import { cn } from '@/lib/utils';
import { ICO_CONFIG } from '@/constants/ico';
import { Title } from '../shared/Title';
import { ProgressBar } from '../shared/ProgressBar';
import { WalletCard } from '../shared/WalletCard';
import { TransactionHistory, Transaction } from '../shared/TransactionHistory';

interface ActivePresaleProps {
  className?: string;
}

// Mock data for development
const MOCK_PROGRESS = {
  tokensSold: 450000000,
  totalAllocation: 1000000000,
  amountRaised: 450000,
};

// Mock wallet data for development
const MOCK_WALLET = {
  address: '0x1234567890abcdef1234567890abcdef12345678',
  balanceUSDT: 5000,
  balanceUSDC: 3500,
  balanceCSPR: 10000,
};

// Mock transactions for development
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

export function ActivePresale({ className }: ActivePresaleProps) {
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

        {/* Progress Bar */}
        <ProgressBar
          currentValue={MOCK_PROGRESS.tokensSold}
          maxValue={MOCK_PROGRESS.totalAllocation}
          amountRaised={MOCK_PROGRESS.amountRaised}
          hardCap={Number(ICO_CONFIG.PRE_SALE.hardCap)}
          tokenSymbol={ICO_CONFIG.TOKEN.symbol}
          initialPrice={Number(ICO_CONFIG.PRE_SALE.price)}
          className="w-full"
        />

        {/* Wallet Card */}
        <WalletCard
          walletAddress={MOCK_WALLET.address}
          balanceUSDT={MOCK_WALLET.balanceUSDT}
          balanceUSDC={MOCK_WALLET.balanceUSDC}
          balanceCSPR={MOCK_WALLET.balanceCSPR}
          tokenPrice={Number(ICO_CONFIG.PRE_SALE.price)}
          tokenSymbol={ICO_CONFIG.TOKEN.symbol}
          onConnect={() => console.log('Connect wallet')}
          onPurchase={(amount, currency) => console.log('Purchase', amount, currency)}
          className="w-full"
        />
      </div>

      {/* Transaction History */}
      <TransactionHistory
        transactions={MOCK_TRANSACTIONS}
        className="mt-8 max-w-5xl"
      />
    </div>
  );
}

export default ActivePresale;
