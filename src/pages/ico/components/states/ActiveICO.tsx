import { cn } from '@/lib/utils';
import { Card } from '../shared/Card';
import { CountdownTimer } from '../shared/CountdownTimer';
import { ProgressBar } from '../shared/ProgressBar';
import { WalletCard } from '../shared/WalletCard';
import { TransactionHistory } from '../shared/TransactionHistory';
import { ICO_CONFIG, MOCK_TRANSACTIONS } from '@/constants/ico';
import type { PaymentCurrency } from '@/types/ico';
import { Title } from '../shared/Title';

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

export function ActiveICO({ endTimestamp, className }: ActiveICOProps) {
  const tokensRemaining = MOCK_PROGRESS.totalAllocation - MOCK_PROGRESS.tokensSold;

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
    <div className={cn('max-w-5xl mx-auto space-y-6 flex flex-col items-center', className)}>
      <Title className="mb-4">
        {ICO_CONFIG.TOKEN.symbol} Active ICO
      </Title>
      {/* Stats Row — using role="group" + aria-label for a11y (WCAG 1.3.1).
          We intentionally avoid aria-hidden on visible text + duplicating content in aria-label,
          as that creates a maintenance burden. Screen readers already read the <p> elements
          in DOM order; role="group" simply announces logical grouping. */}
      <div className="grid grid-cols-1 w-full md:grid-cols-3 gap-4">
        {/* Token Price */}
        <Card className="p-6 text-center" role="group" aria-label="Live token price">
          <p className="text-sm text-[hsl(var(--ico-text-secondary))] mb-2">Live Token Price</p>
          <p className="text-3xl font-bold text-[hsl(var(--ico-text-primary))]">
            ${ICO_CONFIG.PUBLIC_ICO.price}
          </p>
          <p className="text-xs text-sky-400 mt-2">per {ICO_CONFIG.TOKEN.symbol}</p>
        </Card>

        {/* ICO Allocation Remaining */}
        <Card className="p-6 text-center" role="group" aria-label="Allocation remaining">
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
          tokenPrice={Number(ICO_CONFIG.PUBLIC_ICO.price)}
          tokenSymbol={ICO_CONFIG.TOKEN.symbol}
          balanceUSDT={1500}
          balanceUSDC={2000}
          balanceCSPR={5000}
          onConnect={handleConnect}
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
