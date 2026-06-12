// ============================================================
// OAuth2 / OIDC Integration mit Frappe als Identity-Provider
// Geteilte Hilfsfunktionen (keine externen Abhängigkeiten,
// nutzt die Web Crypto API der Cloudflare-Runtime).
//
// Dateien mit führendem "_" werden NICHT als Route exponiert.
// ============================================================

export interface AuthEnv {
  FRAPPE_URL: string; // z. B. https://erp.astoria.systems
  OAUTH_CLIENT_ID: string;
  OAUTH_CLIENT_SECRET: string;
  SESSION_SECRET: string; // langer Zufallswert für die Cookie-Signatur
  OAUTH_REDIRECT_URI?: string; // optional, sonst aus Request abgeleitet
  OAUTH_SCOPE?: string; // optional, Default "openid all"
  SESSION_TTL?: string; // optional, Sekunden (Default 86400)
}

export const SESSION_COOKIE = "astoria_session";
export const FLOW_COOKIE = "astoria_oauth";

// ---- Base64URL ---------------------------------------------
export function b64urlEncode(data: ArrayBuffer | Uint8Array | string): string {
  let bytes: Uint8Array;
  if (typeof data === "string") bytes = new TextEncoder().encode(data);
  else if (data instanceof Uint8Array) bytes = data;
  else bytes = new Uint8Array(data);
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function b64urlDecode(str: string): string {
  const pad = str.length % 4 === 0 ? "" : "=".repeat(4 - (str.length % 4));
  const bin = atob(str.replace(/-/g, "+").replace(/_/g, "/") + pad);
  return bin;
}

// ---- HMAC-signierte Tokens ---------------------------------
async function hmacKey(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"]
  );
}

export async function signToken(
  payload: Record<string, unknown>,
  secret: string
): Promise<string> {
  const body = b64urlEncode(JSON.stringify(payload));
  const key = await hmacKey(secret);
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(body));
  return `${body}.${b64urlEncode(sig)}`;
}

export async function verifyToken<T = Record<string, unknown>>(
  token: string | undefined,
  secret: string
): Promise<T | null> {
  if (!token || !token.includes(".")) return null;
  const [body, sig] = token.split(".");
  const key = await hmacKey(secret);
  const expected = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(body)
  );
  // konstante-Zeit-Vergleich
  const a = b64urlEncode(expected);
  if (a.length !== sig.length) return null;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ sig.charCodeAt(i);
  if (diff !== 0) return null;
  try {
    const payload = JSON.parse(b64urlDecode(body)) as T & { exp?: number };
    if (payload.exp && Date.now() / 1000 > payload.exp) return null;
    return payload;
  } catch {
    return null;
  }
}

// ---- PKCE ---------------------------------------------------
export function randomString(bytes = 32): string {
  const buf = new Uint8Array(bytes);
  crypto.getRandomValues(buf);
  return b64urlEncode(buf);
}

export async function pkceChallenge(verifier: string): Promise<string> {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(verifier)
  );
  return b64urlEncode(digest);
}

// ---- Cookies ------------------------------------------------
export function parseCookies(header: string | null): Record<string, string> {
  const out: Record<string, string> = {};
  if (!header) return out;
  for (const part of header.split(";")) {
    const idx = part.indexOf("=");
    if (idx === -1) continue;
    out[part.slice(0, idx).trim()] = decodeURIComponent(part.slice(idx + 1).trim());
  }
  return out;
}

export function serializeCookie(
  name: string,
  value: string,
  opts: { maxAge?: number; path?: string; httpOnly?: boolean; sameSite?: "Lax" | "Strict" | "None"; secure?: boolean } = {}
): string {
  const p: string[] = [`${name}=${encodeURIComponent(value)}`];
  p.push(`Path=${opts.path ?? "/"}`);
  if (opts.maxAge !== undefined) p.push(`Max-Age=${opts.maxAge}`);
  if (opts.httpOnly !== false) p.push("HttpOnly");
  p.push(`SameSite=${opts.sameSite ?? "Lax"}`);
  if (opts.secure !== false) p.push("Secure");
  return p.join("; ");
}

// ---- Konfiguration -----------------------------------------
export function getRedirectUri(env: AuthEnv, request: Request): string {
  if (env.OAUTH_REDIRECT_URI) return env.OAUTH_REDIRECT_URI;
  return new URL("/api/auth/callback", request.url).toString();
}

export function frappeEndpoint(env: AuthEnv, path: string): string {
  return env.FRAPPE_URL.replace(/\/$/, "") + path;
}
