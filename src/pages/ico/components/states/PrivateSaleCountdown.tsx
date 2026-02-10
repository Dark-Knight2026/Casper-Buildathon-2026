import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';
import { CountdownTimer } from '../shared/CountdownTimer';
import { ICO_CONFIG } from '@/constants/ico';
import type { ScheduleProgress } from '@/hooks/ico/useICOSchedules';
import { MainButton } from '../shared/MainButton';
import { Title } from '../shared/Title';
import { InfoCard } from '../shared/InfoCard';


interface PresaleCountdownProps {
  targetTimestamp: number;
  endTimestamp: number;
  progress?: ScheduleProgress | null;
  className?: string;
}

export function PrivateSaleCountdown({ targetTimestamp, endTimestamp, progress, className }: PresaleCountdownProps) {
  const navigate = useNavigate();
  const isMobile = useIsMobile();

  return (
    <div className={cn('max-w-5xl mx-auto relative flex flex-col items-center', className)}>

      {/* Hero Section */}
      <div className="text-center mb-4 mt-4">

        <Title className="mb-4">
          {ICO_CONFIG.TOKEN.symbol} Private Sale
        </Title>

        <p className="text-lg md:text-xl font-thin text-[hsl(var(--ico-text-secondary))] max-w-2xl mx-auto">
          Starts In
        </p>
      </div>

      {/* Countdown Card */}
      <div className=" p-6 md:p-10 mb-8">

        <CountdownTimer
          targetTimestamp={targetTimestamp}
          size={isMobile ? 'md' : 'lg'}
          showLabels
        />

        {/* Pre-sale Info - show only if progress data exists */}
        {progress && (
          <InfoCard className="mt-14">
            <div className="text-center p-4">
              <p className="text-sm text-[hsl(var(--ico-text-secondary))] mb-1">Token Price</p>
              <p className="text-lg font-bold text-[hsl(var(--ico-text-primary))]">
                ${progress.priceUsd.toFixed(2)}
              </p>
            </div>

            <div className="text-center p-4">
              <p className="text-sm text-[hsl(var(--ico-text-secondary))] mb-1">Allocation</p>
              <p className="text-lg font-bold text-[hsl(var(--ico-text-primary))]">
                {progress.totalAllocation.toLocaleString()} {ICO_CONFIG.TOKEN.symbol}
              </p>
            </div>

            <div className="text-center p-4">
              <p className="text-sm text-[hsl(var(--ico-text-secondary))] mb-1">Hard Cap</p>
              <p className="text-lg font-bold text-[hsl(var(--ico-text-primary))]">
                ${Number(ICO_CONFIG.PRE_SALE.hardCap).toLocaleString()}
              </p>
            </div>

            <div className="text-center p-4">
              <p className="text-sm text-[hsl(var(--ico-text-secondary))] mb-1">Presale Ends:</p>
              <p className="text-sm text-[hsl(var(--ico-text-secondary))] mb-1">{new Date(endTimestamp).toLocaleString()}</p>
            </div>
          </InfoCard>
        )}
      </div>
      <MainButton text="Learn More" onClick={() => navigate('/ico/whitepaper')}/>
    </div>
  );
}

export default PrivateSaleCountdown;
