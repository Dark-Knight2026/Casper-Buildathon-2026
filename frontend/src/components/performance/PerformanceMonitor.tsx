/**
 * Performance Monitor Component
 * Display real-time performance metrics and monitoring data
 */

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import {
  Activity,
  Database,
  Zap,
  AlertTriangle,
  TrendingUp,
  Clock,
  CheckCircle,
  XCircle,
} from 'lucide-react';
import { cacheService } from '@/services/cacheService';
import { queryMonitorService } from '@/services/queryMonitorService';
import type { CacheMetrics, QueryMetrics, DatabaseMetrics, PerformanceAlert } from '@/types/performance';

export function PerformanceMonitor() {
  const [cacheMetrics, setCacheMetrics] = useState<CacheMetrics | null>(null);
  const [queryMetrics, setQueryMetrics] = useState<QueryMetrics | null>(null);
  const [dbMetrics, setDbMetrics] = useState<DatabaseMetrics | null>(null);
  const [alerts, setAlerts] = useState<PerformanceAlert[]>([]);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    loadMetrics();
    const interval = setInterval(loadMetrics, 5000); // Refresh every 5 seconds
    return () => clearInterval(interval);
  }, []);

  const loadMetrics = () => {
    setCacheMetrics(cacheService.getMetrics());
    setQueryMetrics(queryMonitorService.getMetrics());
    setDbMetrics(queryMonitorService.getDatabaseMetrics());
    setAlerts(queryMonitorService.getAlerts());
  };

  const getStatusColor = (value: number, threshold: number, inverse: boolean = false) => {
    if (inverse) {
      return value < threshold ? 'text-green-600' : 'text-red-600';
    }
    return value >= threshold ? 'text-green-600' : 'text-red-600';
  };

  const getSeverityColor = (severity: PerformanceAlert['severity']) => {
    switch (severity) {
      case 'low':
        return 'default';
      case 'medium':
        return 'secondary';
      case 'high':
        return 'destructive';
      case 'critical':
        return 'destructive';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Performance Monitor</h2>
          <p className="text-gray-600">Real-time system performance metrics</p>
        </div>
        <Button onClick={loadMetrics} variant="outline">
          <Activity className="mr-2 h-4 w-4" />
          Refresh
        </Button>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-2">
              <Zap className="h-8 w-8 text-blue-600" />
              <Badge variant={cacheMetrics && cacheMetrics.hitRate >= 80 ? 'default' : 'destructive'}>
                {cacheMetrics ? `${cacheMetrics.hitRate.toFixed(1)}%` : 'N/A'}
              </Badge>
            </div>
            <h3 className="font-semibold text-lg mb-1">Cache Hit Rate</h3>
            <p className="text-sm text-gray-600">Target: &gt; 80%</p>
            {cacheMetrics && (
              <Progress value={cacheMetrics.hitRate} className="mt-2" />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-2">
              <Clock className="h-8 w-8 text-green-600" />
              <Badge variant={queryMetrics && queryMetrics.avgExecutionTime < 500 ? 'default' : 'destructive'}>
                {queryMetrics ? `${queryMetrics.avgExecutionTime.toFixed(0)}ms` : 'N/A'}
              </Badge>
            </div>
            <h3 className="font-semibold text-lg mb-1">Avg Query Time</h3>
            <p className="text-sm text-gray-600">Target: &lt; 500ms</p>
            {queryMetrics && (
              <p className={`text-2xl font-bold mt-2 ${getStatusColor(queryMetrics.avgExecutionTime, 500, true)}`}>
                {queryMetrics.avgExecutionTime.toFixed(0)}ms
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-2">
              <Database className="h-8 w-8 text-purple-600" />
              <Badge variant={queryMetrics && queryMetrics.slowQueries === 0 ? 'default' : 'destructive'}>
                {queryMetrics ? queryMetrics.slowQueries : 'N/A'}
              </Badge>
            </div>
            <h3 className="font-semibold text-lg mb-1">Slow Queries</h3>
            <p className="text-sm text-gray-600">&gt; 1 second</p>
            {queryMetrics && (
              <p className={`text-2xl font-bold mt-2 ${queryMetrics.slowQueries === 0 ? 'text-green-600' : 'text-red-600'}`}>
                {queryMetrics.slowQueries}
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-2">
              <AlertTriangle className="h-8 w-8 text-orange-600" />
              <Badge variant={alerts.length === 0 ? 'default' : 'destructive'}>
                {alerts.length}
              </Badge>
            </div>
            <h3 className="font-semibold text-lg mb-1">Active Alerts</h3>
            <p className="text-sm text-gray-600">Performance issues</p>
            <p className={`text-2xl font-bold mt-2 ${alerts.length === 0 ? 'text-green-600' : 'text-red-600'}`}>
              {alerts.length}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Metrics */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="cache">Cache</TabsTrigger>
          <TabsTrigger value="queries">Queries</TabsTrigger>
          <TabsTrigger value="alerts">Alerts</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Cache Performance</CardTitle>
                <CardDescription>Redis cache statistics</CardDescription>
              </CardHeader>
              <CardContent>
                {cacheMetrics ? (
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Total Requests</span>
                      <span className="font-semibold">{cacheMetrics.totalRequests.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Cache Hits</span>
                      <span className="font-semibold text-green-600">{cacheMetrics.hits.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Cache Misses</span>
                      <span className="font-semibold text-red-600">{cacheMetrics.misses.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Hit Rate</span>
                      <span className={`font-semibold ${getStatusColor(cacheMetrics.hitRate, 80)}`}>
                        {cacheMetrics.hitRate.toFixed(2)}%
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Avg Response Time</span>
                      <span className="font-semibold">{cacheMetrics.avgResponseTime.toFixed(2)}ms</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Cache Size</span>
                      <span className="font-semibold">{cacheMetrics.cacheSize.toLocaleString()} entries</span>
                    </div>
                  </div>
                ) : (
                  <p className="text-gray-600">No cache metrics available</p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Database Performance</CardTitle>
                <CardDescription>Connection pool and query statistics</CardDescription>
              </CardHeader>
              <CardContent>
                {dbMetrics ? (
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Connection Pool Size</span>
                      <span className="font-semibold">{dbMetrics.connectionPoolSize}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Active Connections</span>
                      <span className="font-semibold text-green-600">{dbMetrics.activeConnections}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Idle Connections</span>
                      <span className="font-semibold">{dbMetrics.idleConnections}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Queries/Second</span>
                      <span className="font-semibold">{dbMetrics.queriesPerSecond.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Avg Query Time</span>
                      <span className={`font-semibold ${getStatusColor(dbMetrics.avgQueryTime, 500, true)}`}>
                        {dbMetrics.avgQueryTime.toFixed(0)}ms
                      </span>
                    </div>
                  </div>
                ) : (
                  <p className="text-gray-600">No database metrics available</p>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="cache" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Cache Statistics</CardTitle>
              <CardDescription>Detailed cache performance metrics</CardDescription>
            </CardHeader>
            <CardContent>
              {cacheMetrics ? (
                <div className="space-y-6">
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm font-medium">Cache Hit Rate</span>
                      <span className="text-sm font-semibold">{cacheMetrics.hitRate.toFixed(2)}%</span>
                    </div>
                    <Progress value={cacheMetrics.hitRate} />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 bg-green-50 rounded-lg">
                      <p className="text-sm text-gray-600 mb-1">Cache Hits</p>
                      <p className="text-2xl font-bold text-green-600">{cacheMetrics.hits.toLocaleString()}</p>
                    </div>
                    <div className="p-4 bg-red-50 rounded-lg">
                      <p className="text-sm text-gray-600 mb-1">Cache Misses</p>
                      <p className="text-2xl font-bold text-red-600">{cacheMetrics.misses.toLocaleString()}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <p className="text-sm text-gray-600 mb-1">Total Requests</p>
                      <p className="text-xl font-semibold">{cacheMetrics.totalRequests.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600 mb-1">Cache Size</p>
                      <p className="text-xl font-semibold">{cacheMetrics.cacheSize.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600 mb-1">Evictions</p>
                      <p className="text-xl font-semibold">{cacheMetrics.evictions.toLocaleString()}</p>
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-gray-600">No cache metrics available</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="queries" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Query Performance</CardTitle>
              <CardDescription>Database query execution statistics</CardDescription>
            </CardHeader>
            <CardContent>
              {queryMetrics ? (
                <div className="space-y-6">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="p-4 bg-blue-50 rounded-lg">
                      <p className="text-sm text-gray-600 mb-1">Total Queries</p>
                      <p className="text-2xl font-bold text-blue-600">{queryMetrics.totalQueries.toLocaleString()}</p>
                    </div>
                    <div className="p-4 bg-red-50 rounded-lg">
                      <p className="text-sm text-gray-600 mb-1">Slow Queries</p>
                      <p className="text-2xl font-bold text-red-600">{queryMetrics.slowQueries.toLocaleString()}</p>
                    </div>
                    <div className="p-4 bg-green-50 rounded-lg">
                      <p className="text-sm text-gray-600 mb-1">Cached Queries</p>
                      <p className="text-2xl font-bold text-green-600">{queryMetrics.cachedQueries.toLocaleString()}</p>
                    </div>
                    <div className="p-4 bg-purple-50 rounded-lg">
                      <p className="text-sm text-gray-600 mb-1">Cache Hit Rate</p>
                      <p className="text-2xl font-bold text-purple-600">{queryMetrics.cacheHitRate.toFixed(1)}%</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <p className="text-sm text-gray-600 mb-1">Avg Execution Time</p>
                      <p className="text-xl font-semibold">{queryMetrics.avgExecutionTime.toFixed(0)}ms</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600 mb-1">Max Execution Time</p>
                      <p className="text-xl font-semibold text-red-600">{queryMetrics.maxExecutionTime.toFixed(0)}ms</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600 mb-1">Min Execution Time</p>
                      <p className="text-xl font-semibold text-green-600">{queryMetrics.minExecutionTime.toFixed(0)}ms</p>
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-gray-600">No query metrics available</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="alerts" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Performance Alerts</CardTitle>
              <CardDescription>Active performance issues and warnings</CardDescription>
            </CardHeader>
            <CardContent>
              {alerts.length > 0 ? (
                <div className="space-y-4">
                  {alerts.map((alert) => (
                    <div key={alert.id} className="p-4 border rounded-lg">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                          {alert.resolved ? (
                            <CheckCircle className="h-5 w-5 text-green-600" />
                          ) : (
                            <XCircle className="h-5 w-5 text-red-600" />
                          )}
                          <Badge variant={getSeverityColor(alert.severity)}>{alert.severity}</Badge>
                          <Badge variant="outline">{alert.type}</Badge>
                        </div>
                        <span className="text-xs text-gray-600">
                          {new Date(alert.timestamp).toLocaleString()}
                        </span>
                      </div>
                      <p className="font-medium mb-2">{alert.message}</p>
                      {Object.keys(alert.details).length > 0 && (
                        <div className="text-sm text-gray-600">
                          {Object.entries(alert.details).map(([key, value]) => (
                            <div key={key}>
                              <span className="font-medium">{key}:</span> {String(value)}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <CheckCircle className="h-12 w-12 text-green-600 mx-auto mb-4" />
                  <p className="text-gray-600">No active performance alerts</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}