/**
 * Dashboard Widget Component
 * Base widget component with header and content
 */

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { GripVertical, X, Settings } from 'lucide-react';
import { cn } from '@/lib/utils';
import { WidgetType } from '@/types/dashboard';

// Import widget components
import { PropertySummaryWidget } from './widgets/PropertySummaryWidget';
import { RecentPaymentsWidget } from './widgets/RecentPaymentsWidget';
import { MaintenanceWidget } from './widgets/MaintenanceWidget';
import { LeaseRenewalsWidget } from './widgets/LeaseRenewalsWidget';
import { FinancialChartWidget } from './widgets/FinancialChartWidget';
import { RecentMessagesWidget } from './widgets/RecentMessagesWidget';
import { QuickActionsWidget } from './widgets/QuickActionsWidget';

interface DashboardWidgetProps {
  widgetId: string;
  isEditMode?: boolean;
  onRemove?: () => void;
  onSettings?: () => void;
}

const widgetComponents: Record<WidgetType, React.ComponentType> = {
  'property-summary': PropertySummaryWidget,
  'recent-payments': RecentPaymentsWidget,
  'maintenance-requests': MaintenanceWidget,
  'lease-renewals': LeaseRenewalsWidget,
  'financial-chart': FinancialChartWidget,
  'occupancy-chart': FinancialChartWidget, // Reuse for now
  'recent-messages': RecentMessagesWidget,
  'quick-actions': QuickActionsWidget,
};

const widgetTitles: Record<WidgetType, string> = {
  'property-summary': 'Property Summary',
  'recent-payments': 'Recent Payments',
  'maintenance-requests': 'Maintenance Requests',
  'lease-renewals': 'Upcoming Renewals',
  'financial-chart': 'Financial Overview',
  'occupancy-chart': 'Occupancy Rate',
  'recent-messages': 'Recent Messages',
  'quick-actions': 'Quick Actions',
};

export function DashboardWidget({
  widgetId,
  isEditMode = false,
  onRemove,
  onSettings,
}: DashboardWidgetProps) {
  const widgetType = widgetId as WidgetType;
  const WidgetComponent = widgetComponents[widgetType];
  const title = widgetTitles[widgetType];

  if (!WidgetComponent) {
    return (
      <Card className="h-full">
        <CardContent className="flex items-center justify-center h-full">
          <p className="text-muted-foreground">Unknown widget: {widgetId}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn('h-full flex flex-col', isEditMode && 'ring-2 ring-primary/20')}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-base font-medium flex items-center gap-2">
          {isEditMode && (
            <div className="drag-handle cursor-move">
              <GripVertical className="h-4 w-4 text-muted-foreground" />
            </div>
          )}
          {title}
        </CardTitle>
        {isEditMode && (
          <div className="flex gap-1">
            {onSettings && (
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={onSettings}
              >
                <Settings className="h-3 w-3" />
              </Button>
            )}
            {onRemove && (
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={onRemove}
              >
                <X className="h-3 w-3" />
              </Button>
            )}
          </div>
        )}
      </CardHeader>
      <CardContent className="flex-1 overflow-auto">
        <WidgetComponent />
      </CardContent>
    </Card>
  );
}