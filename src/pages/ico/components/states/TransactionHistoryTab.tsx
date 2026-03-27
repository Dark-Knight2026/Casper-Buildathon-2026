import { useState } from 'react';
import { ExternalLink, RefreshCw, AlertCircle } from 'lucide-react';
import { SubTitle } from '../shared/SubTitle';
import { Card } from '../shared/Card';
import { TablePagination } from '../shared/TablePagination';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useTokenTransactions, type TokenTransaction } from '@/hooks/ico/useTokenTransactions';
import { ICO_CONFIG } from '@/constants/ico';

const EXPLORER_URL = ICO_CONFIG.CASPER.explorerUrl;
const ICO_PACKAGE_HASH = ICO_CONFIG.CONTRACTS.icoPackageHash.replace(/^hash-/, '').toLowerCase();
const PAGE_SIZE = 10;
const BIG_DECIMALS = ICO_CONFIG.TOKEN.decimals; // 18

function truncateHash(hash: string, start = 6, end = 4) {
  if (hash.length <= start + end + 3) return hash;
  return `${hash.slice(0, start)}...${hash.slice(-end)}`;
}

function formatRelativeTime(timestamp: string | null): string {
  if (!timestamp) return '—';
  const diff = Date.now() - new Date(timestamp).getTime();
  const seconds = Math.floor(diff / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hr ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function formatBigAmount(raw: string | null): string {
  if (!raw) return '—';
  const divisor = 10n ** BigInt(BIG_DECIMALS);
  const big = BigInt(raw);
  const intPart = (big / divisor).toString();
  const fracPart = (big % divisor).toString().padStart(BIG_DECIMALS, '0').slice(0, 2);
  return Number(`${intPart}.${fracPart}`).toLocaleString('en-US', { maximumFractionDigits: 2 });
}

function isICOPurchase(tx: TokenTransaction): boolean {
  return tx.from_type === 1 && tx.from_hash?.toLowerCase() === ICO_PACKAGE_HASH;
}

function getActionLabel(tx: TokenTransaction): string {
  if (isICOPurchase(tx)) return 'Purchase';
  switch (tx.ft_action_type_id) {
    case 1: return 'Mint';
    case 2: return 'Transfer';
    case 3: return 'Burn';
    default: return 'Action';
  }
}

function getActionColor(tx: TokenTransaction): string {
  if (isICOPurchase(tx)) return 'text-green-900 bg-green-400/10';
  switch (tx.ft_action_type_id) {
    case 1: return 'text-blue-900 bg-blue-400/10';
    case 3: return 'text-red-800 bg-red-400/10';
    default: return 'text-gray-800 bg-gray-400/10';
  }
}

export function TransactionHistoryTab() {
  const [page, setPage] = useState(1);
  const { transactions, totalPages, totalItems, isLoading, isFetching, error, refetch } = useTokenTransactions(page, PAGE_SIZE);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <SubTitle>Transaction History</SubTitle>
        <div className="flex items-center gap-3">
          <span className="text-xs text-[hsl(var(--ico-text-muted))]">
            {totalItems} transactions
          </span>
          <button
            type="button"
            onClick={() => refetch()}
            className="p-1.5 rounded-md text-[hsl(var(--ico-text-secondary))] hover:text-[hsl(var(--ico-text-primary))] hover:bg-[hsl(var(--ico-bg-secondary))] transition-colors cursor-pointer"
            aria-label="Refresh transactions"
          >
            <RefreshCw className={`w-4 h-4${isFetching ? ' animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      <Card className="p-0 overflow-hidden">
        {isLoading ? (
          <div role="status" aria-label="Loading transactions" className="flex items-center justify-center py-16">
            <RefreshCw className="w-5 h-5 animate-spin text-[hsl(var(--ico-text-muted))]" />
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <AlertCircle className="w-6 h-6 text-red-400" />
            <p className="text-sm text-[hsl(var(--ico-text-secondary))]">Failed to load transactions</p>
            <button
              type="button"
              onClick={() => refetch()}
              className="text-sm text-[hsl(var(--ico-brand-primary))] hover:underline cursor-pointer"
            >
              Try again
            </button>
          </div>
        ) : transactions.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-sm text-[hsl(var(--ico-text-secondary))]">No transactions found</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-b border-[hsl(var(--ico-border-color))]">
                    <TableHead className="text-[hsl(var(--ico-text-muted))] text-xs font-medium">Tx Hash</TableHead>
                    <TableHead className="text-[hsl(var(--ico-text-muted))] text-xs font-medium">Block</TableHead>
                    <TableHead className="text-[hsl(var(--ico-text-muted))] text-xs font-medium">Age</TableHead>
                    <TableHead className="text-[hsl(var(--ico-text-muted))] text-xs font-medium">Type</TableHead>
                    <TableHead className="text-[hsl(var(--ico-text-muted))] text-xs font-medium">From</TableHead>
                    <TableHead className="text-[hsl(var(--ico-text-muted))] text-xs font-medium">To</TableHead>
                    <TableHead className="text-[hsl(var(--ico-text-muted))] text-xs font-medium text-right">Amount (BIG)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transactions.map((tx) => (
                    <TableRow
                      key={`${tx.deploy_hash}-${tx.transform_idx}`}
                      className="border-b border-[hsl(var(--ico-border-color))] hover:bg-[hsl(var(--ico-bg-secondary))]"
                    >
                      <TableCell className="font-mono text-sm">
                        <a
                          href={`${EXPLORER_URL}/deploy/${tx.deploy_hash}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[hsl(var(--ico-brand-primary))] hover:underline inline-flex items-center gap-1"
                        >
                          {truncateHash(tx.deploy_hash)}
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </TableCell>
                      <TableCell className="text-sm text-[hsl(var(--ico-text-secondary))]">
                        {tx.block_height.toLocaleString('en-US')}
                      </TableCell>
                      <TableCell className="text-sm text-[hsl(var(--ico-text-secondary))] whitespace-nowrap">
                        {formatRelativeTime(tx.timestamp)}
                      </TableCell>
                      <TableCell>
                        <span className={`inline-flex text-xs px-2 py-0.5 rounded-full ${getActionColor(tx)}`}>
                          {getActionLabel(tx)}
                        </span>
                      </TableCell>
                      <TableCell className="font-mono text-sm text-[hsl(var(--ico-text-secondary))]">
                        {tx.from_hash ? truncateHash(tx.from_hash, 6, 4) : '-'}
                      </TableCell>
                      <TableCell className="font-mono text-sm text-[hsl(var(--ico-text-secondary))]">
                        {tx.to_hash ? truncateHash(tx.to_hash, 6, 4) : '-'}
                      </TableCell>
                      <TableCell className="text-sm text-right text-[hsl(var(--ico-text-primary))] font-medium">
                        {formatBigAmount(tx.amount)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <div className="p-4">
              <TablePagination
                currentPage={page}
                totalPages={totalPages}
                onPageChange={setPage}
              />
            </div>
          </>
        )}
      </Card>
    </div>
  );
}

export default TransactionHistoryTab;
