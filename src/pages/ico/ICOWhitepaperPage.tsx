import { ICOHeader } from './components/ICOHeader';
import { ICOFooter } from './components/ICOFooter';
import { ICOScrollArea as ScrollArea } from './components/shared/ICOScrollArea';
import { WhitepaperTab } from './components/states/WhitepaperTab';

export function ICOWhitepaperPage() {
  return (
    <div className="min-h-screen overflow-hidden relative bg-[hsl(var(--ico-bg-primary))]">
      <ICOHeader />
      <div
        className="absolute inset-0 z-0 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse 100% 60% at center, rgba(56, 189, 248, 0.25) 0%, rgba(56, 189, 248, 0.1) 30%, transparent 70%)',
          filter: 'blur(10px)',
        }}
      />

      <ScrollArea className="h-[calc(100vh-112px-92px)]">
        <main className="container max-h-full mx-auto px-4 pt-2">
          <WhitepaperTab />
        </main>
      </ScrollArea>

      <ICOFooter />
    </div>
  );
}

export default ICOWhitepaperPage;
