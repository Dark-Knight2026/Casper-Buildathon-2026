/**
 * Controlled form for the landlord's on-chain lease values (`create_lease_agreement`).
 *
 * Pure presentation: it renders the fields and reports edits via callbacks. The
 * owning `LeaseOnChainCommitCard` keeps the wallet gating, state machine and the
 * submit action. Amounts are the currency's smallest unit; the tenant id and
 * (for a lease-to-own lease) the equity property id are entered manually.
 */

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  LEASE_CURRENCY_OPTIONS,
  currencyOption,
  defaultCurrencySymbol,
  scaleToSmallestUnit,
} from '@/lib/leaseCurrency';
import type { Lease } from '@/types/leaseContract';

const ONE_MONTH_IN_SECONDS = 30 * 24 * 60 * 60;

export interface LeaseOnChainFormState {
  /** Tenant's on-chain UserRegistry user id (`U256`, decimal digits). */
  tenantUserId: string;
  equityPropertyId: string;
  currencySymbol: string;
  monthlyRentAmount: string;
  securityDepositAmount: string;
  startUnixSeconds: string;
  endUnixSeconds: string;
  invoiceValidityDuration: string;
}

export const isDigits = (value: string) => /^\d+$/.test(value.trim());

/** UTC midnight of a `YYYY-MM-DD` (or ISO) date, as unix seconds. */
function toUnixSeconds(date: string): number {
  return Math.floor(Date.parse(`${date.slice(0, 10)}T00:00:00Z`) / 1000);
}

/**
 * Prefill from the lease: currency from `lease.currency`, amounts scaled to its
 * smallest unit, term aligned to whole 30-day months. The tenant's on-chain user
 * id can't be derived, so it starts blank for the landlord to enter.
 */
export function initialLeaseOnChainForm(lease: Lease): LeaseOnChainFormState {
  const start = toUnixSeconds(lease.startDate);
  const months = Math.max(
    1,
    Math.round((toUnixSeconds(lease.endDate) - start) / ONE_MONTH_IN_SECONDS)
  );
  const symbol = defaultCurrencySymbol(lease.currency);
  const { decimals } = currencyOption(symbol);
  return {
    tenantUserId: '',
    equityPropertyId: '',
    currencySymbol: symbol,
    monthlyRentAmount: scaleToSmallestUnit(lease.monthlyRent ?? 0, decimals),
    securityDepositAmount: scaleToSmallestUnit(
      lease.securityDeposit ?? 0,
      decimals
    ),
    startUnixSeconds: String(start),
    // Aligned to a whole 30-day multiple — the contract reverts otherwise.
    endUnixSeconds: String(start + months * ONE_MONTH_IN_SECONDS),
    invoiceValidityDuration: String(ONE_MONTH_IN_SECONDS),
  };
}

/** Every required field is present and numeric (equity id only when applicable). */
export function isLeaseOnChainFormValid(
  form: LeaseOnChainFormState,
  hasEquity: boolean
): boolean {
  return (
    isDigits(form.tenantUserId) &&
    isDigits(form.monthlyRentAmount) &&
    isDigits(form.securityDepositAmount) &&
    isDigits(form.startUnixSeconds) &&
    isDigits(form.endUnixSeconds) &&
    isDigits(form.invoiceValidityDuration) &&
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
  onCurrencyChange: (symbol: string) => void;
}

export function LeaseOnChainForm({
  form,
  hasEquity,
  equityPropertyId,
  onFieldChange,
  onCurrencyChange,
}: LeaseOnChainFormProps) {
  const field = (
    key: keyof LeaseOnChainFormState,
    label: string,
    placeholder?: string
  ) => (
    <div className="flex flex-col gap-1">
      <Label htmlFor={key} className="text-xs">
        {label}
      </Label>
      <Input
        id={key}
        value={form[key]}
        placeholder={placeholder}
        onChange={(e) => onFieldChange(key, e.target.value)}
        className="font-mono text-sm"
      />
    </div>
  );

  return (
    <>
      <p className="text-sm text-muted-foreground">
        Review the on-chain values for this lease, then sign once. Amounts are
        in the currency's smallest unit and prefilled from the lease — adjust if
        a token's decimals differ.
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
          <div className="flex flex-col gap-1">
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

        <div className="flex flex-col gap-1">
          <Label htmlFor="currencySymbol" className="text-xs">
            Currency
          </Label>
          <Select value={form.currencySymbol} onValueChange={onCurrencyChange}>
            <SelectTrigger id="currencySymbol">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {LEASE_CURRENCY_OPTIONS.map((option) => (
                <SelectItem key={option.symbol} value={option.symbol}>
                  {option.symbol}
                  {option.address
                    ? ` · ${option.decimals} decimals`
                    : ' · native'}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {field('monthlyRentAmount', 'Rent amount (smallest unit) *')}
        {field('securityDepositAmount', 'Deposit amount (smallest unit) *')}
        {field('startUnixSeconds', 'Start (unix seconds)')}
        {field('endUnixSeconds', 'End (unix seconds)')}
        {field('invoiceValidityDuration', 'Invoice validity (seconds)')}
      </div>
    </>
  );
}
