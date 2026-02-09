/**
 * ICO Purchase Service
 *
 * Handles token purchase transactions on the ICO contract.
 * Supports:
 *   - CSPR native token payments
 *   - CEP-18 token payments (USDT, USDC) with approve flow
 *
 * Entry points called:
 *   - ICO contract: `purchase(purchase_amount: U256, currency: Currency, __cargo_purse: URef)`
 *   - CEP-18 tokens: `approve(spender: Key, amount: U256)` before purchase
 */

import {
  Args,
  CLValue,
  Key,
  URef,
  UrefAccess,
  Transaction,
} from 'casper-js-sdk';

import { ICO_CONFIG } from '@/constants/ico';
import {
  createContractCallTransaction,
  stripHashPrefix,
  getCasperRpcClient,
} from './casperClient';
import { Currency, paymentCurrencyToContractCurrency } from './contractTypes';
import { getAllowance } from './cep18Service';
import type { PaymentCurrency } from '@/types/ico';

// ── Constants ───────────────────────────────────────────────────────

const ICO_HASH = ICO_CONFIG.CONTRACTS.icoAddress;
const TOKEN_DECIMALS = ICO_CONFIG.TOKEN.decimals; // 18
const STABLECOIN_DECIMALS = 6; // USDT/USDC typically use 6 decimals
const CSPR_DECIMALS = 9; // CSPR uses 9 decimals (motes)

// Gas costs (in motes = 1e-9 CSPR)
const GAS_COST = {
  APPROVE: 3_000_000_000n, // 3 CSPR for approve
  BUY_TOKENS_CSPR: 5_000_000_000n, // 5 CSPR for buy with CSPR
  BUY_TOKENS_CEP18: 4_000_000_000n, // 4 CSPR for buy with tokens
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
    case 'CARD':
      return 2; // Fiat cents
    default:
      return 18;
  }
}

/**
 * Gets the contract hash for a CEP-18 currency.
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

// ── Approval functions ──────────────────────────────────────────────

/**
 * Checks if approval is needed for a CEP-18 token purchase.
 */
export async function checkApprovalNeeded(
  senderAccountHash: string,
  amount: string,
  currency: PaymentCurrency,
): Promise<ApprovalCheckResult> {
  // CSPR and CARD don't need approval
  if (currency === 'CSPR' || currency === 'CARD') {
    return { needed: false, currentAllowance: 0n, requiredAmount: 0n };
  }

  const tokenContract = getCurrencyContractHash(currency);
  if (!tokenContract) {
    return { needed: false, currentAllowance: 0n, requiredAmount: 0n };
  }

  const decimals = getDecimals(currency);
  const requiredAmount = toRawAmount(amount, decimals);

  // Get current allowance for ICO contract
  const icoAccountHash = stripHashPrefix(ICO_HASH);
  const currentAllowance = await getAllowance(
    tokenContract,
    senderAccountHash,
    icoAccountHash,
  );

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
  // Create Key from prefixed string (e.g., "hash-abc123...")
  const icoContractWithPrefix = ICO_HASH.startsWith('hash-') ? ICO_HASH : `hash-${ICO_HASH}`;
  const spenderKey = Key.newKey(icoContractWithPrefix);

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
  );
}

// ── Purchase functions ──────────────────────────────────────────────

/**
 * Creates a dummy URef for the __cargo_purse parameter.
 * For CEP-18 token payments, the purse is not used (contract uses transferFrom).
 * For CSPR payments, the attached value is handled by the transaction itself.
 */
function createDummyPurseURef(): URef {
  // Create a zero-filled 32-byte array for an empty/dummy URef
  const emptyData = new Uint8Array(32);
  return new URef(emptyData, UrefAccess.ReadAddWrite);
}

/**
 * Creates a purchase transaction for the ICO contract.
 *
 * The ICO contract entry point signature (from schema):
 *   purchase(purchase_amount: U256, currency: Currency, __cargo_purse: URef)
 *
 * For CSPR payments, the amount is sent as attached value.
 * For CEP-18 payments, the contract will transferFrom the buyer.
 */
export function createPurchaseTransaction(
  senderPublicKey: string,
  amount: string,
  currency: PaymentCurrency,
): Transaction {
  if (currency === 'CARD') {
    throw new Error('CARD payments are handled via fiat on-ramp, not blockchain transaction');
  }

  const decimals = getDecimals(currency);
  const rawAmount = toRawAmount(amount, decimals);
  const contractCurrency = paymentCurrencyToContractCurrency(
    currency as 'CSPR' | 'USDC' | 'USDT'
  );

  // Create a dummy purse URef (for CEP-18 payments, the actual purse is not used)
  const cargoPurse = createDummyPurseURef();

  // Build args for purchase(purchase_amount: U256, currency: Currency, __cargo_purse: URef)
  const args = Args.fromMap({
    purchase_amount: CLValue.newCLUInt256(rawAmount),
    currency: CLValue.newCLUint8(contractCurrency),
    __cargo_purse: CLValue.newCLUref(cargoPurse),
  });

  const gasCost = currency === 'CSPR'
    ? GAS_COST.BUY_TOKENS_CSPR
    : GAS_COST.BUY_TOKENS_CEP18;

  return createContractCallTransaction(
    senderPublicKey,
    ICO_HASH,
    'purchase',
    args,
    gasCost,
  );
}

// Keep old function name as alias for backward compatibility
export const createBuyTokensTransaction = createPurchaseTransaction;

/**
 * Prepares a complete purchase flow.
 * Returns approval transaction (if needed) and purchase transaction.
 */
export async function preparePurchase(
  params: PurchaseParams,
): Promise<PurchaseResult> {
  const { senderPublicKey, senderAccountHash, amount, currency } = params;

  // Check if approval is needed (for CEP-18 tokens)
  const approvalCheck = await checkApprovalNeeded(
    senderAccountHash,
    amount,
    currency,
  );

  let approvalTransaction: Transaction | undefined;
  if (approvalCheck.needed) {
    approvalTransaction = createApproveTransaction(
      senderPublicKey,
      currency,
      amount,
    );
  }

  // Create the purchase transaction
  const purchaseTransaction = createBuyTokensTransaction(
    senderPublicKey,
    amount,
    currency,
  );

  return {
    approvalNeeded: approvalCheck.needed,
    approvalTransaction,
    purchaseTransaction,
  };
}

// ── Transaction submission ──────────────────────────────────────────

/**
 * Submits a signed transaction to the blockchain.
 * Returns the deploy hash.
 */
export async function submitTransaction(
  signedTransaction: Transaction,
): Promise<string> {
  const client = getCasperRpcClient();

  // Submit as Transaction (Casper 2.0) or Deploy (Casper 1.x)
  // For testnet (1.x), we use putDeploy
  const result = await client.putTransaction(signedTransaction);

  console.log('[icoPurchaseService] Transaction submitted:', result);
  return result.transactionHash.toString();
}

/**
 * Gets the status of a submitted transaction.
 */
export async function getTransactionStatus(
  transactionHash: string,
): Promise<{
  status: 'pending' | 'executed' | 'failed';
  errorMessage?: string;
}> {
  const client = getCasperRpcClient();

  try {
    const result = await client.getTransactionByTransactionHash(transactionHash);

    // Check execution results
    const executionInfo = result.executionInfo;
    if (!executionInfo) {
      return { status: 'pending' };
    }

    // Check if execution was successful
    // ExecutionResult has errorMessage property - if undefined/empty, it's success
    const executionResult = executionInfo.executionResult;
    if (executionResult) {
      if (executionResult.errorMessage) {
        return {
          status: 'failed',
          errorMessage: executionResult.errorMessage,
        };
      }
      return { status: 'executed' };
    }

    return { status: 'pending' };
  } catch (err) {
    // Transaction not found yet = still pending
    console.warn('[icoPurchaseService] getTransactionStatus error:', err);
    return { status: 'pending' };
  }
}

// ── Validation ──────────────────────────────────────────────────────

/**
 * Validates purchase parameters before creating transactions.
 */
export function validatePurchase(
  amount: string,
  currency: PaymentCurrency,
  balance: number,
): { valid: boolean; error?: string } {
  const numAmount = parseFloat(amount);

  if (isNaN(numAmount) || numAmount <= 0) {
    return { valid: false, error: 'Invalid amount' };
  }

  // Check minimum/maximum in USD
  const currencyRate = ICO_CONFIG.CURRENCY_RATES[currency];
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
 * Calculates the number of tokens that will be received for a given payment.
 */
export function calculateTokensReceived(
  amount: string,
  currency: PaymentCurrency,
  tokenPriceUsd: number,
): bigint {
  const numAmount = parseFloat(amount);
  if (isNaN(numAmount) || numAmount <= 0 || tokenPriceUsd <= 0) {
    return 0n;
  }

  const currencyRate = ICO_CONFIG.CURRENCY_RATES[currency];
  const amountInUsd = numAmount * currencyRate;
  const tokensFloat = amountInUsd / tokenPriceUsd;

  // Convert to raw amount with token decimals
  return toRawAmount(tokensFloat.toFixed(TOKEN_DECIMALS), TOKEN_DECIMALS);
}
