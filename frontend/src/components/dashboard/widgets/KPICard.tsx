import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface KPICardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  trend?: number;
  trendLabel?: string;
  description?: string;
  className?: string;
}

export const KPICard: React.FC<KPICardProps> = ({ 
  title, 
  value, 
  icon: Icon, 
  trend, 
  trendLabel,
  description,
  className 
}) => {
  const isPositive = trend && trend > 0;

  return (
    <Card className={cn("overflow-hidden", className)}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {description ? (
             <p className="text-xs text-muted-foreground mt-1">{description}</p>
        ) : (
            trend !== undefined && (
            <p className="text-xs text-muted-foreground mt-1 flex items-center">
                <span className={cn(
                "font-medium mr-1", 
                isPositive ? "text-green-600" : "text-red-600"
                )}>
                {isPositive ? "+" : ""}{trend}%
                </span>
                {trendLabel || "from last month"}
            </p>
            )
        )}
      </CardContent>
    </Card>
  );
};