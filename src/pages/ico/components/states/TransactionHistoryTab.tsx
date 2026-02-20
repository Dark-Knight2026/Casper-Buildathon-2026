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
import { useContractDeploys, type ContractDeploy } from '@/hooks/ico/useContractDeploys';

const EXPLORER_URL = import.meta.env.VITE_CASPER_EXPLORER_URL || 'https://testnet.cspr.live';
const PAGE_SIZE = 10;
const MOTES_PER_CSPR = 1_000_000_000;

function truncateHash(hash: string, start = 6, end = 4) {
  if (hash.length <= start + end + 3) return hash;
  return `${hash.slice(0, start)}...${hash.slice(-end)}`;
}

function formatRelativeTime(timestamp: string): string {
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

function formatAmount(deploy: ContractDeploy): string {
  const raw = deploy.args?.amount_to_spend?.parsed;
  if (!raw) return '-';
  return Number(raw).toLocaleString('en-US');
}

function formatCost(cost: string): string {
  const cspr = Number(cost) / MOTES_PER_CSPR;
  return `${cspr.toFixed(2)} CSPR`;
}

export function TransactionHistoryTab() {
  const [page, setPage] = useState(1);
  const { deploys, totalPages, totalItems, isLoading, error, refetch } = useContractDeploys(page, PAGE_SIZE);

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
            title="Refresh"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      <Card className="p-0 overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
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
        ) : deploys.length === 0 ? (
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
                    <TableHead className="text-[hsl(var(--ico-text-muted))] text-xs font-medium">Caller</TableHead>
                    <TableHead className="text-[hsl(var(--ico-text-muted))] text-xs font-medium text-right">Amount</TableHead>
                    <TableHead className="text-[hsl(var(--ico-text-muted))] text-xs font-medium text-right">Cost</TableHead>
                    <TableHead className="text-[hsl(var(--ico-text-muted))] text-xs font-medium text-center">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {deploys.map((deploy) => (
                    <TableRow
                      key={deploy.deploy_hash}
                      className="border-b border-[hsl(var(--ico-border-color))] hover:bg-[hsl(var(--ico-bg-secondary))]"
                    >
                      <TableCell className="font-mono text-sm">
                        <a
                          href={`${EXPLORER_URL}/deploy/${deploy.deploy_hash}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[hsl(var(--ico-brand-primary))] hover:underline inline-flex items-center gap-1"
                        >
                          {truncateHash(deploy.deploy_hash)}
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </TableCell>
                      <TableCell className="text-sm text-[hsl(var(--ico-text-secondary))]">
                        {deploy.block_height.toLocaleString('en-US')}
                      </TableCell>
                      <TableCell className="text-sm text-[hsl(var(--ico-text-secondary))] whitespace-nowrap">
                        {formatRelativeTime(deploy.timestamp)}
                      </TableCell>
                      <TableCell className="font-mono text-sm text-[hsl(var(--ico-text-secondary))]">
                        {truncateHash(deploy.caller_public_key, 8, 5)}
                      </TableCell>
                      <TableCell className="text-sm text-right text-[hsl(var(--ico-text-primary))] font-medium">
                        {formatAmount(deploy)}
                      </TableCell>
                      <TableCell className="text-sm text-right text-[hsl(var(--ico-text-secondary))]">
                        {formatCost(deploy.cost)}
                      </TableCell>
                      <TableCell className="text-center">
                        <span
                          className={`inline-flex text-xs px-2 py-0.5 rounded-full ${
                            deploy.error_message
                              ? 'text-red-800 bg-red-400/10'
                              : 'text-green-900 bg-green-400/10'
                          }`}
                        >
                          {deploy.error_message ? 'Failed' : 'Success'}
                        </span>
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
