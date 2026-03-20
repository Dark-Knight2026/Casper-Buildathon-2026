#!/usr/bin/env bats
bats_require_minimum_version 1.5.0

setup() {
  export BASE="$BATS_TEST_TMPDIR"

  mkdir -p "$BASE/deploy" "$BASE/bin" "$BASE/nginx"

  # Place script at $BASE/deploy/ so BASH_SOURCE-derived OPT_DIR resolves to $BASE
  cp "$BATS_TEST_DIRNAME/../redeploy.sh" "$BASE/deploy/redeploy.sh"
  chmod +x "$BASE/deploy/redeploy.sh"

  # Default .env consumed by the script
  cat > "$BASE/deploy/.env" <<EOF
DEPLOYMENT_MODE=dev
TAG=registry.example.com/myapp
VERSION=1.0.0
SERVER_DOMAIN=test.example.com
EOF

  # https.conf.template — required by pre-flight check; must be non-empty so envsubst
  # produces a non-empty https.conf
  echo 'server { server_name ${SERVER_DOMAIN}; }' > "$BASE/nginx/https.conf.template"

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

  # Default docker stub: succeeds for every sub-command, logs calls + RUST_LOG
  cat > "$BASE/bin/docker" <<'STUB'
#!/bin/bash
echo "docker $*" >> "$BASE/docker.log"
echo "RUST_LOG=$RUST_LOG" >> "$BASE/env.log"
exit 0
STUB
  chmod +x "$BASE/bin/docker"

  # curl stub: returns 200 so the health-check poll passes immediately
  cat > "$BASE/bin/curl" <<'STUB'
#!/bin/bash
echo "200"
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
  grep -q "RUST_LOG=info,api=debug" "$BASE/env.log"
}

# -------------------------------------------------
@test "sets RUST_LOG to info,api=debug for staging mode" {
  cat > "$BASE/deploy/.env" <<EOF
DEPLOYMENT_MODE=staging
TAG=registry.example.com/myapp
VERSION=1.0.0
EOF

  run -0 run_deploy
  grep -q "RUST_LOG=info,api=debug" "$BASE/env.log"
}

# -------------------------------------------------
@test "sets RUST_LOG to error,api=error for production mode" {
  cat > "$BASE/deploy/.env" <<EOF
DEPLOYMENT_MODE=production
TAG=registry.example.com/myapp
VERSION=1.0.0
EOF

  run -0 run_deploy
  grep -q "RUST_LOG=error,api=error" "$BASE/env.log"
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
  # docker inspect returns a running image for each service so .env.rollback is written
  cat > "$BASE/bin/docker" <<'STUB'
#!/bin/bash
echo "docker $*" >> "$BASE/docker.log"
if [[ "$1" == "inspect" ]]; then
  if [[ "$*" == *"leasefi_backend"* ]];  then echo "registry.example.com/myapp_back:0.9.0";    exit 0; fi
  if [[ "$*" == *"leasefi_indexer"* ]];  then echo "registry.example.com/myapp_indexer:0.9.0"; exit 0; fi
fi
exit 0
STUB
  chmod +x "$BASE/bin/docker"

  # curl always returns non-200 → health-check loop exhausts all 30 iterations
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
}

# -------------------------------------------------
@test "reports no rollback state when no previous containers exist" {
  # docker inspect exits 1 (containers not running) → PREV_*_IMAGE stays empty →
  # .env.rollback is never written → rollback branch hits "No rollback state found"
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
