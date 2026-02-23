import { PublicKey } from 'casper-js-sdk';

/**
 * Derives account hash from public key hex string.
 * Account hash format: account-hash-<hex>
 */
export function deriveAccountHash(publicKeyHex: string): string {
  if (!publicKeyHex) {
    console.warn('[accountUtils] Empty public key provided');
    return '';
  }

  try {
    const pk = PublicKey.fromHex(publicKeyHex);
    const accountHash = pk.accountHash();
    return accountHash.toPrefixedString();
  } catch (err) {
    console.warn('[accountUtils] Failed to derive account hash:', err);
    return '';
  }
}
