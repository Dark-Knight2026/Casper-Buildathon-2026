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

set -a
. /opt/itinerary_service/deploy/.env
set +a

# =================================================================================================
OPT_DIR="/opt/itinerary_service"
export OPT_DIR

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

install -m 644 /dev/stdin /etc/docker/daemon.json <<EOF
{
  "ipv6": true,
  "fixed-cidr-v6": "fd00:dead:beef::/48"
}
EOF

# Compose down
__msg_info "docker compose down"
docker compose \
  --project-directory "${OPT_DIR}/deploy" \
  -f "${OPT_DIR}/deploy/docker-compose.yml" \
  down --remove-orphans || __msg_info "Nothing to remove"

# ---- deployment section ----
docker compose \
  --project-directory "${OPT_DIR}/deploy" \
  -f "${OPT_DIR}/deploy/docker-compose.yml" \
  up -d

# Remove unused images
__msg_info "Cleanup unused images"
docker image prune -f
