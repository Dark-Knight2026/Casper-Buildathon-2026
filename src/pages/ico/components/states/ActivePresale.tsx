import { cn } from '@/lib/utils';
import { ICO_CONFIG } from '@/constants/ico';
import type { PaymentCurrency } from '@/types/ico';
import { Title } from '../shared/Title';
import { ProgressBar } from '../shared/ProgressBar';
import { WalletCard } from '../shared/WalletCard';
import { TransactionHistory, Transaction } from '../shared/TransactionHistory';
import CountdownTimer from '../shared/CountdownTimer';
import { UserTokenBalance } from '../shared/UserTokenBalance';
import { useICOWallet } from '@/hooks/ico/useICOWallet';

interface ActivePresaleProps {
  className?: string;
  endTimestamp: number;
}

// Mock data for development (progress & transactions will come from backend later)
const MOCK_PROGRESS = {
  tokensSold: 450000000,
  totalAllocation: 1000000000,
  amountRaised: 450000,
};

const MOCK_USER_BALANCE = {
  tokensPurchased: 17500,
  totalSpentUSD: 1750,
};

const MOCK_TRANSACTIONS: Transaction[] = [
  {
    id: '1',
    type: 'purchase',
    amount: 500,
    currency: 'USDT',
    tokensReceived: 5000,
    tokenSymbol: ICO_CONFIG.TOKEN.symbol,
    status: 'completed',
    timestamp: new Date(Date.now() - 1000 * 60 * 30),
    txHash: '0xabc123def456789abc123def456789abc123def4',
  },
  {
    id: '2',
    type: 'purchase',
    amount: 1000,
    currency: 'USDC',
    tokensReceived: 10000,
    tokenSymbol: ICO_CONFIG.TOKEN.symbol,
    status: 'completed',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2),
    txHash: '0xdef456789abc123def456789abc123def456789a',
  },
  {
    id: '3',
    type: 'purchase',
    amount: 250,
    currency: 'CSPR',
    tokensReceived: 2500,
    tokenSymbol: ICO_CONFIG.TOKEN.symbol,
    status: 'pending',
    timestamp: new Date(),
    txHash: '0x789abc123def456789abc123def456789abc1234',
  },
];

export function ActivePresale({ className, endTimestamp }: ActivePresaleProps) {
  const { isConnected, account, connect } = useICOWallet();

  const handlePurchase = (amount: number, currency: PaymentCurrency) => {
  };

  return (
    <div className={cn('max-w-5xl mx-auto', className)}>
      {/* Hero Section */}
      <div className="text-center mb-12">

        <Title className="mb-4">
          {ICO_CONFIG.TOKEN.symbol} Token Presale
        </Title>

        <p className="text-lg md:text-xl font-thin text-[hsl(var(--ico-text-secondary))] max-w-2xl mx-auto">
          Purchase BIG Tokens at Presale Rate
        </p>
      </div>
      <div className='mx-auto flex flex-col md:flex-row gap-4 items-start justify-center'>
        <div className='w-full flex flex-col gap-4'>
          <p className='text-[hsl(var(--ico-text-secondary))] pl-2'>Presale ends in:</p>
          <CountdownTimer variant='compact' targetTimestamp={endTimestamp} className="py-2" />

          {/* Progress Bar */}
          <ProgressBar
            currentValue={MOCK_PROGRESS.tokensSold}
            maxValue={MOCK_PROGRESS.totalAllocation}
            label="Progress"
            rightLabel={`$${MOCK_PROGRESS.amountRaised.toLocaleString()} / $${Number(ICO_CONFIG.PRE_SALE.hardCap).toLocaleString()}`}
            showPercentage={true}
            infoColumns={[
              { label: 'Funds Raised', value: `$${MOCK_PROGRESS.amountRaised.toLocaleString()}` },
              { label: 'Initial Price', value: `$${ICO_CONFIG.PRE_SALE.price} per ${ICO_CONFIG.TOKEN.symbol}` },
            ]}
            className="w-full"
          />
          <p className='text-[hsl(var(--ico-text-secondary))] pl-2'>Hard Cap: ${Number(ICO_CONFIG.PRE_SALE.hardCap).toLocaleString()}</p>
        </div>

        {/* Wallet Card */}
        <WalletCard
          walletAddress={isConnected ? account?.publicKey : undefined}
          tokenPrice={Number(ICO_CONFIG.PRE_SALE.price)}
          tokenSymbol={ICO_CONFIG.TOKEN.symbol}
          onConnect={connect}
          onPurchase={handlePurchase}
          className="w-full"
        />
      </div>

      {/* User Token Balance */}
      <UserTokenBalance
        tokensPurchased={MOCK_USER_BALANCE.tokensPurchased}
        totalSpentUSD={MOCK_USER_BALANCE.totalSpentUSD}
        tokenPrice={Number(ICO_CONFIG.PRE_SALE.price)}
        tokenSymbol={ICO_CONFIG.TOKEN.symbol}
        className="mt-8"
      />

      {/* Transaction History */}
      <TransactionHistory
        transactions={MOCK_TRANSACTIONS}
        className="mt-8 max-w-5xl"
      />
    </div>
  );
}

export default ActivePresale;
