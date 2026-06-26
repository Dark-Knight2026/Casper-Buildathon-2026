import { ReactNode } from 'react';
import { WidgetConfig } from '@/contexts/DashboardPreferencesContext';

interface DashboardWidgetContainerProps {
  widget: WidgetConfig;
  children: ReactNode;
  columns: 1 | 2 | 3;
}

export default function DashboardWidgetContainer({ widget, children, columns }: DashboardWidgetContainerProps) {
  // Calculate grid column span based on widget size and grid columns
  const getColumnSpan = () => {
    if (columns === 1) return 'col-span-1';
    
    if (columns === 2) {
      switch (widget.size) {
        case 'small':
          return 'col-span-1';
        case 'medium':
          return 'col-span-1';
        case 'large':
          return 'col-span-2';
        default:
          return 'col-span-1';
      }
    }
    
    if (columns === 3) {
      switch (widget.size) {
        case 'small':
          return 'col-span-1';
        case 'medium':
          return 'col-span-2';
        case 'large':
          return 'col-span-3';
        default:
          return 'col-span-1';
      }
    }
    
    return 'col-span-1';
  };

  if (!widget.enabled) return null;

  return (
    <div className={`${getColumnSpan()} transition-all duration-300`}>
      {children}
    </div>
  );
}