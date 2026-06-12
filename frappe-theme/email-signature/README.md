# E-Mail-Signaturen – Astoria Systems

E-Mail-sichere HTML-Signaturen im Corporate-Identity-Stil
(Cyan-Akzent `#00e5ff`, dunkler Text, Logo, Inter mit Fallback).

| Datei                   | Einsatz                                                       |
| ----------------------- | ------------------------------------------------------------- |
| `signature-team.html`   | Allgemein / System-Mails (Login, Willkommen, noreply) – „Dein Team von Astoria Systems" |
| `signature-person.html` | Persönliche Mitarbeiter-Signatur (Platzhalter `[...]` ersetzen) |

## Wichtig zu E-Mail-HTML
- **Tabellen + Inline-Styles** sind Absicht – Mail-Clients (v. a. Outlook)
  unterstützen kein externes CSS, kein Flexbox/Grid und keine
  Text-Verläufe (`background-clip`). Deshalb solider Cyan-Balken statt
  Gradient.
- Das **Logo ist absolut verlinkt** (`https://www.astoria.systems/logo-horizontal.png`).
  Relative Pfade funktionieren in Mails nicht. Liegt das Logo woanders, URL
  anpassen.

## In Frappe einbinden

### A) Pro Postfach (normale ausgehende Mails)
**Email Account** öffnen (das jeweilige Konto, z. B. `service@…`) →
Feld **Signature**. Dort den HTML-Quelltext einfügen. In Frappe ist das
Signaturfeld ein Rich-Text-Editor: über das **`< >` (Code/HTML)**-Symbol in
den HTML-Modus wechseln und den Inhalt von `signature-team.html` einsetzen.

### B) Globaler Fuß für ALLE ausgehenden Mails (inkl. System-/Login-Mails)
**System Settings** → Abschnitt *Email* → Feld **Email Footer Address**
(kurzer Footer) bzw. der globale Footer, der an jede Mail angehängt wird.
Für einen vollständigen HTML-Footer eignet sich der Eintrag in den
System Settings; alternativ als **Email Template** (siehe C).

### C) System-/Login-Mails brandgerecht (empfohlen für „Dein Team von …")
Login-, Passwort-Reset- und Willkommens-Mails nutzen **Email Templates**:
1. Im Desk nach **Email Template** suchen → das passende Template öffnen
   (z. B. *New User* / Passwort-Reset) oder neu anlegen.
2. In den **HTML-Modus** wechseln und die Signatur aus `signature-team.html`
   ans Ende des Template-Bodys setzen.
3. Im jeweiligen Prozess (z. B. **Notification** / Welcome Email) dieses
   Template auswählen.

> Tipp: Den oberen „Mit freundlichen Grüßen / Dein Team von Astoria Systems"-
> Block kannst du im Template weglassen, wenn der Mailtext schon eine Anrede/
> Grußformel enthält – dann nur den Logo-/Kontaktblock als Footer nutzen.

## Anpassen
- Andere Absenderadresse: `service@astoria.systems` ersetzen.
- Logo-Höhe: `height="36"` und `height:36px` gemeinsam ändern.
- Akzentfarbe: `#00e5ff` (Balken) / `#2e9aa0` (Links) – Links bewusst dunkler
  für Lesbarkeit auf Weiß.
