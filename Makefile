SHELL := /bin/bash

.PHONY: \
 help \
 env-up env-down migrate restart  \
 check validate fmt lint openapi prepare \
 test test-one test-in test-not \
 run index clean deploy \

help: ## Show available targets
	@grep -E '^[a-zA-Z0-9_.-]+:.*?## ' Makefile | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "  make %-10s %s\n", $$1, $$2}'

env-up: ## Start Supabase, Redis, and MinIO
	@echo "[*] Starting Supabase..."
	@supabase start
	@echo "[*] Starting Redis and MinIO..."
	@docker compose up -d redis minio minio-init

env-down: ## Stop Supabase, Redis, MinIO, and test database
	@echo "[*] Stopping Redis and MinIO..."
	@docker compose down --volumes
	@echo "[*] Stopping test database..."
	@docker compose -p leasefi-test -f docker-compose.test.yml down --volumes
	@echo "[*] Stopping Supabase..."
	@supabase stop

migrate: ## Reset local database and apply all migrations
	@echo "[*] Resetting database and applying migrations..."
	@supabase db reset

restart: env-down env-up migrate ## Restart environment and run migrations

validate: check test ## Full production validation

check: fmt prepare lint openapi ## Quick code quality check

fmt: ## Check and fix formatting if needed
	@echo "[*] Checking formatting..."
	@cargo fmt --all -- --check \
		|| (echo "[*] Formatting code..." && cargo fmt --all)

lint: ## Run clippy in strict mode
	@echo "[*] Running clippy..."
	@cargo clippy --workspace --all-targets --all-features -- -D warnings

openapi: ## Check all ToSchema types are registered in openapi.rs
	@echo "[*] Checking OpenAPI schema completeness..."
	@missing=0; \
	for f in $$(find crates/api/src -name 'models.rs' -type f | sort); do \
		for name in $$(grep -A5 'derive.*ToSchema' "$$f" \
			| grep -oE 'pub (struct|enum) [A-Za-z0-9_]+' \
			| awk '{print $$3}'); do \
			if ! grep -q "$$name" crates/api/src/openapi.rs; then \
				echo "  $${f#crates/api/src/}: $$name"; \
				missing=$$((missing + 1)); \
			fi; \
		done; \
	done; \
	if [ "$$missing" -gt 0 ]; then \
		echo ""; \
		echo "[!] $$missing type(s) with ToSchema not found in openapi.rs"; \
		exit 1; \
	fi

prepare: ## Generate SQLx offline query metadata for CI builds (requires bash/zsh)
	@echo "[*] Generating SQLx offline query metadata..."
	@test -f .env || (echo "Error: .env file not found" && exit 1)
	@set -eo pipefail; \
		set -a; source ./.env; set +a; \
		cargo sqlx prepare --workspace -- --all-features --tests 2>&1 \
		| sed 's/^query/    query/'

test: ## Run nextest (use ARGS="..." for extra arguments)
	@echo "[*] Starting test database..."
	@docker compose -p leasefi-test -f docker-compose.test.yml up -d --wait
	@echo "[*] Running tests..."
	@DATABASE_URL=postgres://postgres:postgres@127.0.0.1:5433/postgres \
		cargo nextest run --all-features --no-fail-fast $(ARGS)

test-one: ## Run single test: `make test-one <test_name>`
	@$(MAKE) test ARGS="$(filter-out $@,$(MAKECMDGOALS))"

test-in: ## Run tests in module: `make test-in <module_name>`
	@$(MAKE) test ARGS="--test $(filter-out $@,$(MAKECMDGOALS))"

test-not: ## Exclude tests: `make test-not <test1> <test2> ...`
	@expr=$$(echo "$(filter-out $@,$(MAKECMDGOALS))" \
		| awk '{for(i=1;i<=NF;i++){printf "not test(%s)%s", $$i, (i<NF?" and ":"")}}'); \
	$(MAKE) test ARGS="-E '$$expr'"

run: ## Run API server with .env loaded
	@set -a && . ./.env && set +a && cargo run --bin api

index: ## Run blockchain indexer with .env loaded
	@set -a && . ./.env && set +a && cargo run --bin indexer

clean: ## Clean build artifacts
	@echo "[*] Cleaning build artifacts..."
	@cargo clean

# Deployment ===================================================================

## Deploys using tools from the container
deploy:
	@echo "[START] Redirect to <./deploy/Makefile.deploy>"
	@$(MAKE) --no-print-directory -f ./deploy/Makefile.deploy deploy

# Prevent "No rule to make target" error for arguments
#   %: — catch-all target, matches any unknown target (e.g. arguments like "test_name")
#   @: — no-op command, does nothing silently
%:
	@:
