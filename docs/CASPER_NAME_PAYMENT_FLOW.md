# Casper.name Payment Flow (non-crypto user)

**Context:** After KYC completion the user must claim a `*.cspr` name. The user signed in via CSPR.click (Google/Apple/Email) and has a custodial wallet, but no CSPR balance and no crypto experience. Anthony's UX requirement: "feel like Apple Pay".

**Related docs:** [CLIENT_TASKS_AND_PORTFOLIO_SPEC.md](./CLIENT_TASKS_AND_PORTFOLIO_SPEC.md)

---

## Table of contents

1. [Recommended approach](#1-recommended-approach)
2. [Architecture](#2-architecture)
3. [User-facing flow](#3-user-facing-flow)
4. [Backend flow](#4-backend-flow)
5. [DB schema](#5-db-schema)
6. [Pricing strategy](#6-pricing-strategy)
7. [Treasury management](#7-treasury-management)
8. [Error handling](#8-error-handling)
9. [New tasks (BE / FE)](#9-new-tasks-be--fe)
10. [Open questions](#10-open-questions)
11. [Changelog](#11-changelog)

---

## 1. Recommended approach

**Stripe + Backend Relayer** — a meta-transaction pattern. The user pays USD via Stripe, the platform performs all on-chain work on the user's behalf, and the Casper.name is registered directly to the user's CSPR.click address.

### Why this approach
1. **The user never touches crypto** — clicks "Pay $9.99", enters card, done
2. **No on-ramp needed** (MoonPay/Transak charge 3-5% and add 3-5 steps)
3. **Casper.name registration can assign owner = any address**, not necessarily the signer
4. **Centralized control over UX and error handling**

### Alternatives (and why not)
| Option | Why not |
|---|---|
| On-ramp (MoonPay → CSPR → user signs) | 3-5 steps, 3-5% fee, second KYC on the on-ramp side, ~30% fail rate |
| User buys CSPR on an exchange and deposits | Anthony explicitly said: feel like Apple Pay |
| Subscription with name included | Expensive for a landlord who buys once; complicates billing |

---

## 2. Architecture

```
┌──────────┐   USD    ┌────────┐   CSPR    ┌──────────────┐
│  User    ├─────────►│ Stripe │           │ Treasury     │
│ (CSPR.   │          └────────┘           │ Wallet       │
│  click)  │              │                │ (server-side)│
└──────────┘              ▼                └──────┬───────┘
     ▲              ┌─────────┐                   │
     │              │ Backend │◄──────────────────┘
     │              │ Relayer │  signs + submits TX
     │              └────┬────┘
     │                   │ register(name, owner=user_addr)
     │                   ▼
     │            ┌────────────────┐
     └────owns────│ Casper.name    │
                  │ smart contract │
                  └────────────────┘
```

**Components:**
1. **Stripe** — fiat payment + webhooks
2. **Treasury wallet** — server-side ed25519 keypair, holds CSPR balance for registrations
3. **Backend relayer** — signs and submits the registration TX
4. **CSPR.click address** — user's public address; the name is registered to it
5. **Webhook listener** — Stripe `payment_intent.succeeded`

---

## 3. User-facing flow

5 screens, target time-to-completion ≤ 60s:

```
1. KYC complete screen
   ┌────────────────────────────────────────┐
   │  ✓ Verification complete               │
   │                                        │
   │  Last step: claim your LeaseFi name    │
   │  This is how others find you on        │
   │  the platform.                         │
   │                                        │
   │  [ Choose my name ]                    │
   └────────────────────────────────────────┘

2. Name picker
   ┌────────────────────────────────────────┐
   │  Your name on LeaseFi                  │
   │                                        │
   │  [ johnsmith            ] .cspr        │
   │  ✓ Available                           │
   │                                        │
   │  Price: $9.99 (one-time)               │
   │                                        │
   │  [ Continue ]                          │
   └────────────────────────────────────────┘

3. Payment confirmation
   ┌────────────────────────────────────────┐
   │  Confirm purchase                      │
   │                                        │
   │  johnsmith.cspr        $9.99           │
   │  ─────────────────────────             │
   │  Total                  $9.99          │
   │                                        │
   │  [ 💳 Pay with card ]                  │
   │  [ 🍎 Apple Pay ]                      │
   └────────────────────────────────────────┘

4. Stripe Checkout (modal/redirect)

5. Success
   ┌────────────────────────────────────────┐
   │  ✓ johnsmith.cspr is yours!            │
   │                                        │
   │  Receipt sent to your email            │
   │                                        │
   │  [ Continue to dashboard ]             │
   └────────────────────────────────────────┘
```

**Time between Stripe success and the success screen:** 5-15 seconds (chain confirmation). Show progress: `Preparing... → Registering on chain... → Done ✓`

---

## 4. Backend flow

```
1. POST /api/casper-name/check
   body: { name: "johnsmith" }
   → check on-chain availability via Casper.name contract
   → 200 { available: true, priceUsd: 9.99 }

2. POST /api/casper-name/reserve
   body: { name: "johnsmith" }
   → create reservation row (status='reserved', 10-min TTL)
   → DO NOT touch chain yet
   → 200 { reservationId, expiresAt }

3. POST /api/casper-name/checkout
   body: { reservationId }
   → create Stripe Checkout Session
   → metadata: { reservationId, userId, name, userCsprAddress }
   → 200 { checkoutUrl }

4. Webhook: stripe payment_intent.succeeded
   → idempotency: skip if already processed
   → load reservation, verify still valid AND name still available
   → if invalid: refund + notify user
   → enqueue job: registerCasperName(reservationId)

5. Job: registerCasperName
   → load reservation, user's CSPR.click address
   → build TX: register("johnsmith", owner=userAddress)
   → sign with treasury keypair
   → submit to Casper RPC
   → poll for finalization (max 60s)
   → on success:
       - mark reservation as 'registered'
       - persist (userId, name, txHash) into user_names
       - emit event: casper_name.registered
       - send confirmation email
   → on failure (3 retries):
       - refund Stripe payment
       - mark reservation as 'failed'
       - notify user with an apology + alternative options
       - alert ops
```

---

## 5. DB schema

```sql
casper_name_reservations
  id              uuid PK
  user_id         uuid FK
  name            text NOT NULL          -- "johnsmith"
  user_cspr_addr  text NOT NULL          -- public key
  status          enum NOT NULL          -- 'reserved'|'paid'|'registered'|'failed'|'refunded'
  price_usd       numeric(8,2)
  stripe_session  text
  stripe_pi       text                   -- payment intent id
  tx_hash         text
  expires_at      timestamptz
  created_at      timestamptz DEFAULT now()
  updated_at      timestamptz

  UNIQUE (name) WHERE status IN ('reserved','paid','registered')

user_names
  user_id         uuid PK
  name            text UNIQUE NOT NULL
  tx_hash         text
  registered_at   timestamptz
```

---

## 6. Pricing strategy

**MVP recommendation: flat fee $9.99.** Covers:
- Casper.name registration cost (~$X CSPR)
- Gas (~$0.01)
- Stripe fee (2.9% + 30¢ = ~59¢)
- Margin for failed/refunded TX

**Why flat:** simplest UX, no need to explain tiers, the user sees one price.

**Phase 2 options:**
- Tier by length (3-letter premium)
- First year free with paid renewals
- Bundle into landlord/tenant onboarding fee

---

## 7. Treasury management

| Concern | Solution |
|---|---|
| CSPR balance drains | Auto-alert when balance < 1000 CSPR (≈ 100 registrations); ops top-ups via Coinbase OTC |
| Price volatility CSPR/USD | Re-price flat fee monthly; optionally hedge a small reserve in USDT |
| Treasury key compromise | HSM / KMS-encrypted key; multi-sig for top-ups from cold wallet |
| Audit | Every TX logged as `(reservationId, userId, txHash, costCspr, costUsd)` |

---

## 8. Error handling

| Scenario | Behavior |
|---|---|
| Stripe paid, chain TX fails 3× | Auto-refund → email apology + retry button |
| Name reserved, but acquired off-platform by someone else | At step 4 (webhook) re-check availability → refund if taken |
| User abandons after Stripe success | TX still executes, name belongs to user; email reminder with login link |
| Stripe webhook lost | Cron job every 5min: scan `status=reserved AND age > 1h AND payment found` |
| Registration succeeds but DB write fails | Idempotent: TX hash unique constraint on retry |
| User picks an existing name | Step 1 catches it; race condition possible → step 4 catches as fallback |
| Card declined | Stripe handles, user remains on step 3 |
| 3DS challenge | Stripe handles |

---

## 9. New tasks (BE / FE)

### Backend
| # | Task | Estimate |
|---|---|---|
| BE-06 | Stripe integration: Checkout Session + webhook handler + idempotency | 1.5d |
| BE-07 | Treasury wallet + signer service (KMS-managed key) | 2d |
| BE-08 | Casper.name reservation + registration job (with retry/refund) | 2d |
| BE-09 | Refund flow + ops alerts (CSPR balance, failed registrations) | 1d |

### Frontend
| # | Task | Estimate |
|---|---|---|
| FE-05 | Casper.name picker UI (post-KYC step) — name input, availability check, debounced | 1d |
| FE-06 | Stripe Checkout integration (redirect or embedded) | 0.5d |
| FE-07 | Registration progress modal — multi-step states, success/failure | 0.5d |

**Total:** ~6.5d backend, ~2d frontend.

---

## 10. Open questions

1. **Pricing:** flat $9.99, or tier by length?
2. **Renewals:** does Casper.name expire? If yes — auto-renew on the user's saved card?
3. **Multi-name:** can a landlord have a separate business name (`skylineproperties.cspr`)? Anthony said "users only" in MVP, but hinted at business identities later.
4. **Treasury custody:** who manages the treasury wallet — our team or Anthony's side?
5. **Stripe account:** existing LeaseFi merchant account, or new?
6. **Refund policy:** automatic refund vs. manual review?
7. **Casper.name contract API:** do we have docs for `register()` signature, or do we need to integrate with cspr.name's REST API on top?
8. **Edit/transfer name:** can the user change their `*.cspr` later? Sell it? (likely Phase 2)

---

## 11. Changelog

- **2026-04-30** — first version, after the Thursday recurring meet
