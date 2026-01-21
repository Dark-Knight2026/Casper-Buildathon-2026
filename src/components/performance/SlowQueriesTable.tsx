/**
 * Slow Queries Table Component
 * Display and analyze slow database queries
 */

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AlertTriangle, TrendingUp, Lightbulb } from 'lucide-react';
import { queryMonitorService } from '@/services/queryMonitorService';
import type { SlowQuery } from '@/types/performance';

export function SlowQueriesTable() {
  const [slowQueries, setSlowQueries] = useState<SlowQuery[]>([]);
  const [selectedQuery, setSelectedQuery] = useState<SlowQuery | null>(null);

  useEffect(() => {
    loadSlowQueries();
  }, []);

  const loadSlowQueries = () => {
    const queries = queryMonitorService.getSlowQueries(20);
    setSlowQueries(queries);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Slow Queries</CardTitle>
              <CardDescription>Queries taking longer than 1 second to execute</CardDescription>
            </div>
            <Button onClick={loadSlowQueries} variant="outline" size="sm">
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {slowQueries.length > 0 ? (
            <div className="space-y-4">
              {slowQueries.map((query) => (
                <div key={query.id} className="p-4 border rounded-lg hover:bg-gray-50 cursor-pointer" onClick={() => setSelectedQuery(query)}>
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="h-5 w-5 text-red-600" />
                      <Badge variant="destructive">{query.executionTime.toFixed(0)}ms</Badge>
                      <Badge variant="outline">{query.operation}</Badge>
                      <Badge variant="secondary">{query.table}</Badge>
                    </div>
                    <div className="flex items-center gap-2">
                      <TrendingUp className="h-4 w-4 text-gray-600" />
                      <span className="text-sm text-gray-600">{query.frequency}x</span>
                    </div>
                  </div>

                  <div className="mb-3">
                    <code className="text-sm bg-gray-100 px-2 py-1 rounded block overflow-x-auto">
                      {query.query.length > 100 ? `${query.query.substring(0, 100)}...` : query.query}
                    </code>
                  </div>

                  {query.suggestions.length > 0 && (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
                        <Lightbulb className="h-4 w-4 text-yellow-600" />
                        Optimization Suggestions:
                      </div>
                      <ul className="list-disc list-inside space-y-1 text-sm text-gray-600 ml-6">
                        {query.suggestions.map((suggestion, index) => (
                          <li key={index}>{suggestion}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  <div className="mt-3 text-xs text-gray-500">
                    Last seen: {new Date(query.timestamp).toLocaleString()}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <AlertTriangle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">No slow queries detected</p>
              <p className="text-sm text-gray-500 mt-2">All queries are executing within acceptable time limits</p>
            </div>
          )}
        </CardContent>
      </Card>

      {selectedQuery && (
        <Card>
          <CardHeader>
            <CardTitle>Query Details</CardTitle>
            <CardDescription>Detailed analysis and optimization suggestions</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <p className="text-sm font-medium text-gray-700 mb-2">Query:</p>
                <code className="text-sm bg-gray-100 px-3 py-2 rounded block overflow-x-auto">
                  {selectedQuery.query}
                </code>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Execution Time</p>
                  <p className="text-lg font-semibold text-red-600">{selectedQuery.executionTime.toFixed(0)}ms</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 mb-1">Frequency</p>
                  <p className="text-lg font-semibold">{selectedQuery.frequency}x</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 mb-1">Table</p>
                  <p className="text-lg font-semibold">{selectedQuery.table}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 mb-1">Operation</p>
                  <p className="text-lg font-semibold">{selectedQuery.operation}</p>
                </div>
              </div>

              {selectedQuery.suggestions.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <Lightbulb className="h-5 w-5 text-yellow-600" />
                    <p className="font-medium text-gray-700">Optimization Suggestions:</p>
                  </div>
                  <ul className="space-y-2">
                    {selectedQuery.suggestions.map((suggestion, index) => (
                      <li key={index} className="flex items-start gap-2 p-3 bg-yellow-50 rounded-lg">
                        <span className="text-yellow-600 font-semibold">{index + 1}.</span>
                        <span className="text-sm text-gray-700">{suggestion}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}