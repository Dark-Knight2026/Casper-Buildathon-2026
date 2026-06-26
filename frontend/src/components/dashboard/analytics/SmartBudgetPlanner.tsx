import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { BudgetRecommendation } from '@/services/predictiveService';
import { Calculator, ArrowRight, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';

interface SmartBudgetPlannerProps {
  recommendations: BudgetRecommendation[];
}

export const SmartBudgetPlanner: React.FC<SmartBudgetPlannerProps> = ({ recommendations }) => {
  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calculator className="h-5 w-5 text-emerald-600" />
          Smart Budget Planner
        </CardTitle>
        <CardDescription>AI-optimized allocation recommendations</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {recommendations.map((rec, index) => {
          const percentChange = ((rec.recommendedAllocation - rec.currentAllocation) / rec.currentAllocation) * 100;
          const isIncrease = percentChange > 0;
          
          return (
            <div key={index} className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <h4 className="font-medium text-sm">{rec.category}</h4>
                  <p className="text-xs text-muted-foreground">{rec.reason}</p>
                </div>
                <div className={`flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-full ${isIncrease ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                  {isIncrease ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                  {Math.abs(percentChange).toFixed(1)}%
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground text-xs">Current</span>
                  <div className="font-semibold">${rec.currentAllocation.toLocaleString()}</div>
                </div>
                <div className="text-right">
                  <span className="text-muted-foreground text-xs">Recommended</span>
                  <div className="font-semibold text-indigo-600">${rec.recommendedAllocation.toLocaleString()}</div>
                </div>
              </div>

              <div className="relative pt-2">
                <Progress value={(rec.currentAllocation / (Math.max(rec.currentAllocation, rec.recommendedAllocation) * 1.2)) * 100} className="h-2 bg-secondary" />
                {/* Marker for recommended */}
                <div 
                  className="absolute top-0 w-1 h-6 bg-indigo-600 rounded-full transform -translate-x-1/2 transition-all"
                  style={{ left: `${(rec.recommendedAllocation / (Math.max(rec.currentAllocation, rec.recommendedAllocation) * 1.2)) * 100}%` }}
                />
              </div>
            </div>
          );
        })}
        
        <Button className="w-full mt-4" variant="outline">
          Apply All Recommendations
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </CardContent>
    </Card>
  );
};