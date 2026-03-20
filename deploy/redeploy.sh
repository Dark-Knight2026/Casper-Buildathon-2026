#!/bin/bash

# ================== INIT ======================================================================

# set -x # for debug
set -o errexit
set -o nounset
set -o pipefail


# Color codes
RED="\e[31m"
YELLOW="\e[33m"
GREEN="\e[32m"
BLUE="\e[34m"
RESET="\e[0m"

# Default log flags
ERROR=${ERROR:-1}
DEBUG=${DEBUG:-0}
INFO=${INFO:-1}
SUCCESS=${SUCCESS:-1}

function __msg_error() {
    [[ "${ERROR}" == "1" ]] && echo -e "${RED}[ERROR]: $*${RESET}"
}

function __msg_debug() {
    [[ "${DEBUG}" == "1" ]] && echo -e "${BLUE}[DEBUG]: $*${RESET}"
}

function __msg_info() {
    [[ "${INFO}" == "1" ]] && echo -e "${YELLOW}[INFO]: $*${RESET}"
}

function __msg_success() {
    [[ "${SUCCESS}" == "1" ]] && echo -e "${GREEN}[SUCCESS]: $*${RESET}"
}

# ==============================================================================================
# ================== Set up main file ==========================================================

__msg_info "Starting redeploy.sh script"

# Derive OPT_DIR from the script's own location (/opt/<project>/deploy/redeploy.sh)
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
OPT_DIR="$(dirname "${SCRIPT_DIR}")"
export OPT_DIR

set -a
. "${OPT_DIR}/deploy/.env"
set +a

case "${DEPLOYMENT_MODE}" in
  dev)
    export RUST_LOG="info,api=debug"
    ;;
  staging)
    export RUST_LOG="info,api=debug"
    ;;
  production)
    export RUST_LOG="error,api=error"
    ;;
  *)
    __msg_error "Invalid DEPLOYMENT_MODE: '${DEPLOYMENT_MODE}'. Expected: dev | staging | production"
    exit 1
    ;;
esac

# ---- pre-flight validation ----
if [[ ! "${VERSION}" =~ ^[a-zA-Z0-9._-]+$ ]]; then
  __msg_error "Invalid VERSION format: '${VERSION}'"
  exit 1
fi

if [[ -z "${SERVER_DOMAIN:-}" ]]; then
  __msg_error "SERVER_DOMAIN is not set in .env"
  exit 1
fi
# RFC 1123: no underscores in domain labels
if [[ ! "${SERVER_DOMAIN}" =~ ^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$ ]]; then
  __msg_error "SERVER_DOMAIN '${SERVER_DOMAIN}' is not a valid FQDN"
  exit 1
fi

if [[ ! -f "${OPT_DIR}/nginx/https.conf.template" ]]; then
  __msg_error "File ${OPT_DIR}/nginx/https.conf.template not found"
  exit 1
fi

# Generate nginx https.conf from template.
# CRITICAL: single-quoted variable list restricts envsubst to SERVER_DOMAIN only —
# nginx runtime vars ($host, $uri, $scheme, etc.) are NOT substituted.
__msg_info "Generating nginx https.conf (SERVER_DOMAIN=${SERVER_DOMAIN})"
envsubst '${SERVER_DOMAIN}' \
  < "${OPT_DIR}/nginx/https.conf.template" \
  > "${OPT_DIR}/nginx/https.conf" \
  || { __msg_error "envsubst failed"; exit 1; }
[[ -s "${OPT_DIR}/nginx/https.conf" ]] \
  || { __msg_error "Generated https.conf is empty"; exit 1; }

# Generate self-signed bootstrap cert if no cert exists yet.
# certbot will replace it after nginx starts up.
CERT_LIVE="${LETSENCRYPT_DIR:-/etc/letsencrypt}/live/${SERVER_DOMAIN}"
CERT_SENTINEL="${OPT_DIR}/deploy/.self-signed"
if [[ ! -f "${CERT_LIVE}/fullchain.pem" ]]; then
  __msg_info "No certificate found — generating self-signed bootstrap cert"
  mkdir -p "${CERT_LIVE}"
  openssl req -x509 -nodes -days 30 -newkey rsa:2048 \
    -keyout "${CERT_LIVE}/privkey.pem" \
    -out    "${CERT_LIVE}/fullchain.pem" \
    -subj   "/CN=${SERVER_DOMAIN}" 2>/dev/null
  # chain.pem (intermediate chain) is a copy of fullchain for bootstrap only.
  # certbot replaces it with the correct intermediate-only file on first issuance.
  cp "${CERT_LIVE}/fullchain.pem" "${CERT_LIVE}/chain.pem"
  touch "${CERT_SENTINEL}"
  __msg_info "Self-signed certificate generated (certbot replaces after startup)"
fi

__msg_info "Verifying images exist in registry"
if ! docker manifest inspect "${TAG}_back:${VERSION}" >/dev/null 2>&1; then
  __msg_error "Image ${TAG}_back:${VERSION} does not exist in registry"
  __msg_error "Cannot proceed with deployment. Push images first."
  exit 1
fi
if ! docker manifest inspect "${TAG}_indexer:${VERSION}" >/dev/null 2>&1; then
  __msg_error "Image ${TAG}_indexer:${VERSION} does not exist in registry"
  __msg_error "Cannot proceed with deployment. Push images first."
  exit 1
fi
__msg_success "Images verified in registry"

# ---- image pull section ----
# Images pull
__msg_info "Pulling images"
docker pull "${TAG}_back:${VERSION}" || { __msg_error "Failed to pull backend image"; exit 1; }
docker pull "${TAG}_indexer:${VERSION}" || { __msg_error "Failed to pull indexer image"; exit 1; }

COMPOSE="docker compose --project-directory ${OPT_DIR}/deploy -f ${OPT_DIR}/deploy/docker-compose.yml"

# Capture running image tags before shutdown so we can roll back if the new deploy fails
PREV_BACK_IMAGE=$(docker inspect --format='{{.Config.Image}}' leasefi_backend 2>/dev/null || true)
PREV_INDEXER_IMAGE=$(docker inspect --format='{{.Config.Image}}' leasefi_indexer 2>/dev/null || true)
__msg_info "Previous backend image: ${PREV_BACK_IMAGE:-none}"
__msg_info "Previous indexer image: ${PREV_INDEXER_IMAGE:-none}"

# Persist exact image refs so rollback is correct even when backend and indexer were deployed independently
if [[ -n "${PREV_BACK_IMAGE}" || -n "${PREV_INDEXER_IMAGE}" ]]; then
  printf 'BACK_IMAGE=%s\nINDEXER_IMAGE=%s\n' \
    "${PREV_BACK_IMAGE}" "${PREV_INDEXER_IMAGE}" \
    > "${OPT_DIR}/deploy/.env.rollback"
fi

# Compose down
__msg_info "docker compose down"
${COMPOSE} down --remove-orphans || __msg_info "Nothing to remove"

# ---- deployment section ----
${COMPOSE} up -d

# Health check: poll GET /health for up to 30 seconds
__msg_info "Polling /health (30s timeout)..."
HEALTH_OK=0
for i in $(seq 1 30); do
  HTTP_STATUS=$(curl -sLk -o /dev/null -w "%{http_code}" https://localhost/health 2>/dev/null || true)
  if [[ "${HTTP_STATUS}" == "200" ]]; then
    HEALTH_OK=1
    break
  fi
  sleep 1
done

if [[ "${HEALTH_OK}" == "0" ]]; then
  __msg_error "Health check failed after 30s"

  ${COMPOSE} down --remove-orphans || true

  if [[ -f "${OPT_DIR}/deploy/.env.rollback" ]]; then
    # shellcheck source=/dev/null
    . "${OPT_DIR}/deploy/.env.rollback"
    __msg_info "Rolling back: backend=${BACK_IMAGE:-none} indexer=${INDEXER_IMAGE:-none}"
    [[ -n "${BACK_IMAGE}" ]]    && { docker pull "${BACK_IMAGE}"    || true; }
    [[ -n "${INDEXER_IMAGE}" ]] && { docker pull "${INDEXER_IMAGE}" || true; }
    BACK_IMAGE="${BACK_IMAGE}" INDEXER_IMAGE="${INDEXER_IMAGE}" ${COMPOSE} up -d \
      || __msg_error "Rollback also failed — manual intervention required"
  else
    __msg_error "No rollback state found — cannot roll back automatically"
  fi

  exit 1
fi

__msg_success "Health check passed"

# ---- certbot section ----
# Run only when nginx started with the self-signed bootstrap cert.
# Moves the bootstrap dir aside (certbot refuses to overwrite non-symlink files),
# obtains a real Let's Encrypt cert via Cloudflare DNS-01, then reloads nginx.
if [[ -f "${CERT_SENTINEL}" ]]; then
  if [[ -z "${CF_DNS_API_TOKEN:-}" ]]; then
    __msg_error "CF_DNS_API_TOKEN is not set — skipping certbot (re-deploy after setting it in .env)"
  elif [[ -z "${CERTBOT_EMAIL:-}" ]]; then
    __msg_error "CERTBOT_EMAIL is not set — skipping certbot (re-deploy after setting it in .env)"
  else
    __msg_info "Obtaining Let's Encrypt certificate for ${SERVER_DOMAIN}..."
    CF_CREDS=$(mktemp)
    printf 'dns_cloudflare_api_token = %s\n' "${CF_DNS_API_TOKEN}" > "${CF_CREDS}"
    chmod 600 "${CF_CREDS}"

    # Move bootstrap cert aside so certbot can create its standard symlink structure
    mv "${CERT_LIVE}" "${CERT_LIVE}.bootstrap"

    if certbot certonly \
        --dns-cloudflare \
        --dns-cloudflare-credentials "${CF_CREDS}" \
        --dns-cloudflare-propagation-seconds 60 \
        --non-interactive \
        --agree-tos \
        --email "${CERTBOT_EMAIL}" \
        -d "${SERVER_DOMAIN}"; then
      shred -u "${CF_CREDS}"
      rm -rf "${CERT_LIVE}.bootstrap"
      rm -f "${CERT_SENTINEL}"
      docker exec leasefi_nginx nginx -s reload
      __msg_success "Let's Encrypt certificate obtained and nginx reloaded"
    else
      shred -u "${CF_CREDS}"
      # Restore bootstrap cert so nginx survives until next re-deploy
      [[ ! -d "${CERT_LIVE}" ]] && mv "${CERT_LIVE}.bootstrap" "${CERT_LIVE}"
      __msg_error "Certbot failed — running with self-signed certificate"
      __msg_error "Fix CF_DNS_API_TOKEN / CERTBOT_EMAIL in .env and re-deploy to retry"
    fi
  fi
fi

# Remove unused images only after a successful deploy
__msg_info "Cleanup unused images"
docker image prune -f
