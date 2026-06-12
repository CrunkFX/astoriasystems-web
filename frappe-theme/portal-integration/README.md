# Website-Login via Frappe (OAuth2 / OIDC) + gebrandetes Portal

Ziel: Auf `astoria.systems` einloggen → über Frappe als Identity-Provider
authentifiziert → Helpdesk/Wiki/Drive im **On-Brand-CI** nutzen. Das Desk/ERP
bleibt im Standard-Stil.

```
 Besucher ── "Login" ──▶ astoria.systems/api/auth/login
                              │ (302)
                              ▼
                    Frappe /oauth2/authorize  ──▶ Frappe-Login (im CI gestylt)
                              │  Code + (PKCE)        │ setzt zugleich Frappe-Session
                              ▼                       ▼
        astoria.systems/api/auth/callback     Portal-Apps (Helpdesk/Wiki)
            │ tauscht Code→Token,                 sind dadurch eingeloggt
            │ lädt OIDC-Profil,
            │ setzt signierte Website-Session
            ▼
        Website kennt Login-Status (/api/auth/me)
```

Der Clou: Beim OAuth-Login meldet sich der Nutzer **bei Frappe** an – das setzt
gleichzeitig die Frappe-Session. Klick auf „Helpdesk" führt also auf eine
bereits authentifizierte Portal-App, ohne zweites Login.

---

## 1. Frappe-Seite einrichten (Identity-Provider)

### a) OAuth Client anlegen
Im Desk nach **OAuth Client** → *Neu* (deutsche Maske):

| Feld (DE) | Wert |
| --- | --- |
| App-Name (Client-Name) | `Astoria Website` |
| Geltungsbereiche | `all openid` |
| Standard Weiterleitungs URI | `https://astoria.systems/api/auth/callback` |
| Weiterleitungs-URIs | `https://astoria.systems/api/auth/callback` |
| Autorisierung überspringen | ✓ |
| Erlaubte Rollen | leer (oder gezielt eine Kundenrolle) |
| Grant Typ | `Autorisierungscode` |
| Antworttyp | `Code` |
| Token-Endpunkt-Authentifizierungsmethode | `Client Secret Basic` |

Nach dem Speichern erhältst du **Client ID** und **Client Secret**.

> **Token-Auth-Methode muss zum Code passen:** `callback.ts` sendet das Secret
> als HTTP-Basic-Header → Einstellung **`Client Secret Basic`** verwenden.
> Wählst du stattdessen `Client Secret Post`, muss das Secret im Body stehen
> (dann in `callback.ts` `client_secret` ins `URLSearchParams` statt in den
> `Authorization`-Header). Bei `None` (public client) entfällt das Secret und
> es zählt nur PKCE.

### b) OpenID/Token aktivieren
- Sicherstellen, dass **Social Login Key**/OpenID in Frappe aktiv ist
  (Standard in Frappe 16). Die genutzten Endpunkte:
  - `…/api/method/frappe.integrations.oauth2.authorize`
  - `…/api/method/frappe.integrations.oauth2.get_token`
  - `…/api/method/frappe.integrations.oauth2.openid_profile`
- **PKCE**: Frappe 16 unterstützt `S256`. Falls eine ältere Version ohne PKCE
  läuft, in `functions/api/auth/login.ts` die beiden `code_challenge*`-Zeilen
  und in `callback.ts` das `code_verifier`-Feld entfernen.

### c) CORS / Cookies
Da Token-Tausch und Profilabruf **serverseitig** in der Cloudflare-Funktion
laufen, ist kein CORS nötig. Liegt Frappe auf einer Subdomain
(`erp.astoria.systems`), für die Portal-Apps ggf. `host_name` korrekt setzen.

---

## 2. Cloudflare-Seite (dieser Repo)

Die Flow-Funktionen liegen unter `functions/api/auth/`:

| Route | Zweck |
| --- | --- |
| `/api/auth/login?next=/helpdesk` | startet den Flow (PKCE, state) |
| `/api/auth/callback` | Code→Token, Profil, setzt Session-Cookie |
| `/api/auth/me` | JSON-Login-Status für den Website-Header |
| `/api/auth/logout?next=/` | beendet die Website-Session |

### Environment-Variablen (Cloudflare Pages → Settings → Environment Variables)
| Variable | Beispiel / Hinweis |
| --- | --- |
| `FRAPPE_URL` | `https://erp.astoria.systems` |
| `OAUTH_CLIENT_ID` | aus dem OAuth Client |
| `OAUTH_CLIENT_SECRET` | aus dem OAuth Client (geheim!) |
| `SESSION_SECRET` | langer Zufallswert, z. B. `openssl rand -base64 48` |
| `OAUTH_REDIRECT_URI` | optional, sonst aus Request abgeleitet |
| `OAUTH_SCOPE` | optional, Default `openid all` |
| `SESSION_TTL` | optional, Sekunden (Default 86400) |

> Das Session-Cookie ist **HttpOnly, Secure, SameSite=Lax** und HMAC-signiert
> (`SESSION_SECRET`). Es enthält nur Name/E-Mail/sub – keine Tokens.

### Website-Header anbinden
Im Header der Website beim Laden `GET /api/auth/me` aufrufen:
```ts
const me = await fetch("/api/auth/me").then(r => r.json());
if (me.loggedIn) {
  // "Hallo {me.name}", Links: /helpdesk, /wiki, "Logout" -> /api/auth/logout
} else {
  // Button "Login" -> /api/auth/login?next=/helpdesk
}
```

---

## 3. Portal im CI (On-Brand)

| Bereich | Wie | Tiefe |
| --- | --- | --- |
| **Login-Seite** | Website Theme (siehe `frappe-theme/`) + eigene Login-Vorlage | sieht aus wie die Website |
| **Wiki** | läuft über die Website-Schicht → erbt Website Theme + Portal-Templates | nah dran |
| **Helpdesk** | Branding-Settings (Logo/Name) + `portal_ci.css` (Farben/Font/Akzent) | klar Astoria |
| **Drive / Raven** | `portal_ci.css` (Farben/Logo/Font) | CI-Akzente |
| **Desk/ERP** | bleibt Standard (so gewünscht) | – |

- Logo/Name je App über deren **Settings** setzen (Helpdesk Settings, Wiki
  Settings, Navbar Settings).
- Das gemeinsame CI-CSS (`portal_ci.css`) global über die `app_include_css`-
  Methode einbinden – genau wie in `frappe-theme/desk_setup.md` beschrieben,
  nur mit dieser Datei.
- Für das „immer noch auf astoria.systems"-Gefühl empfiehlt sich ein
  gemeinsamer, schmaler **Top-Bar mit Logo + Zurück-zur-Website-Link** über
  allen Portal-Apps (per `app_include_js`/Header-Snippet).

---

## 4. Sicherheit (Kurzcheck)
- `state` + **PKCE** schützen vor CSRF/Code-Interception.
- `redirect_uri` ist fix auf den Callback gesetzt; `next` wird auf
  **seiteninterne Pfade** (`/…`) begrenzt → kein Open Redirect.
- Token werden **nicht** im Browser gespeichert; nur ein signiertes
  Minimal-Session-Cookie.
- `client_secret` und `SESSION_SECRET` liegen ausschließlich als
  Cloudflare-Env-Var vor, nie im Frontend-Bundle.
