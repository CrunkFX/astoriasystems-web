# Frappe 16 Website Theme – Astoria Systems

Dieses Verzeichnis enthält ein **Website-Theme für Frappe 16**, das die
Corporate Identity der Website [astoria.systems](https://www.astoria.systems)
auf dein Frappe-/ERPNext-Portal überträgt.

Die Werte wurden direkt aus dem Quellcode der Website extrahiert
(`src/styles/global.css`, `src/components/seo/SEOHead.astro`,
`src/components/ui/Button.astro`).

---

## 1. Corporate Identity (Referenz)

| Element              | Wert                                                  |
| -------------------- | ----------------------------------------------------- |
| **Schrift**          | Inter (Gewichte 300–900), von fonts.bunny.net         |
| **Primär / Akzent**  | `#00e5ff` (Cyan)                                      |
| Akzent hell          | `#3fe0d0`                                             |
| Akzent mittel        | `#1ed6d6`                                             |
| Akzent dunkel        | `#2e9aa0` (für Links – besserer Kontrast)             |
| **Textfarbe**        | `#4f4f4f` (sekundär `#6b7280`)                        |
| **Hintergrund**      | `#ffffff` (sekundär `#f8fafc`, tertiär `#f1f5f9`)     |
| Rahmen               | `#e2e8f0`                                             |
| **Dunkel (Dark BG)** | `#030712` (Surface `#0a0e1a`)                         |
| Button-Radius        | `0.5rem` (rounded-lg / 8px)                           |
| Button-Stil          | Glow-Gradient 135° von Akzent → Akzent-hell           |
| Stil-Highlights      | Glassmorphism-Karten, Gradient-Text, Glow-Effekte     |

---

## 2. Theme anlegen – Schritt für Schritt

Gehe in Frappe zu **Website Theme** (App-Suche → „Website Theme" → *Neu*)
oder direkt über die abgebildete Theme-Maske und fülle die Felder so aus:

### Obere Felder

| UI-Feld (DE)                  | Wert eintragen                  |
| ----------------------------- | ------------------------------- |
| **Thema**                     | `Astoria Systems`               |
| **Google Font**               | `Inter`                         |
| **Schriftgröße**              | `16px`                          |
| **Schrifteigenschaften**      | `wght@300;400;500;600;700;800;900` |
| **Button Abgerundete Ecken**  | ☑ aktivieren                    |
| **Knopf Schatten**            | ☐ deaktiviert lassen (Glow kommt aus dem SCSS) |
| **Schaltflächenverläufe**     | ☑ aktivieren                    |

### Farbfelder (rechte Spalte)

| UI-Feld (DE)         | Wert        |
| -------------------- | ----------- |
| **Primärfarbe**      | `#00e5ff`   |
| **Textfarbe**        | `#4f4f4f`   |
| **Helle Farbe**      | `#f8fafc`   |
| **Dunkle Farbe**     | `#030712`   |
| **Hintergrundfarbe** | `#ffffff`   |

### Code-Felder

| UI-Feld (DE)                          | Inhalt                                      |
| ------------------------------------- | ------------------------------------------- |
| **Benutzerdefinierte Überschreibungen** | kompletter Inhalt aus `custom_overrides.scss` |
| **Benutzerdefiniertes SCSS**          | kompletter Inhalt aus `custom_scss.scss`    |
| **JavaScript**                        | leer lassen                                 |

> **Reihenfolge ist wichtig:** Das Feld *Benutzerdefinierte
> Überschreibungen* wird **vor** dem Bootstrap-SCSS eingebunden – nur dort
> wirken SCSS-Variablen wie `$primary`. Das Feld *Benutzerdefiniertes SCSS*
> wird **danach** eingebunden – dort stehen fertige CSS-Klassen und
> Utilities (Glas-Karten, Glow-Buttons, Gradient-Text).

### Thema aus Apps einschließen

Hier kannst du alle Häkchen so lassen, wie sie sind (ERPNext, Frappe CRM,
Frappe HR usw.). Diese Option bindet zusätzliche SCSS-Bundles der jeweiligen
Apps ein und hat keinen Einfluss auf die CI-Farben.

---

## 3. Theme aktivieren

1. Theme **speichern**.
2. Über den Button **„Set as Default Theme" / „Als Standard festlegen"**
   das Theme aktivieren – oder unter
   **Website Settings → Website Theme** auswählen.
3. Frappe baut die CSS-Bundles automatisch neu. Falls Änderungen nicht
   sofort sichtbar sind:
   ```bash
   bench build --app frappe
   bench clear-cache
   ```
   und im Browser einen Hard-Reload (Strg/Cmd + Shift + R) ausführen.

---

## 4. Alternative: Direkt importieren

Statt alles manuell einzutippen, kannst du die fertige Konfiguration
importieren:

- **Über die UI:** *Website Theme* öffnen → *Menü ⋮ → Import* und
  `website_theme.json` hochladen.
- **Über die bench-Konsole:**
  ```bash
  bench --site DEINE-SITE console
  ```
  ```python
  import json, frappe
  data = json.load(open("frappe-theme/website_theme.json"))
  doc = frappe.get_doc(data)
  doc.insert(ignore_if_duplicate=True)
  frappe.db.commit()
  ```

> In `website_theme.json` stecken dieselben Werte wie in den `.scss`-Dateien
> (nur als JSON-String). Die `.scss`-Dateien bleiben die lesbare, gepflegte
> Quelle – bei Änderungen dort bitte das JSON entsprechend aktualisieren.

---

## 5. Hinweise zur Lesbarkeit / Barrierefreiheit

- `#00e5ff` ist als Button-**Hintergrund** sehr hell. Deshalb nutzen die
  Glow-Buttons im SCSS dunklen Text (`#052b30`) statt Weiß – das sorgt für
  ausreichenden Kontrast (WCAG AA).
- **Links** verwenden bewusst das dunklere Akzent `#2e9aa0`, weil reines
  `#00e5ff` auf Weiß zu kontrastarm für Fließtext wäre.
- Möchtest du Buttons doch mit weißem Text, ersetze im SCSS `#052b30` durch
  `#ffffff` und nimm als Verlauf `$ci-accent-dark` → `$ci-accent`.

---

---

## 6. Desk im CI (Backend `/app`, Konfigurations-Oberfläche)

**Wichtig:** Das Desk (das interne Backend unter `/app`) nutzt das Website
Theme **nicht**. Es muss separat über globales CSS gebrandet werden. Es gibt
zwei Wege:

### Weg A – Ohne Server-Zugriff (Client Script)
1. Im Desk nach **Client Script** suchen → *Neu*.
2. **Enabled** = an, **Script Type** = `App`.
3. Kompletten Inhalt aus `desk_client_script.js` einfügen.
4. Speichern, Desk hart neu laden (Strg/Cmd + Shift + R).

### Weg B – Sauber für Produktion (eigene App)
CSS aus `desk_theme.css` in eine App legen und in deren `hooks.py`:
```python
app_include_css = ["/assets/<deine_app>/css/desk_theme.css"]
```
Danach `bench build && bench clear-cache`. Kein Client Script nötig.

> Das Desk-CSS gleicht **Farben, Inter-Schrift, Akzent-Buttons, Navbar und
> Fokus-Stil** an die Website an, hält die Oberfläche aber bewusst nutzbar
> (kein animierter Hintergrund / Glas-Effekt über Formularen). Einzelne
> CSS-Variablennamen können je Frappe-Version abweichen – im DevTools-
> Inspector (`:root` → Computed → nach `--primary` / `--bg` filtern) prüfen
> und bei Bedarf anpassen.

---

## Dateien in diesem Verzeichnis

| Datei                    | Zweck                                                          |
| ------------------------ | -------------------------------------------------------------- |
| `README.md`              | Diese Anleitung                                                |
| `custom_overrides.scss`  | Website-Theme: Feld **Benutzerdefinierte Überschreibungen**    |
| `custom_scss.scss`       | Website-Theme: Feld **Benutzerdefiniertes SCSS**               |
| `website_theme.json`     | Komplettes Website-Theme zum direkten Import                   |
| `desk_theme.css`         | **Desk-Branding** (für eigene App via `app_include_css`)       |
| `desk_client_script.js`  | **Desk-Branding** ohne Server-Zugriff (Client Script, Typ App) |
