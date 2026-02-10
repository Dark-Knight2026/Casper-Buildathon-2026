import { useState } from 'react';
import { cn } from '@/lib/utils';
import { ChevronRight, FileText, Download } from 'lucide-react';

interface Section {
  id: string;
  title: string;
  page: number;
  subsections?: { id: string; title: string; page: number }[];
}

const WHITEPAPER_SECTIONS: Section[] = [
  {
    id: 'abstract',
    title: '1. Abstract',
    page: 1,
    subsections: [
       { id: 'big-token', title: 'BIG Token', page: 1 },
    ],
  },
  {
    id: 'introduction',
    title: '2. Introduction',
    page: 1,
  },
  {
    id: 'proposed-solution',
    title: '3. Proposed Solution',
    page: 2,
    subsections: [
      { id: 'keychain', title: 'KeyChain', page: 2 },
      { id: 'leasefi', title: 'LeaseFi - Blockchain Real Estate Transaction Layer', page: 3 },
    ],
  },
  {
    id: 'tokenomics',
    title: '4. Tokenomics',
    page: 2,
    subsections: [
      { id: 'overview', title: '4.1 Token Overview', page: 2 },
      { id: 'cases', title: '4.2 Utility & Use Cases', page: 3 },
      { id: 'distribution', title: '4.3 Distribution', page: 3 },
      { id: 'vesting', title: '4.4 Vesting & Lock-Up', page: 3 },
      { id: 'inflation', title: '4.5 Inflation / Deflation Policy', page: 4 },
      { id: 'pricing', title: '4.7 Pricing & Fundraising', page: 4 },
      { id: 'fundamentals', title: '4.8 Growth-Oriented Token Fundamentals', page: 4 },
      { id: 'fee', title: '4.9 Transaction Fee Allocation', page: 5 },
      { id: 'pre-ico', title: '4.10 Pre-Initial Coin Offering Funding', page: 6 },
      { id: 'priority-hires', title: '4.11 Priority Hires', page: 7 },
    ],
  },
  {
    id: 'how-it-works',
    title: '5. How It Works - KeyChain App Ecosystem',
    page: 11,
    subsections: [
      { id: 'real-estate', title: 'Real Estate on the Blockchain', page: 11 },
      { id: 'architecture-overview', title: 'Architecture overview', page: 12 },
      { id: 'iterative-development', title: 'Iterative development strategy', page: 14 },
      { id: 'security-compliance', title: 'Security & Compliance', page: 14 },
      { id: 'staking-rewards-model', title: 'Staking & Rewards Model', page: 15 },
    ],
  },
  {
    id: 'career-growth-credentials',
    title: '6. Career Growth & Credentials',
    page: 19,
  },
  {
    id: 'roadmap',
    title: '7. Roadmap',
    page: 20,
  },
  {
    id: 'legal',
    title: '8. Legal Disclaimer',
    page: 21,
  },
];

interface WhitepaperTabProps {
  className?: string;
}

export function WhitepaperTab({ className }: WhitepaperTabProps) {
  const [activeSection, setActiveSection] = useState<string>('introduction');
  const [expandedSections, setExpandedSections] = useState<string[]>(['introduction', 'tokenomics']);
  const [currentPage, setCurrentPage] = useState<number>(1);

  const toggleSection = (sectionId: string) => {
    setExpandedSections((prev) =>
      prev.includes(sectionId) ? prev.filter((id) => id !== sectionId) : [...prev, sectionId]
    );
  };

  const navigateToPage = (sectionId: string, page: number) => {
    setActiveSection(sectionId);
    setCurrentPage(page);
  };

  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = '/docs/BIG_WhitePaper.pdf';
    link.download = 'BIG_WhitePaper.pdf';
    link.click();
  };

  return (
    <div className={cn('flex gap-6 h-175', className)}>
      {/* Sidebar */}
      <div className="hidden md:block w-64 shrink-0 rounded-md bg-[hsl(var(--ico-bg-card))] border border-[hsl(var(--ico-border-color))] overflow-hidden">
        <div className="p-4 border-b border-[hsl(var(--ico-border-color))]">
          <div className="flex items-center gap-2 text-[hsl(var(--ico-text-primary))]">
            <FileText className="w-5 h-5 text-[#1F7A63]" />
            <span className="font-semibold">WhitePaper</span>
          </div>
        </div>

        <div className="p-2 overflow-y-auto h-[calc(100%-120px)]">
          <nav className="space-y-1">
            {WHITEPAPER_SECTIONS.map((section) => (
              <div key={section.id}>
                <button
                  onClick={() => {
                    navigateToPage(section.id, section.page);
                    if (section.subsections) {
                      toggleSection(section.id);
                    }
                  }}
                  className={cn(
                    'w-full flex items-start gap-2 px-3 py-2 rounded-lg text-sm text-start transition-colors',
                    activeSection === section.id
                      ? 'bg-[#1F7A63]/20 text-[#1F7A63]'
                      : 'text-[hsl(var(--ico-text-secondary))] hover:bg-[hsl(var(--ico-bg-secondary))] hover:text-[hsl(var(--ico-text-primary))]'
                  )}
                >
                  {section.subsections && (
                    <ChevronRight
                      className={cn(
                        'w-4 h-4 shrink-0 transition-transform',
                        expandedSections.includes(section.id) && 'rotate-90'
                      )}
                    />
                  )}
                  <span className="flex-1 text-start">{section.title}</span>
                </button>

                {section.subsections && expandedSections.includes(section.id) && (
                  <div className="ml-6 mt-1 space-y-1 border-l border-[hsl(var(--ico-border-color))] pl-3">
                    {section.subsections.map((sub) => (
                      <button
                        key={sub.id}
                        onClick={() => navigateToPage(sub.id, sub.page)}
                        className={cn(
                          'w-full flex! justify-start! text-left px-3 py-1.5 rounded-lg text-xs transition-colors',
                          activeSection === sub.id
                            ? 'bg-[#1F7A63]/10 text-[#1F7A63]'
                            : 'text-[hsl(var(--ico-text-muted))] hover:bg-[hsl(var(--ico-bg-secondary))] hover:text-[hsl(var(--ico-text-secondary))]'
                        )}
                      >
                        {sub.title}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </nav>
        </div>

        <div className="p-3 border-t border-[hsl(var(--ico-border-color))]">
          <button
            onClick={handleDownload}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-md bg-[hsl(var(--ico-form-button))] text-white font-medium text-sm hover:bg-[hsl(var(--ico-form-button-hover))] transition-colors"
          >
            <Download className="w-4 h-4" />
            Download PDF
          </button>
        </div>
      </div>

      {/* PDF Viewer */}
      <div className="flex-1 rounded-md bg-[hsl(var(--ico-bg-card))] border border-[hsl(var(--ico-border-color))] overflow-hidden">
        <iframe
          key={activeSection}
          src={`/docs/BIG_WhitePaper.pdf#page=${currentPage}&view=FitH`}
          className="w-full h-full"
          title="BIG WhitePaper"
        >
          <div className="flex flex-col items-center justify-center h-full text-[hsl(var(--ico-text-secondary))]">
            <FileText className="w-16 h-16 mb-4 text-[hsl(var(--ico-text-muted))]" />
            <p className="mb-4">Unable to display PDF in browser</p>
            <button
              onClick={handleDownload}
              className="flex items-center gap-2 px-4 py-2 rounded-md bg-[hsl(var(--ico-form-button))] text-white font-medium text-sm hover:bg-[hsl(var(--ico-form-button-hover))] transition-colors"
            >
              <Download className="w-4 h-4" />
              Download PDF
            </button>
          </div>
        </iframe>
      </div>
    </div>
  );
}

export default WhitepaperTab;
