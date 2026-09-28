#!/usr/bin/env bash
#
# Ploi-API-Helfer: komplette Site für diese Vorlage anlegen, Environment schreiben,
# nginx-Ergänzungen einspielen, Deployment auslösen.
#
#   bash ploi/ploi.sh site-create           Site (+ Benutzer) + Repository + Deploy-Script + Env + nginx + SSL + Quick Deploy
#   bash ploi/ploi.sh env-push              Environment der Site ersetzen (SITE_URL + Kontaktformular)
#   bash ploi/ploi.sh env-pull              aktuelle Environment der Site anzeigen
#   bash ploi/ploi.sh nginx-push            ploi/nginx/astro.conf in die nginx-Konfiguration der Site einfügen
#   bash ploi/ploi.sh nginx-pull            aktuelle nginx-Konfiguration der Site anzeigen
#   bash ploi/ploi.sh deploy-script         Deploy-Script der Site auf den Standard dieser Vorlage setzen
#   bash ploi/ploi.sh deploy                Deployment der Site starten
#
# Optionen:
#   --env-file <datei>   Variablen aus Datei laden (KEY=VALUE, z. B. ploi/.env.site – nie committen)
#   --create-user        site-create legt den Systembenutzer PLOI_SYSTEM_USER an (Website-Isolation)
#   --zero-downtime      site-create aktiviert Zero-Downtime-Deployment (Deploy-Script mit {RELEASE})
#   --no-ssl             site-create ohne Let's-Encrypt-Zertifikat (z. B. wenn DNS noch nicht zeigt)
#   --no-deploy          site-create ohne abschließendes Deployment
#   --dry-run            API-Aufrufe nur anzeigen
#
# Benötigte Variablen (Umgebung oder --env-file):
#   PLOI_API_TOKEN       API-Token (ploi.io → Profil → API)
#   PLOI_SERVER_ID       Server-ID
#   SITE_DOMAIN          Domain der Webseite, z. B. www.kunde.de
#   PLOI_SITE_ID         Site-ID – optional, wird sonst anhand von SITE_DOMAIN nachgeschlagen
#   GIT_REPOSITORY       owner/name des Repositories (site-create)
#   optional             GIT_BRANCH (main), PLOI_SYSTEM_USER (ploi; mit --create-user aus der Domain
#                        abgeleitet: www.kunde.de → kunde), PLOI_SOURCE_PROVIDER_ID,
#                        SITE_URL (Standard: https://SITE_DOMAIN), ZERO_DOWNTIME=1 (für deploy-script)
#   Kontaktformular      LETTERMINT_TOKEN, LETTERMINT_ROUTE_ID, MAIL_FROM, CONTACT_EMAIL, KONTAKT_PORT
#                        (env-push/site-create schreiben gesetzte Werte in die Environment; siehe
#                        ploi/.env.production.example)
#
# Voraussetzungen: bash, curl, jq.
set -euo pipefail

API="https://ploi.io/api"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
NGINX_SNIPPET="${SCRIPT_DIR}/nginx/astro.conf"
NGINX_MARKER="# astoriasystems-web nginx"
ENV_FILE=""
CREATE_USER=0
ZERO_DOWNTIME="${ZERO_DOWNTIME:-0}"
NO_SSL=0
NO_DEPLOY=0
DRY_RUN=0

log() { printf '→ %s\n' "$*" >&2; }
warn() { printf 'Warnung: %s\n' "$*" >&2; }
die() { printf 'Fehler: %s\n' "$*" >&2; exit 1; }
usage() { awk 'NR > 1 && !/^#/ { exit } NR > 1 { sub(/^# ?/, ""); print }' "${BASH_SOURCE[0]}"; }

# ----------------------------------------------------------------------------- Argumente
COMMAND="${1:-}"
case "$COMMAND" in
    '' | -h | --help) usage; [[ -n "$COMMAND" ]] && exit 0 || exit 1 ;;
esac
shift

while [[ $# -gt 0 ]]; do
    case "$1" in
        --env-file) ENV_FILE="$2"; shift 2 ;;
        --create-user) CREATE_USER=1; shift ;;
        --zero-downtime) ZERO_DOWNTIME=1; shift ;;
        --no-ssl) NO_SSL=1; shift ;;
        --no-deploy) NO_DEPLOY=1; shift ;;
        --dry-run) DRY_RUN=1; shift ;;
        -h | --help) usage; exit 0 ;;
        *) die "Unbekannte Option: $1" ;;
    esac
done

if [[ -n "$ENV_FILE" ]]; then
    [[ -f "$ENV_FILE" ]] || die "Datei nicht gefunden: $ENV_FILE"
    set -a
    # shellcheck disable=SC1090
    source "$ENV_FILE"
    set +a
fi

# ----------------------------------------------------------------------------- Helfer
require_tools() {
    for tool in "$@"; do
        command -v "$tool" >/dev/null 2>&1 || die "Benötigtes Programm fehlt: $tool"
    done
}

require_vars() {
    local missing=()
    for name in "$@"; do
        [[ -n "${!name:-}" ]] || missing+=("$name")
    done
    [[ ${#missing[@]} -eq 0 ]] || die "Fehlende Variablen: ${missing[*]}"
}

api() {
    local method="$1" path="$2" body="${3:-}"
    require_vars PLOI_API_TOKEN

    if [[ $DRY_RUN -eq 1 ]]; then
        printf '[dry-run] %s %s%s\n' "$method" "$API" "$path" >&2
        [[ -z "$body" ]] || printf '%s\n' "$body" | sed 's/^/           /' >&2
        printf '{"data":{"id":0,"status":"active","name":"%s"},"content":""}' "${PLOI_SYSTEM_USER:-ploi}"
        return 0
    fi

    local args=(-sS -X "$method" "${API}${path}"
        -H "Authorization: Bearer ${PLOI_API_TOKEN}"
        -H "Accept: application/json"
        -H "Content-Type: application/json"
        -w '\n%{http_code}')
    [[ -z "$body" ]] || args+=(--data "$body")

    local response status payload
    response="$(curl "${args[@]}")"
    status="${response##*$'\n'}"
    payload="${response%$'\n'*}"

    if [[ "$status" -lt 200 || "$status" -ge 300 ]]; then
        die "Ploi-API ${method} ${path} antwortete mit HTTP ${status}: ${payload}"
    fi

    printf '%s' "$payload"
}

site_path() { printf '/servers/%s/sites/%s%s' "$PLOI_SERVER_ID" "$PLOI_SITE_ID" "${1:-}"; }

# PLOI_SITE_ID fehlt? Dann anhand von SITE_DOMAIN in der Site-Liste des Servers nachschlagen.
resolve_site_id() {
    [[ -z "${PLOI_SITE_ID:-}" ]] || return 0
    require_vars PLOI_SERVER_ID SITE_DOMAIN
    PLOI_SITE_ID="$(api GET "/servers/${PLOI_SERVER_ID}/sites?per_page=100" |
        jq -r --arg d "$SITE_DOMAIN" '.data[] | select(.root_domain == $d) | .id' | head -n1)"
    [[ -n "$PLOI_SITE_ID" ]] || die "Keine Site mit Domain ${SITE_DOMAIN} auf Server ${PLOI_SERVER_ID} gefunden (PLOI_SITE_ID setzen oder site-create)."
    export PLOI_SITE_ID
    log "Site-ID für ${SITE_DOMAIN}: ${PLOI_SITE_ID}"
}

# Systembenutzer aus der Domain ableiten: www.kunde.de → kunde
default_system_user() {
    local name="${SITE_DOMAIN,,}"
    name="${name#www.}"
    name="${name%%.*}"
    printf '%s' "${name//[^a-z0-9]/}"
}

wait_for_site() {
    local status="" i
    for i in $(seq 1 60); do
        status="$(api GET "$(site_path)" | jq -r '.data.status // "unknown"')"
        [[ "$status" != "active" ]] || return 0
        sleep 5
    done
    die "Site wurde nicht aktiv (Status: ${status})."
}

wait_for_system_user() {
    local name="$1" i
    for i in $(seq 1 60); do
        if api GET "/servers/${PLOI_SERVER_ID}/system-users" | jq -e --arg n "$name" '.data[] | select(.name == $n)' >/dev/null; then
            return 0
        fi
        [[ $DRY_RUN -eq 0 ]] || return 0
        sleep 5
    done
    die "Systembenutzer ${name} wurde nicht angelegt."
}

# Deploy-Script der Site: nur Ploi-Platzhalter, alles Projektspezifische steht in ploi/deploy.sh.
# Mit Zero-Downtime-Deployment klont Ploi jede Version nach <domain>-deploy/<timestamp> ({RELEASE}).
deploy_script() {
    local dir='{SITE_DIRECTORY}'
    [[ "$ZERO_DOWNTIME" != "1" ]] || dir='{RELEASE}'
    cat <<EOF
cd ${dir}
git pull origin {BRANCH}
bash ploi/deploy.sh
EOF
}

env_content() {
    printf 'SITE_URL=%s\n' "${SITE_URL:-https://${SITE_DOMAIN}}"
    # Kontaktformular (server/kontakt.mjs): nur gesetzte Werte. env-push ersetzt die ganze .env – ohne
    # LETTERMINT_TOKEN hier wäre er danach weg.
    local name
    for name in LETTERMINT_TOKEN LETTERMINT_ROUTE_ID MAIL_FROM CONTACT_EMAIL KONTAKT_PORT; do
        [[ -z "${!name:-}" ]] || printf '%s="%s"\n' "$name" "${!name}"
    done
}

# Fügt ploi/nginx/astro.conf hinter der Zeile `include /etc/nginx/ploi/<domain>/server/*;` ein.
nginx_with_snippet() {
    local config="$1"
    awk -v snippet="$NGINX_SNIPPET" '
        {
            print
            if (!done && $0 ~ /include \/etc\/nginx\/ploi\/[^ ]*\/server\/\*;/) {
                while ((getline line < snippet) > 0) print "    " line
                close(snippet)
                print ""
                done = 1
            }
        }
        END { exit done ? 0 : 1 }
    ' <<<"$config"
}

# ----------------------------------------------------------------------------- Befehle
cmd_env_pull() {
    require_tools curl jq
    resolve_site_id
    api GET "$(site_path /env)" | jq -r '.content'
}

cmd_env_push() {
    require_tools curl jq
    require_vars SITE_DOMAIN
    resolve_site_id
    [[ -n "${LETTERMINT_TOKEN:-}" ]] \
        || warn "LETTERMINT_TOKEN nicht gesetzt – die Environment der Site wird ohne ihn ersetzt, das Kontaktformular antwortet danach mit 500."
    api PATCH "$(site_path /env)" "$(jq -n --arg content "$(env_content)" '{content: $content}')" >/dev/null
    # Nur die Namen ins Log – der Token ist geheim.
    log "Environment der Site ${PLOI_SITE_ID} gesetzt: $(env_content | cut -d= -f1 | tr '\n' ' ')"
}

cmd_nginx_pull() {
    require_tools curl jq
    resolve_site_id
    api GET "$(site_path /nginx-configuration)" | jq -r '.content'
}

cmd_nginx_push() {
    require_tools curl jq
    resolve_site_id
    [[ -f "$NGINX_SNIPPET" ]] || die "Datei nicht gefunden: $NGINX_SNIPPET"

    local current updated
    current="$(api GET "$(site_path /nginx-configuration)" | jq -r '.content // ""')"

    if [[ $DRY_RUN -eq 1 && -z "$current" ]]; then
        log "nginx-Konfiguration würde um ploi/nginx/astro.conf ergänzt (dry-run)."
        return 0
    fi

    if grep -qF "$NGINX_MARKER" <<<"$current"; then
        log "nginx-Konfiguration enthält die Astro-Ergänzungen bereits."
        return 0
    fi

    updated="$(nginx_with_snippet "$current")" \
        || die "Zeile 'include /etc/nginx/ploi/<domain>/server/*;' nicht gefunden. Inhalt von ploi/nginx/astro.conf im Panel unter Site → Manage → NGINX configuration in den server{}-Block einfügen."

    api PATCH "$(site_path /nginx-configuration)" "$(jq -n --arg content "$updated" '{content: $content}')" >/dev/null
    log "nginx-Konfiguration der Site ${PLOI_SITE_ID} ergänzt."

    api POST "/servers/${PLOI_SERVER_ID}/services/nginx/restart" >/dev/null
    log "nginx neu gestartet."
}

cmd_deploy() {
    require_tools curl jq
    resolve_site_id
    api POST "$(site_path /deploy)" | jq -r '.message // "Deployment gestartet."' >&2
}

cmd_deploy_script() {
    require_tools curl jq
    resolve_site_id
    api PATCH "$(site_path /deploy/script)" "$(jq -n --arg s "$(deploy_script)" '{deploy_script: $s}')" >/dev/null
    log "Deploy-Script der Site ${PLOI_SITE_ID} gesetzt ($( [[ "$ZERO_DOWNTIME" == "1" ]] && echo '{RELEASE}' || echo '{SITE_DIRECTORY}' ))."
}

cmd_site_create() {
    require_tools curl jq
    require_vars PLOI_SERVER_ID SITE_DOMAIN GIT_REPOSITORY

    local branch="${GIT_BRANCH:-main}" user="${PLOI_SYSTEM_USER:-}"

    if [[ -z "${PLOI_SITE_ID:-}" ]] && api GET "/servers/${PLOI_SERVER_ID}/sites?per_page=100" |
        jq -e --arg d "$SITE_DOMAIN" '.data[] | select(.root_domain == $d)' >/dev/null; then
        die "Site ${SITE_DOMAIN} existiert bereits auf Server ${PLOI_SERVER_ID}. Für bestehende Sites: nginx-push, env-push, deploy-script, deploy."
    fi

    if [[ $CREATE_USER -eq 1 ]]; then
        [[ -n "$user" ]] || user="$(default_system_user)"
        [[ -n "$user" && "$user" != "ploi" ]] || die "--create-user braucht PLOI_SYSTEM_USER (Name des neuen Systembenutzers, z. B. kunde)."
        if api GET "/servers/${PLOI_SERVER_ID}/system-users" | jq -e --arg n "$user" '.data[] | select(.name == $n)' >/dev/null; then
            log "Systembenutzer ${user} existiert bereits"
        else
            log "Systembenutzer ${user} anlegen (Website-Isolation, ohne sudo)"
            api POST "/servers/${PLOI_SERVER_ID}/system-users" "$(jq -n --arg n "$user" '{name: $n, sudo: false}')" >/dev/null
            wait_for_system_user "$user"
        fi
    fi
    [[ -n "$user" ]] || user="ploi"

    log "Site ${SITE_DOMAIN} anlegen (Web-Directory /dist, Benutzer ${user})"
    PLOI_SITE_ID="$(api POST "/servers/${PLOI_SERVER_ID}/sites" "$(jq -n \
        --arg d "$SITE_DOMAIN" --arg u "$user" \
        '{root_domain: $d, web_directory: "/dist", project_root: "/", system_user: $u}')" | jq -r '.data.id')"
    export PLOI_SITE_ID
    log "Site-ID: ${PLOI_SITE_ID}"
    wait_for_site

    log "Repository ${GIT_REPOSITORY}@${branch} installieren"
    local repo_body
    repo_body="$(jq -n --arg n "$GIT_REPOSITORY" --arg b "$branch" '{provider: "github", name: $n, branch: $b, install_composer: false}')"
    if [[ -n "${PLOI_SOURCE_PROVIDER_ID:-}" ]]; then
        repo_body="$(jq --argjson id "$PLOI_SOURCE_PROVIDER_ID" '. + {source_provider_id: $id}' <<<"$repo_body")"
    fi
    api POST "$(site_path /repository)" "$repo_body" >/dev/null

    if [[ "$ZERO_DOWNTIME" == "1" ]]; then
        log "Zero-Downtime-Deployment aktivieren"
        api PATCH "$(site_path)" '{"zero_downtime_deployment": true}' >/dev/null
    fi

    log "Deploy-Script setzen"
    cmd_deploy_script

    log "Environment schreiben"
    cmd_env_push

    log "nginx-Ergänzungen einspielen"
    cmd_nginx_push

    if [[ $NO_SSL -eq 0 ]]; then
        log "Let's-Encrypt-Zertifikat anfordern (DNS muss bereits auf den Server zeigen)"
        api POST "$(site_path /certificates)" "$(jq -n --arg d "$SITE_DOMAIN" '{type: "letsencrypt", certificate: $d}')" >/dev/null
    fi

    log "Quick Deploy aktivieren (Deploy bei jedem Push auf ${branch})"
    api POST "$(site_path /repository/quick-deploy)" >/dev/null

    if [[ $NO_DEPLOY -eq 0 ]]; then
        log "Erstes Deployment starten"
        cmd_deploy
    fi

    cat >&2 <<EOF

✅ Site angelegt.
   PLOI_SERVER_ID=${PLOI_SERVER_ID}
   PLOI_SITE_ID=${PLOI_SITE_ID}
   Nach dem Deploy: ${SITE_URL:-https://${SITE_DOMAIN}}
   Falls Ploi die nginx-Konfiguration beim SSL-Einrichten neu schreibt: \`bash ploi/ploi.sh nginx-push\` erneut ausführen.
EOF
}

case "$COMMAND" in
    env-pull) cmd_env_pull ;;
    env-push) cmd_env_push ;;
    nginx-pull) cmd_nginx_pull ;;
    nginx-push) cmd_nginx_push ;;
    deploy) cmd_deploy ;;
    deploy-script) cmd_deploy_script ;;
    site-create) cmd_site_create ;;
    *) usage; die "Unbekannter Befehl: $COMMAND" ;;
esac
