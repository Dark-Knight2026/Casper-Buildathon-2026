/**
 * Currency choices for the on-chain `create_lease_agreement` call (LA-12): the
 * token `Address` (null = native CSPR) and the decimals used to scale a human
 * amount to smallest units. The landlord picks one in the commit card.
 *
 * The token addresses are the CEP-18 **contract** hashes (`VITE_USD?_CONTRACT_HASH`,
 * surfaced via `ICO_CONFIG`), NOT the instance hashes (those are for state reads).
 * The testnet tokens are tUSDC / tUSDT. USDC/USDT decimals are read on-chain by
 * `cep18Service`; 6 is the standard and a safe default for the scaled prefill —
 * the amount stays editable before signing.
 */

import { ICO_CONFIG } from '@/constants/ico';

export interface CurrencyOption {
  /** Display label and form value. */
  symbol: string;
  /** CEP-18 token contract hash, or null for native CSPR. */
  address: string | null;
  /** Decimals to scale a human amount to the token's smallest unit. */
  decimals: number;
}

/** Selectable currencies, in dropdown order. */
export const LEASE_CURRENCY_OPTIONS: CurrencyOption[] = [
  { symbol: 'CSPR', address: null, decimals: 9 },
  {
    symbol: 'tUSDC',
    address: ICO_CONFIG.CONTRACTS.usdcAddress || null,
    decimals: 6,
  },
  {
    symbol: 'tUSDT',
    address: ICO_CONFIG.CONTRACTS.usdtAddress || null,
    decimals: 6,
  },
];

/** The option for a symbol, defaulting to CSPR for anything unrecognized. */
export function currencyOption(symbol: string): CurrencyOption {
  return (
    LEASE_CURRENCY_OPTIONS.find((o) => o.symbol === symbol) ??
    LEASE_CURRENCY_OPTIONS[0]
  );
}

/**
 * Maps a lease's stored `currency` label to a selectable option symbol. USDC/USDT
 * (and the testnet `tUSD*` forms) map to the token; everything else — including
 * label-only currencies like `cUSD`/`USD` — defaults to CSPR.
 */
export function defaultCurrencySymbol(
  currency: string | null | undefined
): string {
  switch ((currency ?? '').toUpperCase()) {
    case 'USDC':
    case 'TUSDC':
      return 'tUSDC';
    case 'USDT':
    case 'TUSDT':
      return 'tUSDT';
    default:
      return 'CSPR';
  }
}

/**
 * Scales a human amount (e.g. `2500.5`) to a smallest-unit U256 decimal string
 * (e.g. `2500500000` at 6 decimals), exactly — no float rounding.
 */
export function scaleToSmallestUnit(amount: number, decimals: number): string {
  const [intPart, fracPart = ''] = String(amount).split('.');
  const frac = (fracPart + '0'.repeat(decimals)).slice(0, decimals);
  const digits = `${intPart}${frac}`.replace(/^0+(?=\d)/, '');
  return BigInt(digits || '0').toString();
}
