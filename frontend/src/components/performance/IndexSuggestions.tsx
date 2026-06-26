/**
 * Index Suggestions Component
 * Display database index recommendations for performance optimization
 */

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Database, TrendingUp, Copy, CheckCircle } from 'lucide-react';
import { queryMonitorService } from '@/services/queryMonitorService';
import type { IndexSuggestion } from '@/types/performance';

export function IndexSuggestions() {
  const [suggestions, setSuggestions] = useState<IndexSuggestion[]>([]);
  const [copiedIndex, setCopiedIndex] = useState<string | null>(null);

  useEffect(() => {
    loadSuggestions();
  }, []);

  const loadSuggestions = () => {
    const indexSuggestions = queryMonitorService.generateIndexSuggestions();
    setSuggestions(indexSuggestions);
  };

  const generateIndexSQL = (suggestion: IndexSuggestion): string => {
    const indexName = `idx_${suggestion.table}_${suggestion.columns.join('_')}`;
    const columns = suggestion.columns.join(', ');
    return `CREATE INDEX ${indexName} ON ${suggestion.table} USING ${suggestion.type} (${columns});`;
  };

  const copyToClipboard = (sql: string, suggestionId: string) => {
    navigator.clipboard.writeText(sql);
    setCopiedIndex(suggestionId);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const getPriorityColor = (priority: IndexSuggestion['priority']) => {
    switch (priority) {
      case 'high':
        return 'destructive';
      case 'medium':
        return 'secondary';
      case 'low':
        return 'outline';
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Index Suggestions</CardTitle>
            <CardDescription>Recommended database indexes to improve query performance</CardDescription>
          </div>
          <Button onClick={loadSuggestions} variant="outline" size="sm">
            Refresh
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {suggestions.length > 0 ? (
          <div className="space-y-4">
            {suggestions.map((suggestion, index) => {
              const sql = generateIndexSQL(suggestion);
              const suggestionId = `${suggestion.table}_${suggestion.columns.join('_')}`;
              
              return (
                <div key={index} className="p-4 border rounded-lg">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Database className="h-5 w-5 text-blue-600" />
                      <Badge variant={getPriorityColor(suggestion.priority)}>
                        {suggestion.priority} priority
                      </Badge>
                      <Badge variant="outline">{suggestion.type}</Badge>
                    </div>
                    <div className="flex items-center gap-2">
                      <TrendingUp className="h-4 w-4 text-green-600" />
                      <span className="text-sm font-medium text-green-600">
                        {suggestion.estimatedImprovement}
                      </span>
                    </div>
                  </div>

                  <div className="mb-3">
                    <p className="text-sm font-medium text-gray-700 mb-1">Table & Columns:</p>
                    <p className="text-sm">
                      <span className="font-semibold">{suggestion.table}</span>
                      <span className="text-gray-600"> ({suggestion.columns.join(', ')})</span>
                    </p>
                  </div>

                  <div className="mb-3">
                    <p className="text-sm font-medium text-gray-700 mb-1">Reason:</p>
                    <p className="text-sm text-gray-600">{suggestion.reason}</p>
                  </div>

                  <div className="mb-3">
                    <p className="text-sm font-medium text-gray-700 mb-1">SQL Command:</p>
                    <div className="flex items-center gap-2">
                      <code className="flex-1 text-sm bg-gray-100 px-3 py-2 rounded overflow-x-auto">
                        {sql}
                      </code>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => copyToClipboard(sql, suggestionId)}
                      >
                        {copiedIndex === suggestionId ? (
                          <>
                            <CheckCircle className="h-4 w-4 mr-1 text-green-600" />
                            Copied
                          </>
                        ) : (
                          <>
                            <Copy className="h-4 w-4 mr-1" />
                            Copy
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-12">
            <Database className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">No index suggestions available</p>
            <p className="text-sm text-gray-500 mt-2">
              Your database queries are well-optimized or there's not enough data to generate suggestions
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}