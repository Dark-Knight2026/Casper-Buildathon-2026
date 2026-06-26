import { useMemo } from 'react';
import { ICO_CONFIG } from '@/constants/ico';
import { rawTokenToNumber } from '@/lib/tokenAmount';
import { useAccountTransactions } from './useAccountTransactions';
import type { ICOTransaction } from '@/types/ico';

export function useTransactionHistory(
  accountHash: string | null | undefined,
  page: number,
  pageSize = 8,
) {
  const accountHex = accountHash?.replace(/^account-hash-/, '').toLowerCase();
  const { transactions: rawTxs, totalPages, isLoading } = useAccountTransactions(
    accountHash, page, pageSize,
  );

  const transactions = useMemo<ICOTransaction[]>(() =>
    rawTxs.map(tx => {
      const isBig = tx.currency === 'BIG';
      const decimals = isBig ? 18 : 6;
      const amount = rawTokenToNumber(tx.amount ?? '', decimals);
      const isIncoming = tx.to_hash?.toLowerCase() === accountHex;

      // Auto-stake/vesting: BIG sent from user account (from_type=0) to a contract (to_type=1)
      const isAutoStake = isBig && tx.from_type === 0 && tx.to_type === 1;
      // Payment: non-BIG token sent to ICO contract (ft_action_type_id=4)
      const isPayment = !isBig && tx.ft_action_type_id === 4;
      // BIG received from ICO contract (from_type=1 = contract)
      const isBigReceived = isBig && tx.from_type === 1;

      let type: ICOTransaction['type'];
      if (isAutoStake) {
        type = 'stake';
      } else if (isPayment || isBigReceived) {
        type = 'purchase';
      } else {
        type = 'transfer';
      }

      return {
        id: `${tx.deploy_hash}-${tx.transform_idx ?? 0}`,
        type,
        direction: isIncoming ? 'in' : 'out',
        tokensReceived: amount,
        tokenSymbol: tx.currency ?? ICO_CONFIG.TOKEN.symbol,
        status: 'completed' as const,
        timestamp: tx.timestamp ? new Date(tx.timestamp) : null,
        txHash: tx.deploy_hash,
      };
    }),
  [rawTxs, accountHex]);

  return { transactions, totalPages, isLoading };
}
