import { PublicKey } from 'casper-js-sdk';
import { logger } from '@/utils/logger';

/**
 * Derives account hash from public key hex string.
 * Account hash format: account-hash-<hex>
 */
export function stripAccountHashPrefix(address: string): string {
  return address.startsWith('account-hash-') ? address.slice('account-hash-'.length) : address;
}

export function deriveAccountHash(publicKeyHex: string): string {
  if (!publicKeyHex) {
    logger.warn('[accountUtils] Empty public key provided');
    return '';
  }

  try {
    const pk = PublicKey.fromHex(publicKeyHex);
    const accountHash = pk.accountHash();
    return accountHash.toPrefixedString();
  } catch (err) {
    logger.error('[accountUtils] Failed to derive account hash', err);
    return '';
  }
}
