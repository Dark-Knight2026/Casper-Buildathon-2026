# LEASEFI

## Build

```bash
cargo odra build
```

## Test

```bash
cargo odra test
```

## Generate schema (ABI)

```bash
cargo odra schema
```

## Deploy

Specify a file with environmental variables to use during deploy via `ODRA_CASPER_LIVENET_ENV` variable.

```bash
ODRA_CASPER_LIVENET_ENV=env/casper-testnet cargo run --bin leasefi_contracts_cli deploy
```

## Use CLI

Specify a file with environmental variables to use during deploy via `ODRA_CASPER_LIVENET_ENV` variable.

```bash
ODRA_CASPER_LIVENET_ENV=env/casper-testnet cargo run --bin leasefi_contracts_cli
```
