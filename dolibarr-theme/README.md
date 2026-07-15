# Dolibarr Theme (v23, eldy) – Astoria Systems

Dieses Verzeichnis überträgt die Corporate Identity der Website
[astoria.systems](https://www.astoria.systems) auf **Dolibarr 23**
(Standard-Theme **eldy**) – analog zu [`frappe-theme/`](../frappe-theme/)
für Frappe/ERPNext.

Alle Werte stammen aus dem Website-Quellcode (`src/styles/global.css`).

**Designprinzip** (Vorbild für Augenkomfort: Lexoffice):

- Heller, leicht eisblauer Seitenhintergrund (`#f2f7f9`, wie der
  Website-Hintergrund), darauf **weiße Karten** mit weichem Schatten.
- **Kein Zebra-Muster** – Zeilen werden durch feine Linien und Hover
  getrennt, nicht durch Flächenwechsel.
- Tabellenüberschriften klein, grau, Versalien statt fetter dunkler Header.
- Das helle Cyan `#00e5ff` ist auf hellen Flächen kaum lesbar – es wird
  nur für Glow-Effekte und Akzentlinien verwendet. Für Links,
  Überschriften und Buttons kommt das dunklere `#2e9aa0` zum Einsatz
  (gleiche Entscheidung wie im Frappe-Theme).

---

## 1. Corporate Identity (Referenz)

| Element              | Wert                                              |
| -------------------- | ------------------------------------------------- |
| **Schrift**          | Inter (von fonts.bunny.net)                       |
| **Primär / Akzent**  | `#00e5ff` (Cyan – nur Glow/Linien)                |
| Akzent mittel        | `#1ed6d6`                                         |
| Akzent dunkel        | `#2e9aa0` (Links, Buttons – besserer Kontrast)    |
| **Textfarbe**        | `#4f4f4f` (dunkel `#1e293b`)                      |
| **Hintergrund**      | `#ffffff` / `#f8fafc` / `#f1f5f9`                 |
| Rahmen               | `#e2e8f0`                                         |
| **Dunkel (Navy)**    | `#0a0e1a` (Website-Dark-Surface)                  |
| Radius               | 6–8 px                                            |

---

## 2. Tab „Oberfläche und Farben“

Pfad: **Start → Einstellungen → Benutzeroberfläche → Oberfläche und Farben**

> Dolibarr erwartet Hex-Werte **ohne** `#`.
> Diese Seite setzt die *globalen* Vorgaben; einzelne Benutzer können sie
> in ihren persönlichen Einstellungen überschreiben.

### Schalter / Auswahl

| Einstellung                             | Wert                                                        |
| --------------------------------------- | ----------------------------------------------------------- |
| Standardvorlage grafische Oberfläche    | **eldy** (beibehalten)                                       |
| Dark Theme-Modus                        | **Immer deaktiviert** – eigene Farbwerte bekommen keine Dark-Variante, gemischtes Ergebnis |
| Icon oder Text im oberen Menü           | **Icon und Text**                                            |
| Firmenlogos im Menü anzeigen            | **An** (sofern Logo unter Unternehmen/Institution hinterlegt) |
| Bilder im Hauptmenü in Farbe anzeigen   | **Aus** – monochrome Icons wirken auf dem dunklen Navy ruhiger |
| Linken und rechten Tabellenrand anzeigen | **An**, **Eckradius 6**                                     |
| Eingabefelder mit Rahmen anzeigen       | **An**                                                       |

### Farbfelder

| Feld                                                    | Wert     | Ergebnis                              |
| ------------------------------------------------------- | -------- | ------------------------------------- |
| Hintergrundfarbe für Hauptmenü                           | `0a0e1a` | dunkles Navy wie Website-Header       |
| Hintergrundfarbe für Menü Links                          | `f8fafc` | ruhige helle Sidebar                  |
| Hintergrundfarbe                                         | `f2f7f9` | eisblauer Grund, weiße Karten heben sich ab |
| Textfarbe der Seitenüberschrift                          | `2e9aa0` | Markenakzent, lesbar                  |
| Hintergrundfarbe für Titelzeilen in Tabellen             | `ffffff` | Titelzeile Teil der weißen Karte      |
| Textfarbe der Tabellenüberschrift                        | `6b7280` | grau, ruhig (Versalien via CSS)       |
| Textfarbe für die Tabellentitel-Linkzeile                | `2e9aa0` | Markenakzent                          |
| Hintergrundfarbe für ungerade Tabellenzeilen             | `ffffff` | kein Zebra – Trennung über feine …    |
| Hintergrundfarbe für gerade Tabellenzeilen               | `ffffff` | … Linien und Hover (via CSS)          |
| Farbe für Hyperlinks                                     | `2e9aa0` | Markenakzent                          |
| Farbe zum Hervorheben der Zeile (Maus darüber)           | `e6f7f9` | sehr helles Cyan                      |
| Farbe zum Hervorheben der Zeile (ausgewählt)             | `d7f1f5` | etwas kräftiger als Hover             |
| Hintergrundfarbe der Aktionsschaltfläche                 | `2e9aa0` | flacher Vollton wie Lexoffice         |
| Textfarbe der Aktionsschaltfläche                        | `ffffff` | weiß                                  |

→ **SPEICHERN**.

---

## 3. Tab „CSS-Style“

Inhalt von [`custom_css.css`](./custom_css.css) in den Editor einfügen
und speichern. Das ergänzt den Lexoffice-Look:

- **Inter** als Schrift überall (wie Website),
- eisblauer Seitenhintergrund, Tabellen/Karten als **weiße Karten**
  mit 8 px Radius und weichem Schatten,
- Zeilentrennung über **feine Linien** + mehr Padding statt Zebra,
- Tabellenüberschriften klein/grau/**Versalien**,
- Aktionsbuttons **flach** in `#2e9aa0`, Versalien, dezenter Hover-Glow,
- Cyan-**Akzentlinie** unter dem Hauptmenü (wie die Section-Divider der Website),
- **Fokus-Ring** in Markenfarbe für Eingabefelder, Textmarkierung in Cyan.

---

## 4. Tab „Anmeldeseite“

- **Hintergrundbild (png,jpg):** [`login-background.png`](./login-background.png)
  hochladen – dunkles Navy mit den Cyan-Glows der Website-Hero-Sektion
  (1920×1080, generiert aus den CI-Farbwerten).
- **Nachricht auf der Anmeldeseite:** optional, z. B. kurzer Willkommenstext.
  Sparsam einsetzen – die Seite wirkt aufgeräumter ohne.

## 5. Tab „Startseite“

- **Nachricht des Tages:** leer lassen oder nur für echte Ankündigungen
  nutzen (jedes Dauer-Banner kostet Aufmerksamkeit).
- Nicht benötigte Dashboard-Kacheln deaktivieren – weniger Kacheln =
  ruhigeres, professionelleres Dashboard.

---

## 6. Firmenlogo

Damit das Logo im Menü und auf PDFs erscheint:
**Start → Einstellungen → Unternehmen/Institution → Logo** hochladen
(idealerweise die helle Logovariante für das dunkle Hauptmenü).
