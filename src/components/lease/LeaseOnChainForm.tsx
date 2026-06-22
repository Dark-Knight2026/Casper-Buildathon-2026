/**
 * Controlled form for the landlord's on-chain lease values (`create_lease_agreement`).
 *
 * Pure presentation: it renders the fields and reports edits via callbacks. The
 * owning `LeaseOnChainCommitCard` keeps the wallet gating, state machine and the
 * submit action — and converts these human-friendly values (tUSDC amounts, local
 * date-times) to the contract's units (smallest unit, unix seconds) at submit.
 * The tenant id and (for a lease-to-own lease) the equity property id are entered
 * manually. Rent and deposit are always in tUSDC, so there is no currency choice.
 */

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { Lease } from '@/types/leaseContract';

const DAY_IN_SECONDS = 24 * 60 * 60;
const ONE_MONTH_IN_SECONDS = 30 * DAY_IN_SECONDS;
/** Default grace period a tenant has to pay each monthly invoice. */
const DEFAULT_INVOICE_VALIDITY_DAYS = 30;

export interface LeaseOnChainFormState {
  /** Tenant's on-chain UserRegistry user id (`U256`, decimal digits). */
  tenantUserId: string;
  equityPropertyId: string;
  /** Monthly rent, as a human tUSDC amount (e.g. `2500.50`). */
  monthlyRentAmount: string;
  /** Security deposit, as a human tUSDC amount. */
  securityDepositAmount: string;
  /** Start, as a `datetime-local` value (`YYYY-MM-DDTHH:mm`) in local time. */
  startDateTime: string;
  /** End, as a `datetime-local` value in local time. */
  endDateTime: string;
  /** Days a tenant has to pay each invoice (converted to seconds at submit). */
  invoiceValidityDays: string;
}

/** Whole days as seconds — the unit the contract expects. */
export const daysToSeconds = (days: string) =>
  String(Number(days.trim()) * DAY_IN_SECONDS);

export const isDigits = (value: string) => /^\d+$/.test(value.trim());

/** A non-negative decimal amount (e.g. `2500`, `2500.50`). */
export const isAmount = (value: string) => /^\d+(\.\d+)?$/.test(value.trim());

/** A `datetime-local` value the browser (and `Date`) can parse. */
export const isDateTime = (value: string) => !Number.isNaN(Date.parse(value));

/** UTC midnight of a `YYYY-MM-DD` (or ISO) date, as unix seconds. */
function toUnixSeconds(date: string): number {
  return Math.floor(Date.parse(`${date.slice(0, 10)}T00:00:00Z`) / 1000);
}

/** Unix seconds as a `datetime-local` value (`YYYY-MM-DDTHH:mm`) in local time. */
function toDateTimeLocal(seconds: number): string {
  const utc = new Date(seconds * 1000);
  const local = new Date(utc.getTime() - utc.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 16);
}

/** A `datetime-local` value (local time) back to unix seconds. */
export function dateTimeLocalToUnixSeconds(value: string): number {
  return Math.floor(new Date(value).getTime() / 1000);
}

/**
 * Prefill from the lease: rent/deposit as their human tUSDC amounts, the term
 * shown as local date-times and aligned to whole 30-day months. The tenant's
 * on-chain user id can't be derived, so it starts blank for the landlord.
 */
export function initialLeaseOnChainForm(lease: Lease): LeaseOnChainFormState {
  const start = toUnixSeconds(lease.startDate);
  const months = Math.max(
    1,
    Math.round((toUnixSeconds(lease.endDate) - start) / ONE_MONTH_IN_SECONDS)
  );
  return {
    tenantUserId: '',
    equityPropertyId: '',
    monthlyRentAmount: String(lease.monthlyRent ?? 0),
    securityDepositAmount: String(lease.securityDeposit ?? 0),
    startDateTime: toDateTimeLocal(start),
    // Aligned to a whole 30-day multiple — the contract reverts otherwise.
    endDateTime: toDateTimeLocal(start + months * ONE_MONTH_IN_SECONDS),
    invoiceValidityDays: String(DEFAULT_INVOICE_VALIDITY_DAYS),
  };
}

/** Every required field is present and well-formed (equity id only when applicable). */
export function isLeaseOnChainFormValid(
  form: LeaseOnChainFormState,
  hasEquity: boolean
): boolean {
  return (
    isDigits(form.tenantUserId) &&
    isAmount(form.monthlyRentAmount) &&
    isAmount(form.securityDepositAmount) &&
    isDateTime(form.startDateTime) &&
    isDateTime(form.endDateTime) &&
    isDigits(form.invoiceValidityDays) &&
    (hasEquity ? isDigits(form.equityPropertyId) : true)
  );
}

interface LeaseOnChainFormProps {
  form: LeaseOnChainFormState;
  /** Whether the lease is lease-to-own and so needs an equity property id. */
  hasEquity: boolean;
  /** The off-chain equity property UUID, shown as a hint when `hasEquity`. */
  equityPropertyId?: string | null;
  onFieldChange: <K extends keyof LeaseOnChainFormState>(
    key: K,
    value: string
  ) => void;
}

export function LeaseOnChainForm({
  form,
  hasEquity,
  equityPropertyId,
  onFieldChange,
}: LeaseOnChainFormProps) {
  const field = (
    key: keyof LeaseOnChainFormState,
    label: string,
    opts: { type?: string; placeholder?: string; mono?: boolean } = {}
  ) => (
    <div className="flex flex-col gap-1">
      <Label htmlFor={key} className="text-xs">
        {label}
      </Label>
      <Input
        id={key}
        type={opts.type ?? 'text'}
        value={form[key]}
        placeholder={opts.placeholder}
        onChange={(e) => onFieldChange(key, e.target.value)}
        className={opts.mono ? 'font-mono text-sm' : 'text-sm'}
      />
    </div>
  );

  return (
    <>
      <p className="text-sm text-muted-foreground">
        Review the on-chain values for this lease, then sign once. Rent and
        deposit are in tUSDC; the term is shown in your local time.
      </p>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="flex flex-col gap-1 sm:col-span-2">
          <Label htmlFor="tenantUserId" className="text-xs">
            Tenant on-chain user id *
          </Label>
          <Input
            id="tenantUserId"
            value={form.tenantUserId}
            placeholder="e.g. 42"
            onChange={(e) => onFieldChange('tenantUserId', e.target.value)}
            className="font-mono text-sm"
          />
          <p className="text-[11px] text-muted-foreground">
            {form.tenantUserId
              ? isDigits(form.tenantUserId)
                ? 'The tenant’s UserRegistry user id.'
                : 'Must be a whole number (the tenant’s on-chain user id).'
              : 'The tenant’s UserRegistry user id (a whole number).'}
          </p>
        </div>

        {hasEquity && (
          <div className="flex flex-col gap-1 sm:col-span-2">
            <Label htmlFor="equityPropertyId" className="text-xs">
              Equity property on-chain id (lease-to-own) *
            </Label>
            <Input
              id="equityPropertyId"
              value={form.equityPropertyId}
              onChange={(e) =>
                onFieldChange('equityPropertyId', e.target.value)
              }
              className="font-mono text-sm"
            />
            <p className="text-[11px] text-muted-foreground">
              Lease-to-own for property{' '}
              <span className="font-mono">{equityPropertyId}</span> — enter its
              on-chain id.
            </p>
          </div>
        )}

        {field('monthlyRentAmount', 'Monthly rent (tUSDC) *', {
          type: 'number',
          placeholder: '0.00',
        })}
        {field('securityDepositAmount', 'Security deposit (tUSDC) *', {
          type: 'number',
          placeholder: '0.00',
        })}
        {field('startDateTime', 'Start date & time *', {
          type: 'datetime-local',
        })}
        {field('endDateTime', 'End date & time *', { type: 'datetime-local' })}
        {field('invoiceValidityDays', 'Invoice validity (days)', {
          type: 'number',
          placeholder: '30',
        })}
      </div>
    </>
  );
}
