# Desk-Branding einbinden (Frappe 16)

Globales Desk-CSS lässt sich in Frappe 16 **nicht** über einen *Client Script*
einbinden – dort gibt es nur die Typen *Form* und *List*, beide verlangen einen
DocType und laufen nur auf der jeweiligen Seite. Für app-weites CSS im Desk
brauchst du den `app_include_css`-Hook einer (Custom-)App.

## Variante A – Vorhandene Custom-App nutzen
Hast du bereits eine eigene App auf der Site? Dann nur das CSS dort ablegen und
den Hook ergänzen:

1. `desk_theme.css` nach
   `apps/<deine_app>/<deine_app>/public/css/desk_theme.css` kopieren.
2. In `apps/<deine_app>/<deine_app>/hooks.py` ergänzen:
   ```python
   app_include_css = ["/assets/<deine_app>/css/desk_theme.css"]
   ```
3. Bauen & Cache leeren:
   ```bash
   bench build --app <deine_app>
   bench --site DEINE-SITE clear-cache
   ```
4. Desk hart neu laden (Strg/Cmd + Shift + R).

## Variante B – Minimale Theme-App neu anlegen
Wenn du noch keine eigene App hast (~5 Minuten):

```bash
# 1. Neue App erzeugen (Fragen mit Enter/eigenen Angaben beantworten)
bench new-app astoria_theme

# 2. CSS ablegen
mkdir -p apps/astoria_theme/astoria_theme/public/css
cp desk_theme.css apps/astoria_theme/astoria_theme/public/css/desk_theme.css

# 3. Hook setzen: in apps/astoria_theme/astoria_theme/hooks.py einfügen:
#    app_include_css = ["/assets/astoria_theme/css/desk_theme.css"]

# 4. App auf der Site installieren
bench --site DEINE-SITE install-app astoria_theme

# 5. Bauen & Cache leeren
bench build --app astoria_theme
bench --site DEINE-SITE clear-cache
```

Danach im Browser hart neu laden.

## Header-Logo & App-Name (reine UI, ohne Code)
Den Marken-Auftritt im Header (Logo, App-Name) kannst du zusätzlich ganz ohne
CSS setzen:

- **Navbar Settings** (im Desk suchen): „App Logo", „App Name", Brand-Image und
  die Einträge im Navbar-Dropdown anpassen.
- **Website Settings → Brand HTML / Banner Image** wirkt zusätzlich im Portal.

## Anpassen, falls Farben nicht greifen
Frappe färbt das Desk über CSS-Variablen auf `:root` und über die o. g.
Klassen. Greift etwas nicht, im Browser-DevTools das Element inspizieren, in
`:root` unter *Computed* nach `--primary` / `--bg` filtern bzw. die echte
Klasse der Sidebar/Navbar ablesen und in `desk_theme.css` ergänzen.
