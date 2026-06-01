# Email Verification

End-to-end specification for the email-verification flow: how a user proves ownership of their stored email, how that bumps their trust level, and how the verification link is delivered, retried, and rate-limited.

This is the cross-cutting view. Per-endpoint request/response shapes live in [`../api/auth.md`](../api/auth.md); cookie attributes and TTLs in [`security.md`](security.md); the per-user access cutoff in [`force_revoke.md`](force_revoke.md).

## Verification levels

A user carries a monotonic trust level: `none < email < identity < full`. The order is significant - the gating extractors compare levels with `>=`, so a higher level always satisfies a lower requirement.

The level is **derived, never assigned**. It is recomputed from the verification flags (`email_verified`, and later the KYC flags) by the `trg_users_sync_verification_level` BEFORE-trigger, which runs inside the same `UPDATE` that flips a flag. A handler never writes `verification_level` directly: confirming email sets `email_verified = TRUE` and the trigger raises the level to `email` in the same statement. This keeps the level and the underlying flags impossible to drift apart.

`identity` and `full` are wired now but produced by the KYC work, not this flow.

## Endpoints

Three endpoints, all mounted under the public auth router but guarded per-handler by the `AuthUser` extractor (same JWT validation as `require_auth`) - a user must be logged in to verify their own email, and the address is always read from the access cookie, never from the request body.

- `POST /api/v1/auth/verify/email/send` - issue a verification link to the user's stored email.
- `POST /api/v1/auth/verify/email/resend` - same logic and same rate-limit slot as `send`; a separate route only so the UI can present "send" and "resend" as distinct buttons without the backend tracking which happened.
- `POST /api/v1/auth/verify/email/confirm` - redeem the link, flip `email_verified`, and re-issue the token pair.

### send / resend

The ordering is deliberate so a wallet-only user never burns a rate-limit slot on a request that cannot succeed:

1. Read-only rate-limit check (does **not** increment). Over the limit -> `429 rate_limited`.
2. Fetch the stored email; a `NULL` email -> `400 email_not_set`. Still no counter touched.
3. Increment both rate-limit counters now that the request is genuinely actionable.
4. Generate an opaque token, store only its hash (24h TTL), and attempt delivery.

Delivery outcome maps as follows:

- **Success** -> `200 { "status": "sent" }`.
- **Transient** mailer failure -> the message is enqueued in `email_send_retries` for background delivery and the user still gets `200 sent`; the counter stays incremented because the mail _will_ go out.
- **Permanent** mailer failure -> the token slot is cleared and the counter is decremented (so the user is not blocked by a dead send), then `500 email_send_failed`.

### confirm

The token slot is consumed by `GETDEL` regardless of the subsequent compare, so a single wrong attempt invalidates the link and forces a fresh send - this is the brute-force backstop.

1. Length-only shape check (`43` chars) before touching Redis -> `400 bad_token_format` on mismatch.
2. `GETDEL` the stored hash. A miss -> `404 invalid_or_expired_token` (expired, never issued, or already consumed).
3. Constant-time compare of the presented hash against the stored one. A mismatch -> `401 invalid_or_expired_token`.
4. `confirm_email_verification` flips `email_verified` and writes the audit row in one transaction; the level trigger fires in the same statement.

The outcome drives token re-issue (below).

## Token model

The plaintext token is `32` random bytes encoded as `URL_SAFE_NO_PAD` base64 - exactly `43` characters - and travels only inside the email URL (`{frontend_url}/verify-email?token=...`). Server-side, only `sha256(plaintext)` is stored, in Redis under key `verify:email:{user_id}` with a 24-hour TTL. Confirm uses an atomic `GETDEL` so a token cannot be redeemed twice, and a constant-time compare on the hashes as defence-in-depth.

Storing by `{user_id}` (rather than by token) means a fresh `send` overwrites any outstanding token for that user: only the most recent link is ever valid.

## Token re-issue on confirm

The verification level lives in the access JWT, so confirming email must refresh the user's tokens for the new level to take effect immediately rather than after the next natural refresh.

- **Genuine transition** (`email_verified` went `false -> true`): a new refresh family is minted (revoking the previous one) and a new access JWT carrying the bumped `verification_level` is issued; both are returned via `Set-Cookie`, alongside the updated `UserInfo` in the response body.
- **Already verified** (idempotent double-tap, or verified by another path): the current `UserInfo` is returned with **no** `Set-Cookie` and **no** family revoke - revoking for a no-op would sign the user out of their other devices. The access claim catches up within one refresh cycle.

**Frontend contract:** after a successful confirm, the client must adopt the `UserInfo` from the response body (or re-fetch `GET /users/me`). The old access cookie still carries the pre-confirm level until it is replaced, so any view that gates on `verification_level` must read the fresh profile, not a cached one.

## Rate limiting

Two sliding windows per user, shared across `send` and `resend`:

- `1` request per minute - key `verify:email:send:1m:{user_id}`.
- `5` requests per hour - key `verify:email:send:1h:{user_id}`.

The check is read-only and runs before the email-existence guard; the increment happens only once the request is actionable. On a **Permanent** mailer failure the increment is compensated (decremented) so a dead send does not consume the user's quota. A **Transient** failure is _not_ compensated, because the retry queue will still deliver it.

## Retry queue and worker

A transient mailer failure on `send` enqueues the message in `email_send_retries` and a background worker drives delivery. Key columns: `to_address` / `subject` / `body` (the payload, re-sent verbatim), `attempts` (incremented at claim time), `status` (`pending` -> `completed` | `failed`), `next_retry_at`, `completed_at`, `last_error`.

The worker (`workers::email_retry`) is spawned **only when a real provider is configured** - under the logging stub nothing ever lands in the queue, so the worker would have no work.

- **Retry tick** every `60s`: claims up to `50` due rows via a single `FOR UPDATE SKIP LOCKED` CTE (so concurrent workers carve disjoint batches), then re-sends each.
- **Backoff** by attempt: `1m, 5m, 30m, 2h, 12h, 24h`; the last value saturates, so further attempts reuse the 24h gap rather than growing past a day.
- **Max attempts** `12`: past this, a Transient error is promoted to terminal `failed` so a misclassified permanent fault cannot retry forever.
- **Cleanup tick** every `24h`: deletes terminal (`completed` / `failed`) rows older than `30` days, keeping the table bounded.

`claim` ordering is FIFO-best-effort (`ORDER BY next_retry_at`), which `SKIP LOCKED` does not preserve globally across workers - acceptable for verification mail, not for strict-ordering use cases.

## Delivery provider

The sender is selected at startup by the presence of `POSTMARK_SERVER_TOKEN`: configured -> `PostmarkSender`, otherwise the no-delivery `LoggingEmailSender` dev stub. The stub never returns a transient error, so the retry worker and queue stay dormant in local development.

Postmark deliverability checklist for DevOps (one-time, per sending domain):

- Verify a **Sender Signature** for the from-address, or verify the whole domain.
- Add the **DKIM** TXT record Postmark provides, so receivers can authenticate the mail.
- Add the **Return-Path** CNAME record, so SPF aligns to your domain instead of Postmark's shared one.
- A Postmark account in Test/Pending-approval mode only delivers to your own confirmed signatures; full delivery needs account approval.

## MVP scope and follow-ups

These are deliberate cuts to be revisited before production launch, not gaps in the current behaviour:

- **Plain-text only:** verification mail has no HTML alternative yet. Postmark sender-reputation favours multipart messages, so an HTML part is a near-term follow-up.
- **Transaction unification:** the confirm path issues the refresh-family revoke and the `email_verified` update as separate statements. An executor-accepting variant of `issue_login_refresh_token` would let the revoke join the `UPDATE` + audit in one transaction.
- **Email-change consistency:** the older `confirm_email_change` flow predates the constant-time compare used here; aligning it would make the two confirm paths uniform.
