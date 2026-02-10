import { lazy, Suspense } from 'react';
import { useICOState } from '@/hooks/ico/useICOState';
import { useICOSchedules } from '@/hooks/ico/useICOSchedules';
import { ICOHeader } from './components/ICOHeader';
import { ICOFooter } from './components/ICOFooter';
import { ScrollArea } from '@/components/ui/scroll-area';
import { PageErrorBoundary } from '@/components/common/PageErrorBoundary';

// Lazy load state components
const PresaleCountdown = lazy(() => import('./components/states/PresaleCountdown'));
const ActivePresale = lazy(() => import('./components/states/ActivePresale'));
const DashboardICOCountdown = lazy(() => import('./components/states/DashboardICOCountdown'));
const ActiveICO = lazy(() => import('./components/states/ActiveICO'));
const PostICODashboard = lazy(() => import('./components/states/PostICODashboard'));

// Loading component
function LoadingFallback() {
  return (
    <div className="flex items-center justify-center min-h-[400px]">
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 border-4 border-[hsl(var(--ico-brand-primary))] border-t-transparent rounded-full animate-spin" />
        <p className="text-[hsl(var(--ico-text-secondary))]">Loading ICO data...</p>
      </div>
    </div>
  );
}

export function ICOPage() {
  const {
    timestamps,
    presaleProgress,
    icoProgress,
    isLoading,
    error,
  } = useICOSchedules();

  console.log('[ICOPage] useICOSchedules result:', {
    timestamps,
    presaleProgress,
    icoProgress,
    isLoading,
    error,
  });

  // Determine state based on timestamps from contract
  const { state } = useICOState({
    timestamps: timestamps ?? undefined,
  });

  console.log('[ICOPage] useICOState result:', { state, timestamps });

  // Show loading while fetching contract data
  if (isLoading || !timestamps) {
    console.log('[ICOPage] Showing loading state because:', { isLoading, hasTimestamps: !!timestamps });
    return (
      <ScrollArea className="h-screen overflow-hidden relative bg-[hsl(var(--ico-bg-primary))]">
        <ICOHeader />
        <div className="min-h-[calc(100vh-112px)] flex flex-col justify-between">
          <main className="container h-full mx-auto px-4 py-8">
            <LoadingFallback />
          </main>
          <ICOFooter />
        </div>
      </ScrollArea>
    );
  }

  // Show error state
  if (error) {
    return (
      <ScrollArea className="h-screen overflow-hidden relative bg-[hsl(var(--ico-bg-primary))]">
        <ICOHeader />
        <div className="min-h-[calc(100vh-112px)] flex flex-col justify-between">
          <main className="container h-full mx-auto px-4 py-8">
            <div className="flex items-center justify-center min-h-[400px]">
              <div className="text-center">
                <p className="text-red-500 mb-2">Failed to load ICO data</p>
                <p className="text-[hsl(var(--ico-text-secondary))] text-sm">{error.message}</p>
              </div>
            </div>
          </main>
          <ICOFooter />
        </div>
      </ScrollArea>
    );
  }

  // Render state-specific component based on current schedule state
  const renderStateComponent = () => {
    switch (state) {
      case 1:
        return (
          <PresaleCountdown
            targetTimestamp={timestamps.presaleStart}
            endTimestamp={timestamps.presaleEnd}
            progress={presaleProgress}
          />
        );
      case 2:
        return (
          <ActivePresale
            endTimestamp={timestamps.presaleEnd}
            progress={presaleProgress}
          />
        );
      case 3:
        return (
          <DashboardICOCountdown
            icoStartTimestamp={timestamps.icoStart}
          />
        );
      case 4:
        return (
          <ActiveICO
            endTimestamp={timestamps.icoEnd}
            progress={icoProgress}
          />
        );
      case 5:
        return <PostICODashboard />;
      default:
        return (
          <PresaleCountdown
            targetTimestamp={timestamps.presaleStart}
            endTimestamp={timestamps.presaleEnd}
            progress={presaleProgress}
          />
        );
    }
  };

  return (
    <ScrollArea className="h-screen overflow-hidden relative bg-[hsl(var(--ico-bg-primary))]">
      <ICOHeader />
      <div className="min-h-[calc(100vh-112px)] flex flex-col justify-between">
        <main className="container h-full mx-auto px-4 py-8">
          <Suspense fallback={<LoadingFallback />}>
            {renderStateComponent()}
          </Suspense>
        </main>

        <ICOFooter />
      </div>
    </ScrollArea>
  );
}

export default ICOPage;
