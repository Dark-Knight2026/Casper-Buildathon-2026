import { cn } from '@/lib/utils';
import { Card } from '../shared/Card';
import { CountdownTimer } from '../shared/CountdownTimer';
import { ProgressBar } from '../shared/ProgressBar';
import { WalletCard } from '../shared/WalletCard';
import { TransactionHistory, Transaction } from '../shared/TransactionHistory';
import { ICO_CONFIG } from '@/constants/ico';
import type { PaymentCurrency } from '@/types/ico';
import { Title } from '../shared/Title';
import { useICOWallet } from '@/hooks/ico/useICOWallet';

interface ActiveICOProps {
  endTimestamp: number;
  className?: string;
}

// Mock data for development
const MOCK_PROGRESS = {
  tokensSold: 225000000,
  totalAllocation: 750000000,
  amountRaised: 337500,
};

const MOCK_TRANSACTIONS: Transaction[] = [
  {
    id: '1',
    type: 'purchase',
    amount: 100,
    currency: 'USDC',
    tokensReceived: 66666,
    tokenSymbol: ICO_CONFIG.TOKEN.symbol,
    status: 'completed',
    timestamp: new Date('2025-01-15T10:30:00'),
    txHash: '0x1234567890abcdef1234567890abcdef12345678',
  },
  {
    id: '2',
    type: 'purchase',
    amount: 500,
    currency: 'USDT',
    tokensReceived: 500000,
    tokenSymbol: ICO_CONFIG.TOKEN.symbol,
    status: 'completed',
    timestamp: new Date('2025-01-10T14:20:00'),
    txHash: '0xabcdef1234567890abcdef1234567890abcdef12',
  },
  {
    id: '3',
    type: 'purchase',
    amount: 250,
    currency: 'USDC',
    tokensReceived: 250000,
    tokenSymbol: ICO_CONFIG.TOKEN.symbol,
    status: 'pending',
    timestamp: new Date('2025-01-16T09:15:00'),
  },
];

export function ActiveICO({ endTimestamp, className }: ActiveICOProps) {
  const { isConnected, account, connect } = useICOWallet();
  const tokensRemaining = MOCK_PROGRESS.totalAllocation - MOCK_PROGRESS.tokensSold;

  const handleConnect = () => {
  };

  const handlePurchase = (amount: number, currency: PaymentCurrency) => {
  };

  return (
    <div className={cn('max-w-5xl mx-auto space-y-6 flex flex-col items-center', className)}>
      <Title className="mb-4">
        {ICO_CONFIG.TOKEN.symbol} Active ICO
      </Title>
      {/* Stats Row */}
      <div className="grid grid-cols-1 w-full md:grid-cols-3 gap-4">
        {/* Token Price */}
        <Card className="p-6 text-center">
          <p className="text-sm text-[hsl(var(--ico-text-secondary))] mb-2">Live Token Price</p>
          <p className="text-3xl font-bold text-[hsl(var(--ico-text-primary))]">
            ${ICO_CONFIG.PUBLIC_ICO.price}
          </p>
          <p className="text-xs text-sky-400 mt-2">per {ICO_CONFIG.TOKEN.symbol}</p>
        </Card>

        {/* ICO Allocation Remaining */}
        <Card className="p-6 text-center">
          <p className="text-sm text-[hsl(var(--ico-text-secondary))] mb-2">Allocation Remaining</p>
          <p className="text-3xl font-bold text-[hsl(var(--ico-text-primary))]">
            {(tokensRemaining / 1e6).toFixed(1)}M
          </p>
          <p className="text-xs text-sky-400 mt-2">
            of {(Number(ICO_CONFIG.PUBLIC_ICO.allocation) / 1e6).toFixed(0)}M {ICO_CONFIG.TOKEN.symbol}
          </p>
        </Card>

        {/* Time Remaining */}
        <div className="text-center">
          <p className="text-sm text-[hsl(var(--ico-text-secondary))] mb-2">Time Remaining</p>
          <CountdownTimer
            targetTimestamp={endTimestamp}
            variant="compact"
            className="text-2xl font-bold text-[hsl(var(--ico-text-primary))] justify-center"
          />
          <p className="text-xs text-sky-400 mt-2">until ICO ends</p>
        </div>
      </div>

      {/* ICO Progress */}
      <ProgressBar
        currentValue={MOCK_PROGRESS.tokensSold}
        maxValue={MOCK_PROGRESS.totalAllocation}
        label="ICO Progress"
        rightLabel={`$${MOCK_PROGRESS.amountRaised.toLocaleString()} / $${Number(ICO_CONFIG.PUBLIC_ICO.hardCap).toLocaleString()}`}
        infoColumns={[
          {
            label: 'Tokens Sold',
            value: `${(MOCK_PROGRESS.tokensSold / 1e6).toFixed(1)}M ${ICO_CONFIG.TOKEN.symbol}`,
          },
          {
            label: 'Total Allocation',
            value: `${(Number(ICO_CONFIG.PUBLIC_ICO.allocation) / 1e6).toFixed(0)}M ${ICO_CONFIG.TOKEN.symbol}`,
          },
          {
            label: 'Hard Cap',
            value: `$${Number(ICO_CONFIG.PUBLIC_ICO.hardCap).toLocaleString()}`,
          },
        ]}
        className="w-full"
      />

      {/* Warning Banner - No Sales During ICO */}
      <Card className="p-4">
        <div className="flex items-center gap-3">
          <div className="shrink-0 w-10 h-10 rounded-full bg-amber-500/20 flex items-center justify-center">
            <span className="text-amber-400 text-lg">⚠</span>
          </div>
          <div>
            <p className="text-sm font-medium text-amber-400">Trading Restricted</p>
            <p className="text-xs text-[hsl(var(--ico-text-secondary))]">
              Token sales are disabled during the Active ICO period. You will be able to sell your tokens after the ICO ends.
            </p>
          </div>
        </div>
      </Card>

      {/* Purchase Module */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Wallet Purchase */}
        <WalletCard
          walletAddress={isConnected ? account?.publicKey : undefined}
          tokenPrice={Number(ICO_CONFIG.PUBLIC_ICO.price)}
          tokenSymbol={ICO_CONFIG.TOKEN.symbol}
          onConnect={connect}
          onPurchase={handlePurchase}
          className="w-full"
        />

      </div>

      {/* Transaction History */}
      <TransactionHistory
        transactions={MOCK_TRANSACTIONS}
        className="w-full"
      />

      {/* ICO End Trigger Info */}
      <Card className="p-4">
        <div className="flex items-start gap-3">
          <div className="shrink-0 w-10 h-10 rounded-full bg-sky-500/20 flex items-center justify-center">
            <span className="text-sky-400 text-lg">ℹ</span>
          </div>
          <div>
            <p className="text-sm font-medium text-[hsl(var(--ico-text-primary))]">ICO End Conditions</p>
            <p className="text-xs text-[hsl(var(--ico-text-secondary))] mt-1">
              The ICO will end when the countdown timer reaches zero or when all tokens are sold out, whichever comes first.
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}

export default ActiveICO;
