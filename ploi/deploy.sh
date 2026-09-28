#!/usr/bin/env bash
#
# Deploy-Schritte für Ploi – wird vom Deploy-Script der Site aufgerufen (Site → Deployment):
#
#   cd {SITE_DIRECTORY}          # mit Zero-Downtime-Deployment: cd {RELEASE}
#   git pull origin {BRANCH}
#   bash ploi/deploy.sh
#
# Ablauf: Node prüfen → Kontaktformular prüfen → pnpm install → Astro-Build nach .dist-next → Stichproben
# → bereitstellung.txt → atomar nach dist/ umschalten (Web-Directory der Site) → nginx-Ergänzungen prüfen.
#
# Entspricht AstoriaSystems/website-deploy-template. Abweichungen: pnpm statt npm (pnpm-lock.yaml), und
# die Cloudflare-Pages-Dateien _headers/_redirects aus public/ kommen nicht mit ins Web-Directory –
# ihre Entsprechung steht für nginx in ploi/nginx/.
set -euo pipefail

cd "$(dirname "$0")/.."
SITE_DIR="$(pwd)"

# Domain der Site: Name des Site-Verzeichnisses (/home/<user>/<domain>) bzw. bei Zero-Downtime-
# Deployment der Ordner <domain>-deploy weiter oben im Pfad. SITE_DOMAIN überschreibt.
detect_domain() {
    local dir="$SITE_DIR" name
    while [[ "$dir" != "/" && -n "$dir" ]]; do
        name="$(basename "$dir")"
        if [[ "$name" == *-deploy ]]; then
            printf '%s' "${name%-deploy}"
            return 0
        fi
        dir="$(dirname "$dir")"
    done
    basename "$SITE_DIR"
}
DOMAIN="${SITE_DOMAIN:-$(detect_domain)}"
DIST="dist"
NEXT=".dist-next"
PREV=".dist-prev"

log() { printf '→ %s\n' "$*"; }
warn() { printf 'Warnung: %s\n' "$*" >&2; }
die() { printf 'Fehler: %s\n' "$*" >&2; exit 1; }

# ----------------------------------------------------------------------------- Node.js
# nvm (falls für den Site-Benutzer installiert) mit der Version aus .nvmrc verwenden.
if [[ -s "$HOME/.nvm/nvm.sh" ]]; then
    # shellcheck disable=SC1091
    . "$HOME/.nvm/nvm.sh"
    if [[ -f .nvmrc ]]; then
        nvm install >/dev/null 2>&1 || true
        nvm use >/dev/null 2>&1 || true
    fi
fi

command -v node >/dev/null 2>&1 || die "Node.js fehlt. In Ploi unter Server → Settings NodeJS installieren (Version ≥ 22.12) oder nvm für den Site-Benutzer einrichten."
node -e 'const [a, b] = process.versions.node.split(".").map(Number); process.exit(a > 22 || (a === 22 && b >= 12) ? 0 : 1)' \
    || die "Node.js ≥ 22.12 wird benötigt (Astro 6), gefunden: $(node -v). NodeJS-Version in Ploi aktualisieren (Server → Settings) oder nvm verwenden."

# ----------------------------------------------------------------------------- pnpm
# Das Repository verwendet pnpm (pnpm-lock.yaml, packageManager in package.json). Reihenfolge: pnpm auf
# dem PATH → corepack (bei Node ≤ 24 dabei) → npx pnpm@10 aus der npm-Registry, ohne globale Installation.
if command -v pnpm >/dev/null 2>&1; then
    PNPM=(pnpm)
elif command -v corepack >/dev/null 2>&1 && corepack pnpm --version >/dev/null 2>&1; then
    PNPM=(corepack pnpm)
else
    PNPM=(npx --yes pnpm@10)
fi
log "Node $(node -v), pnpm $("${PNPM[@]}" --version 2>/dev/null | tail -n1)"

# ----------------------------------------------------------------------------- SITE_URL
# astro.config.mjs liest SITE_URL aus der Umgebung oder aus .env (Ploi → Site → Environment, siehe
# ploi/.env.production.example). Fehlt beides, wird die Domain der Site mit https verwendet. Der Wert
# steht im Deploy-Log, damit ein falscher Canonical-Host sofort auffällt.
SITE_URL_EFFEKTIV=""
if [[ -f .env ]]; then
    SITE_URL_EFFEKTIV="$(sed -nE "s/^SITE_URL=['\"]?([^'\" ]+).*$/\1/p" .env | tail -n1)"
fi
SITE_URL_EFFEKTIV="${SITE_URL_EFFEKTIV:-${SITE_URL:-https://${DOMAIN}}}"
export SITE_URL="$SITE_URL_EFFEKTIV"
log "SITE_URL: ${SITE_URL}"

# ----------------------------------------------------------------------------- Kontaktformular
# server/kontakt.mjs läuft als Ploi-Daemon unter dem Systembenutzer der Site; nginx reicht POST /api/contact
# an 127.0.0.1:<KONTAKT_PORT> weiter (ploi/nginx/). Nach dem Umschalten beendet sich der laufende Dienst von
# selbst und supervisor startet die neue Version. Hier nur prüfen, damit Fehlendes im Deploy-Log steht.
node --check server/kontakt.mjs || die "server/kontakt.mjs hat einen Syntaxfehler."
KONTAKT_PORT=""
if [[ -f .env ]]; then
    KONTAKT_PORT="$(sed -nE "s/^KONTAKT_PORT=['\"]?([0-9]+).*$/\1/p" .env | tail -n1)"
fi
KONTAKT_PORT="${KONTAKT_PORT:-3811}"
if ! grep -qsE '^[[:space:]]*(export[[:space:]]+)?LETTERMINT_TOKEN=[^[:space:]]' .env; then
    warn "LETTERMINT_TOKEN fehlt in der Environment der Site – das Kontaktformular antwortet mit 500 (Vorlage: ploi/.env.production.example)."
fi
if node -e "fetch('http://127.0.0.1:${KONTAKT_PORT}/api/contact', { signal: AbortSignal.timeout(3000) }).then((r) => process.exit(r.status === 405 ? 0 : 1), () => process.exit(1))"; then
    log "Kontaktformular: Dienst antwortet auf 127.0.0.1:${KONTAKT_PORT}"
else
    warn "Kontakt-Dienst antwortet nicht auf 127.0.0.1:${KONTAKT_PORT} – in Ploi einmalig einen Daemon anlegen (Server → Daemons): Befehl \`$(command -v node) /home/$(id -un)/${DOMAIN}/server/kontakt.mjs\`, Benutzer $(id -un), 1 Prozess. Bis dahin antwortet das Kontaktformular mit 502."
fi

# ----------------------------------------------------------------------------- Build
log "pnpm install"
"${PNPM[@]}" install --frozen-lockfile --prefer-offline

log "Astro-Build nach ${NEXT}"
rm -rf "$NEXT"
"${PNPM[@]}" exec astro build --outDir "$NEXT"

# Stichproben: Startseite, 404-Seite, englische Startseite, Kontakt, Sitemap, robots.txt.
log "Build prüfen"
for datei in index.html 404.html en/index.html kontakt/index.html produkte/index.html sitemap-index.xml robots.txt; do
    [[ -f "${NEXT}/${datei}" ]] || die "Build unvollständig: ${NEXT}/${datei} fehlt."
done

# Cloudflare-Pages-Dateien aus public/ (Kopfzeilen und Umleitungen) gehören nicht ins Web-Directory –
# nginx übernimmt beides aus ploi/nginx/. Sie bleiben im Repository, bis Cloudflare abgeschaltet ist.
rm -f "${NEXT}/_headers" "${NEXT}/_redirects"

# Kennung des ausgelieferten Standes, abrufbar unter /bereitstellung.txt.
{
    echo "commit: $(git rev-parse HEAD)"
    echo "gebaut: $(date -u +%Y-%m-%dT%H:%M:%SZ)"
    echo "lauf:   ploi $(hostname -s 2>/dev/null || echo server)"
} > "${NEXT}/bereitstellung.txt"

# ----------------------------------------------------------------------------- Umschalten
# nginx zeigt auf <site>/dist – ein Verzeichnis-Rename ist atomar, es gibt keinen Moment ohne Seite.
log "Neues Build aktivieren"
rm -rf "$PREV"
[[ ! -d "$DIST" ]] || mv "$DIST" "$PREV"
mv "$NEXT" "$DIST"
rm -rf "$PREV"

# ----------------------------------------------------------------------------- nginx
# ploi/nginx/astro.conf ergänzt das Ploi-Webserver-Template „Astro static“ um die Umleitungen der alten
# Odoo-Adressen (früher public/_redirects), HSTS (früher public/_headers) und das Kontaktformular
# (/api/contact → Node-Dienst auf 127.0.0.1:3811). Das Kopieren braucht sudo – isolierte Site-Benutzer haben es nicht; dann einmalig
# `bash ploi/ploi.sh nginx-push` (Ploi-API) oder ploi/nginx/webserver-template.conf im Panel unter
# Site → Manage → NGINX configuration einsetzen.
NGINX_INCLUDE_DIR="/etc/nginx/ploi/${DOMAIN}/server"
NGINX_TARGET="${NGINX_INCLUDE_DIR}/astro.conf"
NGINX_CONF="/etc/nginx/sites-available/${DOMAIN}"
NGINX_MARKER="# astoriasystems-web nginx"
nginx_has_include() {
    [[ -r "$NGINX_TARGET" ]] || grep -qsF "$NGINX_MARKER" "$NGINX_CONF" 2>/dev/null
}
if sudo -n true 2>/dev/null; then
    if [[ ! -d "$NGINX_INCLUDE_DIR" ]]; then
        warn "${NGINX_INCLUDE_DIR} nicht gefunden – bitte \`bash ploi/ploi.sh nginx-push\` ausführen."
    elif sudo -n cmp -s ploi/nginx/astro.conf "$NGINX_TARGET" 2>/dev/null; then
        log "nginx-Include ist aktuell"
    elif sudo -n install -m 644 ploi/nginx/astro.conf "$NGINX_TARGET" 2>/dev/null; then
        if sudo -n nginx -t >/dev/null 2>&1; then
            sudo -n service nginx reload
            log "nginx-Include installiert und nginx neu geladen"
        else
            sudo -n rm -f "$NGINX_TARGET"
            warn "nginx -t schlug mit ploi/nginx/astro.conf fehl – Include wieder entfernt, bitte Konfiguration prüfen."
        fi
    else
        warn "Konnte ${NGINX_TARGET} nicht schreiben – bitte \`bash ploi/ploi.sh nginx-push\` ausführen."
    fi
elif nginx_has_include; then
    log "nginx-Konfiguration enthält die astoria-Ergänzungen"
else
    warn "Kein sudo für $(id -un) (isolierter Site-Benutzer) und keine astoria-Ergänzungen in ${NGINX_CONF} – einmalig \`bash ploi/ploi.sh nginx-push\` ausführen, sonst fehlen das Kontaktformular (/api/contact), die Umleitungen der alten Adressen (/our-services & Co.), X-Frame-Options DENY und HSTS."
fi

echo "✅ Deployment abgeschlossen ($(git rev-parse --short HEAD)) → ${SITE_URL}"
