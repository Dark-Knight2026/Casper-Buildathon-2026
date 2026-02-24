/**
 * Casper RPC client — singleton wrapper around casper-js-sdk v5.
 *
 * Used for:
 *   • Reading contract state via `queryLatestGlobalState`
 *   • Reading dictionary items via `getDictionaryItemByIdentifier`
 *   • Submitting & tracking deploys/transactions
 *
 * High-level balance / token queries still go through the CSPR Cloud REST API
 * (see useWalletBalances hook) because it handles pagination and indexing.
 */

import {
  HttpHandler,
  RpcClient,
  CLValue,
  type StoredValue,
  type QueryGlobalStateResult,
  type StateGetDictionaryResult,
  ParamDictionaryIdentifier,
  ParamDictionaryIdentifierContractNamedKey,
  EntityAddr,
  EntityIdentifier,
  Deploy,
  DeployHeader,
  ExecutableDeployItem,
  StoredContractByHash,
  ContractHash,
  Transaction,
  TransactionV1,
  ContractCallBuilder,
  Args,
  PublicKey,
  Timestamp,
  Duration,
} from 'casper-js-sdk';

import { ICO_CONFIG } from '@/constants/ico';
import logger from '@/lib/logger';


// ── Singleton ──────────────────────────────────────────────────────

let rpcClient: RpcClient | null = null;

export function getCasperRpcClient(): RpcClient {
  if (!rpcClient) {
    // Auth is handled by the Vite dev proxy (see vite.config.ts /api/casper-rpc).
    // No custom headers here — custom headers trigger CORS preflight in the browser.
    const handler = new HttpHandler(ICO_CONFIG.CASPER.rpcUrl, 'fetch');
    rpcClient = new RpcClient(handler);
  }
  return rpcClient;
}


// ── Key helpers ────────────────────────────────────────────────────

/**
 * Returns the global-state key for a contract.
 *
 * This testnet stores contracts under the legacy `hash-<hex>` format
 * (Casper 1.x), NOT the Casper 2.0 `entity-contract-<hex>` format.
 * The input is expected to already be in `hash-<hex>` form from .env.
 */
export function contractHashToEntityKey(hash: string): string {
  // Ensure we always have the `hash-` prefix
  if (hash.startsWith('hash-')) return hash;
  const hex = hash.replace(/^(entity-contract-|contract-)/, '');
  return `hash-${hex}`;
}

/**
 * Strips the `hash-` prefix from a contract hash, returning only the hex.
 */
export function stripHashPrefix(hash: string): string {
  return hash.replace(/^(hash-|contract-)/, '');
}

// ── Account helpers ─────────────────────────────────────────────────

/**
 * Returns the account's main purse URef string (e.g. "uref-abc...def-007").
 *
 * Needed for Odra `#[payable]` entry points that require `__cargo_purse: URef`.
 * The main purse URef grants the contract one-time access to transfer CSPR
 * from the caller's purse during the deploy execution.
 */
export async function getAccountMainPurseURef(publicKeyHex: string): Promise<string> {
  const client = getCasperRpcClient();
  const pk = PublicKey.fromHex(publicKeyHex);
  const accountHashHex = pk.accountHash().toPrefixedString().replace(/^account-hash-/, '');
  const accountKey = `account-hash-${accountHashHex}`;

  const stateResult = await client.queryLatestGlobalState(accountKey, []);
  const mainPurse: string | undefined =
    stateResult.rawJSON?.stored_value?.Account?.main_purse;
  logger.log('[casperClient] queryLatestGlobalState for account main purse:', {
    accountKey,
    stateResult,
  });
  
  if (!mainPurse) {
    throw new Error('Could not find main purse for account');
  }

  logger.log('[casperClient] main purse URef:', mainPurse);
  return mainPurse;
}

// ── Query helpers ──────────────────────────────────────────────────

/**
 * Reads a named key from a contract entity via the latest global state.
 *
 * @param contractHash  Contract hash in `hash-<hex>` format
 * @param path          Named key path (e.g. `['schedules_count']`)
 * @returns The StoredValue at that path, or null if not found
 */
export async function queryContractState(
  contractHash: string,
  path: string[],
): Promise<StoredValue | null> {
  const client = getCasperRpcClient();
  const entityKey = contractHashToEntityKey(contractHash);

  try {
    const result: QueryGlobalStateResult =
      await client.queryLatestGlobalState(entityKey, path);
    return result.storedValue;
  } catch (err) {
    // RPC returns error when path doesn't exist — treat as null
    logger.warn(
      `[casperClient] queryContractState failed for ${entityKey} path=[${path.join(',')}]:`,
      err,
    );
    return null;
  }
}

/**
 * Reads a dictionary item from a contract.
 *
 * @param contractHash   Contract hash in `hash-<hex>` format
 * @param dictionaryName The dictionary's named key in the contract
 * @param itemKey        The dictionary item key (string)
 * @returns The StoredValue, or null if not found
 */
export async function queryDictionaryItem(
  contractHash: string,
  dictionaryName: string,
  itemKey: string,
): Promise<StoredValue | null> {
  const client = getCasperRpcClient();
  const entityKey = contractHashToEntityKey(contractHash);

  const identifier = new ParamDictionaryIdentifier(
    undefined,
    new ParamDictionaryIdentifierContractNamedKey(
      entityKey,
      dictionaryName,
      itemKey,
    ),
  );

  try {
    const result: StateGetDictionaryResult =
      await client.getDictionaryItemByIdentifier(null, identifier);
    return result.storedValue;
  } catch (err) {
    logger.warn(
      `[casperClient] queryDictionaryItem failed: dict=${dictionaryName} key=${itemKey}:`,
      err,
    );
    return null;
  }
}

// ── Odra State Dictionary Query ─────────────────────────────────────

import { ODRA_STATE_DICTIONARY } from './odraStorage';

/**
 * Queries the Odra state dictionary using a pre-calculated key.
 *
 * Odra stores all contract state in a single dictionary called "state".
 * The key is a blake2b hash of the storage index (see odraStorage.ts).
 *
 * @param contractHash Contract hash in `hash-<hex>` format
 * @param dictionaryKey Pre-calculated blake2b hash key (64 hex chars)
 * @returns The StoredValue, or null if not found
 */
export async function queryOdraState(
  contractHash: string,
  dictionaryKey: string,
): Promise<StoredValue | null> {
  return queryDictionaryItem(contractHash, ODRA_STATE_DICTIONARY, dictionaryKey);
}

/**
 * Queries multiple Odra state dictionary items in parallel.
 *
 * @param contractHash Contract hash in `hash-<hex>` format
 * @param keys Object with named keys to query
 * @returns Object with same keys, values are StoredValue or null
 */
export async function queryOdraStateMultiple<T extends Record<string, string>>(
  contractHash: string,
  keys: T,
): Promise<{ [K in keyof T]: StoredValue | null }> {
  const entries = Object.entries(keys);
  const results = await Promise.all(
    entries.map(([, key]) => queryOdraState(contractHash, key)),
  );

  const output = {} as { [K in keyof T]: StoredValue | null };
  entries.forEach(([name], index) => {
    output[name as keyof T] = results[index];
  });

  return output;
}

// ── CLValue extraction helpers ─────────────────────────────────────

/** Extract a BigInt from a CLValue (supports U8, U32, U64, U128, U256, U512, I32, I64) */
export function clValueToBigInt(clValue: CLValue | undefined): bigint {
  if (!clValue) return 0n;

  if (clValue.ui64) return BigInt(clValue.ui64.toString());
  if (clValue.ui128) return BigInt(clValue.ui128.toString());
  if (clValue.ui256) return BigInt(clValue.ui256.toString());
  if (clValue.ui512) return BigInt(clValue.ui512.toString());
  if (clValue.ui32) return BigInt(clValue.ui32.toString());
  if (clValue.ui8) return BigInt(clValue.ui8.toString());
  if (clValue.i64) return BigInt(clValue.i64.toString());
  if (clValue.i32) return BigInt(clValue.i32.toString());

  return 0n;
}

/** Extract a string from a CLValue */
export function clValueToString(clValue: CLValue | undefined): string {
  if (!clValue) return '';
  if (clValue.stringVal) return clValue.stringVal.toString();
  if (clValue.key) return clValue.key.toString();
  return clValue.toString();
}

/** Extract a boolean from a CLValue */
export function clValueToBool(clValue: CLValue | undefined): boolean {
  if (!clValue) return false;
  if (clValue.bool) return Boolean(clValue.bool.toString() === 'true');
  return false;
}

/** Extract the inner value from an Option CLValue, or return null */
export function clValueUnwrapOption(clValue: CLValue | undefined): CLValue | null {
  if (!clValue?.option) return null;
  const inner = clValue.option;
  // CLValueOption has an `inner` field that's the wrapped CLValue or null
  return (inner as unknown as { inner: CLValue | null })?.inner ?? null;
}

// ── Bytes parsing utilities ─────────────────────────────────────────

/**
 * Converts hex string to Uint8Array
 */
export function hexToBytes(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  }
  return bytes;
}

/**
 * Reads a little-endian u64 from bytes at given offset.
 * Returns [value, newOffset]
 */
export function readU64LE(bytes: Uint8Array, offset: number): [bigint, number] {
  const view = new DataView(bytes.buffer, bytes.byteOffset + offset, 8);
  const value = view.getBigUint64(0, true); // little-endian
  return [value, offset + 8];
}

/**
 * Reads a variable-length U256 from bytes (CLValue format).
 * Format: first byte = length (0-32), followed by little-endian bytes.
 * Returns [value, newOffset]
 */
export function readU256VarLen(bytes: Uint8Array, offset: number): [bigint, number] {
  const length = bytes[offset];
  if (length === 0) {
    return [0n, offset + 1];
  }

  let value = 0n;
  for (let i = 0; i < length; i++) {
    value |= BigInt(bytes[offset + 1 + i]) << BigInt(i * 8);
  }
  return [value, offset + 1 + length];
}

/**
 * Reads a variable-length U128 from bytes (CLValue format).
 * Format: first byte = length (0-16), followed by little-endian bytes.
 * Returns [value, newOffset]
 */
export function readU128VarLen(bytes: Uint8Array, offset: number): [bigint, number] {
  return readU256VarLen(bytes, offset); // Same format, just smaller max length
}

/**
 * Extract bytes from a CLValue that is List<U8> (commonly used for serialized addresses).
 * Returns the bytes as a hex string.
 */
export function clValueListU8ToHex(clValue: CLValue | undefined): string | null {
  if (!clValue) return null;

  // Try to access the list of U8 values
  // In casper-js-sdk v5, CLValue has different structures
  try {
    // Check if it's a list type
    const listData = (clValue as unknown as { list?: { values?: Array<{ ui8?: number }> } }).list;
    if (listData?.values) {
      const bytes = listData.values.map(v => v.ui8 ?? 0);
      return bytes.map(b => b.toString(16).padStart(2, '0')).join('');
    }

    // Alternative: try bytes() method
    if (typeof (clValue as unknown as { bytes?: () => Uint8Array }).bytes === 'function') {
      const bytes = (clValue as unknown as { bytes: () => Uint8Array }).bytes();
      return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
    }

    // Try to get raw value
    const rawValue = clValue.toString();
    if (rawValue && rawValue !== '[object Object]') {
      return rawValue;
    }
  } catch (err) {
    logger.warn('[casperClient] Failed to extract List<U8>:', err);
  }

  return null;
}

/**
 * Debug helper: logs the full structure of a CLValue for inspection.
 */
export function debugCLValue(name: string, clValue: CLValue | undefined): void {
  if (!clValue) {
    logger.log(`[debug] ${name}: null/undefined`);
    return;
  }

  logger.log(`[debug] ${name}:`, {
    type: clValue.type?.toString(),
    raw: clValue,
    keys: Object.keys(clValue),
  });
}

// ── Entity inspection helper ────────────────────────────────────────

/**
 * Inspects a contract entity on-chain and logs its named keys.
 * Use this to discover the actual storage key names used by Odra.
 *
 * Call from browser console or a temporary component:
 *   import { inspectContractEntity } from '@/services/ico/casperClient';
 *   inspectContractEntity('hash-6ffbe3ee...');
 */
export async function inspectContractEntity(
  contractHash: string,
): Promise<void> {
  const client = getCasperRpcClient();
  const hex = contractHash.replace(/^hash-/, '');

  // Try multiple key formats to find which one this node supports
  const keysToTry = [
    // `entity-contract-${hex}`,
    `hash-${hex}`,
    // `contract-${hex}`,
  ];

  // 1) Try getLatestEntity with each format
  for (const key of keysToTry) {
    try {
      const entityAddr = EntityAddr.fromPrefixedString(key);
      const entityId = EntityIdentifier.fromEntityAddr(entityAddr);
      const result = await client.getLatestEntity(entityId);
      // const store = client.getLate
      logger.log(`[inspect] getLatestEntity OK with key="${key}":`, result);
      logger.log('[inspect] Raw JSON:', result.rawJSON);
      const entity = result.entity?.addressableEntity;
      if (entity) {
        logger.log('[inspect] Named keys:', entity.namedKeys);
        logger.log('[inspect] Entry points:', entity.entryPoints);
      }
      return;
    } catch (err) {
      logger.warn(`[inspect] getLatestEntity failed for "${key}":`, (err as Error).message);
    }
  }

  // 2) Try queryLatestGlobalState with each format (no path — just check if entity exists)
  for (const key of keysToTry) {
    try {
      const result = await client.queryLatestGlobalState(key, []);
      logger.log(`[inspect] queryLatestGlobalState OK with key="${key}":`, result);
      logger.log('[inspect] storedValue:', result.storedValue);
      logger.log('[inspect] Raw JSON:', result.rawJSON);
      return;
    } catch (err) {
      logger.warn(`[inspect] queryLatestGlobalState failed for "${key}":`, (err as Error).message);
    }
  }

  logger.error('[inspect] All attempts failed. Contract may not exist on this network.');
}

// ── ICO Contract Query Functions (read-only, no deploy) ─────────────

export interface ICOScheduleData {
  startTimestamp: bigint;
  endTimestamp: bigint;
  saleAmount: bigint;
  soldAmount: bigint;
  price: bigint;
}

/**
 * Reads ICO data via RPC without deploy.
 * Uses queryLatestGlobalState to read contract named keys.
 *
 * @param contractHash Contract hash in `hash-<hex>` format
 * @returns Object with ICO data or null
 */



export async function queryICOData(contractHash: string): Promise<{
  schedulesCount: bigint;
  currentSchedule: ICOScheduleData | null;
  currentScheduleId: bigint | null;
} | null> {
  const client = getCasperRpcClient();
  const entityKey = contractHashToEntityKey(contractHash);

  try {
    // 1. Get contract named keys
    const stateResult = await client.queryLatestGlobalState(entityKey, []);
    logger.log('[queryICOData] Contract state:', stateResult.rawJSON);

    // 2. Find Odra storage keys
    const namedKeys = stateResult.rawJSON?.stored_value?.Contract?.named_keys ||
                      stateResult.rawJSON?.stored_value?.AddressableEntity?.named_keys || [];

    logger.log('[queryICOData] Named keys:', namedKeys);

    // 3. Find schedules_count in named keys
    let schedulesCount = 0n;
    for (const nk of namedKeys) {
      if (nk.name?.includes('schedules_count') || nk.name?.includes('ico_schedules_count')) {
        const uref = nk.key;
        if (uref) {
          const countResult = await client.queryLatestGlobalState(uref, []);
          const clValue = countResult.storedValue?.clValue;
          schedulesCount = clValueToBigInt(clValue);
          logger.log('[queryICOData] schedules_count:', schedulesCount);
        }
        break;
      }
    }

    return {
      schedulesCount,
      currentSchedule: null,
      currentScheduleId: null,
    };
  } catch (err) {
    logger.error('[queryICOData] Failed:', err);
    return null;
  }
}

export async function testQueryICOData(contractHash: string): Promise<unknown> {
  const client = getCasperRpcClient();
  const entityKey = contractHashToEntityKey(contractHash);

  try {
    const stateResult = await client.queryLatestGlobalState(entityKey, ["get_ico_schedules_count"]);
    logger.log('[testQueryICOData] Contract state:', JSON.stringify(stateResult, null, 2));
    return stateResult;
  } catch (err) {
    logger.error('[testQueryICOData] Failed:', err);
    return null;
  }
}

/**
 * Simple wrapper to get the ICO schedules count.
 * Delegates to queryICOData internally.
 */
export async function getICOSchedulesCount(contractHash: string): Promise<bigint> {
  const result = await queryICOData(contractHash);
  return result?.schedulesCount ?? 0n;
}

/**
 * Gets contract info: named keys, entry points.
 * Useful for debugging and understanding storage structure.
 */
export async function getContractInfo(contractHash: string): Promise<{
  namedKeys: Array<{ name: string; key: string }>;
  entryPoints: string[];
} | null> {
  const client = getCasperRpcClient();
  const entityKey = contractHashToEntityKey(contractHash);

  try {
    const result = await client.queryLatestGlobalState(entityKey, []);
    const rawContract = result.rawJSON?.stored_value?.Contract ||
                        result.rawJSON?.stored_value?.AddressableEntity;

    if (!rawContract) {
      logger.warn('[getContractInfo] Contract not found');
      return null;
    }

    const namedKeys = (rawContract.named_keys || []).map((nk: { name: string; key: string }) => ({
      name: nk.name,
      key: nk.key,
    }));

    const entryPoints = (rawContract.entry_points || []).map((ep: { name: string }) => ep.name);

    logger.log('[getContractInfo] Named keys:', namedKeys);
    logger.log('[getContractInfo] Entry points:', entryPoints);

    return { namedKeys, entryPoints };
  } catch (err) {
    logger.error('[getContractInfo] Failed:', err);
    return null;
  }
}

// ── Transaction/Deploy creation for entry point calls ───────────────

/**
 * Serializes a bigint as Casper U512 (variable-length, little-endian).
 * Format: [length_byte, ...value_bytes_le]
 */
function serializeU512(value: bigint): Uint8Array {
  if (value === 0n) return new Uint8Array([0]);
  const bytes: number[] = [];
  let v = value;
  while (v > 0n) {
    bytes.push(Number(v & 0xffn));
    v >>= 8n;
  }
  return new Uint8Array([bytes.length, ...bytes]);
}

/**
 * Creates an unsigned Transaction for calling a contract entry point.
 * Transaction must be signed via CSPR.click before submission.
 *
 * @param senderPublicKeyHex  Sender's public key (hex string)
 * @param contractHashStr     Contract hash in `hash-<hex>` format
 * @param entryPoint          Entry point name
 * @param args                Args for entry point
 * @param paymentAmount       Payment amount in motes (default: 2.5 CSPR)
 * @param isPackageHash       If true, use byPackageHash(); if false, use byHash()
 * @returns Transaction object ready for signing
 */
export function createContractCallTransaction(
  senderPublicKeyHex: string,
  contractHashStr: string,
  entryPoint: string,
  args: Args = Args.fromMap({}),
  paymentAmount: bigint = 2_500_000_000n, // 2.5 CSPR
  isPackageHash: boolean = false,
): Transaction {
  const senderPublicKey = PublicKey.fromHex(senderPublicKeyHex);
  const contractHashHex = stripHashPrefix(contractHashStr);

  // Using ContractCallBuilder for v5 SDK
  const builder = new ContractCallBuilder()
    .from(senderPublicKey);

  const withTarget = isPackageHash
    ? builder.byPackageHash(contractHashHex)
    : builder.byHash(contractHashHex);

  const transaction = withTarget
    .entryPoint(entryPoint)
    .runtimeArgs(args)
    .chainName(ICO_CONFIG.CASPER.networkName)
    .payment(Number(paymentAmount))
    .ttl(1800000) // 30 minutes
    .buildFor1_5(); // For Casper 1.x compatible deploy

  // Debug
  logger.log('[createContractCallTransaction] Transaction created:', {
    hash: transaction.hash?.toString(),
    toJSON: transaction.toJSON(),
  });

  return transaction;
}

/**
 * Creates a TransactionV1 for calling a payable contract entry point with attached CSPR.
 *
 * Uses Casper 2.0 TransactionV1 format with `transferred_value` (payload field 4)
 * so the runtime creates a temporary purse funded with the specified CSPR amount.
 * This is required for Odra #[payable] entry points that check `attached_value`.
 *
 * @param senderPublicKeyHex  Sender's public key (hex string)
 * @param contractHashStr     Contract package hash in `hash-<hex>` format
 * @param entryPoint          Entry point name
 * @param args                Args for entry point
 * @param paymentAmount       Gas payment in motes
 * @param transferredValue    CSPR to attach to the call (in motes)
 * @returns Transaction (TransactionV1) ready for signing
 */
export function createPayableContractCallTransaction(
  senderPublicKeyHex: string,
  contractHashStr: string,
  entryPoint: string,
  args: Args,
  paymentAmount: bigint,
  transferredValue: bigint,
): Transaction {
  const senderPublicKey = PublicKey.fromHex(senderPublicKeyHex);
  const contractHashHex = stripHashPrefix(contractHashStr);

  // 1. Build a base TransactionV1 via ContractCallBuilder.build()
  const baseTransaction = new ContractCallBuilder()
    .from(senderPublicKey)
    .byPackageHash(contractHashHex)
    .entryPoint(entryPoint)
    .runtimeArgs(args)
    .chainName(ICO_CONFIG.CASPER.networkName)
    .payment(Number(paymentAmount))
    .ttl(1800000)
    .build(); // TransactionV1 (Casper 2.0)

  const baseV1 = baseTransaction.getTransactionV1();
  if (!baseV1) {
    throw new Error('Failed to build TransactionV1');
  }

  // 2. Add transferred_value as payload field 4 (Casper 2.0 spec)
  //    This tells the runtime to create a temp purse with this amount.
  //    The contract's self.env().attached_value() will read this amount.
  baseV1.payload.fields.addField(4, serializeU512(transferredValue));

  // 3. Rebuild TransactionV1 to recompute the hash over the modified payload
  const newV1 = TransactionV1.makeTransactionV1(baseV1.payload);

  const transaction = Transaction.fromTransactionV1(newV1);

  logger.log('[createPayableContractCallTransaction] Transaction created:', {
    hash: transaction.hash?.toString(),
    transferredValue: transferredValue.toString(),
    toJSON: transaction.toJSON(),
  });

  return transaction;
}

/**
 * Creates a Transaction to call get_ico_schedules_count.
 * This is a view function, but in Casper it requires a transaction/deploy.
 */
export function createGetSchedulesCountTransaction(
  senderPublicKeyHex: string,
  contractHash: string,
  paymentAmount: bigint = 2_500_000_000n // 2.5 CSPR for contract call
): Transaction {
  return createContractCallTransaction(
    senderPublicKeyHex,
    contractHash,
    'get_ico_schedules_count',
    Args.fromMap({}),
    paymentAmount
  );
}

/**
 * Submits a signed deploy to the blockchain.
 * @returns deploy hash
 */
export async function submitDeploy(signedDeploy: Deploy): Promise<string> {
  const client = getCasperRpcClient();
  const result = await client.putDeploy(signedDeploy);
  logger.log('[casperClient] Deploy submitted:', result);
  return result.deployHash.toString();
}

/**
 * Checks deploy status by hash.
 */
export async function getDeployStatus(deployHash: string) {
  const client = getCasperRpcClient();
  try {
    const result = await client.getDeploy(deployHash);
    return result;
  } catch (err) {
    logger.warn('[casperClient] getDeploy failed:', err);
    return null;
  }
}

// ── Deploy creation ─────────────────────────────────────────────────

/**
 * Creates a Deploy object for contract calls.
 * This is the legacy Deploy format for Casper 1.5.x.
 *
 * @param senderPublicKeyHex - Public key of the sender
 * @param contractHashStr - Contract hash in `hash-<hex>` format
 * @param entryPoint - Entry point name to call
 * @param args - Arguments for the entry point
 * @param paymentAmount - Payment amount in motes
 * @returns Deploy object
 */
export function createDeploy(
  senderPublicKeyHex: string,
  contractHashStr: string,
  entryPoint: string,
  args: Args = Args.fromMap({}),
  paymentAmount: bigint = 2_500_000_000n // 2.5 CSPR
): Deploy {
  const senderPublicKey = PublicKey.fromHex(senderPublicKeyHex);
  const contractHashHex = stripHashPrefix(contractHashStr);

  // Create deploy header
  const deployHeader = new DeployHeader(
    ICO_CONFIG.CASPER.networkName, // chainName
    [],                             // dependencies
    1,                              // gasPrice
    new Timestamp(new Date()),      // timestamp (now)
    new Duration(1800000),          // ttl (30 minutes)
    senderPublicKey,                // account
  );

  // Create payment (standard payment)
  const payment = ExecutableDeployItem.standardPayment(paymentAmount.toString());

  // Create session (contract call by hash)
  const contractHash = ContractHash.newContract(contractHashHex);
  const storedContractByHash = new StoredContractByHash(contractHash, entryPoint, args);
  const session = new ExecutableDeployItem();
  session.storedContractByHash = storedContractByHash;

  // Create the deploy
  const deploy = Deploy.makeDeploy(deployHeader, payment, session);

  logger.log('[createDeploy] Deploy created:', {
    hash: deploy.hash?.toHex(),
    header: deploy.header,
  });

  return deploy;
}
