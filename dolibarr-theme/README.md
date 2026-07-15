# Dolibarr Komplett-Theme „astoria“ (v23)

Ein vollständiger Reskin für **Dolibarr 23.0.x** im Stil der Website
[astoria.systems](https://www.astoria.systems) – analog zu
[`frappe-theme/`](../frappe-theme/) für Frappe/ERPNext.

Vorbild für den Augenkomfort ist Lexoffice:

- heller, leicht eisblauer Seitenhintergrund (`#f2f7f9`), darauf
  **weiße Karten** mit weichem Schatten,
- **kein Zebra-Muster** – Zeilen trennen sich durch feine Linien,
  Hover und mehr Padding,
- Tabellenüberschriften klein, grau, Versalien,
- **flache Buttons** in Vollton-Teal mit Versalien,
- dunkles Navy-Hauptmenü mit feiner Cyan-Akzentlinie,
- Login-Seite im Look der Website-Hero-Sektion (Navy + Cyan-Glows).

Das helle CI-Cyan `#00e5ff` wird nur für Glows und Linien verwendet;
Links, Überschriften und Buttons nutzen das kontrastsichere `#2e9aa0`.

---

## Installation – Variante A: CSS-Style-Tab (ohne Serverzugriff)

1. **Einstellungen → Benutzeroberfläche → Oberfläche und Farben**:
   Theme **eldy** wählen und die Werte aus der Tabelle unten eintragen.
2. **Tab „CSS-Style“**: kompletten Inhalt von
   [`astoria-theme.css`](./astoria-theme.css) einfügen → **SPEICHERN**.
3. Browser hart neu laden (Strg+F5).

## Installation – Variante B: eigenes Theme „astoria“ (mit Dateizugriff)

Das Skript [`server-theme/install.sh`](./server-theme/install.sh) kopiert
das eldy-Theme nach `htdocs/theme/astoria` und hängt `astoria-theme.css`
an dessen `style.css.php` an. Dadurch erbt „astoria“ alle Icons und
Layout-Dateien von eldy und erscheint als **eigene Theme-Auswahl**.

### Cloudron

1. Im Cloudron-Dashboard → Dolibarr-App → **File Manager**:
   `astoria-theme.css` und `server-theme/install.sh` nach `/app/data`
   hochladen (beide in denselben Ordner).
2. App → **Terminal** öffnen und ausführen:

   ```sh
   sh /app/data/install.sh
   ```

   Das Skript findet htdocs automatisch (`/app/code/htdocs`).
3. Meldet das Skript, dass `htdocs/theme` **nicht beschreibbar** ist,
   ist der Paketstand zu alt (das Theme-Verzeichnis wird erst in
   neueren Cloudron-Paketen nach `/app/data` verlinkt) → Cloudron-App
   aktualisieren oder einfach Variante A nutzen.
4. Nach einem **App-Update** das Skript ggf. erneut ausführen.

### Andere Server

```sh
sh server-theme/install.sh /pfad/zu/dolibarr/htdocs
```

Danach (beide Fälle): **Einstellungen → Benutzeroberfläche → Standardvorlage
grafische Oberfläche → astoria** → SPEICHERN → Strg+F5.
Die Farbfelder unten gelten weiter (das kopierte Theme liest dieselben
`THEME_ELDY_*`-Konstanten).

---

## Farbfelder: Tab „Oberfläche und Farben“

Pfad: **Start → Einstellungen → Benutzeroberfläche → Oberfläche und Farben**

> Hex-Werte **ohne** `#` eintragen. Diese Seite setzt die globalen
> Vorgaben; Benutzer können sie persönlich überschreiben.

### Schalter / Auswahl

| Einstellung                              | Wert                                                        |
| ---------------------------------------- | ----------------------------------------------------------- |
| Standardvorlage grafische Oberfläche     | **eldy** (Variante A) bzw. **astoria** (Variante B)          |
| Dark Theme-Modus                         | **Immer deaktiviert** – eigene Farbwerte bekommen keine Dark-Variante |
| Icon oder Text im oberen Menü            | **Icon und Text**                                            |
| Firmenlogos im Menü anzeigen             | **An** (Logo unter Unternehmen/Institution hinterlegen)      |
| Bilder im Hauptmenü in Farbe anzeigen    | **Aus** – monochrome Icons wirken auf dem dunklen Navy ruhiger |
| Linken und rechten Tabellenrand anzeigen | **An**, **Eckradius 6**                                      |
| Eingabefelder mit Rahmen anzeigen        | **An**                                                       |

### Farbwerte

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
| Hintergrundfarbe der Aktionsschaltfläche                 | `2e9aa0` | flacher Vollton                       |
| Textfarbe der Aktionsschaltfläche                        | `ffffff` | weiß                                  |

---

## Was das Theme umstylt

[`astoria-theme.css`](./astoria-theme.css) deckt ab:

- Grundlagen: Inter-Schrift, eisblauer Hintergrund, Links, Scrollbalken
- Hauptmenü oben (Navy, Cyan-Akzentlinie, aktiver Punkt mit Cyan-Unterstreichung)
- linkes Menü (Blocktitel als Versalien, Hover-Zustände)
- Karten-Look für Fichen, Tabellen, Dashboard-Widgets (Radius + Schatten)
- Tabellen (Linien statt Zebra, Padding, graue Versalien-Header, Summenzeilen)
- Tabs auf Objektseiten (Unterstreichungs-Stil statt Reiter-Kästen)
- Buttons (flach, Versalien; Abbrechen als Ghost-Button; Löschen behält Warnfarbe)
- Formulare inkl. Select2 (Radius, Fokus-Ring in Markenfarbe)
- Badges, Dropdowns, Dialoge, Pagination, Fortschrittsbalken, Hinweisboxen
- Login-Seite (Navy mit Cyan-Glows, weiße Login-Karte, Gradient-Button)

Selektoren sind auf Dolibarr 23 / eldy abgestimmt; einzelne Stellen können
je Minor-Version abweichen → im DevTools-Inspector prüfen und anpassen.

---

## Sonstiges

- **Anmeldeseite:** Das Theme stylt den Login per CSS. Falls das
  CSS auf der Login-Seite eurer Installation nicht greift (Variante A),
  alternativ [`login-background.png`](./login-background.png) unter
  **Benutzeroberfläche → Anmeldeseite → Hintergrundbild** hochladen.
- **Startseite:** Nachricht des Tages leer lassen; ungenutzte
  Dashboard-Kacheln unter dem Tab „Startseite“ deaktivieren.
- **Logo:** helle Logovariante unter **Einstellungen →
  Unternehmen/Institution** hochladen (sitzt im dunklen Hauptmenü).
