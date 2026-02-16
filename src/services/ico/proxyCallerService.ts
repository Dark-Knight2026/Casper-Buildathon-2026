/**
 * Proxy Caller Service
 *
 * Uses Odra's proxy_caller.wasm to call #[payable] entry points.
 *
 * Why this is needed:
 *   Odra's attached_value() reads the BALANCE of the cargo_purse URef.
 *   A direct contract call cannot create a temporary purse from the frontend.
 *   The proxy_caller.wasm runs as session code in the caller's account context,
 *   creates a temp cargo purse, funds it with the exact CSPR amount, and
 *   forwards the call to the contract with the cargo_purse arg.
 *
 * Odra proxy_caller args (from odra-core/src/consts.rs):
 *   - "package_hash": ByteArray(32) — contract package hash
 *   - "entry_point":  String         — entry point name
 *   - "args":         Bytes/List<U8> — serialized RuntimeArgs
 *   - "attached_value": U512         — CSPR amount in motes
 *
 * Uses SessionBuilder (TransactionV1) instead of legacy Deploy to avoid
 * Casper 2.0 "Mint error: 21" (TooManyBalanceHolds).
 */

import {
  Args,
  CLValue,
  CLTypeUInt8,
  PublicKey,
  Transaction,
  SessionBuilder,
} from 'casper-js-sdk';

import { ICO_CONFIG } from '@/constants/ico';
import { hexToBytes, stripHashPrefix } from './casperClient';

// ── WASM loader ─────────────────────────────────────────────────────

let proxyWasmCache: Uint8Array | null = null;

/**
 * Loads proxy_caller.wasm from /public and caches it.
 */
export async function loadProxyCallerWasm(): Promise<Uint8Array> {
  if (proxyWasmCache) return proxyWasmCache;

  const response = await fetch('/proxy_caller.wasm');
  if (!response.ok) {
    throw new Error(`Failed to load proxy_caller.wasm: ${response.status}`);
  }
  const buffer = await response.arrayBuffer();
  proxyWasmCache = new Uint8Array(buffer);
  return proxyWasmCache;
}

// ── Transaction creation ────────────────────────────────────────────

/**
 * Creates a TransactionV1 that runs proxy_caller.wasm as session code.
 *
 * The WASM will:
 * 1. Create/reuse a temporary cargo purse
 * 2. Transfer `attachedValue` motes from the caller's main purse to it
 * 3. Insert the cargo purse as "__cargo_purse" into the entry point args
 * 4. Call the target contract via call_versioned_contract
 * 5. Verify the cargo purse is empty after the call
 *
 * @param senderPublicKeyHex  Public key of the caller (hex)
 * @param contractPackageHash Package hash (hex, with or without "hash-" prefix)
 * @param entryPoint          Entry point name on the target contract
 * @param entryPointArgs      Args for the entry point (WITHOUT __cargo_purse)
 * @param attachedValue       CSPR amount to attach, in motes
 * @param gasPayment          Gas payment in motes
 * @param proxyWasm           The proxy_caller.wasm bytes
 */
export function createProxyCallerTransaction(
  senderPublicKeyHex: string,
  contractPackageHash: string,
  entryPoint: string,
  entryPointArgs: Args,
  attachedValue: bigint,
  gasPayment: bigint,
  proxyWasm: Uint8Array,
): Transaction {
  const senderPublicKey = PublicKey.fromHex(senderPublicKeyHex);
  const packageHashHex = stripHashPrefix(contractPackageHash);
  const packageHashBytes = hexToBytes(packageHashHex);

  // Serialize entry point args → Uint8Array (Casper binary format)
  const serializedArgs = entryPointArgs.toBytes();

  // Wrap as CLValue List<U8> — matches Rust Bytes type (CLType::List(U8))
  const argsCLValue = CLValue.newCLList(
    CLTypeUInt8,
    Array.from(serializedArgs).map(b => CLValue.newCLUint8(b)),
  );

  // Build proxy_caller runtime args
  // "amount" is required by Casper 2.0 runtime — it sets the approved spending limit
  // for main purse transfers inside session WASM. Without it, the limit defaults to 0
  // and any transfer_from_purse_to_purse from the main purse fails with Mint error 21
  // (UnapprovedSpendingAmount).
  const proxyArgs = Args.fromMap({
    package_hash: CLValue.newCLByteArray(packageHashBytes),
    entry_point: CLValue.newCLString(entryPoint),
    args: argsCLValue,
    attached_value: CLValue.newCLUInt512(attachedValue),
    amount: CLValue.newCLUInt512(attachedValue),
  });

  // Build TransactionV1 with SessionBuilder (avoids legacy Deploy balance hold issues)
  const transaction = new SessionBuilder()
    .from(senderPublicKey)
    .wasm(proxyWasm)
    .runtimeArgs(proxyArgs)
    .chainName(ICO_CONFIG.CASPER.networkName)
    .payment(Number(gasPayment), 5)
    .build();

  console.log('[proxyCallerService] Transaction created:', {
    hash: transaction.hash?.toHex(),
    entryPoint,
    attachedValue: attachedValue.toString(),
    argsSize: serializedArgs.length,
  });

  return transaction;
}
