/**
 * Performance Dashboard Page
 * Main page for monitoring system performance and optimization
 */

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Activity, Database, Zap, TrendingUp } from 'lucide-react';
import { PerformanceMonitor } from '@/components/performance/PerformanceMonitor';
import { SlowQueriesTable } from '@/components/performance/SlowQueriesTable';
import { IndexSuggestions } from '@/components/performance/IndexSuggestions';
import { QueryPatterns } from '@/components/performance/QueryPatterns';

export default function PerformanceDashboard() {
  return (
    <div className="container mx-auto py-8 max-w-7xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Performance Dashboard</h1>
        <p className="text-gray-600">Monitor system performance, cache metrics, and database query optimization</p>
      </div>

      <Tabs defaultValue="monitor" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="monitor">
            <Activity className="mr-2 h-4 w-4" />
            Monitor
          </TabsTrigger>
          <TabsTrigger value="queries">
            <Database className="mr-2 h-4 w-4" />
            Slow Queries
          </TabsTrigger>
          <TabsTrigger value="indexes">
            <Zap className="mr-2 h-4 w-4" />
            Index Suggestions
          </TabsTrigger>
          <TabsTrigger value="patterns">
            <TrendingUp className="mr-2 h-4 w-4" />
            Query Patterns
          </TabsTrigger>
        </TabsList>

        <TabsContent value="monitor">
          <PerformanceMonitor />
        </TabsContent>

        <TabsContent value="queries">
          <SlowQueriesTable />
        </TabsContent>

        <TabsContent value="indexes">
          <IndexSuggestions />
        </TabsContent>

        <TabsContent value="patterns">
          <QueryPatterns />
        </TabsContent>
      </Tabs>
    </div>
  );
}