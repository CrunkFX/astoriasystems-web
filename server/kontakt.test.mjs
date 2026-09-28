// Tests für server/kontakt.php – Aufruf: pnpm test (braucht php ≥ 8.1 mit curl).
//
// Jeder Test baut eine Site wie auf Ploi (<wurzel>/server/kontakt.php und <wurzel>/.env) und startet PHP
// ohne Umgebungsvariablen, wie PHP-FPM mit clear_env: die Einstellungen kommen nur aus der .env. Lettermint
// ist nachgebildet – nie echte Aufrufe.
import { after, before, beforeEach, test } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { copyFileSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { createServer, request } from 'node:http';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HANDLER = join(dirname(fileURLToPath(import.meta.url)), 'kontakt.php');

const ANFRAGE = {
  name: 'Anna Müller',
  email: 'anna@example.org',
  phone: '+49 30 123456',
  company: 'Müller <GmbH>',
  subject: 'Angebot\r\nBcc: boese@example.org',
  message: 'Guten Tag,\r\n\r\n<script>alert(1)</script>\nZeile zwei',
  website: '',
};

// ---------------------------------------------------------------- nachgebildeter Lettermint-Endpunkt
const lettermint = { anfragen: [], status: 202 };
let lettermintServer;
let lettermintUrl;

before(async () => {
  lettermintServer = createServer((req, res) => {
    let koerper = '';
    req.on('data', (teil) => (koerper += teil));
    req.on('end', () => {
      lettermint.anfragen.push({ methode: req.method, pfad: req.url, kopf: req.headers, koerper: JSON.parse(koerper || 'null') });
      res.writeHead(lettermint.status, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(lettermint.status < 300 ? { message_id: 'lm-1', status: 'pending' } : { message: 'The from domain is not verified.' }));
    });
  });
  await new Promise((fertig) => lettermintServer.listen(0, '127.0.0.1', fertig));
  lettermintUrl = `http://127.0.0.1:${lettermintServer.address().port}/v1`;
});

after(() => lettermintServer.close());

beforeEach(() => {
  lettermint.anfragen = [];
  lettermint.status = 202;
});

// ---------------------------------------------------------------- Site mit .env und php -S
const laufend = [];
after(() => laufend.forEach((s) => s.stoppen()));

function freierPort() {
  return new Promise((fertig, fehler) => {
    const s = createServer();
    s.on('error', fehler);
    s.listen(0, '127.0.0.1', () => {
      const { port } = s.address();
      s.close(() => fertig(port));
    });
  });
}

async function site(env) {
  const wurzel = mkdtempSync(join(tmpdir(), 'kontakt-'));
  mkdirSync(join(wurzel, 'server'));
  copyFileSync(HANDLER, join(wurzel, 'server', 'kontakt.php'));
  writeFileSync(join(wurzel, '.env'), Object.entries(env).map(([k, v]) => `${k}=${v}`).join('\n') + '\n');

  const port = await freierPort();
  const php = spawn('php', ['-S', `127.0.0.1:${port}`, join(wurzel, 'server', 'kontakt.php')], {
    env: { PATH: process.env.PATH },
    stdio: ['ignore', 'ignore', 'pipe'],
  });
  let log = '';
  php.stderr.on('data', (teil) => (log += teil));

  const s = {
    host: `127.0.0.1:${port}`,
    wurzel,
    log: () => log,
    stoppen: () => {
      php.kill();
      rmSync(wurzel, { recursive: true, force: true });
    },
  };
  laufend.push(s);

  for (let i = 0; i < 100; i++) {
    try {
      await senden(s, { methode: 'GET' });
      return s;
    } catch {
      await new Promise((warte) => setTimeout(warte, 50));
    }
  }
  throw new Error(`php -S startet nicht: ${log}`);
}

function eingerichtet(extra = {}) {
  return site({
    LETTERMINT_TOKEN: 'lm_test_token',
    LETTERMINT_BASE_URL: lettermintUrl,
    MAIL_FROM: '"Astoria Website <noreply@astoria.example>"',
    CONTACT_EMAIL: 'service@astoria.example # Kommentar',
    ...extra,
  });
}

function senden(s, { methode = 'POST', daten = ANFRAGE, kopf = {} } = {}) {
  const koerper = typeof daten === 'string' ? daten : JSON.stringify(daten);
  return new Promise((fertig, fehler) => {
    const req = request(
      {
        host: '127.0.0.1',
        port: Number(s.host.split(':')[1]),
        path: '/api/contact',
        method: methode,
        headers: methode === 'POST' ? { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(koerper), ...kopf } : kopf,
      },
      (res) => {
        let text = '';
        res.on('data', (teil) => (text += teil));
        res.on('end', () => fertig({ status: res.statusCode, kopf: res.headers, json: text ? JSON.parse(text) : null }));
      },
    );
    req.on('error', fehler);
    if (methode === 'POST') req.write(koerper);
    req.end();
  });
}

// ---------------------------------------------------------------- Tests
test('Anfrage geht als Mail über Lettermint an das Service-Postfach, Antwort an den Absender', async () => {
  const s = await eingerichtet({ LETTERMINT_ROUTE_ID: 'website' });

  const antwort = await senden(s, { kopf: { Origin: `http://${s.host}` } });
  assert.equal(antwort.status, 200);
  assert.deepEqual(antwort.json, { success: true });
  assert.equal(antwort.kopf['cache-control'], 'no-store');

  assert.equal(lettermint.anfragen.length, 1);
  const { methode, pfad, kopf, koerper } = lettermint.anfragen[0];
  assert.equal(methode, 'POST');
  assert.equal(pfad, '/v1/send');
  assert.equal(kopf['x-lettermint-token'], 'lm_test_token');
  assert.equal(koerper.from, 'Astoria Website <noreply@astoria.example>');
  assert.deepEqual(koerper.to, ['service@astoria.example']);
  assert.deepEqual(koerper.reply_to, ['anna@example.org']);
  assert.equal(koerper.subject, '[Website] Angebot Bcc: boese@example.org');
  assert.equal(koerper.route, 'website');
  assert.equal(koerper.tag, 'kontaktformular');

  // HTML maskiert alles aus dem Formular, der Text bleibt Text.
  assert.match(koerper.html, /Müller &lt;GmbH&gt;/);
  assert.match(koerper.html, /&lt;script&gt;alert\(1\)&lt;\/script&gt;/);
  assert.doesNotMatch(koerper.html, /<script>/);
  assert.match(koerper.html, /mailto:anna@example\.org/);
  assert.match(koerper.text, /Telefon: \+49 30 123456/);
  assert.match(koerper.text, /Guten Tag,\n\n<script>alert\(1\)<\/script>\nZeile zwei/);
});

test('ohne Route und Absender gelten die Standardwerte, Telefon ist freiwillig', async () => {
  const s = await site({ LETTERMINT_TOKEN: 'lm_test_token', LETTERMINT_BASE_URL: lettermintUrl });

  assert.equal((await senden(s, { daten: { ...ANFRAGE, phone: '' } })).status, 200);
  const { koerper } = lettermint.anfragen[0];
  assert.equal(koerper.from, 'Astoria Website <noreply@astoria.systems>');
  assert.deepEqual(koerper.to, ['service@astoria.systems']);
  assert.equal('route' in koerper, false);
  assert.match(koerper.text, /Telefon: –/);
});

test('Honigtopf: still verworfen, trotzdem Erfolg', async () => {
  const s = await eingerichtet();

  const antwort = await senden(s, { daten: { ...ANFRAGE, website: 'https://spam.example' } });
  assert.equal(antwort.status, 200);
  assert.deepEqual(antwort.json, { success: true });
  assert.equal(lettermint.anfragen.length, 0);
});

test('Pflichtfelder, gültige Adresse und Längen', async () => {
  const s = await eingerichtet();

  for (const daten of [
    { ...ANFRAGE, company: '' },
    { ...ANFRAGE, message: '   ' },
    { ...ANFRAGE, email: 'keine-adresse' },
    { ...ANFRAGE, email: 'anna@example.org\r\nBcc: boese@example.org' },
    { ...ANFRAGE, name: 'x'.repeat(121) },
    { ...ANFRAGE, subject: ['kein', 'text'] },
  ]) {
    const antwort = await senden(s, { daten });
    assert.equal(antwort.status, 400, JSON.stringify(daten));
    assert.ok(antwort.json.error);
  }
  assert.equal(lettermint.anfragen.length, 0);
});

test('nur POST mit JSON von der eigenen Seite', async () => {
  const s = await eingerichtet();

  const get = await senden(s, { methode: 'GET' });
  assert.equal(get.status, 405);
  assert.equal(get.kopf.allow, 'POST');

  assert.equal((await senden(s, { kopf: { 'Content-Type': 'text/plain' } })).status, 415);
  assert.equal((await senden(s, { kopf: { Origin: 'https://boese.example' } })).status, 403);
  assert.equal((await senden(s, { kopf: { Origin: 'null' } })).status, 403);
  assert.equal((await senden(s, { daten: '{kaputt' })).status, 400);
  assert.equal((await senden(s, { daten: JSON.stringify({ ...ANFRAGE, message: 'x'.repeat(40000) }) })).status, 413);
  assert.equal(lettermint.anfragen.length, 0);
});

test('ohne Token: 500, nichts gesendet, Hinweis im Log', async () => {
  const s = await site({ LETTERMINT_BASE_URL: lettermintUrl });

  const antwort = await senden(s);
  assert.equal(antwort.status, 500);
  assert.equal(lettermint.anfragen.length, 0);
  assert.match(s.log(), /LETTERMINT_TOKEN fehlt/);
});

test('Lettermint lehnt ab: 502, im Log nur Status und Meldung, keine Inhalte', async () => {
  const s = await eingerichtet();
  lettermint.status = 422;

  const antwort = await senden(s);
  assert.equal(antwort.status, 502);
  assert.equal(lettermint.anfragen.length, 1);
  assert.match(s.log(), /Lettermint antwortete 422 – The from domain is not verified\./);
  assert.doesNotMatch(s.log(), /anna@example\.org|Anna Müller|Guten Tag|lm_test_token/);
});

test('API-Adresse nur über https oder auf dem eigenen Rechner', async () => {
  const s = await eingerichtet({ LETTERMINT_BASE_URL: 'http://api.lettermint.example/v1' });

  assert.equal((await senden(s)).status, 502);
  assert.match(s.log(), /LETTERMINT_BASE_URL ist nicht erlaubt/);
});

test('Drosselung: fünf Anfragen je Adresse in zehn Minuten', async () => {
  const s = await eingerichtet();

  for (let i = 0; i < 5; i++) {
    assert.equal((await senden(s)).status, 200);
  }
  const sechste = await senden(s);
  assert.equal(sechste.status, 429);
  assert.ok(Number(sechste.kopf['retry-after']) > 0);
  assert.equal(lettermint.anfragen.length, 5);
});
