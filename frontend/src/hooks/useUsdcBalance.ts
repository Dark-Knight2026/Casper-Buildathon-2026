/**
 * Reads the connected wallet's USDC (tUSDC) balance, in the token's smallest
 * unit, for the payment pre-flight (§3.5b, P-2.2) — letting the dialog warn
 * before a payment that would revert for lack of funds, rather than burning the
 * approve gas on a doomed deploy. The on-chain revert stays the authority; this
 * is advisory and fails open (a read error leaves the balance `undefined`).
 */

import { useQuery } from '@tanstack/react-query';

import { getCep18Balance } from '@/lib/casper/cep18';
import { ICO_CONFIG } from '@/constants/ico';

export function useUsdcBalance(accountHash: string | null | undefined) {
  const tokenInstanceHash = ICO_CONFIG.CONTRACTS.usdcInstanceHash;
  return useQuery({
    queryKey: ['usdc-balance', accountHash],
    queryFn: () =>
      getCep18Balance({ tokenInstanceHash, ownerAccountHash: accountHash! }),
    enabled: Boolean(accountHash) && Boolean(tokenInstanceHash),
    staleTime: 30_000,
  });
}
