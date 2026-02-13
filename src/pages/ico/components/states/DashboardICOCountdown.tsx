import { cn } from '@/lib/utils';
import { Card } from '../shared/Card';
import { CountdownTimer } from '../shared/CountdownTimer';
import { VestingProgressBlock } from '../shared/VestingProgressBlock';
import { ICO_CONFIG } from '@/constants/ico';
import { MOCK_VESTING_INFO, MOCK_VESTING_ENTRIES } from '@/constants/icoMockData';
import { Wallet, Lock, Unlock, DollarSign } from 'lucide-react';
import { Title } from '../shared/Title';
import { formatNumber, formatUSD } from '../../utils/formatters';

interface DashboardICOCountdownProps {
  icoStartTimestamp: number;
  className?: string;
}

export function DashboardICOCountdown({ icoStartTimestamp, className }: DashboardICOCountdownProps) {
  // Calculate USD values based on token prices
  const tokensOwned = Number(MOCK_VESTING_INFO.bigPurchased);
  const presalePrice = Number(ICO_CONFIG.PRE_SALE.price);
  const estValuePresale = tokensOwned * presalePrice;
  const availableTokens = Number(MOCK_VESTING_INFO.bigAvailable);
  const availableValuePresale = availableTokens * presalePrice;

  const dashboardCards = [
    {
      label: 'BIG Purchased',
      value: MOCK_VESTING_INFO.bigPurchased,
      usdValue: estValuePresale,
      icon: Wallet,
      iconColor: 'text-sky-500',
      iconBg: 'bg-sky-500/10',
    },
    {
      label: 'BIG Locked',
      value: MOCK_VESTING_INFO.bigLocked,
      usdValue: estValuePresale,
      icon: Lock,
      iconColor: 'text-amber-500',
      iconBg: 'bg-amber-500/10',
    },
    {
      label: 'BIG Available',
      value: MOCK_VESTING_INFO.bigAvailable,
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
              <span className="font-medium text-[hsl(var(--ico-text-primary))]">{MOCK_VESTING_INFO.vestingStartDate}</span>
            </div>
            <div className="flex flex-col">
              <span className="text-sm text-[hsl(var(--ico-text-muted))]">Cliff Period</span>
              <span className="font-medium text-[hsl(var(--ico-text-primary))]">{MOCK_VESTING_INFO.vestingCliff}</span>
            </div>
            <div className="flex flex-col">
              <span className="text-sm text-[hsl(var(--ico-text-muted))]">Total Duration</span>
              <span className="font-medium text-[hsl(var(--ico-text-primary))]">{MOCK_VESTING_INFO.vestingDuration}</span>
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
