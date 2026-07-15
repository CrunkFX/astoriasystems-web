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
# Aufruf auf dem Dolibarr-Server:
#   sh install.sh /pfad/zu/dolibarr/htdocs
# ============================================================
set -e

DOLI_HTDOCS="${1:?Aufruf: sh install.sh /pfad/zu/dolibarr/htdocs}"
SRC_DIR="$(cd "$(dirname "$0")" && pwd)"
CSS_FILE="$SRC_DIR/../astoria-theme.css"
THEME_DIR="$DOLI_HTDOCS/theme"

[ -f "$CSS_FILE" ] || { echo "FEHLER: $CSS_FILE nicht gefunden."; exit 1; }
[ -d "$THEME_DIR/eldy" ] || { echo "FEHLER: $THEME_DIR/eldy nicht gefunden."; exit 1; }

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

echo "OK: Theme 'astoria' installiert."
echo "In Dolibarr auswählen: Einstellungen → Benutzeroberfläche →"
echo "Standardvorlage grafische Oberfläche → astoria → SPEICHERN."
echo "Danach im Browser hart neu laden (Strg+F5)."
