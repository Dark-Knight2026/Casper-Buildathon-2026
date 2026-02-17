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
  Deploy,
  URef,
  PublicKey,
  AccountIdentifier,
} from 'casper-js-sdk';

import { ICO_CONFIG } from '@/constants/ico';
import {
  createDeploy,
  stripHashPrefix,
  getCasperRpcClient,
} from './casperClient';
import { paymentCurrencyToContractCurrency } from './contractTypes';
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
  approvalTransaction?: Deploy;
  /** Purchase transaction */
  purchaseTransaction: Deploy;
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
 * Creates an approve deploy for CEP-18 tokens.
 */
export function createApproveDeploy(
  senderPublicKey: string,
  currency: PaymentCurrency,
  amount: string,
): Deploy {
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

  return createDeploy(
    senderPublicKey,
    tokenContract,
    'approve',
    args,
    GAS_COST.APPROVE,
  );
}

// Keep old function name as alias for backward compatibility
export const createApproveTransaction = createApproveDeploy;

// ── Account helpers ─────────────────────────────────────────────────

/**
 * Fetches the main purse URef for an account via RPC.
 */
async function getMainPurseURef(publicKeyHex: string): Promise<string> {
  const client = getCasperRpcClient();
  const pubKey = PublicKey.fromHex(publicKeyHex);
  const accountId = new AccountIdentifier(undefined, pubKey);
  const info = await client.getAccountInfo(null, accountId);
  return info.account.mainPurse.toJSON();
}

// ── Purchase functions ──────────────────────────────────────────────

/**
 * Creates a purchase deploy for the ICO contract.
 *
 * The ICO contract entry point signature (from schema):
 *   purchase(purchase_amount: U256, currency: Currency, __cargo_purse: URef)
 *
 * For CSPR payments, the amount is attached as payment.
 * For CEP-18 payments, the contract will transferFrom the buyer (after approve).
 */
export function createPurchaseDeploy(
  senderPublicKey: string,
  amount: string,
  currency: PaymentCurrency,
  mainPurseURef: string,
): Deploy {
  if (currency === 'CARD') {
    throw new Error('CARD payments are handled via fiat on-ramp, not blockchain transaction');
  }

  const decimals = getDecimals(currency);
  const rawAmount = toRawAmount(amount, decimals);
  const contractCurrency = paymentCurrencyToContractCurrency(
    currency as 'CSPR' | 'USDC' | 'USDT'
  );

  // Build args for purchase(purchase_amount: U256, currency: Currency, __cargo_purse: URef)
  const purse = URef.fromString(mainPurseURef);

  const args = Args.fromMap({
    purchase_amount: CLValue.newCLUInt256(rawAmount),
    currency: CLValue.newCLUint8(contractCurrency),
    __cargo_purse: CLValue.newCLUref(purse),
  });

  const gasCost = currency === 'CSPR'
    ? GAS_COST.BUY_TOKENS_CSPR
    : GAS_COST.BUY_TOKENS_CEP18;

  return createDeploy(
    senderPublicKey,
    ICO_HASH,
    'purchase',
    args,
    gasCost,
  );
}

// Keep old function names as aliases for backward compatibility
export const createPurchaseTransaction = createPurchaseDeploy;
export const createBuyTokensTransaction = createPurchaseDeploy;

/**
 * Prepares a complete purchase flow.
 * Returns approval deploy (if needed) and purchase deploy.
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

  let approvalTransaction: Deploy | undefined;
  if (approvalCheck.needed) {
    approvalTransaction = createApproveDeploy(
      senderPublicKey,
      currency,
      amount,
    );
  }

  // Fetch sender's main purse for __cargo_purse contract argument
  const mainPurseURef = await getMainPurseURef(senderPublicKey);

  // Create the purchase transaction
  const purchaseTransaction = createPurchaseDeploy(
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

// ── Deploy submission ───────────────────────────────────────────────

/**
 * Submits a signed deploy to the blockchain.
 * Returns the deploy hash.
 */
export async function submitDeploy(
  signedDeploy: Deploy,
): Promise<string> {
  const client = getCasperRpcClient();

  const result = await client.putDeploy(signedDeploy);

  console.log('[icoPurchaseService] Deploy submitted:', result);
  return result.deployHash.toString();
}

// Keep old function name as alias for backward compatibility
export const submitTransaction = submitDeploy;

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
