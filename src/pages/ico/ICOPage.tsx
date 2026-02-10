import { lazy, Suspense } from 'react';
import { useICOState } from '@/hooks/ico/useICOState';
import { useICOSchedules } from '@/hooks/ico/useICOSchedules';
import { ICOHeader } from './components/ICOHeader';
import { ICOFooter } from './components/ICOFooter';
import { ScrollArea } from '@/components/ui/scroll-area';
import { PageErrorBoundary } from '@/components/common/PageErrorBoundary';

// Lazy load state components
const PrivateSaleCountdown = lazy(() => import('./components/states/PrivateSaleCountdown'));
const ActivePresale = lazy(() => import('./components/states/ActivePresale'));
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
    icoProgress,
    isLoading,
    error,
  } = useICOSchedules();

  // Show loading while fetching contract data
  // IMPORTANT: Check this BEFORE calling useICOState to avoid flash of wrong state
  const hasLoadedData = !isLoading && timestamps !== null;

  // Determine state based on timestamps from contract
  const { state } = useICOState({
    timestamps: hasLoadedData ? timestamps : undefined,
  });

  // Show loading until we have real contract data
  if (!hasLoadedData) {
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
          <PrivateSaleCountdown
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
        return <PostICODashboard />;
      default:
        return (
          <LoadingFallback />
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
