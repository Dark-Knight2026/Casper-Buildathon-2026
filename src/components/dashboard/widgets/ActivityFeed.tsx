import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ActivityItem } from '@/hooks/useDashboardMetrics';
import { FileSignature, DollarSign, Wrench, UserPlus, Clock } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ScrollArea } from '@/components/ui/scroll-area';

interface ActivityFeedProps {
  items: ActivityItem[];
  isLoading?: boolean;
}

export const ActivityFeed: React.FC<ActivityFeedProps> = ({ items, isLoading }) => {
  const getIcon = (type: ActivityItem['type']) => {
    switch (type) {
      case 'lease_signed': return FileSignature;
      case 'payment_received': return DollarSign;
      case 'maintenance_completed': return Wrench;
      case 'tenant_joined': return UserPlus;
      default: return Clock;
    }
  };

  const getIconColor = (type: ActivityItem['type']) => {
    switch (type) {
      case 'lease_signed': return 'bg-blue-100 text-blue-600 dark:bg-blue-900/20';
      case 'payment_received': return 'bg-green-100 text-green-600 dark:bg-green-900/20';
      case 'maintenance_completed': return 'bg-orange-100 text-orange-600 dark:bg-orange-900/20';
      case 'tenant_joined': return 'bg-purple-100 text-purple-600 dark:bg-purple-900/20';
      default: return 'bg-gray-100 text-gray-600 dark:bg-gray-800';
    }
  };

  if (isLoading) {
    return (
      <Card className="col-span-4 h-full">
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
          <CardDescription>Loading activity...</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card className="col-span-4 h-full flex flex-col">
      <CardHeader>
        <CardTitle>Recent Activity</CardTitle>
        <CardDescription>Latest updates from your portfolio</CardDescription>
      </CardHeader>
      <CardContent className="flex-1 p-0">
        <ScrollArea className="h-[300px] px-6 pb-4">
          <div className="space-y-8 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-slate-300 before:to-transparent">
            {items.map((item) => {
              const Icon = getIcon(item.type);
              return (
                <div key={item.id} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                  {/* Icon */}
                  <div className={`flex items-center justify-center w-10 h-10 rounded-full border border-white dark:border-gray-900 shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 ${getIconColor(item.type)} z-10`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  
                  {/* Content */}
                  <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-4 rounded border border-slate-200 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-sm">
                    <div className="flex items-center justify-between space-x-2 mb-1">
                      <div className="font-bold text-slate-900 dark:text-slate-100">{item.title}</div>
                      <time className="font-caveat font-medium text-indigo-500 text-xs">
                        {formatDistanceToNow(item.timestamp, { addSuffix: true })}
                      </time>
                    </div>
                    <div className="text-slate-500 dark:text-slate-400 text-sm">
                      {item.description}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
};