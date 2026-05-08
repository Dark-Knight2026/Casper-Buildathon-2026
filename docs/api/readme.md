# API Endpoints

## Responsibility Table

| File              | Responsibility                                                          |
|-------------------|-------------------------------------------------------------------------|
| analytics.md      | POST /analytics/property-performance (mock implementation)              |
| auth.md           | Auth flow: nonce, login, refresh, logout (cookie-based JWT)             |
| auth_sessions.md  | Auth sessions: list, delete one, revoke-all                             |
| health.md         | GET /health liveness probe                                              |
| ico.md            | ICO endpoints: balance lookup, progress reporting                       |
| staking.md        | Staking endpoints: info, portfolio, earnings, rewards, unbonding        |
| tax.md            | POST /tax/calculate-liability (mock implementation)                     |
| transactions.md   | Transaction history endpoints + TransactionResponse + PaginatedResponse |
| users.md          | Users self-management: UserInfo, /me, /me/email, avatar, role, delete   |
| vesting.md        | Vesting endpoints: schedules, token-supply, release-schedule            |
