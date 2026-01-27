import { cn } from '@/lib/utils';
import { CountdownTimer } from '../shared/CountdownTimer';
import { ICO_CONFIG } from '@/constants/ico';
import { MainButton } from '../shared/MainButton';
import { Title } from '../shared/Title';
import { InfoCard } from '../shared/InfoCard';

interface PresaleCountdownProps {
  targetTimestamp: number;
  endTimestamp: number;
  className?: string;

}

export function PresaleCountdown({ targetTimestamp, endTimestamp, className }: PresaleCountdownProps) {

  return (
    <div className={cn('max-w-5xl mx-auto relative flex flex-col items-center', className)}>

      {/* Hero Section */}
      <div className="text-center mb-12">

        <Title className="mb-4">
          {ICO_CONFIG.TOKEN.symbol} Token Presale
        </Title>

        <p className="text-lg md:text-xl font-thin text-[hsl(var(--ico-text-secondary))] max-w-2xl mx-auto">
          Presale Sale Starts In
        </p>
      </div>

      {/* Countdown Card */}
      <div className="rounded-2xl shadow-lg p-6 md:p-10 mb-8">

        <CountdownTimer
          targetTimestamp={targetTimestamp}
          size="lg"
          showLabels
        />

        {/* Pre-sale Info */}
        <InfoCard className="mt-14">
          <div className="text-center p-4">
            <p className="text-sm text-[hsl(var(--ico-text-secondary))] mb-1">Token Price</p>
            <p className="text-lg font-bold text-[hsl(var(--ico-text-primary))]">
              ${ICO_CONFIG.PRE_SALE.price}
            </p>
          </div>

          <div className="text-center p-4">
            <p className="text-sm text-[hsl(var(--ico-text-secondary))] mb-1">Allocation</p>
            <p className="text-lg font-bold text-[hsl(var(--ico-text-primary))]">
              {(Number(ICO_CONFIG.PRE_SALE.allocation) / 1e9).toFixed(0)}B {ICO_CONFIG.TOKEN.symbol}
            </p>
          </div>

          <div className="text-center p-4">
            <p className="text-sm text-[hsl(var(--ico-text-secondary))] mb-1">Funds Raised</p>
            <p className="text-lg font-bold text-[hsl(var(--ico-text-primary))]">
              ${(Number(ICO_CONFIG.PRE_SALE.fundsRaised)).toLocaleString()} USD
            </p>
          </div>

          <div className="text-center p-4">
            <p className="text-sm text-[hsl(var(--ico-text-secondary))] mb-1">Presale Ends:</p>
            <p className="text-sm text-[hsl(var(--ico-text-secondary))] mb-1">{new Date(endTimestamp).toLocaleString()}</p>
          </div>
        </InfoCard>
      </div>
      <MainButton text="Learn More"/>
    </div>
  );
}

export default PresaleCountdown;
