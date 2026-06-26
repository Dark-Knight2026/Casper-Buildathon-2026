/**
 * Query Patterns Component
 * Display common query patterns and their performance metrics
 */

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { BarChart3, Database, Clock } from 'lucide-react';
import { queryMonitorService } from '@/services/queryMonitorService';
import type { QueryPattern } from '@/types/performance';

export function QueryPatterns() {
  const [patterns, setPatterns] = useState<QueryPattern[]>([]);

  useEffect(() => {
    loadPatterns();
  }, []);

  const loadPatterns = () => {
    const queryPatterns = queryMonitorService.getQueryPatterns();
    setPatterns(queryPatterns.slice(0, 15));
  };

  const getPerformanceColor = (avgTime: number) => {
    if (avgTime < 100) return 'text-green-600';
    if (avgTime < 500) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Query Patterns</CardTitle>
            <CardDescription>Most frequent query patterns and their performance</CardDescription>
          </div>
          <Button onClick={loadPatterns} variant="outline" size="sm">
            Refresh
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {patterns.length > 0 ? (
          <div className="space-y-4">
            {patterns.map((pattern, index) => (
              <div key={index} className="p-4 border rounded-lg hover:bg-gray-50">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <BarChart3 className="h-5 w-5 text-purple-600" />
                    <Badge variant="secondary">{pattern.count}x executions</Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-gray-600" />
                    <span className={`text-sm font-semibold ${getPerformanceColor(pattern.avgExecutionTime)}`}>
                      {pattern.avgExecutionTime.toFixed(0)}ms avg
                    </span>
                  </div>
                </div>

                <div className="mb-3">
                  <code className="text-sm bg-gray-100 px-2 py-1 rounded block overflow-x-auto">
                    {pattern.pattern}
                  </code>
                </div>

                <div className="flex items-center gap-4 text-sm text-gray-600">
                  <div className="flex items-center gap-1">
                    <Database className="h-4 w-4" />
                    <span>Tables: {pattern.tables.join(', ') || 'N/A'}</span>
                  </div>
                  <div>
                    <span>Operations: {pattern.operations.join(', ')}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <BarChart3 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">No query patterns detected</p>
            <p className="text-sm text-gray-500 mt-2">Execute some queries to see patterns</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}