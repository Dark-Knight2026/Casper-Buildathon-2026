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
} from 'casper-js-sdk';

import { ICO_CONFIG } from '@/constants/ico';

// ── Singleton ──────────────────────────────────────────────────────

let rpcClient: RpcClient | null = null;

export function getCasperRpcClient(): RpcClient {
  if (!rpcClient) {
    const handler = new HttpHandler(ICO_CONFIG.CASPER.rpcUrl, 'fetch');
    const apiKey = import.meta.env.VITE_CSPR_CLOUD_API_KEY;
    if (apiKey) {
      handler.setCustomHeaders({ authorization: apiKey });
    }
    rpcClient = new RpcClient(handler);
  }
  return rpcClient;
}

// ── Key helpers ────────────────────────────────────────────────────

/**
 * Converts a contract hash from the `hash-<hex>` format used in .env
 * to the Casper 2.0 entity key format `entity-contract-<hex>`.
 */
export function contractHashToEntityKey(hash: string): string {
  const hex = hash.replace(/^hash-/, '');
  return `entity-contract-${hex}`;
}

/**
 * Strips the `hash-` prefix from a contract hash, returning only the hex.
 */
export function stripHashPrefix(hash: string): string {
  return hash.replace(/^hash-/, '');
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
    console.warn(
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
    console.warn(
      `[casperClient] queryDictionaryItem failed: dict=${dictionaryName} key=${itemKey}:`,
      err,
    );
    return null;
  }
}

// ── CLValue extraction helpers ─────────────────────────────────────

/** Extract a BigInt from a CLValue that is U64, U128, U256, or U512 */
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
