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
