# Frappe 16 Login-Seite im Website-Look

Stylt die Anmeldeseite (`/login`) im CI der Website (Glas-Card, Inter,
Cyan-Akzent, Glow-Button).

## Einbinden
Die Login-Seite läuft über die **Website-Schicht** und wird vom **Website
Theme** gestylt. Zwei Wege:

1. **Einfach:** Den Inhalt von `login.scss` an das Feld **Benutzerdefiniertes
   SCSS** des Website Themes **anhängen** (zusätzlich zu `custom_scss.scss`).
   Theme speichern → `bench build` → `bench clear-cache`.
2. **Sauber:** `login.scss` in eine App legen und via `app_include_css`
   einbinden (siehe `../desk_setup.md`, gleiche Methode).

## Animierter Triangle-Hintergrund (wie auf der Website)
`login-background.js` portiert den Trianglify-/Low-Poly-Mesh-Effekt der
Website (animiertes Dreiecks-Mesh im Markenverlauf, ohne externe Libs).

**Einbinden:**
1. Inhalt von `login-background.js` in das Feld **JavaScript** des Website
   Themes einfügen (läuft auf den Website-Seiten inkl. `/login`).
   Alternativ via `app_include_js`.
2. `login.scss` muss eingebunden sein – sobald der Canvas läuft, setzt das
   Skript die Klasse `has-trianglify` auf `<body>`, wodurch der statische
   Verlauf entfernt und das Mesh hinter der Glas-Login-Card sichtbar wird.

**Optionen (oben im Skript):**
- `RUN_EVERYWHERE = false` → nur Login-Seite. Auf `true` setzen, um das Mesh
  auf **allen** Website-Seiten zu zeigen.
- Reagiert auf Hell/Dunkel-Modus und `prefers-reduced-motion` (zeichnet dann
  statisch, ohne Animation).

> Performance-Hinweis: Der Effekt ist leichtgewichtig (Canvas, ein
> `requestAnimationFrame`), bremst aber Eingabe-lastige Portalseiten unnötig –
> daher standardmäßig nur auf der Login-Seite.

## Logo auf der Login-Seite
Das Logo zieht Frappe aus den **Navbar Settings** (App Logo / Brand) bzw.
**Website Settings**. Dort das Astoria-Logo setzen, dann erscheint es auch
über der Login-Karte.

## Hinweis zu Frappe 16
- Die Kern-Anmeldeseite `/login` nutzt weiterhin die Klassen `.login-content`
  und `.page-card` – die Selektoren passen.
- Einzelne App-Logins (z. B. **Helpdesk** hat eine eigene Vue-Login-Maske)
  weichen ab. Falls du den Helpdesk-Direktlogin stylen willst, dort die
  Branding-Settings der App nutzen + `../portal-integration/portal_ci.css`.
- Sollte eine Regel nicht greifen: im Browser-DevTools die echte Klasse der
  Login-Karte ablesen und in `login.scss` anpassen.

## Zusammenspiel mit dem OAuth-Login
Beim Klick auf „Login" auf der Website wird der Nutzer zu genau dieser
Frappe-Anmeldeseite geleitet (OAuth-Authorize). Sie im CI zu stylen sorgt
für einen nahtlosen Übergang von der Website ins Portal.
