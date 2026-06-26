/**
 * Types matching the deployed Casper smart contract schemas.
 * Source: docs/casper_contract_schemas/ico_schema.json
 *        docs/casper_contract_schemas/tailor_coin_schema.json
 */

// ── ICO Contract types ─────────────────────────────────────────────

/** Currency enum from ICO contract (discriminant matches on-chain encoding) */
export enum Currency {
  CSPR = 0,
  USDC = 1,
  USDT = 2,
}

/** Maps the frontend PaymentCurrency string to the on-chain Currency enum */
export function paymentCurrencyToContractCurrency(
  currency: 'CSPR' | 'USDC' | 'USDT',
): Currency {
  const map: Record<string, Currency> = {
    CSPR: Currency.CSPR,
    USDC: Currency.USDC,
    USDT: Currency.USDT,
  };
  return map[currency];
}

/** ICOSchedule struct as stored on-chain */
export interface ICOSchedule {
  /** Unix timestamp in milliseconds when this schedule starts */
  startTimestamp: bigint;
  /** Unix timestamp in milliseconds when this schedule ends */
  endTimestamp: bigint;
  /** Total token amount allocated for sale (raw, with decimals) */
  saleAmount: bigint;
  /** Amount of tokens already sold (raw, with decimals) */
  soldAmount: bigint;
  /** Token price in USD (raw, with decimals) */
  price: bigint;
}

/** ICOSchedule with its on-chain ID */
export interface ICOScheduleWithId {
  id: bigint;
  schedule: ICOSchedule;
}

/** Info about a supported currency */
export interface CurrencyInfo {
  supported: boolean;
  address: string | null;
}

// ── CEP-18 Token types ─────────────────────────────────────────────

/** Basic token metadata from a CEP-18 contract */
export interface TokenMetadata {
  name: string;
  symbol: string;
  decimals: number;
  totalSupply: bigint;
}

// ── Common ─────────────────────────────────────────────────────────

/** Possible deploy/transaction statuses when tracking on-chain */
export type DeployStatus = 'pending' | 'processed' | 'failed';
