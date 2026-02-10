import { lazy, Suspense } from 'react';
import { useICOState } from '@/hooks/ico/useICOState';
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


// Loading fallback
function LoadingFallback() {
  return (
    <div className="flex items-center justify-center min-h-100">
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 border-4 border-[hsl(var(--ico-brand-primary))] border-t-transparent rounded-full animate-spin" />
        <p className="text-[hsl(var(--ico-text-secondary))]">Loading...</p>
      </div>
    </div>
  );
}

export function ICOPage() {
  const { state, phase, timestamps, nextStateTimestamp } = useICOState();

  // Render state-specific component
  const renderStateComponent = () => {
    switch (state) {
      case 1:
        return (
          <PresaleCountdown
            targetTimestamp={timestamps.presaleStart}
            endTimestamp={timestamps.presaleEnd}
          />
        );
      case 2:
        return (
          <ActivePresale 
            endTimestamp={timestamps.presaleEnd}
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
          />
        );
      case 5:
        return <PostICODashboard />;
      default:
        return <PresaleCountdown targetTimestamp={timestamps.presaleStart} endTimestamp={timestamps.presaleEnd} />;
    }
  };

  return (
    <div className="min-h-screen overflow-hidden relative bg-[hsl(var(--ico-bg-primary))]">
      {/* Header */}
      <ICOHeader/>
      {/* Sky Glow Background */}
      <div
        className="absolute inset-0 z-0 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse 100% 60% at center, rgba(56, 189, 248, 0.25) 0%, rgba(56, 189, 248, 0.1) 30%, transparent 70%)',
          filter: 'blur(10px)',
        }}
      />

      {/* Main Content */}
      <ScrollArea className="min-h-[calc(100vh-112px)]">
        <div className='min-h-[calc(100vh-112px)] flex flex-col justify-between'>
          <main className="container h-full mx-auto px-4 py-8">
            <PageErrorBoundary pageName="ICO">
              <Suspense fallback={<LoadingFallback />}>
                {renderStateComponent()}
              </Suspense>
            </PageErrorBoundary>
          </main>

          {/* Footer */}
          <ICOFooter />
        </div>
      </ScrollArea>
    </div>
  );
}

export default ICOPage;
