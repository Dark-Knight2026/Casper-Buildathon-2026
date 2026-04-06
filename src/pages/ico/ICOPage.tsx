import { lazy, Suspense } from 'react';
import { useICOState } from '@/hooks/ico/useICOState';
import { useICOSchedules } from '@/hooks/ico/useICOSchedules';
import { ICOHeader } from './components/ICOHeader';
import { ICOFooter } from './components/ICOFooter';
import { DevStateSelector } from './components/DevStateSelector';
import { ScrollArea } from '@/components/ui/scroll-area';
import { PageErrorBoundary } from '@/components/common/PageErrorBoundary';
import { logger } from '@/utils/logger';

// Lazy load state components
const PrivateSaleCountdown = lazy(() => import('./components/states/PrivateSaleCountdown'));
const PrivateSaleActive = lazy(() => import('./components/states/PrivateSaleActive'));
const PostICODashboard = lazy(() => import('./components/states/PostICODashboard'));

// Loading component
function LoadingFallback() {
  return (
    <div className="flex items-center justify-center min-h-100">
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
    isLoading,
    error,
  } = useICOSchedules();

  logger.debug('[ICOPage] useICOSchedules result:', {
    timestamps,
    presaleProgress,
    isLoading,
    error,
  });

  // Show loading while fetching contract data
  // IMPORTANT: Check this BEFORE calling useICOState to avoid flash of wrong state
  const hasLoadedData = !isLoading && timestamps !== null;

  // Determine state based on timestamps from contract
  const { state, setDevState, isDevOverride } = useICOState({
    timestamps: hasLoadedData ? timestamps : undefined,
  });

  logger.debug('[ICOPage] useICOState result:', { state, timestamps });

  // Show loading until we have real contract data
  if (!hasLoadedData) {
    logger.debug('[ICOPage] Showing loading state because:', { isLoading, hasTimestamps: !!timestamps });
    return (
      <ScrollArea className="h-screen overflow-hidden relative bg-[hsl(var(--ico-bg-primary))]">
        <ICOHeader />
        <DevStateSelector currentState={state} onStateChange={setDevState} isDevOverride={isDevOverride} />
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
        <DevStateSelector currentState={state} onStateChange={setDevState} isDevOverride={isDevOverride} />
        <div className="min-h-[calc(100vh-112px)] flex flex-col justify-between">
          <main className="container h-full mx-auto px-4 py-8">
            <div className="flex items-center justify-center min-h-100">
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
          <PrivateSaleCountdown
            targetTimestamp={timestamps.presaleStart}
            endTimestamp={timestamps.presaleEnd}
            progress={presaleProgress}
          />
        );
      case 2:
        return (
          <PrivateSaleActive
            endTimestamp={timestamps.presaleEnd}
            progress={presaleProgress}
          />
        );
      case 3:
        return <PostICODashboard />;
      default:
        return (
          <LoadingFallback />
        );
    }
  };

  return (
    <ScrollArea className="h-screen overflow-hidden relative bg-[hsl(var(--ico-bg-primary))]">
      {/* Skip navigation for keyboard users (WCAG 2.4.1) */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:bg-white focus:text-black focus:px-4 focus:py-2 focus:rounded"
      >
        Skip to main content
      </a>
      <ICOHeader />
      <DevStateSelector currentState={state} onStateChange={setDevState} isDevOverride={isDevOverride} />
      <div className="min-h-[calc(100vh-112px)] flex flex-col justify-between">
        <main className="container h-full mx-auto px-4 py-8">
            <PageErrorBoundary pageName="ICO">
              <Suspense fallback={<LoadingFallback />}>
                {renderStateComponent()}
              </Suspense>
            </PageErrorBoundary>
        </main>

        <ICOFooter />
      </div>
    </ScrollArea>
  );
}

export default ICOPage;
