import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Download } from "lucide-react";
import { ResponsiveContainer } from "recharts";

interface EnhancedChartContainerProps {
  title: string;
  description?: string;
  timeRange?: {
    value: string;
    options: Array<{ label: string; value: string }>;
    onChange: (value: string) => void;
  };
  exportable?: boolean;
  children: React.ReactNode;
  isLoading?: boolean;
  actions?: React.ReactNode;
}

export const EnhancedChartContainer: React.FC<EnhancedChartContainerProps> = ({
  title,
  description,
  timeRange,
  exportable,
  children,
  isLoading,
  actions
}) => {
  return (
    <Card className="p-6">
      <CardHeader className="pb-4 px-0 pt-0">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <CardTitle className="text-lg font-semibold">{title}</CardTitle>
            {description && (
              <p className="text-sm text-gray-500 mt-1">{description}</p>
            )}
          </div>
          <div className="flex items-center gap-2">
            {timeRange && (
              <Select value={timeRange.value} onValueChange={timeRange.onChange}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {timeRange.options.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            {exportable && (
              <Button variant="outline" size="sm">
                <Download className="w-4 h-4 mr-2" />
                Export
              </Button>
            )}
            {actions}
          </div>
        </div>
      </CardHeader>
      <CardContent className="px-0 pb-0">
        {isLoading ? (
          <Skeleton className="w-full h-[300px]" />
        ) : (
          <div className="h-[300px] w-full">
            {children}
          </div>
        )}
      </CardContent>
    </Card>
  );
};