#!/usr/bin/env bats
bats_require_minimum_version 1.5.0

setup() {
  export BASE="$BATS_TEST_TMPDIR"

  mkdir -p "$BASE/deploy" "$BASE/bin" "$BASE/nginx"

  # Place script at $BASE/deploy/ so BASH_SOURCE-derived OPT_DIR resolves to $BASE
  cp "$BATS_TEST_DIRNAME/../redeploy.sh" "$BASE/deploy/redeploy.sh"
  chmod +x "$BASE/deploy/redeploy.sh"

  # Default .env consumed by the script.
  # S3_BUCKET is mandatory once `redeploy.sh` reaches its envsubst step
  # (it feeds the nginx `/media/` proxy template); tests that expect a
  # successful pre-flight, or that target a failure AFTER the S3 guard,
  # MUST set it. Tests that target an earlier failure (invalid VERSION,
  # missing PROJECT_DOMAIN, invalid DEPLOYMENT_MODE) override this default
  # `.env` and may omit S3_BUCKET on purpose.
  cat > "$BASE/deploy/.env" <<EOF
DEPLOYMENT_MODE=dev
TAG=registry.example.com/myapp
VERSION=1.0.0
PROJECT_DOMAIN=test.example.com
DATABASE_URL=postgres://postgres:postgres@localhost:54322/postgres
ALLOW_DB_RESET=true
REDIS_PASSWORD=testpass123
S3_BUCKET=test-bucket
EOF

  # https.conf.template — required by pre-flight check; must be non-empty so envsubst
  # produces a non-empty https.conf
  echo 'server { server_name ${PROJECT_DOMAIN}; }' > "$BASE/nginx/https.conf.template"

  # redis.conf.template — required by pre-flight check; must be non-empty so envsubst
  # produces a non-empty redis.conf
  echo 'requirepass ${REDIS_PASSWORD}' > "$BASE/deploy/redis.conf.template"

  # Redirect LETSENCRYPT_DIR to a writable temp path so the cert bootstrap does not
  # require root. Pre-populate the cert files so the self-signed path is skipped
  # entirely and the .self-signed sentinel is never created.
  # Docker daemon.json configuration runs once at provisioning time (cloud-init.yml),
  # not during redeploy — there is no install call to stub here.
  export LETSENCRYPT_DIR="$BASE/letsencrypt"
  mkdir -p "$LETSENCRYPT_DIR/live/test.example.com"
  echo "FAKE_CERT"  > "$LETSENCRYPT_DIR/live/test.example.com/fullchain.pem"
  echo "FAKE_KEY"   > "$LETSENCRYPT_DIR/live/test.example.com/privkey.pem"
  echo "FAKE_CHAIN" > "$LETSENCRYPT_DIR/live/test.example.com/chain.pem"

  # Default docker stub: succeeds for every sub-command, logs calls.
  # Captures RUST_LOG on compose up so tests can assert the value forwarded
  # to the container matches the DEPLOYMENT_MODE — not just the host shell value.
  cat > "$BASE/bin/docker" <<'STUB'
#!/bin/bash
echo "docker $*" >> "$BASE/docker.log"
if [[ "$*" == *"compose"*"up"* ]]; then
  echo "RUST_LOG=${RUST_LOG}" >> "$BASE/compose_up_env.log"
fi
exit 0
STUB
  chmod +x "$BASE/bin/docker"

  # curl stub: returns 200 with a health body so the health-check poll passes immediately.
  # The script uses -w "\n%{http_code}" so output must be "<body>\n<status>".
  cat > "$BASE/bin/curl" <<'STUB'
#!/bin/bash
printf '{"redis":"connected","database":"connected"}\n200'
STUB
  chmod +x "$BASE/bin/curl"

  # sleep stub: no-op so health-check retries don't slow the suite down
  cat > "$BASE/bin/sleep" <<'STUB'
#!/bin/bash
exit 0
STUB
  chmod +x "$BASE/bin/sleep"

  export PATH="$BASE/bin:$PATH"
}

teardown() { :; }

run_deploy() {
  bash "$BASE/deploy/redeploy.sh"
}

# -------------------------------------------------
@test "exits with error for invalid VERSION format" {
  cat > "$BASE/deploy/.env" <<EOF
DEPLOYMENT_MODE=dev
TAG=registry.example.com/myapp
VERSION=1.0@invalid
PROJECT_DOMAIN=test.example.com
EOF

  run run_deploy
  [ "$status" -ne 0 ]
  [[ "$output" == *"Invalid VERSION format"* ]]
}

# -------------------------------------------------
@test "exits with error when PROJECT_DOMAIN is missing" {
  cat > "$BASE/deploy/.env" <<EOF
DEPLOYMENT_MODE=dev
TAG=registry.example.com/myapp
VERSION=1.0.0
EOF

  run run_deploy
  [ "$status" -ne 0 ]
  [[ "$output" == *"PROJECT_DOMAIN is not set"* ]]
}

# -------------------------------------------------
@test "exits with error for invalid PROJECT_DOMAIN (underscore)" {
  cat > "$BASE/deploy/.env" <<EOF
DEPLOYMENT_MODE=dev
TAG=registry.example.com/myapp
VERSION=1.0.0
PROJECT_DOMAIN=invalid_domain.example.com
EOF

  run run_deploy
  [ "$status" -ne 0 ]
  [[ "$output" == *"is not a valid FQDN"* ]]
}

# -------------------------------------------------
@test "removes .env.rollback after successful deploy" {
  echo "BACK_IMAGE=old INDEXER_IMAGE=old" > "$BASE/deploy/.env.rollback"

  run -0 run_deploy
  [ ! -f "$BASE/deploy/.env.rollback" ]
}

# -------------------------------------------------
@test "generates non-empty https.conf after successful deploy" {
  run -0 run_deploy
  [ -f "$BASE/nginx/https.conf" ]
  [ -s "$BASE/nginx/https.conf" ]
}

# -------------------------------------------------
@test "generates non-empty redis.conf after successful deploy" {
  run -0 run_deploy
  [ -f "$BASE/deploy/redis.conf" ]
  [ -s "$BASE/deploy/redis.conf" ]
  grep -q "testpass123" "$BASE/deploy/redis.conf"
}

# -------------------------------------------------
@test "exits when redis.conf.template is missing" {
  rm "$BASE/deploy/redis.conf.template"

  run run_deploy
  [ "$status" -ne 0 ]
  [[ "$output" == *"redis.conf.template not found"* ]]
}

# -------------------------------------------------
@test "exits with error for invalid DEPLOYMENT_MODE" {
  cat > "$BASE/deploy/.env" <<EOF
DEPLOYMENT_MODE=invalid
TAG=registry.example.com/myapp
VERSION=1.0.0
EOF

  run run_deploy
  [ "$status" -ne 0 ]
  [[ "$output" == *"Invalid DEPLOYMENT_MODE"* ]]
}

# -------------------------------------------------
@test "sets RUST_LOG to info,api=debug for dev mode" {
  run -0 run_deploy
  grep -q "RUST_LOG=info,api=debug" "$BASE/compose_up_env.log"
}

# -------------------------------------------------
@test "sets RUST_LOG to info,api=debug for staging mode" {
  cat > "$BASE/deploy/.env" <<EOF
DEPLOYMENT_MODE=staging
TAG=registry.example.com/myapp
VERSION=1.0.0
PROJECT_DOMAIN=test.example.com
S3_BUCKET=test-bucket
EOF

  run -0 run_deploy
  grep -q "RUST_LOG=info,api=debug" "$BASE/compose_up_env.log"
}

# -------------------------------------------------
@test "sets RUST_LOG to error,api=error for production mode" {
  cat > "$BASE/deploy/.env" <<EOF
DEPLOYMENT_MODE=production
TAG=registry.example.com/myapp
VERSION=1.0.0
PROJECT_DOMAIN=test.example.com
S3_BUCKET=test-bucket
EOF

  run -0 run_deploy
  grep -q "RUST_LOG=error,api=error" "$BASE/compose_up_env.log"
}

# -------------------------------------------------
@test "exits when backend image is missing from registry" {
  cat > "$BASE/bin/docker" <<'STUB'
#!/bin/bash
echo "docker $*" >> "$BASE/docker.log"
if [[ "$1 $2" == "manifest inspect" ]]; then
  exit 1
fi
exit 0
STUB
  chmod +x "$BASE/bin/docker"

  run run_deploy
  [ "$status" -ne 0 ]
  [[ "$output" == *"does not exist in registry"* ]]
}

# -------------------------------------------------
@test "exits when indexer image is missing from registry" {
  cat > "$BASE/bin/docker" <<'STUB'
#!/bin/bash
echo "docker $*" >> "$BASE/docker.log"
if [[ "$1 $2" == "manifest inspect" ]]; then
  COUNT=$(( $(cat "$BASE/manifest_count" 2>/dev/null || echo 0) + 1 ))
  echo "$COUNT" > "$BASE/manifest_count"
  [ "$COUNT" -ge 2 ] && exit 1
fi
exit 0
STUB
  chmod +x "$BASE/bin/docker"

  run run_deploy
  [ "$status" -ne 0 ]
  [[ "$output" == *"does not exist in registry"* ]]
}

# -------------------------------------------------
@test "exits when docker pull of backend image fails" {
  cat > "$BASE/bin/docker" <<'STUB'
#!/bin/bash
echo "docker $*" >> "$BASE/docker.log"
if [[ "$1" == "pull" ]]; then
  exit 1
fi
exit 0
STUB
  chmod +x "$BASE/bin/docker"

  run run_deploy
  [ "$status" -ne 0 ]
  [[ "$output" == *"Failed to pull"* ]]
}

# -------------------------------------------------
@test "runs docker compose down before up on successful deployment" {
  run -0 run_deploy
  DOWN_LINE=$(grep -n "compose.*down" "$BASE/docker.log" | head -1 | cut -d: -f1)
  UP_LINE=$(grep -n "compose.*up" "$BASE/docker.log" | head -1 | cut -d: -f1)
  [ "$DOWN_LINE" -lt "$UP_LINE" ]
}

# -------------------------------------------------
@test "runs docker compose up on successful deployment" {
  run -0 run_deploy
  grep -q "compose.*up" "$BASE/docker.log"
}

# -------------------------------------------------
@test "prunes unused images after deployment" {
  run -0 run_deploy
  grep -q "image prune" "$BASE/docker.log"
}

# -------------------------------------------------
@test "rolls back to previous images when health check fails" {
  # docker inspect returns a running image for each service so .env.rollback is written.
  # Each compose up invocation logs its BACK_IMAGE/INDEXER_IMAGE env vars to compose_up_env.log
  # so the rollback assertion can verify the correct images were used.
  cat > "$BASE/bin/docker" <<'STUB'
#!/bin/bash
echo "docker $*" >> "$BASE/docker.log"
if [[ "$1" == "inspect" ]]; then
  if [[ "$*" == *"leasefi_backend"* ]];  then echo "registry.example.com/myapp_back:0.9.0";    exit 0; fi
  if [[ "$*" == *"leasefi_indexer"* ]];  then echo "registry.example.com/myapp_indexer:0.9.0"; exit 0; fi
fi
if [[ "$*" == *"compose"*"up"* ]]; then
  echo "BACK_IMAGE=${BACK_IMAGE} INDEXER_IMAGE=${INDEXER_IMAGE}" >> "$BASE/compose_up_env.log"
fi
exit 0
STUB
  chmod +x "$BASE/bin/docker"

  # curl always returns non-200 -> health-check loop exhausts all 30 iterations
  cat > "$BASE/bin/curl" <<'STUB'
#!/bin/bash
echo "503"
STUB
  chmod +x "$BASE/bin/curl"

  run run_deploy
  [ "$status" -ne 0 ]

  # First compose up = deployment; second compose up = rollback
  UP_COUNT=$(grep -c "compose.*up" "$BASE/docker.log")
  [ "$UP_COUNT" -ge 2 ]

  # The rollback compose up (second entry) must have received the captured previous image tags,
  # not the new images from .env. This assertion would have caught the CORRECTNESS bug where
  # BACK_IMAGE/INDEXER_IMAGE were passed but not consumed by the compose file.
  ROLLBACK_ENV=$(sed -n '2p' "$BASE/compose_up_env.log")
  [[ "$ROLLBACK_ENV" == *"BACK_IMAGE=registry.example.com/myapp_back:0.9.0"* ]]
  [[ "$ROLLBACK_ENV" == *"INDEXER_IMAGE=registry.example.com/myapp_indexer:0.9.0"* ]]
}

# -------------------------------------------------
@test "reports no rollback state when no previous containers exist" {
  # docker inspect exits 1 (containers not running) -> PREV_*_IMAGE stays empty ->
  # .env.rollback is never written -> rollback branch hits "No rollback state found"
  cat > "$BASE/bin/docker" <<'STUB'
#!/bin/bash
echo "docker $*" >> "$BASE/docker.log"
if [[ "$1" == "inspect" ]]; then exit 1; fi
exit 0
STUB
  chmod +x "$BASE/bin/docker"

  cat > "$BASE/bin/curl" <<'STUB'
#!/bin/bash
echo "503"
STUB
  chmod +x "$BASE/bin/curl"

  run run_deploy
  [ "$status" -ne 0 ]
  [[ "$output" == *"No rollback state found"* ]]
}

# -------------------------------------------------
@test "generates self-signed cert and writes sentinel when no cert exists" {
  # Remove pre-populated certs so the bootstrap path is taken
  rm -rf "$LETSENCRYPT_DIR/live/test.example.com"

  # openssl stub: creates the expected output files
  cat > "$BASE/bin/openssl" <<'STUB'
#!/bin/bash
# Parse -keyout and -out flags to create the expected files
key_out=""
cert_out=""
while [[ $# -gt 0 ]]; do
  case "$1" in
    -keyout) key_out="$2"; shift 2 ;;
    -out)    cert_out="$2"; shift 2 ;;
    *)       shift ;;
  esac
done
[[ -n "$key_out"  ]] && mkdir -p "$(dirname "$key_out")"  && echo "FAKE_KEY"  > "$key_out"
[[ -n "$cert_out" ]] && mkdir -p "$(dirname "$cert_out")" && echo "FAKE_CERT" > "$cert_out"
exit 0
STUB
  chmod +x "$BASE/bin/openssl"

  run -0 run_deploy
  [ -f "$LETSENCRYPT_DIR/live/test.example.com/fullchain.pem" ]
  [ -f "$BASE/deploy/.self-signed" ]
}

# -------------------------------------------------
@test "database reset executes when DEPLOYMENT_MODE is dev" {
  # Default .env has DEPLOYMENT_MODE=dev — the DROP SCHEMA block must run.
  run -0 run_deploy
  grep -q "DROP SCHEMA" "$BASE/docker.log"
}

# -------------------------------------------------
@test "database reset is skipped in dev mode when ALLOW_DB_RESET is not true" {
  cat > "$BASE/deploy/.env" <<EOF
DEPLOYMENT_MODE=dev
TAG=registry.example.com/myapp
VERSION=1.0.0
PROJECT_DOMAIN=test.example.com
DATABASE_URL=postgres://postgres:postgres@localhost:54322/postgres
REDIS_PASSWORD=testpass123
S3_BUCKET=test-bucket
EOF

  run -0 run_deploy
  run grep -q "DROP SCHEMA" "$BASE/docker.log"
  [ "$status" -ne 0 ]
}

# -------------------------------------------------
@test "database reset is skipped when DEPLOYMENT_MODE is staging" {
  cat > "$BASE/deploy/.env" <<EOF
DEPLOYMENT_MODE=staging
TAG=registry.example.com/myapp
VERSION=1.0.0
PROJECT_DOMAIN=test.example.com
S3_BUCKET=test-bucket
EOF

  run -0 run_deploy
  run grep -q "DROP SCHEMA" "$BASE/docker.log"
  [ "$status" -ne 0 ]
}

# -------------------------------------------------
@test "database reset is skipped when DEPLOYMENT_MODE is production" {
  cat > "$BASE/deploy/.env" <<EOF
DEPLOYMENT_MODE=production
TAG=registry.example.com/myapp
VERSION=1.0.0
PROJECT_DOMAIN=test.example.com
S3_BUCKET=test-bucket
EOF

  run -0 run_deploy
  run grep -q "DROP SCHEMA" "$BASE/docker.log"
  [ "$status" -ne 0 ]
}

# -------------------------------------------------
@test "calls certbot when sentinel exists and credentials are set" {
  # Sentinel present — certbot path should be taken
  touch "$BASE/deploy/.self-signed"

  # Add certbot creds to .env
  cat >> "$BASE/deploy/.env" <<EOF
CF_DNS_API_TOKEN=fake-cf-token
CERTBOT_EMAIL=test@example.com
EOF

  # certbot stub: succeeds and logs the call
  cat > "$BASE/bin/certbot" <<'STUB'
#!/bin/bash
echo "certbot $*" >> "$BASE/certbot.log"
exit 0
STUB
  chmod +x "$BASE/bin/certbot"

  run -0 run_deploy
  [ -f "$BASE/certbot.log" ]
  grep -q "certonly" "$BASE/certbot.log"
  # Sentinel removed after successful certbot run
  [ ! -f "$BASE/deploy/.self-signed" ]
}
