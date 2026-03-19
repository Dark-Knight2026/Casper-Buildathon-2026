#!/usr/bin/env bats
bats_require_minimum_version 1.5.0

setup() {
  export BASE="$BATS_TEST_TMPDIR"

  mkdir -p "$BASE/deploy" "$BASE/bin"

  # Patch hardcoded paths to use sandbox directories
  sed \
    -e "s|/opt/itinerary_service/deploy/.env|$BASE/deploy/.env|g" \
    -e "s|OPT_DIR=\"/opt/itinerary_service\"|OPT_DIR=\"$BASE\"|g" \
    "$BATS_TEST_DIRNAME/../redeploy.sh" > "$BASE/redeploy.sh"
  chmod +x "$BASE/redeploy.sh"

  # Default .env consumed by the script
  cat > "$BASE/deploy/.env" <<EOF
DEPLOYMENT_MODE=dev
TAG=registry.example.com/myapp
VERSION=1.0.0
EOF

  # Default docker stub: succeeds for every sub-command, logs calls + RUST_LOG
  cat > "$BASE/bin/docker" <<'STUB'
#!/bin/bash
echo "docker $*" >> "$BASE/docker.log"
echo "RUST_LOG=$RUST_LOG" >> "$BASE/env.log"
exit 0
STUB
  chmod +x "$BASE/bin/docker"

  # install stub: absorbs the write to /etc/docker/daemon.json
  cat > "$BASE/bin/install" <<'STUB'
#!/bin/bash
cat > /dev/null
exit 0
STUB
  chmod +x "$BASE/bin/install"

  export PATH="$BASE/bin:$PATH"
}

teardown() { :; }

run_deploy() {
  bash "$BASE/redeploy.sh"
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
  grep -q "compose.*down" "$BASE/docker.log"
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
