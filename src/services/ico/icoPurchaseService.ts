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

import { ICO_CONFIG, getCurrencyRateUsd } from '@/constants/ico';
import {
  createContractCallTransaction,
  stripHashPrefix,
  getCasperRpcClient,
  getAccountMainPurseURef,
} from './casperClient';
import { loadProxyCallerWasm, createProxyCallerTransaction } from './proxyCallerService';
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
  BUY_TOKENS_CSPR: 15_000_000_000n, // 15 CSPR for buy with CSPR (proxy_caller.wasm session code)
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
  // Pass prefixed keys so getAllowance can determine tag bytes (account vs contract)
  const icoContractKey = ICO_HASH.startsWith('hash-') ? ICO_HASH : `hash-${ICO_HASH}`;
  const currentAllowance = await getAllowance(
    tokenContract,
    senderAccountHash,
    icoContractKey,
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
  if (currency === 'CARD') {
    throw new Error('CARD payments are handled via fiat on-ramp, not blockchain transaction');
  }

  const decimals = getDecimals(currency);
  const rawAmount = toRawAmount(amount, decimals);
  const contractCurrency = paymentCurrencyToContractCurrency(
    currency as 'CSPR' | 'USDC' | 'USDT'
  );

  console.log('[createPurchaseTransaction] params:', {
    amount: fromRawAmount(rawAmount, decimals),
    currency,
    rawAmount: rawAmount.toString(),
  });

  // CSPR: use proxy_caller.wasm to create a proper cargo purse
  if (currency === 'CSPR') {
    console.log('[createPurchaseTransaction] Loading proxy_caller.wasm for CSPR...');
    const proxyWasm = await loadProxyCallerWasm();
    console.log('[createPurchaseTransaction] WASM loaded, size:', proxyWasm.length, 'bytes');

    // Entry point args WITHOUT __cargo_purse — the proxy adds it automatically
    const entryPointArgs = Args.fromMap({
      amount_to_spend: CLValue.newCLUInt256(rawAmount),
      currency: CLValue.newCLUint8(contractCurrency),
    });

    const serializedSize = entryPointArgs.toBytes().length;
    console.log('[createPurchaseTransaction] Entry point args serialized:', serializedSize, 'bytes');

    const transaction = createProxyCallerTransaction(
      senderPublicKey,
      ICO_PACKAGE_HASH,
      'purchase',
      entryPointArgs,
      rawAmount,                  // attached_value = CSPR amount in motes
      GAS_COST.BUY_TOKENS_CSPR,  // gas payment
      proxyWasm,
    );

    console.log('[createPurchaseTransaction] Transaction created:', {
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

// ── Contract error code mapping (from ico_schema.json) ──────────────

const CONTRACT_ERROR_MAP: Record<string, string> = {
  '59000': 'Invalid ICO schedule',
  '59001': 'Invalid ICO schedule start time',
  '59002': 'Invalid ICO schedule end time',
  '59003': 'Invalid ICO schedule sale amount',
  '59004': 'Invalid ICO schedule price',
  '59005': 'Invalid amount to spend',
  '59006': 'Unsupported currency',
  '59007': 'No active ICO schedule — sale is not currently open',
  '59008': 'Price oracle unavailable — please try again later',
  '59010': 'Invalid amount attached to transaction',
  '59011': 'Insufficient tokens available for sale',
  '59012': 'Purchase amount below minimum',
  '20000': 'Contract owner not configured',
  '20001': 'Unauthorized: caller is not the owner',
  '20003': 'Unauthorized: missing required role',
  '20004': 'Cannot renounce role for another address',
};

function parseContractError(rawMessage?: string): string {
  if (!rawMessage) return 'Deploy failed';

  const match = rawMessage.match(/User error: (\d+)/);
  if (match) {
    return CONTRACT_ERROR_MAP[match[1]] || rawMessage;
  }

  return rawMessage;
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
        errorMessage: parseContractError(execResult.Failure.error_message),
      };
    }

    return { status: 'pending' };
  } catch (err) {
    // Deploy not found yet = still pending
    console.warn('[icoPurchaseService] getDeployStatus error:', err);
    return { status: 'pending' };
  }
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

  if (isNaN(numAmount) || numAmount <= 0) {
    return { valid: false, error: 'Invalid amount' };
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
  if (isNaN(numAmount) || numAmount <= 0 || tokenPriceUsd <= 0) {
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
