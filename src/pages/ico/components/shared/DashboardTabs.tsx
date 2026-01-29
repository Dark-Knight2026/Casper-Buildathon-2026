import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@radix-ui/react-tabs';
import { cn } from '@/lib/utils';

export interface TabData {
  label: string;
  value: string;
  icon?: React.ReactNode;
  content?: React.ReactNode;
}

interface DashboardTabsProps {
  tabs: TabData[];
  defaultValue?: string;
  onTabChange?: (value: string) => void;
  className?: string;
  /** Position of the tabs: 'left' | 'right' | 'center' (default: 'right' on lg screens) */
  tabsPosition?: 'left' | 'right' | 'center';
  /** Color of the active underline */
  activeColor?: string;
}

export function DashboardTabs({
  tabs,
  defaultValue,
  onTabChange,
  className,
  tabsPosition = 'right',
}: DashboardTabsProps) {
  const [activeValue, setActiveValue] = useState(defaultValue ?? tabs[0]?.value);
  const [underlineStyle, setUnderlineStyle] = useState({ width: 0, left: 0 });

  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  const handleValueChange = (value: string) => {
    setActiveValue(value);
    onTabChange?.(value);
  };

  const updateUnderline = useCallback(() => {
    const activeEl = triggerRefs.current[activeValue];
    const containerEl = containerRef.current;

    if (activeEl && containerEl) {
      const containerRect = containerEl.getBoundingClientRect();
      const activeRect = activeEl.getBoundingClientRect();

      setUnderlineStyle({
        width: activeRect.width,
        left: activeRect.left - containerRect.left,
      });
    }
  }, [activeValue]);

  useLayoutEffect(() => {
    updateUnderline();
  }, [updateUnderline, tabs]);

  useEffect(() => {
    window.addEventListener('resize', updateUnderline);
    return () => window.removeEventListener('resize', updateUnderline);
  }, [updateUnderline]);

  const positionClasses = {
    left: 'justify-start',
    right: 'justify-start lg:justify-end',
    center: 'justify-center',
  };

  return (
    <div className={cn('w-full', className)}>
      <Tabs
        defaultValue={defaultValue ?? tabs[0]?.value}
        value={activeValue}
        onValueChange={handleValueChange}
        className="flex flex-col w-full"
      >
        <TabsList className="w-full">
          <div
            ref={containerRef}
            className={cn('relative flex w-full pb-3', positionClasses[tabsPosition])}
          >
            <div className="flex gap-6 md:gap-8">
              {tabs.map((tab) => (
                <TabsTrigger
                  key={tab.value}
                  value={tab.value}
                  ref={(el) => {
                    triggerRefs.current[tab.value] = el;
                  }}
                  className={cn(
                    'group flex items-center gap-2 pb-1 text-sm md:text-base font-medium transition-colors duration-200',
                    'text-[hsl(var(--ico-text-secondary))] hover:text-[hsl(var(--ico-text-primary))]',
                    'data-[state=active]:text-[hsl(var(--ico-text-primary))]',
                    'focus-visible:outline-none cursor-pointer',
                    'border-none shadow-none'
                  )}
                  style={{ background: 'transparent', boxShadow: 'none' }}
                >
                  <span className="group-data-[state=active]:text-sky-500 group-data-[state=active]:bg-sky-500/15 transition-colors duration-200">
                    {tab.icon}
                  </span>
                  <span>{tab.label}</span>
                </TabsTrigger>
              ))}
            </div>

            {/* Background line */}
            <div className="absolute bottom-0 left-0 w-full h-px bg-sky-900" />

            {/* Active indicator */}
            <div
              className="absolute bottom-0 h-0.5 transition-all duration-300 ease-out rounded-full bg-sky-500"
              style={{
                width: underlineStyle.width,
                left: underlineStyle.left,
              }}
            />
          </div>
        </TabsList>

        {tabs.map((tab) => (
          <TabsContent
            key={tab.value}
            value={tab.value}
            className="mt-6 focus-visible:outline-none"
          >
            {tab.content}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}

export default DashboardTabs;
