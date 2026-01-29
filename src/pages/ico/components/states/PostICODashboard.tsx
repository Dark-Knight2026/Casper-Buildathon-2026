import { cn } from '@/lib/utils';
import { DashboardTabs, type TabData } from '../shared/DashboardTabs';
import { OverviewTab } from './OverviewTab';
import { WhitepaperTab } from './WhitepaperTab';
import { ArrowLeftRight, LayoutDashboard, Gift, PieChart, FileText } from 'lucide-react';

interface PostICODashboardProps {
  className?: string;
}

export function PostICODashboard({ className }: PostICODashboardProps) {
  const tabs: TabData[] = [
    {
      label: 'Exchange',
      value: 'exchange',
      icon: <ArrowLeftRight className="w-4 h-4" />,
      content: (
        <div className="text-center py-12 text-[hsl(var(--ico-text-secondary))]">
          Exchange functionality coming soon...
        </div>
      ),
    },
    {
      label: 'Overview',
      value: 'overview',
      icon: <LayoutDashboard className="w-4 h-4" />,
      content: <OverviewTab />,
    },
    {
      label: 'Rewards',
      value: 'rewards',
      icon: <Gift className="w-4 h-4" />,
      content: (
        <div className="text-center py-12 text-[hsl(var(--ico-text-secondary))]">
          Rewards dashboard coming soon...
        </div>
      ),
    },
    {
      label: 'Tokenomics',
      value: 'tokenomics',
      icon: <PieChart className="w-4 h-4" />,
      content: (
        <div className="text-center py-12 text-[hsl(var(--ico-text-secondary))]">
          Tokenomics information coming soon...
        </div>
      ),
    },
    {
      label: 'WhitePaper',
      value: 'whitepaper',
      icon: <FileText className="w-4 h-4" />,
      content: <WhitepaperTab />,
    },
  ];

  return (
    <div className={cn('max-w-5xl mx-auto', className)}>
      <DashboardTabs
        tabs={tabs}
        defaultValue="overview"
        tabsPosition="left"
        className="mb-8"
      />
    </div>
  );
}

export default PostICODashboard;
