// Kontaktformular von www.astoria.systems: die Anfrage geht als Mail über Lettermint an das Service-Postfach.
//
// Kleiner Node-Dienst ohne Abhängigkeiten. Er läuft als Ploi-Daemon (Server → Daemons) unter dem
// Systembenutzer der Site, mit absolutem Pfad über das Site-Verzeichnis:
//
//   node /home/<benutzer>/www.astoria.systems/server/kontakt.mjs
//
// nginx reicht POST /api/contact an 127.0.0.1:<KONTAKT_PORT> weiter (ploi/nginx/); die Site selbst bleibt
// statisch, PHP wird nicht gebraucht. Die Datei liegt außerhalb von dist/ und wird nie ausgeliefert.
// Derselbe Pfad wie früher die Cloudflare Pages Function (functions/api/contact.ts).
//
// Einstellungen aus der .env der Site (Ploi → Site → Environment, Vorlage ploi/.env.production.example),
// bei jeder Anfrage neu gelesen – eine Änderung im Panel gilt sofort. Eine gleichnamige Umgebungsvariable
// geht vor.
//
//   LETTERMINT_TOKEN     Sending-API-Token des Lettermint-Projekts (Pflicht, sonst 500)
//   LETTERMINT_ROUTE_ID  Route im Projekt (leer = Standard-Route)
//   MAIL_FROM            Absender, Domain in Lettermint verifiziert (Standard: Astoria Website <noreply@astoria.systems>)
//   CONTACT_EMAIL        Empfänger (Standard: service@astoria.systems)
//   KONTAKT_PORT         Port auf 127.0.0.1 (Standard 3811, muss zu ploi/nginx/ passen; wirkt nach Neustart)
//
// Anfrage: POST mit JSON {name, email, phone?, company, subject, message, website}. `website` ist ein
// Honigtopf, im Formular unsichtbar: ausgefüllt wird still verworfen und trotzdem Erfolg gemeldet.
// Antwort wie bei der Pages Function: 200 {"success":true}, sonst {"error":"…"} mit 400 (ungültig),
// 403 (fremde Herkunft), 404, 405, 413, 415, 429 (mit Retry-After), 500 (nicht eingerichtet) oder 502
// (Versand gescheitert). Inhalte und Adressen aus dem Formular gehen nie ins Log.
//
// Neue Version: Zero-Downtime schaltet den Symlink des Site-Verzeichnisses auf ein neues Release, ohne
// Zero-Downtime ändert `git pull` diese Datei. Beides bemerkt der Dienst (alle 10 Sekunden), beantwortet
// laufende Anfragen und beendet sich; supervisor startet ihn mit dem neuen Stand. Dafür braucht es kein sudo.

import { createServer } from 'node:http';
import { readFileSync, realpathSync, statSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const SKRIPT = resolve(process.argv[1] ?? '.');
const SITE = siteVerzeichnis(SKRIPT);
const LETTERMINT_URL = 'https://api.lettermint.co/v1';
const STANDARD = {
  MAIL_FROM: 'Astoria Website <noreply@astoria.systems>',
  CONTACT_EMAIL: 'service@astoria.systems',
  KONTAKT_PORT: '3811',
};
const MAX_BYTES = 32 * 1024;

/** Längste erlaubte Eingabe je Feld (Zeichen); phone ist das einzige freiwillige Feld. */
const FELDER = { name: 120, email: 254, phone: 60, company: 160, subject: 200, message: 5000 };

/** Drosselung [Fenster in ms, Anfragen]: je Adresse 5 in 10 Minuten, insgesamt 60 je Stunde. */
const GRENZEN = { ip: [10 * 60_000, 5], alle: [60 * 60_000, 60] };
const zaehler = new Map();

/**
 * Site-Verzeichnis aus dem Pfad des Skripts. Startet der Daemon über das Release statt über den Symlink
 * (Ploi Zero-Downtime: /home/<benutzer>/<domain>-deploy/<domain>/<zeitstempel>), zurück auf
 * /home/<benutzer>/<domain> – dort liegen die aktuelle .env und der Symlink auf das jeweils neue Release.
 */
export function siteVerzeichnis(skript) {
  const release = dirname(dirname(skript));
  const treffer = release.match(/^(.*)\/([^/]+)-deploy\/\2\/[^/]+$/);
  return treffer ? `${treffer[1]}/${treffer[2]}` : release;
}

// ---------------------------------------------------------------- Einstellungen

/** Einfacher .env-Leser: KEY=wert, KEY="wert mit Leerzeichen", 'wert', Kommentare, `export`. Ohne ${…}. */
export function envLesen(text) {
  const werte = {};
  for (const zeile of text.split(/\r?\n/)) {
    const treffer = zeile.match(/^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
    if (!treffer) continue;
    let wert = treffer[2].trim();
    if (wert && (wert[0] === '"' || wert[0] === "'")) {
      const ende = wert.indexOf(wert[0], 1);
      wert = ende === -1 ? wert.slice(1) : wert.slice(1, ende);
    } else {
      wert = wert.replace(/\s+#.*$/, '').trim();
    }
    werte[treffer[1]] = wert;
  }
  return werte;
}

function einstellungen() {
  let datei = {};
  try {
    datei = envLesen(readFileSync(`${SITE}/.env`, 'utf8'));
  } catch {
    // keine .env – Umgebung und Standardwerte
  }
  return (name) => process.env[name] || datei[name] || STANDARD[name] || '';
}

// ---------------------------------------------------------------- Anfrage

async function bearbeiten(req, res) {
  if (new URL(req.url ?? '/', 'http://localhost').pathname !== '/api/contact') {
    return antworte(res, 404, 'Not found');
  }
  if (req.method !== 'POST') {
    return antworte(res, 405, 'Method not allowed', { Allow: 'POST' });
  }
  if (!gleicheHerkunft(req)) {
    return antworte(res, 403, 'Forbidden');
  }
  if ((req.headers['content-type'] ?? '').split(';')[0].trim().toLowerCase() !== 'application/json') {
    return antworte(res, 415, 'Unsupported media type');
  }
  if (Number(req.headers['content-length'] ?? 0) > MAX_BYTES) {
    return antworte(res, 413, 'Payload too large');
  }

  const roh = await koerperLesen(req);
  if (roh === null) {
    return antworte(res, 413, 'Payload too large');
  }

  let daten;
  try {
    daten = JSON.parse(roh);
  } catch {
    daten = null;
  }
  if (daten === null || typeof daten !== 'object' || Array.isArray(daten)) {
    return antworte(res, 400, 'Invalid JSON');
  }

  // Honigtopf: Menschen sehen das Feld nicht, Bots füllen es aus. Sie bekommen Erfolg und lernen nichts.
  if (text(daten.website) !== '') {
    return antworte(res, 200);
  }

  const anfrage = {};
  for (const [feld, max] of Object.entries(FELDER)) {
    const wert = feld === 'message' ? mehrzeilig(text(daten[feld])) : einzeilig(text(daten[feld]));
    const laenge = [...wert].length;
    if ((laenge === 0 && feld !== 'phone') || laenge > max) {
      return antworte(res, 400, `Missing or invalid field: ${feld}`);
    }
    anfrage[feld] = wert;
  }
  if (!gueltigeAdresse(anfrage.email)) {
    return antworte(res, 400, 'Invalid email address');
  }

  const wert = einstellungen();
  const token = wert('LETTERMINT_TOKEN');
  if (token === '') {
    console.error('Kontaktformular: LETTERMINT_TOKEN fehlt in der .env der Site.');
    return antworte(res, 500, 'Mail service not configured');
  }

  const warten = gedrosselt(clientAdresse(req));
  if (warten !== null) {
    return antworte(res, 429, 'Too many requests', { 'Retry-After': String(warten) });
  }

  const [status, meldung] = await lettermintSenden(wert, token, nachricht(anfrage, wert));
  if (status < 200 || status >= 300) {
    console.error(`Kontaktformular: Lettermint antwortete ${status === 0 ? 'nicht' : status}${meldung ? ` – ${meldung}` : ''}`);
    return antworte(res, 502, 'Failed to send message');
  }

  return antworte(res, 200);
}

/** Nutzlast für POST /v1/send der Lettermint-API. */
export function nachricht(a, wert) {
  const e = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
  const felder = [
    ['Name', a.name],
    ['E-Mail', a.email],
    ['Telefon', a.phone !== '' ? a.phone : '–'],
    ['Unternehmen', a.company],
    ['Betreff', a.subject],
  ];

  let html = '<h2 style="margin:0 0 16px">Neue Kontaktanfrage</h2>';
  let klartext = 'Neue Kontaktanfrage\n\n';
  for (const [bezeichnung, inhalt] of felder) {
    const zelle = bezeichnung === 'E-Mail' ? `<a href="mailto:${e(inhalt)}">${e(inhalt)}</a>` : e(inhalt);
    html += `<p style="margin:0 0 6px"><strong>${bezeichnung}:</strong> ${zelle}</p>`;
    klartext += `${bezeichnung}: ${inhalt}\n`;
  }
  const fuss = 'Gesendet über das Kontaktformular auf www.astoria.systems. Antworten gehen direkt an die Absenderin oder den Absender.';
  html += `<hr style="margin:16px 0"><p style="margin:0">${e(a.message).replace(/\n/g, '<br>')}</p>`
    + `<hr style="margin:16px 0"><p style="margin:0;color:#666;font-size:12px">${e(fuss)}</p>`;
  klartext += `\n${a.message}\n\n-- \n${fuss}\n`;

  const mail = {
    from: wert('MAIL_FROM'),
    to: [wert('CONTACT_EMAIL')],
    reply_to: [a.email],
    subject: `[Website] ${a.subject}`,
    html,
    text: klartext,
    tag: 'kontaktformular',
  };
  const route = wert('LETTERMINT_ROUTE_ID');
  if (route !== '') mail.route = route;
  return mail;
}

/** @returns {Promise<[number, string]>} HTTP-Status (0 = keine Antwort) und Meldung der API */
async function lettermintSenden(wert, token, mail) {
  // LETTERMINT_BASE_URL nur für Tests (nachgebildeter Endpunkt); nie ein fremder Host ohne TLS.
  const basis = wert('LETTERMINT_BASE_URL') || LETTERMINT_URL;
  if (!erlaubteApiUrl(basis)) {
    return [0, 'LETTERMINT_BASE_URL ist nicht erlaubt'];
  }

  try {
    const antwort = await fetch(`${basis.replace(/\/+$/, '')}/send`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        'x-lettermint-token': token,
        'User-Agent': 'astoriasystems-web/kontakt',
      },
      body: JSON.stringify(mail),
      redirect: 'manual',
      signal: AbortSignal.timeout(15_000),
    });
    let meldung = '';
    try {
      const json = await antwort.json();
      if (typeof json?.message === 'string') meldung = json.message.slice(0, 200);
    } catch {
      // keine JSON-Antwort
    }
    return [antwort.status, meldung];
  } catch (fehler) {
    return [0, fehler?.name === 'TimeoutError' ? 'Zeitüberschreitung' : 'nicht erreichbar'];
  }
}

/** Nur https, oder http auf den eigenen Rechner. */
function erlaubteApiUrl(url) {
  try {
    const { protocol, hostname } = new URL(url);
    return protocol === 'https:' || (protocol === 'http:' && ['127.0.0.1', 'localhost', '[::1]'].includes(hostname));
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------- Schutz

/** Sekunden bis zur nächsten erlaubten Anfrage, null = frei. Nur im Speicher, ein Neustart setzt zurück. */
function gedrosselt(adresse) {
  const jetzt = Date.now();
  const schluessel = { ip: `ip:${adresse}`, alle: 'alle' };
  const staende = {};
  for (const [art, [fenster, max]] of Object.entries(GRENZEN)) {
    const liste = (zaehler.get(schluessel[art]) ?? []).filter((t) => t > jetzt - fenster);
    if (liste.length >= max) {
      zaehler.set(schluessel[art], liste);
      return Math.max(1, Math.ceil((liste[0] + fenster - jetzt) / 1000));
    }
    staende[art] = liste;
  }
  for (const art of Object.keys(GRENZEN)) {
    zaehler.set(schluessel[art], [...staende[art], jetzt]);
  }
  return null;
}

// Alte Zähler einzelner Adressen gelegentlich wegräumen.
setInterval(() => {
  const grenze = Date.now() - GRENZEN.alle[0];
  for (const [schluessel, liste] of zaehler) {
    if (liste.every((t) => t < grenze)) zaehler.delete(schluessel);
  }
}, 10 * 60_000).unref();

/** Adresse des Besuchers: von nginx als X-Real-IP, nur wenn die Anfrage vom eigenen Rechner kommt. */
function clientAdresse(req) {
  const direkt = req.socket.remoteAddress ?? '';
  const lokal = ['127.0.0.1', '::1', '::ffff:127.0.0.1'].includes(direkt);
  const weitergereicht = String(req.headers['x-real-ip'] ?? '').trim();
  return lokal && weitergereicht !== '' ? weitergereicht : direkt;
}

/** Browser schicken bei POST einen Origin-Kopf; er muss der eigene Host sein. Ohne Kopf greift die Drosselung. */
function gleicheHerkunft(req) {
  const origin = req.headers.origin;
  if (origin === undefined || origin === '') return true;
  const eigener = String(req.headers.host ?? '').toLowerCase().replace(/:\d+$/, '');
  try {
    return new URL(origin).hostname.toLowerCase() === eigener;
  } catch {
    return false;
  }
}

function gueltigeAdresse(adresse) {
  return adresse.length <= 254 && /^[^\s@<>()[\]\\,;:"]{1,64}@[^\s@<>()[\]\\,;:"_]+\.[a-z]{2,}$/i.test(adresse);
}

// ---------------------------------------------------------------- Hilfen

function koerperLesen(req) {
  return new Promise((fertig, fehler) => {
    const teile = [];
    let groesse = 0;
    req.on('data', (teil) => {
      groesse += teil.length;
      if (groesse > MAX_BYTES) {
        fertig(null);
        req.destroy();
        return;
      }
      teile.push(teil);
    });
    req.on('end', () => fertig(Buffer.concat(teile).toString('utf8')));
    req.on('error', fehler);
  });
}

function text(wert) {
  if (typeof wert === 'string') return wert.trim();
  if (typeof wert === 'number' && Number.isFinite(wert)) return String(wert);
  return '';
}

/** Eine Zeile: Zeilenumbrüche und Steuerzeichen raus (Betreff, Name – nichts wird zu einem Mail-Kopf). */
function einzeilig(wert) {
  return wert.replace(/\s+/gu, ' ').replace(/[\p{Cc}\u2028\u2029]+/gu, ' ').trim();
}

/** Nachrichtentext: Zeilenumbrüche bleiben, andere Steuerzeichen nicht. */
function mehrzeilig(wert) {
  return wert.replace(/\r\n?/g, '\n').replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '').trim();
}

function antworte(res, status, fehler = null, kopf = {}) {
  if (res.headersSent) return;
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    ...kopf,
  });
  res.end(JSON.stringify(fehler === null ? { success: true } : { error: fehler }));
}

// ---------------------------------------------------------------- Dienst

function releaseStand() {
  try {
    return `${realpathSync(SITE)}|${statSync(`${SITE}/server/kontakt.mjs`).mtimeMs}`;
  } catch {
    return '';
  }
}

// Nur als Dienst starten, nicht beim Import (Tests).
if (process.argv[1] !== undefined && import.meta.url === pathToFileURL(realpathSync(SKRIPT)).href) {
  const port = Number(einstellungen()('KONTAKT_PORT'));
  const dienst = createServer((req, res) => {
    bearbeiten(req, res).catch((fehler) => {
      console.error(`Kontaktformular: unerwarteter Fehler ${fehler?.name ?? 'Error'}`);
      antworte(res, 500, 'Internal error');
    });
  });

  let beendet = false;
  const beenden = (grund) => {
    if (beendet) return;
    beendet = true;
    console.log(`Kontaktformular: ${grund}`);
    dienst.close(() => process.exit(0));
    setTimeout(() => process.exit(0), 10_000).unref();
  };

  const stand = releaseStand();
  setInterval(() => {
    if (releaseStand() !== stand) beenden('neue Version erkannt – Neustart durch supervisor.');
  }, Number(process.env.KONTAKT_PRUEFEN_MS) || 10_000);

  process.on('SIGTERM', () => beenden('beendet (SIGTERM).'));
  dienst.on('error', (fehler) => {
    console.error(`Kontaktformular: Port ${port} nicht nutzbar (${fehler.code ?? fehler.message}).`);
    process.exit(1);
  });
  dienst.listen(port, '127.0.0.1', () => console.log(`Kontaktformular: bereit auf 127.0.0.1:${port} (Site ${SITE}).`));
}
