<?php

/**
 * Kontaktformular von www.astoria.systems: die Anfrage geht als Mail über Lettermint an das Service-Postfach.
 *
 * nginx reicht POST /api/contact über den PHP-FPM-Pool der Site hierher (ploi/nginx/). Die Datei liegt
 * außerhalb des Web-Directory dist/ und wird nie ausgeliefert. Derselbe Pfad wie früher die Cloudflare
 * Pages Function (functions/api/contact.ts), das Formular (ContactFormHandler.tsx) bleibt unverändert.
 *
 * Einstellungen stehen in der .env der Site (Ploi → Site → Environment, Vorlage ploi/.env.production.example),
 * nie im Repository. Eine gleichnamige Umgebungsvariable geht vor.
 *
 *   LETTERMINT_TOKEN     Sending-API-Token des Lettermint-Projekts (Pflicht, sonst 500)
 *   LETTERMINT_ROUTE_ID  Route im Projekt (leer = Standard-Route)
 *   MAIL_FROM            Absender, Domain in Lettermint verifiziert (Standard: Astoria Website <noreply@astoria.systems>)
 *   CONTACT_EMAIL        Empfänger (Standard: service@astoria.systems)
 *
 * Anfrage: POST mit JSON {name, email, phone?, company, subject, message, website}. `website` ist ein
 * Honigtopf, im Formular unsichtbar: ausgefüllt wird still verworfen und trotzdem Erfolg gemeldet.
 * Antwort wie bei der Pages Function: 200 {"success":true}, sonst {"error":"…"} mit 400 (ungültig),
 * 403 (fremde Herkunft), 405, 413, 415, 429 (mit Retry-After), 500 (nicht eingerichtet) oder 502
 * (Versand gescheitert). Inhalte und Adressen aus dem Formular gehen nie ins Log.
 */

declare(strict_types=1);

const KONTAKT_MAX_BYTES = 32768;
const KONTAKT_ABSENDER = 'Astoria Website <noreply@astoria.systems>';
const KONTAKT_EMPFAENGER = 'service@astoria.systems';
const LETTERMINT_URL = 'https://api.lettermint.co/v1';

/** Längste erlaubte Eingabe je Feld (Zeichen); phone ist das einzige freiwillige Feld. */
const KONTAKT_FELDER = ['name' => 120, 'email' => 254, 'phone' => 60, 'company' => 160, 'subject' => 200, 'message' => 5000];

/** Drosselung [Fenster in Sekunden, Anfragen]: je Adresse 5 in 10 Minuten, insgesamt 60 je Stunde. */
const KONTAKT_GRENZEN = ['ip' => [600, 5], 'alle' => [3600, 60]];

try {
    kontakt_bearbeiten();
} catch (Throwable $e) {
    error_log('Kontaktformular: unerwarteter Fehler ' . $e::class);
    antworte(500, 'Internal error');
}

function kontakt_bearbeiten(): never
{
    if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
        antworte(405, 'Method not allowed', ['Allow' => 'POST']);
    }

    if (! gleiche_herkunft()) {
        antworte(403, 'Forbidden');
    }

    $typ = strtolower(trim(explode(';', (string) ($_SERVER['CONTENT_TYPE'] ?? ''))[0]));
    if ($typ !== 'application/json') {
        antworte(415, 'Unsupported media type');
    }

    if ((int) ($_SERVER['CONTENT_LENGTH'] ?? 0) > KONTAKT_MAX_BYTES) {
        antworte(413, 'Payload too large');
    }
    $roh = (string) file_get_contents('php://input', false, null, 0, KONTAKT_MAX_BYTES + 1);
    if (strlen($roh) > KONTAKT_MAX_BYTES) {
        antworte(413, 'Payload too large');
    }

    $daten = json_decode($roh, true);
    if (! is_array($daten)) {
        antworte(400, 'Invalid JSON');
    }

    // Honigtopf: Menschen sehen das Feld nicht, Bots füllen es aus. Sie bekommen Erfolg und lernen nichts.
    if (text($daten, 'website') !== '') {
        antworte(200);
    }

    $anfrage = [];
    foreach (KONTAKT_FELDER as $feld => $max) {
        $wert = text($daten, $feld);
        $wert = $feld === 'message' ? mehrzeilig($wert) : einzeilig($wert);
        $laenge = function_exists('mb_strlen') ? mb_strlen($wert, 'UTF-8') : strlen($wert);
        if (($laenge === 0 && $feld !== 'phone') || $laenge > $max) {
            antworte(400, 'Missing or invalid field: ' . $feld);
        }
        $anfrage[$feld] = $wert;
    }
    if (filter_var($anfrage['email'], FILTER_VALIDATE_EMAIL) === false) {
        antworte(400, 'Invalid email address');
    }

    $token = einstellung('LETTERMINT_TOKEN');
    if ($token === '') {
        error_log('Kontaktformular: LETTERMINT_TOKEN fehlt in der .env der Site.');
        antworte(500, 'Mail service not configured');
    }

    $warten = gedrosselt();
    if ($warten !== null) {
        antworte(429, 'Too many requests', ['Retry-After' => (string) $warten]);
    }

    [$status, $meldung] = lettermint_senden($token, nachricht($anfrage));
    if ($status < 200 || $status >= 300) {
        error_log('Kontaktformular: Lettermint antwortete ' . ($status === 0 ? 'nicht' : (string) $status) . ($meldung !== '' ? ' – ' . $meldung : ''));
        antworte(502, 'Failed to send message');
    }

    antworte(200);
}

/**
 * @param  array{name: string, email: string, phone: string, company: string, subject: string, message: string}  $a
 * @return array<string, mixed> Nutzlast für POST /v1/send
 */
function nachricht(array $a): array
{
    $e = static fn (string $s): string => htmlspecialchars($s, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
    $felder = [
        'Name' => $a['name'],
        'E-Mail' => $a['email'],
        'Telefon' => $a['phone'] !== '' ? $a['phone'] : '–',
        'Unternehmen' => $a['company'],
        'Betreff' => $a['subject'],
    ];

    $html = '<h2 style="margin:0 0 16px">Neue Kontaktanfrage</h2>';
    $text = "Neue Kontaktanfrage\n\n";
    foreach ($felder as $bezeichnung => $wert) {
        $inhalt = $bezeichnung === 'E-Mail' ? '<a href="mailto:' . $e($wert) . '">' . $e($wert) . '</a>' : $e($wert);
        $html .= '<p style="margin:0 0 6px"><strong>' . $bezeichnung . ':</strong> ' . $inhalt . '</p>';
        $text .= $bezeichnung . ': ' . $wert . "\n";
    }
    $fuss = 'Gesendet über das Kontaktformular auf www.astoria.systems. Antworten gehen direkt an die Absenderin oder den Absender.';
    $html .= '<hr style="margin:16px 0"><p style="margin:0">' . nl2br($e($a['message']), false) . '</p>'
        . '<hr style="margin:16px 0"><p style="margin:0;color:#666;font-size:12px">' . $e($fuss) . '</p>';
    $text .= "\n" . $a['message'] . "\n\n-- \n" . $fuss . "\n";

    $mail = [
        'from' => einstellung('MAIL_FROM', KONTAKT_ABSENDER),
        'to' => [einstellung('CONTACT_EMAIL', KONTAKT_EMPFAENGER)],
        'reply_to' => [$a['email']],
        'subject' => '[Website] ' . $a['subject'],
        'html' => $html,
        'text' => $text,
        'tag' => 'kontaktformular',
    ];
    $route = einstellung('LETTERMINT_ROUTE_ID');
    if ($route !== '') {
        $mail['route'] = $route;
    }

    return $mail;
}

/**
 * @param  array<string, mixed>  $mail
 * @return array{0: int, 1: string} HTTP-Status (0 = keine Antwort) und Meldung der API bzw. von curl
 */
function lettermint_senden(string $token, array $mail): array
{
    if (! function_exists('curl_init')) {
        return [0, 'PHP-Erweiterung curl fehlt'];
    }

    // LETTERMINT_BASE_URL nur für Tests (nachgebildeter Endpunkt); nie ein fremder Host ohne TLS.
    $basis = einstellung('LETTERMINT_BASE_URL', LETTERMINT_URL);
    if (! erlaubte_api_url($basis)) {
        return [0, 'LETTERMINT_BASE_URL ist nicht erlaubt'];
    }

    $ch = curl_init(rtrim($basis, '/') . '/send');
    curl_setopt_array($ch, [
        CURLOPT_POST => true,
        CURLOPT_POSTFIELDS => json_encode($mail, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_THROW_ON_ERROR),
        CURLOPT_HTTPHEADER => [
            'Content-Type: application/json',
            'Accept: application/json',
            'x-lettermint-token: ' . $token,
            'User-Agent: astoriasystems-web/kontakt',
        ],
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_FOLLOWLOCATION => false,
        CURLOPT_CONNECTTIMEOUT => 5,
        CURLOPT_TIMEOUT => 15,
    ]);
    $antwort = curl_exec($ch);
    if (! is_string($antwort)) {
        return [0, curl_error($ch)];
    }

    $json = json_decode($antwort, true);
    $meldung = is_array($json) && is_string($json['message'] ?? null) ? $json['message'] : '';

    return [(int) curl_getinfo($ch, CURLINFO_RESPONSE_CODE), substr($meldung, 0, 200)];
}

/** Nur https, oder http auf den eigenen Rechner. */
function erlaubte_api_url(string $url): bool
{
    $schema = strtolower((string) parse_url($url, PHP_URL_SCHEME));
    $host = strtolower((string) parse_url($url, PHP_URL_HOST));

    return $host !== '' && ($schema === 'https' || ($schema === 'http' && in_array($host, ['127.0.0.1', 'localhost', '[::1]'], true)));
}

/**
 * Sekunden bis zur nächsten erlaubten Anfrage, null = frei. Zähler liegen in <site>/.kontakt/ (außerhalb
 * von dist/), die Adresse nur als Hash. Ist die Ablage nicht beschreibbar, wird nicht gedrosselt – eine
 * Anfrage zuzustellen ist wichtiger als sie abzuweisen.
 */
function gedrosselt(): ?int
{
    $ablage = dirname(__DIR__) . '/.kontakt';
    if (! is_dir($ablage) && ! @mkdir($ablage, 0700) && ! is_dir($ablage)) {
        error_log('Kontaktformular: Ablage für die Drosselung nicht beschreibbar.');

        return null;
    }

    $sperre = @fopen($ablage . '/sperre', 'c');
    if ($sperre === false || ! flock($sperre, LOCK_EX)) {
        return null;
    }

    try {
        $jetzt = time();
        $dateien = [
            'ip' => $ablage . '/ip-' . hash('sha256', (string) ($_SERVER['REMOTE_ADDR'] ?? '')) . '.json',
            'alle' => $ablage . '/alle.json',
        ];

        $staende = [];
        foreach (KONTAKT_GRENZEN as $art => [$fenster, $max]) {
            $liste = is_file($dateien[$art]) ? json_decode((string) file_get_contents($dateien[$art]), true) : [];
            $liste = array_values(array_filter(is_array($liste) ? $liste : [], static fn ($t): bool => is_int($t) && $t > $jetzt - $fenster));
            if (count($liste) >= $max) {
                return max(1, $liste[0] + $fenster - $jetzt);
            }
            $staende[$dateien[$art]] = $liste;
        }

        foreach ($staende as $datei => $liste) {
            $liste[] = $jetzt;
            file_put_contents($datei, json_encode($liste));
        }

        // Gelegentlich aufräumen: Zähler einzelner Adressen, die seit einer Stunde ruhen.
        if (random_int(1, 20) === 1) {
            foreach (glob($ablage . '/ip-*.json') ?: [] as $alt) {
                if (filemtime($alt) < $jetzt - 3600) {
                    @unlink($alt);
                }
            }
        }

        return null;
    } finally {
        flock($sperre, LOCK_UN);
        fclose($sperre);
    }
}

/** Browser schicken bei POST einen Origin-Kopf; er muss der eigene Host sein. Ohne Kopf greift die Drosselung. */
function gleiche_herkunft(): bool
{
    $origin = (string) ($_SERVER['HTTP_ORIGIN'] ?? '');
    if ($origin === '') {
        return true;
    }

    $host = strtolower((string) parse_url($origin, PHP_URL_HOST));
    $eigener = strtolower((string) preg_replace('/:\d+$/', '', (string) ($_SERVER['HTTP_HOST'] ?? '')));

    return $host !== '' && $host === $eigener;
}

/** Wert aus der Umgebung, sonst aus der .env der Site (eine Ebene über server/). */
function einstellung(string $name, string $standard = ''): string
{
    static $datei = null;

    $wert = getenv($name);
    if (is_string($wert) && $wert !== '') {
        return $wert;
    }

    $datei ??= env_lesen(dirname(__DIR__) . '/.env');

    return ($datei[$name] ?? '') !== '' ? $datei[$name] : $standard;
}

/**
 * Einfacher .env-Leser: KEY=wert, KEY="wert mit Leerzeichen", 'wert', Kommentare, `export`. Ohne ${…}.
 *
 * @return array<string, string>
 */
function env_lesen(string $pfad): array
{
    $werte = [];
    $zeilen = is_readable($pfad) ? file($pfad, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES) : false;

    foreach ($zeilen ?: [] as $zeile) {
        if (! preg_match('/^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/', $zeile, $m)) {
            continue;
        }
        $wert = trim($m[2]);
        if ($wert !== '' && ($wert[0] === '"' || $wert[0] === "'")) {
            $ende = strpos($wert, $wert[0], 1);
            $wert = $ende === false ? substr($wert, 1) : substr($wert, 1, $ende - 1);
        } else {
            $wert = trim((string) preg_replace('/\s+#.*$/', '', $wert));
        }
        $werte[$m[1]] = $wert;
    }

    return $werte;
}

/** @param  array<array-key, mixed>  $daten */
function text(array $daten, string $feld): string
{
    $wert = $daten[$feld] ?? '';

    return is_string($wert) ? trim($wert) : (is_int($wert) || is_float($wert) ? (string) $wert : '');
}

/** Eine Zeile: Zeilenumbrüche und Steuerzeichen raus (Betreff, Name – nichts wird zu einem Mail-Kopf). */
function einzeilig(string $wert): string
{
    return trim((string) preg_replace('/[\p{Cc}\x{2028}\x{2029}]+/u', ' ', (string) preg_replace('/\s+/u', ' ', $wert)));
}

/** Nachrichtentext: Zeilenumbrüche bleiben, andere Steuerzeichen nicht. */
function mehrzeilig(string $wert): string
{
    $wert = str_replace(["\r\n", "\r"], "\n", $wert);

    return trim((string) preg_replace('/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/', '', $wert));
}

/** @param  array<string, string>  $kopf */
function antworte(int $status, ?string $fehler = null, array $kopf = []): never
{
    http_response_code($status);
    header('Content-Type: application/json; charset=utf-8');
    header('Cache-Control: no-store');
    foreach ($kopf as $name => $wert) {
        header($name . ': ' . $wert);
    }

    echo json_encode($fehler === null ? ['success' => true] : ['error' => $fehler], JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
    exit;
}
