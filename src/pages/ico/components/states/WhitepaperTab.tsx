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
    subsections: [
    ],
  },
  {
    id: 'proposed-solution',
    title: '3. Proposed Solution',
    page: 2,
    subsections: [
      { id: 'platform', title: 'KeyChain - Blockchain Real Estate Platform', page: 2 },
      { id: 'rewards', title: 'Realtor Rewards & Ranking System', page: 3 },
      { id: 'deal-difficulty', title: 'Deal Difficulty Adjustment ', page: 4 },
      { id: 'career-growth', title: 'Career Growth & Credentials ', page: 5 },
    ],
  },
  {
    id: 'platform',
    title: '4. Tokenomics',
    page: 5,
    subsections: [
      { id: 'overview', title: '4.1 Token Overview', page: 5 },
      { id: 'cases', title: '4.2 Utility & Use Cases', page: 6 },
      { id: 'distribution', title: '4.3 Distribution', page: 6 },
      { id: 'vesting', title: '4.4 Vesting & Lock-Up', page: 7 },
      { id: 'inflation', title: '4.5 Inflation / Deflation Policy', page: 7 },
      { id: 'pricing', title: '4.7 Pricing & Fundraising', page: 7 },
      { id: 'fundamentals', title: '4.8 Growth-Oriented Token Fundamentals', page: 7 },
      { id: 'fee', title: '4.9 Transaction Fee Allocation', page: 9 },
    ],
  },
  {
    id: 'tokenomics',
    title: '4.8 Growth-Oriented Token Fundamentals',
    page: 7,
    subsections: [
      { id: 'distribution', title: 'Token Distribution', page: 8 },
      { id: 'utility', title: 'Token Utility', page: 9 },
      { id: 'vesting', title: 'Vesting Schedule', page: 10 },
    ],
  },
  {
    id: 'roadmap',
    title: 'Roadmap',
    page: 11,
  },
  {
    id: 'team',
    title: 'Team',
    page: 12,
  },
  {
    id: 'legal',
    title: 'Legal & Compliance',
    page: 13,
  },
];

interface WhitepaperTabProps {
  className?: string;
}

export function WhitepaperTab({ className }: WhitepaperTabProps) {
  const [activeSection, setActiveSection] = useState<string>('introduction');
  const [expandedSections, setExpandedSections] = useState<string[]>(['introduction', 'platform', 'tokenomics']);
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
    link.href = '/docs/LeaseFi_WhitePaper.pdf';
    link.download = 'LeaseFi_WhitePaper.pdf';
    link.click();
  };

  return (
    <div className={cn('flex gap-6 h-[700px]', className)}>
      {/* Sidebar */}
      <div className="hidden md:block w-64 flex-shrink-0 rounded-xl bg-black/40 border border-white/10 overflow-hidden">
        <div className="p-4 border-b border-white/10">
          <div className="flex items-center gap-2 text-[hsl(var(--ico-text-primary))]">
            <FileText className="w-5 h-5 text-[#d4a847]" />
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
                    'w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-left transition-colors',
                    activeSection === section.id
                      ? 'bg-[#d4a847]/20 text-[#d4a847]'
                      : 'text-[hsl(var(--ico-text-secondary))] hover:bg-white/5 hover:text-[hsl(var(--ico-text-primary))]'
                  )}
                >
                  {section.subsections && (
                    <ChevronRight
                      className={cn(
                        'w-4 h-4 flex-shrink-0 transition-transform',
                        expandedSections.includes(section.id) && 'rotate-90'
                      )}
                    />
                  )}
                  <span className="flex-1 text-left">{section.title}</span>
                </button>

                {section.subsections && expandedSections.includes(section.id) && (
                  <div className="ml-6 mt-1 space-y-1 border-l border-white/10 pl-3">
                    {section.subsections.map((sub) => (
                      <button
                        key={sub.id}
                        onClick={() => navigateToPage(sub.id, sub.page)}
                        className={cn(
                          'w-full text-left px-3 py-1.5 rounded-lg text-xs transition-colors',
                          activeSection === sub.id
                            ? 'bg-[#d4a847]/10 text-[#d4a847]'
                            : 'text-[hsl(var(--ico-text-muted))] hover:bg-white/5 hover:text-[hsl(var(--ico-text-secondary))]'
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

        <div className="p-3 border-t border-white/10">
          <button
            onClick={handleDownload}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-[#d4a847] text-black font-medium text-sm hover:bg-[#c49a3d] transition-colors"
          >
            <Download className="w-4 h-4" />
            Download PDF
          </button>
        </div>
      </div>

      {/* PDF Viewer */}
      <div className="flex-1 rounded-xl bg-black/40 border border-white/10 overflow-hidden">
        <iframe
          key={currentPage}
          src={`/docs/LeaseFi_WhitePaper.pdf#page=${currentPage}&view=FitH`}
          className="w-full h-full"
          title="LeaseFi WhitePaper"
        >
          <div className="flex flex-col items-center justify-center h-full text-[hsl(var(--ico-text-secondary))]">
            <FileText className="w-16 h-16 mb-4 text-[hsl(var(--ico-text-muted))]" />
            <p className="mb-4">Unable to display PDF in browser</p>
            <button
              onClick={handleDownload}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#d4a847] text-black font-medium text-sm hover:bg-[#c49a3d] transition-colors"
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
