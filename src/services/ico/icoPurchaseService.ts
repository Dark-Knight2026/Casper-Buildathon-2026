/**
 * ICO Purchase Service
 *
 * Handles token purchase transactions on the ICO contract.
 * Supports:
 *   - CSPR native token payments
 *   - CEP-18 token payments (USDT, USDC) with approve flow
 *
 * Entry points called:
 *   - ICO contract: `purchase(amount_to_spend: U256, currency: Currency, __cargo_purse: URef)`
 *   - CEP-18 tokens: `approve(spender: Key, amount: U256)` before purchase
 */

import {
  Args,
  CLValue,
  Key,
  Transaction,
  URef,
} from 'casper-js-sdk';

import { ICO_CONFIG, getCurrencyRateUsd } from '@/constants/ico';
import logger from '@/lib/logger';
import {
  createContractCallTransaction,
  getAccountMainPurseURef,
} from './casperClient';
import { loadProxyCallerWasm, createProxyCallerTransaction } from './proxyCallerService';
import { paymentCurrencyToContractCurrency } from './contractTypes';
import { getAllowance } from './cep18Service';
import type { PaymentCurrency } from '@/types/ico';

// ── Constants ───────────────────────────────────────────────────────

const ICO_PACKAGE_HASH = ICO_CONFIG.CONTRACTS.icoPackageHash;
const TOKEN_DECIMALS = ICO_CONFIG.TOKEN.decimals; // 18
const STABLECOIN_DECIMALS = 6; // USDT/USDC typically use 6 decimals
const CSPR_DECIMALS = 9; // CSPR uses 9 decimals (motes)

// Gas costs (in motes = 1e-9 CSPR)
const GAS_COST = {
  APPROVE: 3_000_000_000n, // 3 CSPR for approve
  BUY_TOKENS_CSPR: 15_000_000_000n, // 15 CSPR for buy with CSPR (proxy_caller.wasm session code)
  BUY_TOKENS_CEP18: 12_000_000_000n, // 12 CSPR for buy with tokens (purchase + vesting schedule creation)
};

// ── Types ───────────────────────────────────────────────────────────

export interface PurchaseParams {
  /** Buyer's public key (hex string) */
  senderPublicKey: string;
  /** Buyer's account hash (for allowance checks) */
  senderAccountHash: string;
  /** Payment amount in the selected currency (human-readable, e.g., "100" for 100 USDT) */
  amount: string;
  /** Payment currency */
  currency: PaymentCurrency;
  /** ICO schedule ID (optional, defaults to current) */
  scheduleId?: bigint;
  /**
   * Cached allowance from a prior approve tx (raw units).
   * Session-level optimization to skip an extra RPC query when we already
   * know the allowance from a just-completed approve in the same session.
   * Falls back to on-chain `getAllowance` when undefined.
   */
  cachedAllowance?: bigint;
}

export interface PurchaseResult {
  /** Whether approval was needed and executed */
  approvalNeeded: boolean;
  /** Approval transaction (if needed) */
  approvalTransaction?: Transaction;
  /** Purchase transaction */
  purchaseTransaction: Transaction;
}

export interface ApprovalCheckResult {
  /** Whether approval is needed */
  needed: boolean;
  /** Current allowance */
  currentAllowance: bigint;
  /** Required amount */
  requiredAmount: bigint;
}

// ── Helper functions ────────────────────────────────────────────────

/**
 * Converts human-readable amount to raw amount with decimals.
 */
export function toRawAmount(amount: string, decimals: number): bigint {
  const [whole, fraction = ''] = amount.split('.');
  const paddedFraction = fraction.padEnd(decimals, '0').slice(0, decimals);
  return BigInt(whole + paddedFraction);
}

/**
 * Converts raw amount to human-readable amount.
 */
export function fromRawAmount(rawAmount: bigint, decimals: number): string {
  const divisor = 10n ** BigInt(decimals);
  const whole = rawAmount / divisor;
  const fraction = rawAmount % divisor;
  const fractionStr = fraction.toString().padStart(decimals, '0');
  // Remove trailing zeros
  const trimmedFraction = fractionStr.replace(/0+$/, '');
  return trimmedFraction ? `${whole}.${trimmedFraction}` : whole.toString();
}

/**
 * Gets the decimals for a currency.
 */
function getDecimals(currency: PaymentCurrency): number {
  switch (currency) {
    case 'CSPR':
      return CSPR_DECIMALS;
    case 'USDT':
    case 'USDC':
      return STABLECOIN_DECIMALS;
    default:
      return 18;
  }
}

/**
 * Gets the package hash for a CEP-18 currency.
 * Used for approve() transactions — Odra contracts are called via package hash.
 */
function getCurrencyContractHash(currency: PaymentCurrency): string | null {
  switch (currency) {
    case 'USDT':
      return ICO_CONFIG.CONTRACTS.usdtAddress;
    case 'USDC':
      return ICO_CONFIG.CONTRACTS.usdcAddress;
    default:
      return null;
  }
}

/**
 * Gets the contract instance hash for a CEP-18 currency.
 * Used for state queries (allowance, balance) — Odra state dict lives on the instance.
 */
function getCurrencyInstanceHash(currency: PaymentCurrency): string | null {
  switch (currency) {
    case 'USDT':
      return ICO_CONFIG.CONTRACTS.usdtInstanceHash;
    case 'USDC':
      return ICO_CONFIG.CONTRACTS.usdcInstanceHash;
    default:
      return null;
  }
}

// ── Approval functions ──────────────────────────────────────────────

/**
 * Checks if approval is needed for a CEP-18 token purchase.
 */
export async function checkApprovalNeeded(
  senderAccountHash: string,
  amount: string,
  currency: PaymentCurrency,
): Promise<ApprovalCheckResult> {
  // CSPR doesn't need approval
  if (currency === 'CSPR') {
    return { needed: false, currentAllowance: 0n, requiredAmount: 0n };
  }

  const tokenContract = getCurrencyContractHash(currency);
  if (!tokenContract) {
    return { needed: false, currentAllowance: 0n, requiredAmount: 0n };
  }

  const decimals = getDecimals(currency);
  const requiredAmount = toRawAmount(amount, decimals);
  const icoPackageKey = ICO_PACKAGE_HASH.startsWith('hash-') ? ICO_PACKAGE_HASH : `hash-${ICO_PACKAGE_HASH}`;

  // For state queries, use the contract instance hash (not the package hash).
  // Odra state dictionary lives on the contract instance, not the package.
  const instanceHash = getCurrencyInstanceHash(currency) ?? tokenContract;

  // Read allowance from the "allowances" named dictionary (standard CEP-18 layout).
  // Key = blake2b(owner_bytes + spender_bytes).
  // Requires the contract instance hash, not the package hash.
  const currentAllowance = await getAllowance(instanceHash, senderAccountHash, icoPackageKey);

  return {
    needed: currentAllowance < requiredAmount,
    currentAllowance,
    requiredAmount,
  };
}

/**
 * Creates an approve transaction for CEP-18 tokens.
 */
export function createApproveTransaction(
  senderPublicKey: string,
  currency: PaymentCurrency,
  amount: string,
): Transaction {
  const tokenContract = getCurrencyContractHash(currency);
  if (!tokenContract) {
    throw new Error(`No contract address for currency: ${currency}`);
  }

  const decimals = getDecimals(currency);
  const rawAmount = toRawAmount(amount, decimals);

  // Build args for approve(spender: Key, amount: U256)
  // Use ICO package hash as spender — cross-contract calls are identified by package hash
  const icoPackageHash = ICO_CONFIG.CONTRACTS.icoPackageHash;
  const spenderWithPrefix = icoPackageHash.startsWith('hash-') ? icoPackageHash : `hash-${icoPackageHash}`;
  const spenderKey = Key.newKey(spenderWithPrefix);

  const args = Args.fromMap({
    spender: CLValue.newCLKey(spenderKey),
    amount: CLValue.newCLUInt256(rawAmount),
  });

  return createContractCallTransaction(
    senderPublicKey,
    tokenContract,
    'approve',
    args,
    GAS_COST.APPROVE,
    true, // token contracts are package hashes
  );
}

// ── Purchase functions ──────────────────────────────────────────────

/**
 * Creates a purchase transaction for the ICO contract.
 *
 * The ICO contract entry point (Odra #[payable]):
 *   pub fn purchase(&mut self, amount_to_spend: U256, currency: Currency) -> U256
 *
 * For CSPR purchases:
 *   Uses proxy_caller.wasm which creates a temporary cargo purse, funds it
 *   with the exact CSPR amount, and passes it as "__cargo_purse" to the contract.
 *   This is required because Odra's attached_value() reads the cargo purse BALANCE.
 *
 * For CEP-18 purchases (USDT/USDC):
 *   Direct contract call (no CSPR transfer needed, uses approve + transfer_from).
 */
export async function createPurchaseTransaction(
  senderPublicKey: string,
  amount: string,
  currency: PaymentCurrency,
  mainPurseURef: string,
): Promise<Transaction> {
  const decimals = getDecimals(currency);
  const rawAmount = toRawAmount(amount, decimals);
  const contractCurrency = paymentCurrencyToContractCurrency(
    currency as 'CSPR' | 'USDC' | 'USDT'
  );

  logger.log('[createPurchaseTransaction] params:', {
    amount: fromRawAmount(rawAmount, decimals),
    currency,
    rawAmount: rawAmount.toString(),
  });

  // CSPR: use proxy_caller.wasm to create a proper cargo purse
  if (currency === 'CSPR') {
    logger.log('[createPurchaseTransaction] Loading proxy_caller.wasm for CSPR...');
    const proxyWasm = await loadProxyCallerWasm();
    logger.log('[createPurchaseTransaction] WASM loaded, size:', proxyWasm.length, 'bytes');

    // Entry point args WITHOUT __cargo_purse — the proxy adds it automatically
    const entryPointArgs = Args.fromMap({
      amount_to_spend: CLValue.newCLUInt256(rawAmount),
      currency: CLValue.newCLUint8(contractCurrency),
    });

    const serializedSize = entryPointArgs.toBytes().length;
    logger.log('[createPurchaseTransaction] Entry point args serialized:', serializedSize, 'bytes');

    const transaction = createProxyCallerTransaction(
      senderPublicKey,
      ICO_PACKAGE_HASH,
      'purchase',
      entryPointArgs,
      rawAmount,                  // attached_value = CSPR amount in motes
      GAS_COST.BUY_TOKENS_CSPR,  // gas payment
      proxyWasm,
    );

    logger.log('[createPurchaseTransaction] Transaction created:', {
      hash: transaction.hash?.toHex(),
    });

    return transaction;
  }

  // USDT/USDC: direct contract call (no CSPR transfer needed)
  const cargoPurse = URef.fromString(mainPurseURef);
  const args = Args.fromMap({
    amount_to_spend: CLValue.newCLUInt256(rawAmount),
    currency: CLValue.newCLUint8(contractCurrency),
    __cargo_purse: CLValue.newCLUref(cargoPurse),
  });

  return createContractCallTransaction(
    senderPublicKey,
    ICO_PACKAGE_HASH,
    'purchase',
    args,
    GAS_COST.BUY_TOKENS_CEP18,
    true, // ICO is an Odra contract — call via package hash
  );
}

/**
 * Prepares a complete purchase flow.
 * Returns approval transaction (if needed) and purchase transaction.
 */
export async function preparePurchase(
  params: PurchaseParams,
): Promise<PurchaseResult> {
  const { senderPublicKey, senderAccountHash, amount, currency, cachedAllowance } = params;

  // Fetch account's main purse URef (needed for Odra __cargo_purse)
  const mainPurseURef = await getAccountMainPurseURef(senderPublicKey);

  // Check if approval is needed (for CEP-18 tokens).
  // If cachedAllowance is provided (from a prior approve in the same session),
  // skip the on-chain query to save an RPC round-trip.
  let approvalCheck: ApprovalCheckResult;
  if (cachedAllowance !== undefined) {
    const decimals = getDecimals(currency);
    const requiredAmount = toRawAmount(amount, decimals);
    approvalCheck = {
      needed: cachedAllowance < requiredAmount,
      currentAllowance: cachedAllowance,
      requiredAmount,
    };
  } else {
    approvalCheck = await checkApprovalNeeded(senderAccountHash, amount, currency);
  }

  let approvalTransaction: Transaction | undefined;
  if (approvalCheck.needed) {
    approvalTransaction = createApproveTransaction(
      senderPublicKey,
      currency,
      amount,
    );
  }

  // Create the purchase transaction (async for CSPR — loads proxy_caller.wasm)
  const purchaseTransaction = await createPurchaseTransaction(
    senderPublicKey,
    amount,
    currency,
    mainPurseURef,
  );

  return {
    approvalNeeded: approvalCheck.needed,
    approvalTransaction,
    purchaseTransaction,
  };
}

// ── Transaction submission ───────────────────────────────────────────

// ── Contract error code mapping (from ico_schema.json) ──────────────

const CONTRACT_ERROR_MAP: Record<string, string> = {
  '500':   'Invalid ICO schedule',
  '501':   'Invalid ICO schedule start time',
  '502':   'Invalid ICO schedule end time',
  '503':   'Invalid ICO schedule sale amount',
  '504':   'Invalid ICO schedule price',
  '505':   'Invalid amount to spend',
  '506':   'Unsupported currency',
  '507':   'No active ICO schedule — sale is not currently open',
  '508':   'Price oracle unavailable — please try again later',
  '509':   'Address is required',
  '510':   'Invalid amount attached to transaction',
  '511':   'Insufficient tokens available for sale',
  '512':   'Invalid purchase amount',
  '513':   'Invalid vesting duration in ICO schedule',
  '514':   'Vesting cliff exceeds total vesting duration',
  '20000': 'Contract owner not configured',
  '20001': 'Unauthorized: caller is not the owner',
  '20002': 'Unauthorized: caller is not the new owner',
  '20003': 'Unauthorized: missing required role',
  '20004': 'Cannot renounce role for another address',
};

export function parseContractError(rawMessage?: string): string {
  if (!rawMessage) return 'Deploy failed';

  const match = rawMessage.match(/User error: (\d+)/);
  if (match) {
    return CONTRACT_ERROR_MAP[match[1]] || rawMessage;
  }

  return rawMessage;
}

// ── Validation ──────────────────────────────────────────────────────

/**
 * Validates purchase parameters before creating transactions.
 * Note: csprRate is used for UI-side estimation only (min/max USD bounds).
 * The smart contract determines the actual on-chain exchange rate.
 */
export function validatePurchase(
  amount: string,
  currency: PaymentCurrency,
  balance: number,
  csprRate?: number,
): { valid: boolean; error?: string } {
  const numAmount = parseFloat(amount);

  if (isNaN(numAmount) || !isFinite(numAmount) || numAmount <= 0) {
    return { valid: false, error: 'Invalid amount' };
  }

  // Reject sub-precision amounts before they silently truncate to 0n in toRawAmount.
  // E.g. "0.0000001" for USDT (6 decimals) → fraction "0000001".slice(0,6) → "000000" → 0.
  const decimals = getDecimals(currency);
  const fraction = amount.split('.')[1] ?? '';
  if (fraction.length > decimals) {
    return {
      valid: false,
      error: `${currency} supports up to ${decimals} decimal places`,
    };
  }

  // Check minimum/maximum in USD
  let currencyRate: number;
  try {
    currencyRate = getCurrencyRateUsd(currency, csprRate);
  } catch {
    return { valid: false, error: 'CSPR price unavailable — please try again later' };
  }
  const amountInUsd = numAmount * currencyRate;

  if (amountInUsd < ICO_CONFIG.PURCHASE_LIMITS.min) {
    return {
      valid: false,
      error: `Minimum purchase is $${ICO_CONFIG.PURCHASE_LIMITS.min}`
    };
  }

  if (amountInUsd > ICO_CONFIG.PURCHASE_LIMITS.max) {
    return {
      valid: false,
      error: `Maximum purchase is $${ICO_CONFIG.PURCHASE_LIMITS.max.toLocaleString()}`
    };
  }

  // Check balance
  if (numAmount > balance) {
    return { valid: false, error: 'Insufficient balance' };
  }

  return { valid: true };
}

/**
 * Calculates the ESTIMATED number of tokens for UI preview.
 * Actual token allocation is determined by the on-chain contract rate.
 * csprRate is advisory only — staleness/bounds checks are intentionally
 * omitted because this value cannot affect the real purchase outcome.
 */
export function calculateTokensReceived(
  amount: string,
  currency: PaymentCurrency,
  tokenPriceUsd: number,
  csprRate?: number,
): bigint {
  const numAmount = parseFloat(amount);
  if (isNaN(numAmount) || !isFinite(numAmount) || numAmount <= 0 || tokenPriceUsd <= 0) {
    return 0n;
  }

  let currencyRate: number;
  try {
    currencyRate = getCurrencyRateUsd(currency, csprRate);
  } catch {
    return 0n;
  }
  const amountInUsd = numAmount * currencyRate;
  const tokensFloat = amountInUsd / tokenPriceUsd;

  // Convert to raw amount with token decimals
  return toRawAmount(tokensFloat.toFixed(TOKEN_DECIMALS), TOKEN_DECIMALS);
}
