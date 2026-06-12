import { connect } from "cloudflare:sockets";

interface Env {
  // Stalwart / SMTP-Versand
  SMTP_HOST?: string; // z. B. mail.astoria.systems
  SMTP_PORT?: string; // 465 (implizites TLS) oder 587 (STARTTLS)
  SMTP_USER?: string; // SMTP-Login
  SMTP_PASS?: string; // SMTP-Passwort
  SMTP_SECURE?: string; // "implicit" (Default, 465) oder "starttls" (587)
  MAIL_FROM?: string; // Absender, z. B. noreply@astoria.systems
  CONTACT_EMAIL?: string; // Zieladresse, Default service@astoria.systems
}

interface ContactForm {
  name: string;
  email: string;
  phone?: string;
  company: string;
  subject: string;
  message: string;
}

// Temporärer Diagnose-Endpunkt: GET /api/contact?debug=env
// Zeigt nur, WELCHE Variablennamen die Funktion sieht (keine Werte).
export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const url = new URL(request.url);
  if (url.searchParams.get("debug") !== "env") {
    return new Response("Not found", { status: 404 });
  }
  const e = env as unknown as Record<string, unknown>;
  const allKeys = Object.keys(e);
  const relevantKeys = allKeys.filter((k) => /smtp|mail|contact/i.test(k));
  const seen: Record<string, string> = {};
  for (const k of ["SMTP_HOST", "SMTP_USER", "SMTP_PASS", "SMTP_PORT", "SMTP_SECURE", "MAIL_FROM", "CONTACT_EMAIL"]) {
    seen[k] = typeof e[k]; // "string" = vorhanden, "undefined" = fehlt
  }
  return json({ host: url.host, relevantKeys, seen }, 200);
};

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const { request, env } = context;
  const ip = request.headers.get("CF-Connecting-IP") || "unknown";

  try {
    const body = (await request.json()) as ContactForm;

    if (!body.name || !body.email || !body.company || !body.subject || !body.message) {
      return json({ error: "Missing required fields" }, 400);
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(body.email)) {
      return json({ error: "Invalid email address" }, 400);
    }

    if (!env.SMTP_HOST || !env.SMTP_USER || !env.SMTP_PASS) {
      console.error("SMTP not configured (SMTP_HOST/SMTP_USER/SMTP_PASS missing)");
      return json(
        {
          error: "Mail service not configured",
          detail: `missing env: ${[
            !env.SMTP_HOST && "SMTP_HOST",
            !env.SMTP_USER && "SMTP_USER",
            !env.SMTP_PASS && "SMTP_PASS",
          ]
            .filter(Boolean)
            .join(", ")}`,
        },
        500
      );
    }

    const to = env.CONTACT_EMAIL || "service@astoria.systems";
    const from = env.MAIL_FROM || env.SMTP_USER;

    const html = `
      <h2>Neue Kontaktanfrage</h2>
      <p><strong>Name:</strong> ${escapeHtml(body.name)}</p>
      <p><strong>E-Mail:</strong> ${escapeHtml(body.email)}</p>
      <p><strong>Telefon:</strong> ${escapeHtml(body.phone || "-")}</p>
      <p><strong>Unternehmen:</strong> ${escapeHtml(body.company)}</p>
      <p><strong>Betreff:</strong> ${escapeHtml(body.subject)}</p>
      <hr />
      <p>${escapeHtml(body.message).replace(/\n/g, "<br />")}</p>
      <hr />
      <p style="color:#666;font-size:12px;">IP: ${ip}</p>`;

    const message = buildMessage({
      from,
      to,
      replyTo: body.email,
      subject: `[Website] ${body.subject}`,
      html,
    });

    await sendMail(env, { from, to, message });

    return json({ success: true }, 200);
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    console.error("Contact form error:", detail);
    return json({ error: "Failed to send message", detail }, 500);
  }
};

// ---------- SMTP über Cloudflare TCP-Sockets ----------
async function sendMail(
  env: Env,
  msg: { from: string; to: string; message: string }
): Promise<void> {
  const mode = (env.SMTP_SECURE || "implicit").toLowerCase();
  const port = parseInt(env.SMTP_PORT || (mode === "starttls" ? "587" : "465"), 10);
  const host = env.SMTP_HOST!;
  const ehloName = (env.MAIL_FROM || env.SMTP_USER || host).split("@").pop() || host;

  let socket = connect(
    { hostname: host, port },
    { secureTransport: mode === "starttls" ? "starttls" : "on", allowHalfOpen: false }
  );

  const enc = new TextEncoder();
  const dec = new TextDecoder();
  let reader = socket.readable.getReader();
  let writer = socket.writable.getWriter();

  async function read(): Promise<{ code: number; msg: string }> {
    let buf = "";
    for (;;) {
      const { value, done } = await reader.read();
      if (value) buf += dec.decode(value, { stream: true });
      const m = buf.match(/(?:^|\r?\n)(\d{3}) [^\r\n]*\r?\n$/);
      if (m) return { code: parseInt(m[1], 10), msg: buf };
      if (done) {
        const m2 = buf.match(/(\d{3})/);
        return { code: m2 ? parseInt(m2[1], 10) : 0, msg: buf };
      }
    }
  }
  async function send(line: string): Promise<void> {
    await writer.write(enc.encode(line + "\r\n"));
  }
  function expect(r: { code: number; msg: string }, ok: number[]): void {
    if (!ok.includes(r.code)) throw new Error(`SMTP ${r.code}: ${r.msg.trim()}`);
  }

  try {
    expect(await read(), [220]); // greeting
    await send(`EHLO ${ehloName}`);
    expect(await read(), [250]);

    if (mode === "starttls") {
      await send("STARTTLS");
      expect(await read(), [220]);
      reader.releaseLock();
      writer.releaseLock();
      socket = socket.startTls();
      reader = socket.readable.getReader();
      writer = socket.writable.getWriter();
      await send(`EHLO ${ehloName}`);
      expect(await read(), [250]);
    }

    // AUTH LOGIN
    await send("AUTH LOGIN");
    expect(await read(), [334]);
    await send(btoa(env.SMTP_USER!));
    expect(await read(), [334]);
    await send(btoa(env.SMTP_PASS!));
    expect(await read(), [235]);

    await send(`MAIL FROM:<${msg.from}>`);
    expect(await read(), [250]);
    await send(`RCPT TO:<${msg.to}>`);
    expect(await read(), [250, 251]);
    await send("DATA");
    expect(await read(), [354]);

    // Nachricht + Terminator; Dot-Stuffing für Zeilen, die mit '.' beginnen
    const stuffed = msg.message.replace(/\r\n\./g, "\r\n..");
    await writer.write(enc.encode(stuffed + "\r\n.\r\n"));
    expect(await read(), [250]);

    await send("QUIT");
    await read().catch(() => undefined);
  } finally {
    try { reader.releaseLock(); } catch { /* noop */ }
    try { writer.releaseLock(); } catch { /* noop */ }
    try { await socket.close(); } catch { /* noop */ }
  }
}

function buildMessage(o: {
  from: string;
  to: string;
  replyTo: string;
  subject: string;
  html: string;
}): string {
  const date = new Date().toUTCString();
  const msgId = `<${crypto.randomUUID()}@${o.from.split("@").pop()}>`;
  const bodyB64 = base64(o.html).replace(/(.{76})/g, "$1\r\n");
  return [
    `From: Astoria Website <${o.from}>`,
    `To: <${o.to}>`,
    `Reply-To: <${o.replyTo}>`,
    `Subject: ${encodeHeader(o.subject)}`,
    `Date: ${date}`,
    `Message-ID: ${msgId}`,
    "MIME-Version: 1.0",
    "Content-Type: text/html; charset=UTF-8",
    "Content-Transfer-Encoding: base64",
    "",
    bodyB64,
  ].join("\r\n");
}

// UTF-8 -> base64
function base64(str: string): string {
  const bytes = new TextEncoder().encode(str);
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin);
}

// RFC 2047 encoded-word für Header mit Nicht-ASCII (z. B. Umlaute im Betreff)
function encodeHeader(str: string): string {
  // eslint-disable-next-line no-control-regex
  if (/^[\x00-\x7F]*$/.test(str)) return str;
  return `=?UTF-8?B?${base64(str)}?=`;
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function json(data: unknown, status: number): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
