# Briefing: Frappe Portal App „astoria_portal" (featurecomplete, im Astoria-Website-Stil)

> Dieses Dokument ist als **Start-Prompt für eine neue Claude-Code-Session** gedacht,
> die direkt im **Frappe-Bench / Custom-App-Repo** läuft (nicht im Astro-Website-Repo).
> Es ist bewusst selbstständig: alle nötigen Design-Tokens und Entscheidungen stehen hier.

---

## 0. Auftrag (eine Zeile)
Baue eine **feature-complete Frappe-16-Custom-App `astoria_portal`**, die die Standard-Portalseite
(`/me` bzw. die Login-Home der Kunden) durch ein **eigenes, gebrandetes Kundenportal im Stil der
Website astoria.systems** ersetzt (dunkel, Cyan-Akzent, Glasmorphismus, Inter, Triangle-Hintergrund).

---

## 1. Kontext & Ausgangslage
- Marketing-Website: **astoria.systems** (Astro, dunkles CI, Cyan `#00e5ff`, Glas-Cards, Low-Poly/Trianglify).
- Frappe-Instanz: **works.astoria.systems** (Helpdesk, Wiki, ggf. Drive/Raven, ERPNext).
- Login der Website läuft via **OAuth2/OIDC gegen Frappe** (Frappe = IdP). Dadurch hat der
  Nutzer beim Portalzugriff bereits eine **first-party Frappe-Session** – kein erneutes Login nötig.
- Es existieren bereits Frappe-seitige CI-Bausteine (im Website-Repo unter `frappe-theme/`), die
  als Vorlage dienen können – **falls verfügbar bitte wiederverwenden**:
  - `frappe-theme/login/login.scss`, `login-background.js` (Trianglify-Canvas), `login-webpage.html`
  - `frappe-theme/portal-integration/portal_ci.css` (On-Brand-CSS für Helpdesk/Wiki etc.)
  - `frappe-theme/custom_overrides.scss`, `custom_scss.scss`, `website_theme.json` (Website Theme)
  - `frappe-theme/desk_theme.css` (Desk-Branding)
  Wenn diese Dateien nicht vorliegen, sind alle Tokens unten im Abschnitt **Design-System** dupliziert.

---

## 2. Wichtige Entscheidungen vorab (mit dem Nutzer klären, sonst Default nehmen)
1. **Portal-Ersatz-Mechanik** (Default: B):
   - A) `/me` (My Account) per Template-Override ersetzen.
   - B) **Neue Route `/portal`** als Dashboard + Kunden-Home auf `/portal` umlenken (über
     `role_home_page` / `get_website_user_home_page`). → sauberste Variante, empfohlen.
2. **Layout-Chrome** (Default: eigenständig): Eigene Kopf-/Fußzeile im Website-Stil statt Frappes
   `templates/web.html`-Chrome (für volle CI-Kontrolle). Frappe-Session/Cookies bleiben trotzdem aktiv.
3. **Hell/Dunkel** (Default: dunkel als Standard + Toggle wie auf der Website, `localStorage`).
4. **Datenquellen feature-complete** (Default: vorhandene Apps erkennen und nur dann anzeigen):
   Helpdesk (`HD Ticket`), ERPNext (`Sales Invoice`, `Quotation`, `Sales Order`), Wiki, Drive, Raven.
5. **Sprache:** DE + EN (Frappe `_()`/Translations) – Default DE.

---

## 3. Architektur: Wie man die Portalseite in Frappe ersetzt
- Eigene App per `bench new-app astoria_portal`, dann `bench --site SITE install-app astoria_portal`.
- **Route/Seite:** `astoria_portal/www/portal/index.html` (+ `index.py` Controller) → erreichbar unter `/portal`.
- **Kunden-Home umlenken** in `hooks.py`:
  ```python
  # statische Zuordnung je Rolle
  role_home_page = {
      "Customer": "portal",
      "Helpdesk Customer": "portal",
  }
  # ODER dynamisch (Vorrang vor role_home_page):
  get_website_user_home_page = "astoria_portal.api.get_home_page"
  ```
  `get_home_page(user)` gibt `"portal"` für Portal-Nutzer zurück (Systemnutzer ggf. `"app"`).
- **Globales CSS/JS** (auch für eingebundene Portal-Listen von Frappe/ERPNext) via
  `app_include_css` / `web_include_css` / `web_include_js` (Desk vs. Website beachten:
  `web_include_*` betrifft die Website/Portal-Schicht).
- **Portal-Menü** optional via `standard_portal_menu_items` ergänzen/ersetzen.
- **Login-Seite** im selben Stil: `login.scss` ins Website Theme bzw. via `web_include_css`
  (siehe vorhandene `frappe-theme/login/`).

---

## 4. App-Struktur (Ziel-Dateibaum)
```
astoria_portal/
├─ pyproject.toml
├─ README.md
└─ astoria_portal/
   ├─ __init__.py            # __version__
   ├─ hooks.py               # app_name, web_include_css/js, role_home_page, website_route_rules, context
   ├─ modules.txt            # "Astoria Portal"
   ├─ api.py                 # get_home_page(), get_portal_context(), Helper für Counts/Listen
   ├─ utils.py               # app-presence checks (is_installed), safe counts
   ├─ config/__init__.py
   ├─ public/
   │  ├─ css/portal.css      # komplettes CI (Tokens + glass + glow-btn + trianglify-layer)
   │  ├─ js/portal.js        # Trianglify-Canvas, Theme-Toggle, User-Menü, kleine Interaktionen
   │  └─ images/             # Logos (logo-light.svg, logo-dark.svg, favicon …) aus dem Website-Repo
   ├─ templates/
   │  └─ includes/
   │     ├─ portal_head.html     # <head>-Snippet: Inter (bunny.net), CSS, Theme-Init (no-flash)
   │     ├─ portal_header.html   # Fixed Header: Logo, Nav, Theme-Toggle, Sprache, User-Menü, Logout
   │     ├─ portal_footer.html   # Footer im Website-Stil
   │     ├─ stat_card.html       # wiederverwendbare Kennzahl-Karte
   │     └─ module_card.html     # Modul-Kachel (Icon, Titel, Beschreibung, Link, Badge)
   └─ www/
      ├─ portal/
      │  ├─ index.html       # Dashboard (Hero-Greeting, Stat-Cards, Modul-Grid, Recent-Aktivität)
      │  └─ index.py         # get_context: User, Counts, Listen, verfügbare Module
      ├─ portal/tickets.html + .py   # (optional) eigene Ticket-Liste/-Detail oder Link zu /helpdesk
      ├─ portal/rechnungen.html + .py# (optional) Rechnungs-/Bestell-Liste (ERPNext)
      └─ portal/profil.html + .py    # Profil/Account: Stammdaten, Passwort, Adressen
```

---

## 5. Design-System (verbindlich – aus der Website extrahiert)

### Schrift
- **Inter**, Gewichte 300–800, von `https://fonts.bunny.net/css?family=inter:300,400,500,600,700,800`.
- Body: `-webkit-font-smoothing: antialiased`.

### Farb-Tokens (CSS-Variablen auf `:root`)
```css
/* Hell */
--surface-primary:#ffffff; --surface-secondary:#f8fafc; --surface-tertiary:#f1f5f9;
--text-primary:#4f4f4f; --text-secondary:#6b7280; --text-tertiary:#9ca3af;
--border:#e2e8f0; --border-light:#f1f5f9;
/* Akzent */
--accent:#00e5ff; --accent-light:#3fe0d0; --accent-mid:#1ed6d6; --accent-dark:#2e9aa0;
--accent-glow:rgba(0,229,255,.4); --accent-glow-light:rgba(0,229,255,.15);
/* Dunkel */
--dark-bg:#030712; --dark-surface:#0a0e1a; --dark-surface-2:#111827; --dark-surface-3:#1e293b;
--dark-text-primary:#f1f5f9; --dark-text-secondary:#94a3b8; --dark-text-tertiary:#64748b;
--dark-border:rgba(255,255,255,.08); --dark-border-light:rgba(255,255,255,.04);
```
Dark-Mode via Klasse `.dark` auf `<html>` (Standard: dunkel). Theme-Init-Script gegen Flash im `<head>`.

### Wiederverwendbare Utilities (in portal.css nachbauen)
- `.glass` (hell): `background:rgba(255,255,255,.75); backdrop-filter:blur(24px) saturate(1.2);
  border:1px solid rgba(226,232,240,.5); box-shadow:0 4px 16px rgba(0,0,0,.04), inset 0 1px 0 rgba(255,255,255,.5);`
  `.dark .glass`: `background:rgba(255,255,255,.04); border:1px solid rgba(255,255,255,.1);
  box-shadow:0 4px 16px rgba(0,0,0,.2), inset 0 1px 0 rgba(255,255,255,.03);`
- `.glass-hover:hover`: `transform:translateY(-2px); border-color:rgba(0,229,255,.25);
  box-shadow:0 12px 40px rgba(0,0,0,.1),0 0 20px rgba(0,229,255,.08);` (dark: stärkerer Cyan-Glow)
- `.glow-btn`: `background:linear-gradient(135deg,var(--accent),var(--accent-light)); color:#052b30;
  font-weight:600;` Hover: `transform:translateY(-1px); box-shadow:0 4px 20px var(--accent-glow);`
  (Wichtig: **dunkler Text `#052b30`** auf dem hellen Cyan-Button für WCAG-Kontrast.)
- `.gradient-text`: `background:linear-gradient(135deg,#00e5ff,#3fe0d0,#1ed6d6,#2e9aa0);
  -webkit-background-clip:text; background-clip:text; -webkit-text-fill-color:transparent;` (optional animiert)
- Buttons/Cards Radius: `0.5rem` (Buttons) / `0.75–1rem` (Cards). Links/Fokus im Akzent.
- Akzent für **Links/Fließtext** = `--accent-dark #2e9aa0` (besserer Kontrast als reines Cyan).

### Hintergrund (zwei Optionen, beide aus der Website)
1. **Trianglify-Canvas** (bevorzugt für Hero/Portal-Header): animiertes Low-Poly-Mesh.
   Vorlage: `frappe-theme/login/login-background.js` (abhängigkeitsfrei, Canvas, respektiert
   `prefers-reduced-motion`, dunkel-/hell-Palette). In `portal.js` portieren, Canvas hinter dem Content.
2. **Radial-Verlauf** `.hero-gradient` (leichter): siehe Tokens unten.
```css
.hero-gradient{background:
 radial-gradient(ellipse at 20% 50%, rgba(0,229,255,.12) 0%, transparent 50%),
 radial-gradient(ellipse at 80% 20%, rgba(63,224,208,.08) 0%, transparent 50%),
 radial-gradient(ellipse at 50% 100%, rgba(30,214,214,.06) 0%, transparent 50%);}
.dark .hero-gradient{ /* gleiche Stops, höhere Opazität (.2/.15/.1) */ }
```

### Header (wie Website)
- Fixiert oben, transparent → beim Scrollen Glas (`backdrop-blur` + Border).
  **Achtung:** Ein Element mit `backdrop-filter` wird zum Containing-Block für `position:fixed`-Kinder.
  Mobile-Overlays/Menüs daher **per Portal in `document.body`** rendern (Lehre aus der Website).
- Inhalt: Logo links; zentrale Nav (Dashboard, Support, Wiki, Rechnungen, Profil); rechts
  Theme-Toggle, Sprach-Umschalter, User-Menü (Avatar/Initialen, „Hallo {Vorname}", Abmelden).

---

## 6. Feature-Umfang (featurecomplete)
Jedes Modul nur anzeigen, wenn die zugehörige App/Quelle vorhanden ist (Erkennung in `utils.py`).

1. **Dashboard `/portal`**
   - Hero-Greeting „Willkommen zurück, {{ full_name }}" + Trianglify-Hintergrund.
   - **Stat-Cards:** offene Tickets, ungelesene Antworten, offene Rechnungen/Beträge, nächste Termine.
   - **Modul-Grid (Glas-Kacheln):** Support/Tickets → `/helpdesk`, Wissen → `/wiki`, Dateien → Drive,
     Rechnungen/Bestellungen → ERPNext-Portal, Profil → `/portal/profil`, ggf. Chat → Raven.
   - **Recent-Liste:** letzte Tickets / letzte Rechnungen.
2. **Support / Tickets**
   - Default: prominenter Link/Embed zu **Frappe Helpdesk** (`/helpdesk`).
   - Optional eigene Liste über `HD Ticket` (Felder: `subject`, `status`, `priority`, `modified`,
     gefiltert auf `raised_by`/Kontakt des Users) + „Neues Ticket" (Helpdesk-Form oder Web Form).
3. **Rechnungen & Bestellungen (falls ERPNext)**
   - Listen über die Standard-Portal-Doctypes (`Sales Invoice`, `Quotation`, `Sales Order`) –
     entweder Frappe-Portal-Routen verlinken oder eigene gestylte Listen (Felder: `name`,
     `status`, `grand_total`, `currency`, `due_date`, PDF-Download).
4. **Profil / Konto**
   - Stammdaten (`User`: `full_name`, `email`, `phone`, `user_image`), Passwort ändern
     (`frappe.core.doctype.user.user`-Flows bzw. `/update-password`), Adressen (`Address`).
5. **Allgemein**
   - Logout (`/api/method/logout`), Sprachumschaltung, Hell/Dunkel, Benachrichtigungs-Badge,
     responsives Layout (Mobile-Menü via body-Portal), Leerzustände/Fehlerzustände gestylt.

---

## 7. hooks.py – Eckpunkte
```python
app_name = "astoria_portal"
app_title = "Astoria Portal"

# Website/Portal-Schicht global stylen (auch eingebundene Frappe-Portal-Listen)
web_include_css = ["/assets/astoria_portal/css/portal.css"]
web_include_js  = ["/assets/astoria_portal/js/portal.js"]

# Kunden-Home auf das neue Portal lenken
get_website_user_home_page = "astoria_portal.api.get_home_page"   # bevorzugt
# role_home_page = {"Customer": "portal"}                         # Alternative

# Optional: zusätzliche Routen / Menü
# website_route_rules = [{"from_route": "/portal/<path:app_path>", "to_route": "portal"}]
# standard_portal_menu_items = [ ... ]

# Optional: Kontext für alle Web-Seiten erweitern
update_website_context = "astoria_portal.api.update_website_context"
```
`api.get_home_page(user)`: liefert `"portal"` für Portal-/Customer-Rollen, sonst Standard.

---

## 8. Implementierungs-Phasen (Reihenfolge für die neue Session)
1. **Scaffold:** `bench new-app astoria_portal`, Grundgerüst, `install-app`, `bench build` testbar.
2. **Design-System:** `public/css/portal.css` (Tokens, glass, glow-btn, gradient-text, hero-gradient,
   responsive) + `public/js/portal.js` (Trianglify-Port, Theme-Toggle no-flash, User-Menü).
3. **Layout-Includes:** `portal_head/header/footer/stat_card/module_card`.
4. **Dashboard `/portal`** (index.html + index.py) mit echten Counts (guarded) + Modul-Grid.
5. **Home-Redirect-Hook** + Login-Styling verifizieren (gemeinsam mit `frappe-theme/login`).
6. **Module:** Tickets, Rechnungen, Profil (jeweils html + py), Leer-/Fehlerzustände.
7. **Feinschliff:** Responsiv (Mobile-Menü via body-Portal), A11y (Fokus, Kontrast, reduced-motion),
   i18n (DE/EN), Performance (Canvas pausiert bei Inaktivität).
8. **Doku:** README mit Install, Konfiguration (Home-Page-Redirect), Theme-Build, Caveats.

---

## 9. Validierung / Tests (ohne und mit Live-Frappe)
- Statisch: HTML/Jinja rendert (kein Template-Fehler), CSS/JS lint/Syntax ok, `bench build` grün.
- Live: `bench --site SITE` mit Test-Kunde einloggen → Redirect auf `/portal`, alle Karten/Listen
  laden, Counts stimmen, Links zu Helpdesk/Wiki/ERPNext funktionieren (Session first-party),
  Hell/Dunkel + Mobile getestet, kein Layout-Overflow, Logout funktioniert.
- Sicherheit: Nur eigene Daten sichtbar (Permission-Filter auf User/Kontakt), keine fremden Tickets/Rechnungen.

---

## 10. Caveats / Lessons aus der Website
- **backdrop-filter + position:fixed:** Overlays in `document.body` portalen (Menü sonst „eingesperrt").
- **Cyan-Buttons:** dunkler Text (`#052b30`), nicht Weiß (Kontrast).
- **Lange deutsche Wörter:** `overflow-wrap/break-words` + ggf. `hyphens:auto` (Hero-Überschriften).
- **Trianglify:** `prefers-reduced-motion` respektieren, Canvas hinter Content (`z-index`, `pointer-events:none`).
- **Frappe-Doctype-Feldnamen** vor Gebrauch verifizieren (Helpdesk `HD Ticket`, ERPNext-Portalfelder).

---

## 11. Offene Punkte für den Nutzer (am Anfang der neuen Session fragen)
1. Welche Apps sind installiert? (Helpdesk? ERPNext? Wiki? Drive? Raven?)
2. Portal-Ersatz via `/portal`-Redirect (empfohlen) oder `/me`-Override?
3. Welche Module/Kacheln gewünscht (Tickets, Rechnungen, Profil, Wiki, Dateien, Chat …)?
4. Sollen eigene Listen (gestylt) gebaut werden oder reicht Verlinkung auf bestehende Frappe-Portale?
5. Soll der Logout zentral auch die Website-Session beenden? Sprache Default DE?

---

## 12. Hand-off
Diese Datei als **Initial-Prompt** in die neue Session geben (idealerweise im Frappe-App/Bench-Repo).
Wenn Zugriff auf das Astro-Repo besteht, zusätzlich `frappe-theme/` referenzieren (Login-/Portal-CSS,
Trianglify, Website Theme) zum 1:1-Wiederverwenden. Logos/Favicon aus `public/` der Website übernehmen.
