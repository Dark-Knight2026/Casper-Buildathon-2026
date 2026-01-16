import React, { useState, useEffect } from 'react';
import { Sparkles, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';

interface WhatsNewItem {
  id: string;
  version: string;
  date: string;
  title: string;
  description: string;
  type: 'feature' | 'improvement' | 'bugfix';
  badge?: string;
}

const whatsNewData: WhatsNewItem[] = [
  {
    id: '1',
    version: '2.1.0',
    date: '2024-12-09',
    title: 'Advanced Filtering System',
    description:
      'Create complex filters with multiple conditions, AND/OR logic, and save your favorite filter presets for quick access.',
    type: 'feature',
    badge: 'New',
  },
  {
    id: '2',
    version: '2.1.0',
    date: '2024-12-09',
    title: 'Enhanced Data Tables',
    description:
      'Powerful data tables with sorting, filtering, pagination, and row selection. Automatically adapts to mobile with card views.',
    type: 'feature',
    badge: 'New',
  },
  {
    id: '3',
    version: '2.1.0',
    date: '2024-12-09',
    title: 'Interactive Charts',
    description:
      'Beautiful, responsive charts for visualizing your data. Includes line, bar, pie, and area charts with dark mode support.',
    type: 'feature',
    badge: 'New',
  },
  {
    id: '4',
    version: '2.0.0',
    date: '2024-11-15',
    title: 'Dashboard Widgets',
    description:
      'Reusable widget components for building consistent dashboard layouts with stat cards, activity feeds, and quick actions.',
    type: 'feature',
  },
  {
    id: '5',
    version: '2.0.0',
    date: '2024-11-15',
    title: 'React Query Integration',
    description:
      'Improved data fetching with automatic caching, background updates, and optimistic UI updates.',
    type: 'improvement',
  },
  {
    id: '6',
    version: '2.0.0',
    date: '2024-11-15',
    title: 'Enhanced Error Handling',
    description:
      'Better error boundaries and error messages throughout the application for a more reliable experience.',
    type: 'improvement',
  },
  {
    id: '7',
    version: '1.9.0',
    date: '2024-10-20',
    title: 'Toast Notifications',
    description:
      'Beautiful toast notifications for success, error, and info messages with customizable duration and positioning.',
    type: 'feature',
  },
  {
    id: '8',
    version: '1.9.0',
    date: '2024-10-20',
    title: 'Code Splitting',
    description:
      'Improved performance with lazy loading of dashboard routes, reducing initial bundle size by 40%.',
    type: 'improvement',
  },
];

const STORAGE_KEY = 'whatsNew_lastSeen';
const CURRENT_VERSION = '2.1.0';

export const WhatsNew: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [hasNewFeatures, setHasNewFeatures] = useState(false);

  useEffect(() => {
    const lastSeenVersion = localStorage.getItem(STORAGE_KEY);
    if (lastSeenVersion !== CURRENT_VERSION) {
      setHasNewFeatures(true);
    }
  }, []);

  const handleOpen = () => {
    setIsOpen(true);
    setHasNewFeatures(false);
    localStorage.setItem(STORAGE_KEY, CURRENT_VERSION);
  };

  const getTypeColor = (type: WhatsNewItem['type']) => {
    switch (type) {
      case 'feature':
        return 'bg-blue-500/10 text-blue-500';
      case 'improvement':
        return 'bg-green-500/10 text-green-500';
      case 'bugfix':
        return 'bg-orange-500/10 text-orange-500';
      default:
        return 'bg-gray-500/10 text-gray-500';
    }
  };

  const getTypeLabel = (type: WhatsNewItem['type']) => {
    switch (type) {
      case 'feature':
        return 'Feature';
      case 'improvement':
        return 'Improvement';
      case 'bugfix':
        return 'Bug Fix';
      default:
        return type;
    }
  };

  // Group by version
  const groupedByVersion = whatsNewData.reduce((acc, item) => {
    if (!acc[item.version]) {
      acc[item.version] = [];
    }
    acc[item.version].push(item);
    return acc;
  }, {} as Record<string, WhatsNewItem[]>);

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        onClick={handleOpen}
        className="relative"
      >
        <Sparkles className="h-4 w-4 mr-2" />
        What's New
        {hasNewFeatures && (
          <span className="absolute -top-1 -right-1 h-2 w-2 bg-blue-500 rounded-full" />
        )}
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center gap-2">
              <Sparkles className="h-6 w-6 text-blue-500" />
              <DialogTitle>What's New</DialogTitle>
            </div>
            <DialogDescription>
              Check out the latest features and improvements to the Real Estate
              Management Platform
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {Object.entries(groupedByVersion).map(([version, items]) => (
              <div key={version} className="space-y-3">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="font-mono">
                    v{version}
                  </Badge>
                  <span className="text-sm text-muted-foreground">
                    {new Date(items[0].date).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </span>
                </div>

                <div className="space-y-2">
                  {items.map((item) => (
                    <Card key={item.id}>
                      <CardContent className="p-4">
                        <div className="space-y-2">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <h4 className="font-semibold text-sm">
                                  {item.title}
                                </h4>
                                {item.badge && (
                                  <Badge
                                    variant="secondary"
                                    className="text-xs bg-blue-500/10 text-blue-500"
                                  >
                                    {item.badge}
                                  </Badge>
                                )}
                              </div>
                              <p className="text-sm text-muted-foreground">
                                {item.description}
                              </p>
                            </div>
                            <Badge
                              variant="secondary"
                              className={getTypeColor(item.type)}
                            >
                              {getTypeLabel(item.type)}
                            </Badge>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>

                <Separator />
              </div>
            ))}
          </div>

          <div className="flex justify-end">
            <Button onClick={() => setIsOpen(false)}>Got it!</Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

/**
 * WhatsNew badge for navigation bar
 */
export const WhatsNewBadge: React.FC = () => {
  const [hasNewFeatures, setHasNewFeatures] = useState(false);

  useEffect(() => {
    const lastSeenVersion = localStorage.getItem(STORAGE_KEY);
    if (lastSeenVersion !== CURRENT_VERSION) {
      setHasNewFeatures(true);
    }
  }, []);

  if (!hasNewFeatures) return null;

  return (
    <span className="absolute -top-1 -right-1 h-2 w-2 bg-blue-500 rounded-full animate-pulse" />
  );
};