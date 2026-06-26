/**
 * Casper signature helpers shared by every backend ownership-proof flow
 * (wallet login, wallet linking, lease signing).
 */

/**
 * Prepends the 1-byte algorithm prefix that `casper_types::Signature::from_hex`
 * requires: `01` = Ed25519, `02` = Secp256k1. The algorithm is read from the
 * public key's own prefix byte (account keys carry the same prefix per the
 * Casper account-key format, https://docs.casper.network/concepts/accounts-and-keys/#account-keys).
 *
 * A raw signature is 128 hex chars; one already carrying the prefix is 130 — so
 * we distinguish by length, not by leading bytes (a raw signature can itself
 * start with `01`/`02`, which would skip a needed prefix).
 */
export function prefixSignature(
  publicKey: string,
  signatureHex: string
): string {
  if (signatureHex.length === 130) return signatureHex;
  const prefix = publicKey.startsWith('02') ? '02' : '01';
  return `${prefix}${signatureHex}`;
}
