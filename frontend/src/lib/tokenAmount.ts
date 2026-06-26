/**
 * Converts a raw 18-decimal token amount string to a human-readable number.
 * Uses BigInt integer division to avoid Number precision loss for large amounts.
 */
export function rawTokenToNumber(raw: string, decimals: number): number {
  let value: bigint;
  try {
    value = BigInt(raw);
  } catch {
    return 0;
  }
  const divisor = 10n ** BigInt(decimals);
  return Number(value / divisor) + Number(value % divisor) / Number(divisor);
}
