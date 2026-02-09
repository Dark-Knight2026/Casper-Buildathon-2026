import { cn } from '@/lib/utils';
import { ICO_CONFIG, MOCK_TRANSACTIONS } from '@/constants/ico';
import type { PaymentCurrency } from '@/types/ico';
import { Title } from '../shared/Title';
import { ProgressBar } from '../shared/ProgressBar';
import { WalletCard } from '../shared/WalletCard';
import { TransactionHistory } from '../shared/TransactionHistory';
import CountdownTimer from '../shared/CountdownTimer';
import { UserTokenBalance } from '../shared/UserTokenBalance';

interface ActivePresaleProps {
  className?: string;
  endTimestamp: number;
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

// Mock user purchased tokens data
const MOCK_USER_BALANCE = {
  tokensPurchased: 1505000,  // 500,000 + 1,000,000 + 5,000
  totalSpentUSD: 1505,       // $500 + $1,000 + $5 (250 CSPR × $0.02)
};

export function ActivePresale({ className, endTimestamp }: ActivePresaleProps) {
  // TODO: [Next PR] Implement wallet connection via CasperWalletProvider.
  // Should prompt user to connect Casper Signer / Casper Wallet extension,
  // retrieve the active public key, and store it in app state.
  const handleConnect = () => {
  };

  // TODO: [Next PR] Implement full purchase flow with server-side validation.
  // This handler is intentionally empty in the current UI-only PR.
  // Required integration steps:
  //   1. Validate amount & currency on the backend (never trust client-side math).
  //   2. Create a pending transaction record server-side before accepting payment.
  //   3. Submit blockchain transaction (CEP-18 transfer for USDT/USDC, native deploy for CSPR).
  //   4. Backend must verify the deploy on-chain and confirm token allocation.
  //   5. Implement idempotency keys / nonce to prevent double-spending.
  //   6. Handle edge cases: insufficient balance, network errors, deploy failures.
  //   7. CSRF protection: API layer must enforce CSRF tokens (via cookies/headers),
  //      SameSite cookie policy, and Origin/Referer header validation.
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
          walletAddress={MOCK_WALLET.address}
          balanceUSDT={MOCK_WALLET.balanceUSDT}
          balanceUSDC={MOCK_WALLET.balanceUSDC}
          balanceCSPR={MOCK_WALLET.balanceCSPR}
          tokenPrice={Number(ICO_CONFIG.PRE_SALE.price)}
          tokenSymbol={ICO_CONFIG.TOKEN.symbol}
          onConnect={handleConnect}
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
