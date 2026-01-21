import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { OccupancyPrediction } from '@/services/predictiveService';
import { ShieldAlert, TrendingDown, Users, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface RiskHeatmapProps {
  data: OccupancyPrediction;
}

export const RiskHeatmap: React.FC<RiskHeatmapProps> = ({ data }) => {
  const getRiskColor = (score: number) => {
    if (score < 30) return 'bg-green-500';
    if (score < 60) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const getRiskLabel = (score: number) => {
    if (score < 30) return 'Low Risk';
    if (score < 60) return 'Medium Risk';
    return 'High Risk';
  };

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ShieldAlert className="h-5 w-5 text-orange-500" />
          Vacancy Risk Analysis
        </CardTitle>
        <CardDescription>AI-driven prediction for {data.propertyName}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col items-center justify-center p-4">
          {/* Gauge Visualization */}
          <div className="relative h-40 w-40 flex items-center justify-center">
            <svg className="h-full w-full transform -rotate-90">
              <circle
                cx="80"
                cy="80"
                r="70"
                stroke="currentColor"
                strokeWidth="12"
                fill="transparent"
                className="text-muted/20"
              />
              <circle
                cx="80"
                cy="80"
                r="70"
                stroke="currentColor"
                strokeWidth="12"
                fill="transparent"
                strokeDasharray={440}
                strokeDashoffset={440 - (440 * data.riskScore) / 100}
                className={cn(
                  "transition-all duration-1000 ease-out",
                  data.riskScore < 30 ? "text-green-500" : 
                  data.riskScore < 60 ? "text-yellow-500" : "text-red-500"
                )}
              />
            </svg>
            <div className="absolute flex flex-col items-center">
              <span className="text-3xl font-bold">{data.riskScore}%</span>
              <span className="text-xs font-medium text-muted-foreground uppercase">Risk Score</span>
            </div>
          </div>

          <div className="mt-6 w-full space-y-4">
            <div className="flex justify-between items-center border-b pb-2">
              <span className="text-sm text-muted-foreground">Current Occupancy</span>
              <span className="font-semibold">{data.currentOccupancy}%</span>
            </div>
            <div className="flex justify-between items-center border-b pb-2">
              <span className="text-sm text-muted-foreground">Predicted (30 Days)</span>
              <span className="font-semibold flex items-center gap-1">
                {data.predictedOccupancy}%
                {data.predictedOccupancy < data.currentOccupancy && (
                  <TrendingDown className="h-4 w-4 text-red-500" />
                )}
              </span>
            </div>
            
            <div className="space-y-2">
              <span className="text-xs font-semibold text-muted-foreground uppercase">Risk Factors</span>
              {data.factors.map((factor, index) => (
                <div key={index} className="flex items-center gap-2 text-sm bg-orange-50 text-orange-900 p-2 rounded border border-orange-100 dark:bg-orange-900/20 dark:text-orange-200 dark:border-orange-900/30">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  {factor}
                </div>
              ))}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};