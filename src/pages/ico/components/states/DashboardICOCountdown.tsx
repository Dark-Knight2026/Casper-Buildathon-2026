import { cn } from '@/lib/utils';
import { Card } from '../shared/Card';
import { CountdownTimer } from '../shared/CountdownTimer';
import { VestingProgressBlock, VestingEntry } from '../shared/VestingProgressBlock';
import { ICO_CONFIG } from '@/constants/ico';
import { Wallet, Lock, Unlock, DollarSign } from 'lucide-react';
import { Title } from '../shared/Title';

interface DashboardICOCountdownProps {
  icoStartTimestamp: number;
  className?: string;
}

// Mock data for development - Vesting model
const MOCK_VESTING_DATA = {
  bigPurchased: '500000',
  bigLocked: '500000',
  bigAvailable: '0',
  vestingStartDate: 'After ICO ends',
  vestingDuration: '12 months',
  vestingCliff: '3 months',
};

// Mock vesting entries - multiple purchases with linear unlock
const MOCK_VESTING_ENTRIES: VestingEntry[] = [
  {
    id: '1',
    lockedAmount: 200000,
    unlockTimestamp: Date.now() + 30 * 24 * 60 * 60 * 1000, // 1 month from now
    purchaseTimestamp: Date.now() - 60 * 24 * 60 * 60 * 1000, // 2 months ago
  },
  {
    id: '2',
    lockedAmount: 150000,
    unlockTimestamp: Date.now() + 60 * 24 * 60 * 60 * 1000, // 2 months from now
    purchaseTimestamp: Date.now() - 30 * 24 * 60 * 60 * 1000, // 1 month ago
  },
  {
    id: '3',
    lockedAmount: 150000,
    unlockTimestamp: Date.now() + 90 * 24 * 60 * 60 * 1000, // 3 months from now
    purchaseTimestamp: Date.now() - 14 * 24 * 60 * 60 * 1000, // 2 weeks ago
  },
];

export function DashboardICOCountdown({ icoStartTimestamp, className }: DashboardICOCountdownProps) {
  const formatNumber = (value: string | number) => {
    return Number(value).toLocaleString();
  };

  const formatUSD = (value: string | number) => {
    return `$${Number(value).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  // Calculate USD values based on token prices
  const tokensOwned = Number(MOCK_VESTING_DATA.bigPurchased);
  const presalePrice = Number(ICO_CONFIG.PRE_SALE.price);
  const estValuePresale = tokensOwned * presalePrice;
  const availableTokens = Number(MOCK_VESTING_DATA.bigAvailable);
  const availableValuePresale = availableTokens * presalePrice;

  const dashboardCards = [
    {
      label: 'BIG Purchased',
      value: MOCK_VESTING_DATA.bigPurchased,
      usdValue: estValuePresale,
      icon: Wallet,
      iconColor: 'text-[hsl(var(--ico-brand-secondary))]',
      iconBg: 'bg-[hsl(var(--ico-brand-secondary))]/10',
    },
    {
      label: 'BIG Locked',
      value: MOCK_VESTING_DATA.bigLocked,
      usdValue: estValuePresale,
      icon: Lock,
      iconColor: 'text-amber-500',
      iconBg: 'bg-amber-500/10',
    },
    {
      label: 'BIG Available',
      value: MOCK_VESTING_DATA.bigAvailable,
      usdValue: availableValuePresale,
      icon: Unlock,
      iconColor: 'text-green-500',
      iconBg: 'bg-green-500/10',
    },
    {
      label: 'Est. Value',
      subtitle: ` $${presalePrice} (Presale)`,
      value: formatUSD(estValuePresale),
      icon: DollarSign,
      iconColor: 'text-yellow-500',
      iconBg: 'bg-yellow-500/10',
      isUsdValue: true,
    },
  ];

  return (
    <div className={cn('max-w-5xl items-center mx-auto', className)}>
      <Title className="mb-12 w-full text-center">
        Dashboard
      </Title>

      {/* ICO Countdown Card */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-4 mb-6">
        <p className="text-center text-[hsl(var(--ico-text-secondary))] text-xl font-semibold">
          Public ICO Starts In
        </p>

        <CountdownTimer
          targetTimestamp={icoStartTimestamp}
          size="lg"
          showLabels
          variant='compact'
        />

        <div className="text-center">
          <p className="text-[hsl(var(--ico-text-secondary))]">
            ICO Price: <span className="font-bold text-[hsl(var(--ico-text-primary))]">${ICO_CONFIG.PUBLIC_ICO.price}</span>
          </p>
        </div>
      </div>

      {/* Dashboard Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {dashboardCards.map((card) => {
          const IconComponent = card.icon;
          return (
            <Card key={card.label} className="p-5 items-start justify-between">
              <div className={cn('w-12 h-12 rounded-lg mb-3 flex items-center justify-center', card.iconBg)}>
                <IconComponent className={cn('w-6 h-6', card.iconColor)} />
              </div>
              <p className="text-sm text-[hsl(var(--ico-text-secondary))] mb-1">{card.label}</p>
              {card.subtitle && (
                <p className="text-xs text-[hsl(var(--ico-text-muted))] mb-1">{card.subtitle}</p>
              )}
              <p className="text-xl font-bold text-[hsl(var(--ico-text-primary))]">
                {card.isUsdValue ? card.value : formatNumber(card.value)}
              </p>
              {!card.isUsdValue && card.usdValue !== undefined && (
                <p className="text-sm text-[hsl(var(--ico-text-muted))]">
                  ≈ {formatUSD(card.usdValue)}
                </p>
              )}
            </Card>
          );
        })}
      </div>
      <div className='flex flex-col md:flex-row'>

        {/* Vesting Schedule Card */}
        <Card className="mb-8 p-6 w-full items-stretch">
          <h3 className="font-semibold text-[hsl(var(--ico-text-primary))] mb-4">
            Vesting Schedule
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full">
            <div className="flex flex-col">
              <span className="text-sm text-[hsl(var(--ico-text-muted))]">Vesting Starts</span>
              <span className="font-medium text-[hsl(var(--ico-text-primary))]">{MOCK_VESTING_DATA.vestingStartDate}</span>
            </div>
            <div className="flex flex-col">
              <span className="text-sm text-[hsl(var(--ico-text-muted))]">Cliff Period</span>
              <span className="font-medium text-[hsl(var(--ico-text-primary))]">{MOCK_VESTING_DATA.vestingCliff}</span>
            </div>
            <div className="flex flex-col">
              <span className="text-sm text-[hsl(var(--ico-text-muted))]">Total Duration</span>
              <span className="font-medium text-[hsl(var(--ico-text-primary))]">{MOCK_VESTING_DATA.vestingDuration}</span>
            </div>
          </div>

          {/* Vesting Progress Block */}
          <VestingProgressBlock
            vestingEntries={MOCK_VESTING_ENTRIES}
            tokenSymbol={ICO_CONFIG.TOKEN.symbol}
            tokenPrice={Number(ICO_CONFIG.PRE_SALE.price)}
            className="mt-6"
          />
        </Card>
      </div>
      {/* Info Banner */}
      <Card className="p-4 items-start">
        <div className="flex items-start gap-3">
          <div className="w-6 h-6 rounded-full bg-[hsl(var(--ico-brand-primary))] flex items-center justify-center shrink-0 mt-0.5">
            <Lock className="w-3.5 h-3.5 text-white" />
          </div>
          <div>
            <p className="font-medium text-[hsl(var(--ico-text-primary))]">
              Your Tokens Are Locked
            </p>
            <p className="text-sm text-[hsl(var(--ico-text-secondary))] mt-1">
              Pre-sale tokens are secured in the vesting contract. They will be released according to the
              vesting schedule after the ICO ends. This ensures fair token distribution and price stability.
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}

export default DashboardICOCountdown;
