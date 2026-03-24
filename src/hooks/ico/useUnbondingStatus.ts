/**
 * useUnbondingStatus Hook
 *
 * Returns the list of active unbonding positions for a staker.
 *
 * TODO: replace mock with real backend call once
 * GET /api/v1/staking/{accountHash}/unbonding is implemented.
 */

export interface UnbondingStatus {
  /** Unique id for this unbonding position */
  id: string;
  /** BIG tokens currently in the unbonding window */
  unbondingAmount: number;
  /** Epoch ms when unbonding ends and withdrawal becomes available */
  unbondingEndsAt: number;
  /** True when unbonding period has elapsed and withdraw_unbonded() can be called */
  isReady: boolean;
}

// ── Mock data ────────────────────────────────────────────────────────
const MOCK_ITEMS: UnbondingStatus[] = [
  {
    id: 'unbonding-1',
    unbondingAmount: 1.1897043025067575,
    unbondingEndsAt: 1774355872300, // 5 min ago — already ready
    isReady: true,
  },
  {
    id: 'unbonding-2',
    unbondingAmount: 0.6363839012592947,
    unbondingEndsAt: 1789842489974, // 2 min from load — still waiting
    isReady: false,
  },
];

// ── Hook ─────────────────────────────────────────────────────────────

export function useUnbondingStatus(
  _accountHash: string | null | undefined,
): { data: UnbondingStatus[]; isLoading: boolean } {
  if (!_accountHash) {
    return { data: [], isLoading: false };
  }

  return { data: MOCK_ITEMS, isLoading: false };
}
