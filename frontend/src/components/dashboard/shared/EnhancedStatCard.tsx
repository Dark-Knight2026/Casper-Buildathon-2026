import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { TrendingUp, TrendingDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Area, AreaChart, ResponsiveContainer } from "recharts";

interface EnhancedStatCardProps {
  label: string;
  value: string | number;
  icon: React.ComponentType<{ className?: string }>;
  trend?: {
    value: number;
    direction: 'up' | 'down';
    label: string;
  };
  sparklineData?: number[];
  colorScheme: 'primary' | 'secondary' | 'accent' | 'success' | 'warning' | 'error';
  isLoading?: boolean;
  onClick?: () => void;
}

const getColorClasses = (scheme: string) => {
  const schemes: Record<string, {
    gradientOverlay: string;
    iconBg: string;
    iconBgHover: string;
    iconColor: string;
    stroke: string;
    fill: string;
  }> = {
    primary: {
      gradientOverlay: "bg-gradient-to-br from-primary-500/10 to-primary-600/5",
      iconBg: "bg-primary-100",
      iconBgHover: "bg-primary-200",
      iconColor: "text-primary-600",
      stroke: "var(--primary-500)",
      fill: "var(--primary-100)",
    },
    secondary: {
      gradientOverlay: "bg-gradient-to-br from-secondary-500/10 to-secondary-600/5",
      iconBg: "bg-secondary-100",
      iconBgHover: "bg-secondary-200",
      iconColor: "text-secondary-600",
      stroke: "var(--secondary-500)",
      fill: "var(--secondary-100)",
    },
    accent: {
      gradientOverlay: "bg-gradient-to-br from-accent-500/10 to-accent-600/5",
      iconBg: "bg-accent-100",
      iconBgHover: "bg-accent-200",
      iconColor: "text-accent-600",
      stroke: "var(--accent-500)",
      fill: "var(--accent-100)",
    },
    success: {
      gradientOverlay: "bg-gradient-to-br from-success-500/10 to-success-700/5",
      iconBg: "bg-success-50",
      iconBgHover: "bg-success-100",
      iconColor: "text-success-700",
      stroke: "var(--success-500)",
      fill: "var(--success-50)",
    },
    warning: {
      gradientOverlay: "bg-gradient-to-br from-warning-500/10 to-warning-700/5",
      iconBg: "bg-warning-50",
      iconBgHover: "bg-warning-100",
      iconColor: "text-warning-700",
      stroke: "var(--warning-500)",
      fill: "var(--warning-50)",
    },
    error: {
      gradientOverlay: "bg-gradient-to-br from-error-500/10 to-error-700/5",
      iconBg: "bg-error-50",
      iconBgHover: "bg-error-100",
      iconColor: "text-error-700",
      stroke: "var(--error-500)",
      fill: "var(--error-50)",
    },
  };
  
  return schemes[scheme] || schemes.primary;
};

const Sparkline = ({ data, colorScheme, className }: { data: number[], colorScheme: string, className?: string }) => {
  const colors = getColorClasses(colorScheme);
  const chartData = data.map((val, i) => ({ i, val }));
  
  return (
    <div className={className}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={chartData}>
          <defs>
            <linearGradient id={`gradient-${colorScheme}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={colors.stroke} stopOpacity={0.2}/>
              <stop offset="100%" stopColor={colors.stroke} stopOpacity={0}/>
            </linearGradient>
          </defs>
          <Area 
            type="monotone" 
            dataKey="val" 
            stroke={colors.stroke} 
            strokeWidth={2}
            fill={`url(#gradient-${colorScheme})`} 
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};

export const EnhancedStatCard: React.FC<EnhancedStatCardProps> = ({
  label,
  value,
  icon: Icon,
  trend,
  sparklineData,
  colorScheme,
  isLoading,
  onClick
}) => {
  const colorClasses = getColorClasses(colorScheme);
  
  return (
    <Card 
      className={cn(
        "group relative overflow-hidden transition-all duration-300",
        "hover:shadow-lg hover:-translate-y-1",
        onClick && "cursor-pointer"
      )}
      onClick={onClick}
    >
      {/* Gradient overlay on hover */}
      <div className={cn(
        "absolute inset-0 opacity-0 group-hover:opacity-100",
        "transition-opacity duration-300",
        colorClasses.gradientOverlay
      )} />
      
      <CardContent className="relative p-6">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            {/* Label */}
            <p className="text-sm font-medium text-gray-600 uppercase tracking-wide">
              {label}
            </p>
            
            {/* Value */}
            {isLoading ? (
              <Skeleton className="h-8 w-24" />
            ) : (
              <p className="text-3xl font-bold font-mono text-gray-900 tracking-tight">
                {value}
              </p>
            )}
            
            {/* Trend Indicator */}
            {trend && (
              <div className="flex items-center gap-1 text-xs">
                {trend.direction === 'up' ? (
                  <TrendingUp className="w-3 h-3 text-success-500" />
                ) : (
                  <TrendingDown className="w-3 h-3 text-error-500" />
                )}
                <span className={cn(
                  "font-medium",
                  trend.direction === 'up' ? "text-success-500" : "text-error-500"
                )}>
                  {trend.value > 0 ? '+' : ''}{trend.value}%
                </span>
                <span className="text-gray-500">{trend.label}</span>
              </div>
            )}
          </div>
          
          {/* Icon */}
          <div className="flex-shrink-0">
            <div className={cn(
              "w-12 h-12 rounded-xl flex items-center justify-center",
              "transition-colors duration-300",
              colorClasses.iconBg,
              "group-hover:" + colorClasses.iconBgHover
            )}>
              <Icon className={cn("w-6 h-6", colorClasses.iconColor)} />
            </div>
          </div>
        </div>
        
        {/* Optional Sparkline */}
        {sparklineData && (
          <div className="mt-4 h-8">
            <Sparkline 
              data={sparklineData} 
              colorScheme={colorScheme}
              className="w-full h-full"
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
};