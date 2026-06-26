/**
 * On-chain user registration (TEMPORARY hackathon bridge).
 *
 * Builds the `UserRegistry::create_user` transaction the frontend submits from
 * the user's own wallet right after linking it. This is a stopgap: the contract
 * currently has its identity-manager role-gate relaxed on testnet so a user
 * wallet can call `create_user`. Once the backend signs the deploy itself, this
 * whole service (and the env hash) goes away — the indexer-written
 * `onchain_user_id` is the permanent part.
 *
 * ABI (resources/casper_contract_schemas/user_registry_schema.json):
 *   create_user(identity_hash: ByteArray(32), initial_wallet: Key, role_flags: U32) -> U256
 */

import { Args, CLValue, Key } from 'casper-js-sdk';
import type { Transaction } from 'casper-js-sdk';

import { createContractCallTransaction } from '@/services/ico/casperClient';
import { deriveAccountHash } from '@/lib/blockchain/accountUtils';

/** UserRegistry **package** hash (versioned call), raw hex, no `hash-` prefix. */
const USER_REGISTRY_PACKAGE_HASH = import.meta.env.VITE_USER_REGISTRY_PACKAGE_HASH ?? '';

/**
 * Whether on-chain registration is wired up. When the package hash is unset the
 * whole step is skipped (the wallet still links; on-chain is a no-op), so the
 * feature stays dark in environments where the contract isn't deployed.
 */
export const isOnchainRegistrationEnabled = Boolean(USER_REGISTRY_PACKAGE_HASH);

/**
 * Gas for `create_user` (motes). Default 3 CSPR — measured on testnet at
 * ~1.03 CSPR consumed (a few storage writes plus an event), so 3 CSPR leaves
 * comfortable headroom. Override via `VITE_USER_REGISTRY_CREATE_USER_GAS`.
 */
const GAS_CREATE_USER = BigInt(
  import.meta.env.VITE_USER_REGISTRY_CREATE_USER_GAS ?? '3000000000',
);

/** Decodes a hex string (optional `0x`) into bytes. */
function hexToBytes(hex: string): Uint8Array {
  const clean = hex.replace(/^0x/, '');
  if (clean.length % 2 !== 0) {
    throw new Error('identity_hash must be an even-length hex string');
  }
  const out = new Uint8Array(clean.length / 2);
  for (let i = 0; i < out.length; i += 1) {
    out[i] = Number.parseInt(clean.slice(i * 2, i * 2 + 2), 16);
  }
  return out;
}

/**
 * Builds the unsigned `create_user` transaction. The caller signs + submits it
 * via CSPR.click (see `useBlockchainTransaction`).
 *
 * @param senderPublicKeyHex - the linked wallet's public key; it is both the
 *   deploy signer and the `initial_wallet` argument (the contract links the
 *   wallet that registers).
 * @param identityHashHex - 32-byte identity hash (lowercase hex) from
 *   `GET /users/me/onchain-registration`.
 * @param roleFlags - role bitmask from the same endpoint.
 */
export function createCreateUserTransaction(
  senderPublicKeyHex: string,
  identityHashHex: string,
  roleFlags: number,
): Transaction {
  const args = Args.fromMap({
    identity_hash: CLValue.newCLByteArray(hexToBytes(identityHashHex)),
    // The user registers their own wallet → derive its account-hash Key.
    initial_wallet: CLValue.newCLKey(Key.newKey(deriveAccountHash(senderPublicKeyHex))),
    role_flags: CLValue.newCLUInt32(roleFlags),
  });

  return createContractCallTransaction(
    senderPublicKeyHex,
    USER_REGISTRY_PACKAGE_HASH,
    'create_user',
    args,
    GAS_CREATE_USER,
    true, // Odra contract — call via package hash
  );
}

// UserRegistry user-error discriminants (user_registry_schema.json).
const CREATE_USER_ERROR_MAP: Record<string, string> = {
  '1200': 'Not authorized to register on-chain.',
  '1201': 'Missing identity hash.',
  '1202': 'This account is already registered on-chain.',
  '1203': 'Invalid user id.',
  '1204': 'This wallet is already linked to another on-chain user.',
  '1205': 'This wallet is already active for another on-chain user.',
  '20003': 'Missing required on-chain role.',
};

/** Maps a Casper `User error: <n>` message to friendly copy. */
export function parseCreateUserError(rawMessage?: string): string {
  if (!rawMessage) return 'On-chain registration failed';

  const match = rawMessage.match(/User error: (\d+)/);
  if (match) return CREATE_USER_ERROR_MAP[match[1]] ?? rawMessage;

  // An unfunded wallet has no on-chain account entity yet (a Casper account is
  // created on first funding) and also can't pay gas. Both surface here as a
  // node-level "Invalid Deploy" rather than a contract User error.
  const lowered = rawMessage.toLowerCase();
  if (
    lowered.includes('no such addressable entity') ||
    lowered.includes('insufficient') ||
    lowered.includes('does not have enough')
  ) {
    return 'Your wallet needs some testnet CSPR before it can register on-chain. Add funds and try again.';
  }

  return rawMessage;
}
