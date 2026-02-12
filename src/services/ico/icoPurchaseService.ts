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
  Transaction,
  URef,
} from 'casper-js-sdk';

import { ICO_CONFIG } from '@/constants/ico';
import {
  createContractCallTransaction,
  stripHashPrefix,
  getCasperRpcClient,
  getAccountMainPurseURef,
} from './casperClient';
import { paymentCurrencyToContractCurrency } from './contractTypes';
import { getAllowance } from './cep18Service';
import type { PaymentCurrency } from '@/types/ico';

// ── Constants ───────────────────────────────────────────────────────

const ICO_HASH = ICO_CONFIG.CONTRACTS.icoAddress;
const ICO_PACKAGE_HASH = ICO_CONFIG.CONTRACTS.icoPackageHash;
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
 * The ICO contract entry point signature (from schema):
 *   purchase(purchase_amount: U256, currency: Currency, __cargo_purse: URef)
 *
 * `__cargo_purse` is required by the Odra framework for `#[payable]` entry points.
 * It's the caller's purse from which the contract can pull CSPR.
 * We pass the account's main purse URef obtained via RPC.
 */
export function createPurchaseTransaction(
  senderPublicKey: string,
  amount: string,
  currency: PaymentCurrency,
  mainPurseURef: string,
): Transaction {
  if (currency === 'CARD') {
    throw new Error('CARD payments are handled via fiat on-ramp, not blockchain transaction');
  }

  const decimals = getDecimals(currency);
  const rawAmount = toRawAmount(amount, decimals);
  const contractCurrency = paymentCurrencyToContractCurrency(
    currency as 'CSPR' | 'USDC' | 'USDT'
  );

  // Parse the main purse URef (e.g. "uref-abc...def-007")
  const cargoPurse = URef.fromString(mainPurseURef);

  // Build args matching the Rust function signature:
  //   pub fn purchase(&mut self, amount_to_spend: U256, currency: Currency) -> U256
  // Odra uses function parameter names as named arg keys!
  const args = Args.fromMap({
    amount_to_spend: CLValue.newCLUInt256(rawAmount),
    currency: CLValue.newCLUint8(contractCurrency),
    __cargo_purse: CLValue.newCLUref(cargoPurse),
  });

  console.log('[createPurchaseTransaction] args:', {
    purchase_amount: fromRawAmount(rawAmount, decimals),
    currency,
    cargo_purse: mainPurseURef,
  });
  console.log("args", args);

  const gasCost = currency === 'CSPR'
    ? GAS_COST.BUY_TOKENS_CSPR
    : GAS_COST.BUY_TOKENS_CEP18;

  return createContractCallTransaction(
    senderPublicKey,
    ICO_PACKAGE_HASH,
    'purchase',
    args,
    gasCost,
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
  const { senderPublicKey, senderAccountHash, amount, currency } = params;

  // Fetch account's main purse URef (needed for Odra __cargo_purse)
  const mainPurseURef = await getAccountMainPurseURef(senderPublicKey);

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
  const purchaseTransaction = createPurchaseTransaction(
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

/**
 * Submits a signed transaction to the blockchain.
 * Returns the transaction hash.
 */
export async function submitTransaction(
  signedTransaction: Transaction,
): Promise<string> {
  const client = getCasperRpcClient();

  const result = await client.putTransaction(signedTransaction);

  console.log('[icoPurchaseService] Transaction submitted:', result);
  return result.transactionHash.toString();
}

/**
 * Gets the status of a submitted deploy.
 */
export async function getDeployStatus(
  deployHash: string,
): Promise<{
  status: 'pending' | 'executed' | 'failed';
  errorMessage?: string;
}> {
  const client = getCasperRpcClient();

  try {
    const result = await client.getDeploy(deployHash);

    // Check execution results from the raw JSON response
    const execResults = result.rawJSON?.execution_results;
    if (!execResults || execResults.length === 0) {
      return { status: 'pending' };
    }

    // Check if execution was successful
    const execResult = execResults[0]?.result;
    if (execResult?.Success) {
      return { status: 'executed' };
    }

    if (execResult?.Failure) {
      return {
        status: 'failed',
        errorMessage: execResult.Failure.error_message || 'Deploy failed',
      };
    }

    return { status: 'pending' };
  } catch (err) {
    // Deploy not found yet = still pending
    console.warn('[icoPurchaseService] getDeployStatus error:', err);
    return { status: 'pending' };
  }
}

// Keep old function name as alias for backward compatibility
export const getTransactionStatus = getDeployStatus;

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
