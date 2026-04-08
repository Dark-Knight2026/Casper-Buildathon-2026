# Indexer Integration Tests

## Responsibility Table

| File                      | Responsibility                                                                       |
|---------------------------|--------------------------------------------------------------------------------------|
| address.rs                | Tests `normalize_casper_address` - all address format branches                       |
| backfill_cep18.rs         | Tests CEP-18 backfill: `ft_action_to_event` mapping, HTTP paging, DB integration     |
| backfill_ico.rs           | Tests ICO backfill: HTTP helpers, DB integration                                     |
| config.rs                 | Tests `IndexerConfig::from_env()` validation: required vars, defaults, serial access |
| contract_deploy_blocks.rs | Manual helper (`#[ignore]`) for discovering first deploy block of each contract      |
| event_handlers.rs         | Integration tests for event handlers via `process_event` with DB assertions          |
| event_registry.rs         | Tests `EventType::parse` - raw `(ContractType, event_name)` resolution               |
| processor.rs              | Integration tests for `process_event`: idempotency, error handling, DB state         |
| staking_events.rs         | Integration tests for all 6 staking event handlers                                   |
| streaming.rs              | Integration tests for WebSocket message deserialization and contract helpers         |
| testnet_ico.rs            | Manual testnet tests (`#[ignore]`) for ICO contract interaction                      |
| vesting_events.rs         | Integration tests for ScheduleCreated and TokensClaimed                              |
| common/                   | Shared test infrastructure: migration runner, fake deploys, RLS, JSON payloads       |
