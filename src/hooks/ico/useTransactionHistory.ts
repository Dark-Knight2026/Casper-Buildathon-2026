import { useMemo } from 'react';
import { ICO_CONFIG } from '@/constants/ico';
import { useAccountTransactions } from './useAccountTransactions';
import type { ICOTransaction } from '@/pages/ico/components/shared/TransactionHistory';

const BIG_TOKEN_HASH = ICO_CONFIG.CONTRACTS.tokenAddress.replace(/^hash-/, '').toLowerCase();

export function useTransactionHistory(
  accountHash: string | null | undefined,
  page: number,
  pageSize = 8,
) {
  const accountHex = accountHash?.replace(/^account-hash-/, '').toLowerCase();
  const { transactions: rawTxs, totalPages, isLoading } = useAccountTransactions(
    accountHash, page, pageSize, 'token_transfer',
  );

  const transactions = useMemo<ICOTransaction[]>(() =>
    rawTxs.map(tx => {
      const isBig = tx.contract_package_hash?.toLowerCase() === BIG_TOKEN_HASH;
      const isTransfer = !isBig && tx.to_type === 0;
      const decimals = isBig ? 18 : 6;
      const amount = tx.amount ? Number(BigInt(tx.amount)) / 10 ** decimals : 0;
      const isIncoming = tx.to_hash?.toLowerCase() === accountHex;

      return {
        id: `${tx.deploy_hash}-${tx.transform_idx ?? 0}`,
        type: isBig ? 'purchase' : isTransfer ? 'transfer' : 'purchase',
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
