#!/bin/sh
# ============================================================
# Installiert das Komplett-Theme "astoria" in Dolibarr (v23).
#
# Vorgehen: kopiert das eldy-Theme nach theme/astoria und hängt
# astoria-theme.css an dessen style.css.php an. Dadurch erbt das
# Theme alle Icons/Layout-Dateien von eldy und erscheint als
# eigene Auswahl "astoria" unter:
#   Einstellungen → Benutzeroberfläche → Standardvorlage
#
# Aufruf:
#   sh install.sh [/pfad/zu/dolibarr/htdocs]
#
# Cloudron: im Dashboard der Dolibarr-App das Terminal öffnen,
# astoria-theme.css und install.sh vorher per File Manager nach
# /app/data hochladen, dann:
#   sh /app/data/install.sh
# (htdocs wird automatisch unter /app/code/htdocs gefunden.)
# ============================================================
set -e

SRC_DIR="$(cd "$(dirname "$0")" && pwd)"

# CSS neben dem Skript oder eine Ebene höher suchen
CSS_FILE=""
for c in "$SRC_DIR/astoria-theme.css" "$SRC_DIR/../astoria-theme.css"; do
  [ -f "$c" ] && CSS_FILE="$c" && break
done
[ -n "$CSS_FILE" ] || { echo "FEHLER: astoria-theme.css nicht gefunden (erwartet neben install.sh)."; exit 1; }

# htdocs finden (Argument oder bekannte Pfade, Cloudron zuerst)
DOLI_HTDOCS="$1"
if [ -z "$DOLI_HTDOCS" ]; then
  for d in /app/code/htdocs /var/www/dolibarr/htdocs /var/www/html/htdocs /usr/share/dolibarr/htdocs; do
    [ -d "$d/theme/eldy" ] && DOLI_HTDOCS="$d" && break
  done
fi
[ -n "$DOLI_HTDOCS" ] && [ -d "$DOLI_HTDOCS/theme/eldy" ] || {
  echo "FEHLER: Dolibarr htdocs nicht gefunden. Aufruf: sh install.sh /pfad/zu/htdocs"; exit 1; }

THEME_DIR="$DOLI_HTDOCS/theme"

# Schreibbarkeit prüfen (Cloudron: htdocs/theme muss auf /app/data zeigen)
if [ ! -w "$THEME_DIR" ]; then
  echo "FEHLER: $THEME_DIR ist nicht beschreibbar."
  if [ -d /app/code ]; then
    echo "Cloudron: In diesem Paketstand ist htdocs/theme noch nicht nach"
    echo "/app/data verlinkt (pruefen mit: ls -ld $THEME_DIR)."
    echo "Optionen: Cloudron-App aktualisieren – oder Variante A nutzen"
    echo "(astoria-theme.css in den Tab 'CSS-Style' einfuegen, siehe README)."
  fi
  exit 1
fi

rm -rf "$THEME_DIR/astoria"
cp -r "$THEME_DIR/eldy" "$THEME_DIR/astoria"

STYLE="$THEME_DIR/astoria/style.css.php"

# style.css.php kann am Dateiende noch im PHP-Modus sein
# (z. B. abschließendes $db->close()). Dann muss vor dem
# CSS-Anhang ein schließendes "?>" eingefügt werden.
LAST_OPEN=$(grep -abo '<?php' "$STYLE" | tail -1 | cut -d: -f1)
LAST_CLOSE=$(grep -abo '?>' "$STYLE" | tail -1 | cut -d: -f1)
[ -z "$LAST_OPEN" ] && LAST_OPEN=-1
[ -z "$LAST_CLOSE" ] && LAST_CLOSE=-1
if [ "$LAST_OPEN" -gt "$LAST_CLOSE" ]; then
  printf '\n?>\n' >> "$STYLE"
fi

printf '\n/* === ASTORIA SYSTEMS THEME OVERRIDES === */\n' >> "$STYLE"
cat "$CSS_FILE" >> "$STYLE"

echo "OK: Theme 'astoria' installiert nach $THEME_DIR/astoria"
echo "In Dolibarr auswählen: Einstellungen → Benutzeroberfläche →"
echo "Standardvorlage grafische Oberfläche → astoria → SPEICHERN."
echo "Danach im Browser hart neu laden (Strg+F5)."
