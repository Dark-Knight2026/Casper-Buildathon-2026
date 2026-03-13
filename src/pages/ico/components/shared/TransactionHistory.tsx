import { useState } from 'react';
import { ExternalLink } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Card } from './Card';
import { TablePagination } from './TablePagination';
import { formatDateTime } from '../../utils/formatters';
import { ICO_CONFIG } from '@/constants/ico';

const EXPLORER_URL = ICO_CONFIG.CASPER.explorerUrl;

export interface ICOTransaction {
  id: string;
  type: 'purchase' | 'claim';
  tokensReceived: number;
  tokenSymbol: string;
  status: 'pending' | 'completed' | 'failed';
  timestamp: Date | null;
  txHash?: string;
}

interface TransactionHistoryProps {
  transactions: ICOTransaction[];
  className?: string;
}

const PAGE_SIZE = 8;

const STATUS_STYLES = {
  pending: 'text-yellow-800 bg-yellow-400/10',
  completed: 'text-green-900 bg-green-400/10',
  failed: 'text-red-800 bg-red-400/10',
};

const STATUS_LABELS = {
  pending: 'Pending',
  completed: 'Completed',
  failed: 'Failed',
};

export function TransactionHistory({ transactions, className }: TransactionHistoryProps) {
  const [page, setPage] = useState(1);

  const totalPages = Math.max(1, Math.ceil(transactions.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const paginatedTx = transactions.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const truncateHash = (hash: string) => {
    return `${hash.slice(0, 6)}...${hash.slice(-4)}`;
  };

  return (
    <Card className={cn('p-6 w-full', className)}>
      <div className="w-full">
        <h3 className="text-lg font-semibold text-[hsl(var(--ico-text-primary))] mb-4">
          Transaction History
        </h3>

        {transactions.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-sm text-[hsl(var(--ico-text-secondary))]">
              No transactions yet
            </p>
          </div>
        ) : (
          <>
            {/* Semantic list structure for a11y (WCAG 1.3.1) */}
            <ul aria-label="Transaction history" className="space-y-3 list-none p-0 m-0">
              {paginatedTx.map((tx) => (
                <li
                  key={tx.id}
                  className="flex items-center justify-between p-3 rounded-md bg-[hsl(var(--ico-bg-secondary))] border border-[hsl(var(--ico-border-color))]"
                >
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-[hsl(var(--ico-text-primary))] capitalize">
                        {tx.type}
                      </span>
                      <span
                        className={cn(
                          'text-xs px-2 py-0.5 rounded-full',
                          STATUS_STYLES[tx.status]
                        )}
                      >
                        {STATUS_LABELS[tx.status]}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-[hsl(var(--ico-text-secondary))]">
                      <span>{tx.timestamp ? formatDateTime(tx.timestamp as Date) : '—'}</span>
                      {tx.txHash && (
                        <>
                          <span>•</span>
                          <a
                            href={`${EXPLORER_URL}/transaction/${tx.txHash}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="font-mono text-[hsl(var(--ico-brand-primary))] hover:underline inline-flex! items-center gap-1"
                          >
                            {truncateHash(tx.txHash)}
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        </>
                      )}
                    </div>
                  </div>

                  <p className="text-sm font-medium text-[hsl(var(--ico-text-primary))] text-right">
                    +{tx.tokensReceived.toLocaleString('en-US', { maximumFractionDigits: 2 })} {tx.tokenSymbol}
                  </p>
                </li>
              ))}
            </ul>

            <TablePagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={setPage}
              className="mt-4"
            />
          </>
        )}
      </div>
    </Card>
  );
}

export default TransactionHistory;
