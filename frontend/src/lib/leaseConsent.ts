/**
 * Builds the canonical lease-consent message both parties sign off-chain.
 *
 * This MUST stay byte-identical to the backend's `lease_consent_message`
 * (`crates/api/src/services/leases/handlers.rs`): the wallet signs exactly these
 * bytes and the backend prepends the Casper `Casper Message:\n` prefix before
 * verifying, so any divergence fails verification (`401`).
 *
 * Format:
 *   LeaseConsent|lease={id}|landlord={landlordId}|tenant={firstTenantId}|rent={monthlyRent}|deposit={securityDeposit}|currency={currency}|start={startDate}|end={endDate}
 *
 * Byte-identity notes:
 *  - `tenant` is the FIRST tenant id, or '' when there are none (matches the
 *    backend's `tenant_ids.first()` → empty string).
 *  - `currency` is '' when null (matches `as_deref().unwrap_or("")`).
 *  - `rent`/`deposit` are f64 amounts rendered with JS `String(n)`, which matches
 *    Rust's `{}` (Display) for every non-exponential value — i.e. all realistic
 *    money (`2500` → "2500", `2500.5` → "2500.5"). Both sides print the shortest
 *    round-trip of the same f64, so they agree.
 *  - `start`/`end` are date-only (`YYYY-MM-DD`), matching the backend's `NaiveDate`
 *    Display; sliced defensively in case a datetime ever arrives.
 *  - `signedAt` is deliberately excluded (it would diverge per party).
 */

import type { Lease } from '@/types/leaseContract';

/** f64 → string matching Rust's `{}` Display for all non-exponential values. */
function formatAmount(amount: number): string {
  return String(amount);
}

/** Backend uses `NaiveDate` Display (date only); keep just `YYYY-MM-DD`. */
function dateOnly(value: string): string {
  return value.slice(0, 10);
}

/** The exact string a party's wallet signs to consent to the lease terms. */
export function buildLeaseConsentMessage(
  lease: Pick<
    Lease,
    | 'id'
    | 'landlordId'
    | 'tenantIds'
    | 'monthlyRent'
    | 'securityDeposit'
    | 'currency'
    | 'startDate'
    | 'endDate'
  >
): string {
  const tenant = lease.tenantIds[0] ?? '';
  return [
    'LeaseConsent',
    `lease=${lease.id}`,
    `landlord=${lease.landlordId}`,
    `tenant=${tenant}`,
    `rent=${formatAmount(lease.monthlyRent)}`,
    `deposit=${formatAmount(lease.securityDeposit)}`,
    `currency=${lease.currency ?? ''}`,
    `start=${dateOnly(lease.startDate)}`,
    `end=${dateOnly(lease.endDate)}`,
  ].join('|');
}
