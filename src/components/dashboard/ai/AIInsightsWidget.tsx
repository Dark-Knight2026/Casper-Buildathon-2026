import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { aiService, Insight } from '@/services/aiService';
import { Sparkles, TrendingUp, AlertTriangle, ArrowRight, Brain } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface AIInsightsWidgetProps {
  role: 'agent' | 'landlord' | 'broker' | 'buyer' | 'seller' | 'tenant';
  userId?: string;
  className?: string;
}

export const AIInsightsWidget: React.FC<AIInsightsWidgetProps> = ({ role, userId = 'current-user', className }) => {
  const [insights, setInsights] = useState<Insight[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchInsights = async () => {
      try {
        const data = await aiService.getRecommendations(userId, role);
        setInsights(data);
      } catch (error) {
        console.error('Failed to fetch AI insights:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchInsights();
  }, [userId, role]);

  const getIcon = (type: string) => {
    switch (type) {
      case 'opportunity': return <Sparkles className="h-5 w-5 text-indigo-500" />;
      case 'risk': return <AlertTriangle className="h-5 w-5 text-amber-500" />;
      case 'action': return <Brain className="h-5 w-5 text-emerald-500" />;
      default: return <TrendingUp className="h-5 w-5 text-blue-500" />;
    }
  };

  const getBadgeColor = (type: string) => {
    switch (type) {
      case 'opportunity': return 'bg-indigo-100 text-indigo-800 border-indigo-200';
      case 'risk': return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'action': return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      default: return 'bg-blue-100 text-blue-800 border-blue-200';
    }
  };

  if (isLoading) {
    return (
      <Card className={`border-indigo-100 dark:border-indigo-900 ${className}`}>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Skeleton className="h-6 w-6 rounded-full" />
              <Skeleton className="h-6 w-32" />
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex space-x-3">
              <Skeleton className="h-10 w-10 rounded-lg" />
              <div className="space-y-2 flex-1">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-full" />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={`border-indigo-100 dark:border-indigo-900 shadow-sm overflow-hidden ${className}`}>
      <CardHeader className="pb-3 bg-gradient-to-r from-indigo-50/50 to-transparent dark:from-indigo-950/20">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="p-1.5 bg-indigo-100 dark:bg-indigo-900/50 rounded-lg">
              <Sparkles className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
            </div>
            <CardTitle className="text-base font-semibold text-indigo-950 dark:text-indigo-100">
              AI Insights
            </CardTitle>
          </div>
          <Badge variant="outline" className="bg-white/50 dark:bg-black/20 border-indigo-200 text-indigo-700">
            {insights.length} New
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="pt-4 space-y-4">
        <AnimatePresence>
          {insights.slice(0, 3).map((insight, index) => (
            <motion.div
              key={insight.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="group relative flex gap-3 p-3 rounded-xl hover:bg-indigo-50/50 dark:hover:bg-indigo-900/20 transition-colors border border-transparent hover:border-indigo-100 dark:hover:border-indigo-900"
            >
              <div className="mt-1 flex-shrink-0">
                <div className={`p-2 rounded-lg bg-white dark:bg-gray-800 shadow-sm border border-gray-100 dark:border-gray-700`}>
                  {getIcon(insight.type)}
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate pr-2">
                    {insight.title}
                  </h4>
                  <Badge variant="secondary" className={`text-[10px] px-1.5 py-0 h-5 ${getBadgeColor(insight.type)}`}>
                    {insight.score}% Match
                  </Badge>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2 mb-2">
                  {insight.description}
                </p>
                {insight.actionLabel && (
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="h-7 px-2 text-xs text-indigo-600 hover:text-indigo-700 hover:bg-indigo-100/50 -ml-2"
                  >
                    {insight.actionLabel}
                    <ArrowRight className="ml-1 h-3 w-3" />
                  </Button>
                )}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
        
        {insights.length === 0 && (
          <div className="text-center py-6 text-gray-500 text-sm">
            No new insights at the moment.
          </div>
        )}
      </CardContent>
    </Card>
  );
};