# API Endpoints

## Responsibility Table

| File              | Responsibility                                                                                        |
| ----------------- | ----------------------------------------------------------------------------------------------------- |
| analytics.md      | POST /analytics/property-performance (mock implementation)                                            |
| applications.md   | Rental applications: submit/draft, review lifecycle, landlord search, notes, background checks, score |
| auth.md           | Auth flow: nonce, login, refresh, logout (cookie-based JWT)                                           |
| auth_sessions.md  | Auth sessions: list, delete one, revoke-all                                                           |
| favorites.md      | Favorites: list, ids, idempotent save, remove (tenant)                                                |
| health.md         | GET /health liveness probe                                                                            |
| ico.md            | ICO endpoints: balance lookup, progress reporting                                                     |
| invoices.md       | Invoices: party-scoped list/detail + filters, settle (pay_invoice), receipt, dashboard summary        |
| leases.md         | Leases: draft, sign (Casper consent), commit on-chain, document, lifecycle                            |
| listings.md       | Listings: search, detail, landlord CRUD, lifecycle, view, statistics                                  |
| listings_media.md | Listing provenance & media: authority docs, Fair Housing screen, media upload/moderation              |
| properties.md     | Properties: dedup upsert, edit, detail, listing history, geo search, registration hash                |
| renewals.md       | Renewals: landlord offer, tenant accept/reject/counter, negotiation thread                            |
| staking.md        | Staking endpoints: info, portfolio, earnings, rewards, unbonding                                      |
| tax.md            | POST /tax/calculate-liability (mock implementation)                                                   |
| transactions.md   | Transaction history endpoints + TransactionResponse + PaginatedResponse                               |
| users.md          | Users self-management: UserInfo, /me, /me/email, avatar, role, delete                                 |
| vesting.md        | Vesting endpoints: schedules, token-supply, release-schedule                                          |
| viewings.md       | Viewings: book, list, confirm/cancel (pending -> confirmed/cancelled)                                 |
