import { useState, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import type { ICSPRClickSDK } from '@make-software/csprclick-core-types';
import { useClaimTokens } from './useClaimTokens';
import { useWithdrawUnbonded } from './useWithdrawUnbonded';
import { logger } from '@/utils/logger';

export function useICOActions(
  publicKey: string | null,
  clickRef: ICSPRClickSDK | null,
) {
  const queryClient = useQueryClient();

  const [claimingId, setClaimingId] = useState<string | null>(null);
  const [claimToastVisible, setClaimToastVisible] = useState(false);
  const [withdrawToastVisible, setWithdrawToastVisible] = useState(false);

  const { state: claimState, claim, reset: resetClaim } = useClaimTokens(publicKey, clickRef, {
    onSuccess: () => {
      setClaimingId(null);
      setClaimToastVisible(true);
      queryClient.invalidateQueries({ queryKey: ['vesting-schedules'] });
      queryClient.invalidateQueries({ queryKey: ['unbonding-status'] });
    },
    onError: (error) => {
      logger.error('[useClaimTokens] claim failed', new Error(error));
      setClaimToastVisible(true);
    },
  });

  const handleClaim = useCallback(
    (vestingId: bigint) => {
      resetClaim();
      setClaimingId(String(vestingId));
      claim(vestingId);
    },
    [claim, resetClaim],
  );

  const { state: withdrawState, withdraw, reset: resetWithdraw } = useWithdrawUnbonded(publicKey, clickRef, {
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staking-info'] });
      queryClient.invalidateQueries({ queryKey: ['vesting-schedules'] });
      setWithdrawToastVisible(true);
    },
    onError: (error) => {
      logger.error('[useWithdrawUnbonded] withdraw failed', new Error(error));
      setWithdrawToastVisible(true);
    },
  });

  return {
    claimState,
    handleClaim,
    resetClaim,
    claimingId,
    claimToastVisible,
    setClaimToastVisible,
    withdrawState,
    withdraw,
    resetWithdraw,
    withdrawToastVisible,
    setWithdrawToastVisible,
  };
}
