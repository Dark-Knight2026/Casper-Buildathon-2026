import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ActionItem } from '@/hooks/useDashboardMetrics';
import { AlertCircle, CheckCircle, FileText, Wrench, DollarSign } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface ActionCenterWidgetProps {
  items: ActionItem[];
  isLoading?: boolean;
}

export const ActionCenterWidget: React.FC<ActionCenterWidgetProps> = ({ items, isLoading }) => {
  const getIcon = (type: ActionItem['type']) => {
    switch (type) {
      case 'approval': return FileText;
      case 'maintenance': return Wrench;
      case 'payment': return DollarSign;
      default: return AlertCircle;
    }
  };

  const getPriorityColor = (priority: ActionItem['priority']): "default" | "secondary" | "destructive" | "outline" => {
    switch (priority) {
      case 'high': return 'destructive';
      case 'medium': return 'secondary';
      case 'low': return 'outline';
      default: return 'outline';
    }
  };

  if (isLoading) {
    return (
      <Card className="col-span-3">
        <CardHeader>
          <CardTitle>Action Center</CardTitle>
          <CardDescription>Loading items...</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card className="col-span-3 h-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Action Center</CardTitle>
            <CardDescription>Tasks requiring your attention</CardDescription>
          </div>
          <Badge variant="secondary">{items.length} Pending</Badge>
        </div>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center text-muted-foreground">
            <CheckCircle className="h-12 w-12 mb-4 text-green-500" />
            <p>All caught up! No pending actions.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {items.map((item) => {
              const Icon = getIcon(item.type);
              return (
                <div key={item.id} className="flex items-start space-x-4 p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors">
                  <div className={`p-2 rounded-full ${item.priority === 'high' ? 'bg-red-100 text-red-600 dark:bg-red-900/20' : 'bg-blue-100 text-blue-600 dark:bg-blue-900/20'}`}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium leading-none">{item.title}</p>
                      <span className="text-xs text-muted-foreground">{formatDistanceToNow(item.date, { addSuffix: true })}</span>
                    </div>
                    <p className="text-sm text-muted-foreground line-clamp-1">{item.description}</p>
                    <div className="flex items-center pt-2 gap-2">
                       <Badge variant={getPriorityColor(item.priority)} className="text-[10px] px-1 py-0 h-5">
                        {item.priority}
                      </Badge>
                      <Button size="sm" variant="outline" className="h-7 text-xs ml-auto" onClick={item.onAction}>
                        {item.actionLabel}
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
};