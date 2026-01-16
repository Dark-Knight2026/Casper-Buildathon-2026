/**
 * Performance Dashboard
 * Comprehensive performance monitoring and analysis dashboard
 */

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Activity,
  Zap,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Download,
  RefreshCw,
  X
} from 'lucide-react';
import {
  performanceObserver,
  frameRateMonitor,
  longTaskDetector,
  memoryLeakDetector,
  getSlowResources,
  getLargeResources,
  getRenderBlockingResources,
  checkPerformanceBudget,
  generatePerformanceReport
} from '@/utils/advanced-performance';

interface PerformanceMetrics {
  fcp?: number;
  lcp?: number;
  fid?: number;
  cls?: number;
  ttfb?: number;
}

export default function PerformanceDashboard() {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const [metrics, setMetrics] = useState<PerformanceMetrics>({});
  const [fps, setFps] = useState(0);
  const [fpsHistory, setFpsHistory] = useState<number[]>([]);

  useEffect(() => {
    if (!isOpen) return;

    // Start monitoring
    frameRateMonitor.start();
    longTaskDetector.start();
    memoryLeakDetector.start();

    // Update metrics
    const interval = setInterval(() => {
      setMetrics(performanceObserver.getMetrics());
      setFps(frameRateMonitor.getFPS());
      setFpsHistory(frameRateMonitor.getHistory());
    }, 1000);

    return () => {
      clearInterval(interval);
      frameRateMonitor.stop();
      longTaskDetector.stop();
      memoryLeakDetector.stop();
    };
  }, [isOpen]);

  const handleExport = () => {
    const report = generatePerformanceReport();
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `performance-report-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleRefresh = () => {
    setMetrics(performanceObserver.getMetrics());
    setFps(frameRateMonitor.getFPS());
    setFpsHistory(frameRateMonitor.getHistory());
  };

  if (!isOpen) {
    return (
      <Button
        variant="outline"
        size="sm"
        onClick={() => setIsOpen(true)}
        className="fixed bottom-4 right-4 z-50 shadow-lg"
      >
        <Activity className="h-4 w-4 mr-2" />
        Performance Dashboard
      </Button>
    );
  }

  const budget = checkPerformanceBudget();
  const slowResources = getSlowResources();
  const largeResources = getLargeResources();
  const renderBlocking = getRenderBlockingResources();
  const longTasks = longTaskDetector.getTasks();
  const memoryLeak = memoryLeakDetector.detectLeak();

  return (
    <div className="fixed bottom-4 right-4 w-[600px] max-h-[80vh] z-50">
      <Card className="shadow-2xl">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-blue-600" />
              <CardTitle>Performance Dashboard</CardTitle>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={handleRefresh}
                className="h-8 w-8"
              >
                <RefreshCw className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleExport}
                className="h-8 w-8"
              >
                <Download className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsOpen(false)}
                className="h-8 w-8"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <CardDescription>
            Real-time performance monitoring and analysis
          </CardDescription>
        </CardHeader>

        <CardContent className="p-0">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="w-full justify-start rounded-none border-b px-4">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="core-vitals">Core Vitals</TabsTrigger>
              <TabsTrigger value="resources">Resources</TabsTrigger>
              <TabsTrigger value="issues">Issues</TabsTrigger>
            </TabsList>

            <ScrollArea className="h-[500px]">
              {/* Overview Tab */}
              <TabsContent value="overview" className="p-4 space-y-4">
                {/* FPS Monitor */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm">Frame Rate</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-end justify-between mb-2">
                      <div>
                        <div className="text-3xl font-bold">{fps}</div>
                        <div className="text-xs text-gray-500">FPS</div>
                      </div>
                      <Badge
                        variant={fps >= 50 ? 'default' : fps >= 30 ? 'secondary' : 'destructive'}
                      >
                        {fps >= 50 ? 'Good' : fps >= 30 ? 'Fair' : 'Poor'}
                      </Badge>
                    </div>
                    <div className="flex items-end gap-1 h-16">
                      {fpsHistory.map((value, i) => (
                        <div
                          key={i}
                          className="flex-1 bg-blue-500 rounded-t"
                          style={{
                            height: `${(value / 60) * 100}%`,
                            opacity: 0.3 + (i / fpsHistory.length) * 0.7
                          }}
                        />
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Performance Budget */}
                <Card>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm">Performance Budget</CardTitle>
                      {budget.passed ? (
                        <CheckCircle className="h-4 w-4 text-green-600" />
                      ) : (
                        <XCircle className="h-4 w-4 text-red-600" />
                      )}
                    </div>
                  </CardHeader>
                  <CardContent>
                    {budget.passed ? (
                      <div className="text-sm text-green-600">
                        All metrics within budget
                      </div>
                    ) : (
                      <div className="space-y-1">
                        {budget.violations.map((violation, i) => (
                          <div key={i} className="text-sm text-red-600">
                            {violation}
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Quick Stats */}
                <div className="grid grid-cols-2 gap-4">
                  <Card>
                    <CardContent className="pt-6">
                      <div className="text-2xl font-bold">{longTasks.length}</div>
                      <div className="text-xs text-gray-500">Long Tasks</div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-6">
                      <div className="text-2xl font-bold">
                        {memoryLeak.detected ? 'Yes' : 'No'}
                      </div>
                      <div className="text-xs text-gray-500">Memory Leak</div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              {/* Core Vitals Tab */}
              <TabsContent value="core-vitals" className="p-4 space-y-4">
                <MetricCard
                  title="First Contentful Paint (FCP)"
                  value={metrics.fcp}
                  unit="ms"
                  threshold={1800}
                  description="Time until first content is painted"
                />
                <MetricCard
                  title="Largest Contentful Paint (LCP)"
                  value={metrics.lcp}
                  unit="ms"
                  threshold={2500}
                  description="Time until largest content is painted"
                />
                <MetricCard
                  title="First Input Delay (FID)"
                  value={metrics.fid}
                  unit="ms"
                  threshold={100}
                  description="Time from first interaction to response"
                />
                <MetricCard
                  title="Cumulative Layout Shift (CLS)"
                  value={metrics.cls}
                  unit=""
                  threshold={0.1}
                  description="Visual stability score"
                  decimals={3}
                />
                <MetricCard
                  title="Time to First Byte (TTFB)"
                  value={metrics.ttfb}
                  unit="ms"
                  threshold={600}
                  description="Time until first byte received"
                />
              </TabsContent>

              {/* Resources Tab */}
              <TabsContent value="resources" className="p-4 space-y-4">
                <ResourceSection
                  title="Slow Resources"
                  resources={slowResources}
                  icon={<TrendingDown className="h-4 w-4 text-orange-600" />}
                  emptyMessage="No slow resources detected"
                />
                <ResourceSection
                  title="Large Resources"
                  resources={largeResources}
                  icon={<AlertTriangle className="h-4 w-4 text-orange-600" />}
                  emptyMessage="No large resources detected"
                />
                <ResourceSection
                  title="Render Blocking"
                  resources={renderBlocking}
                  icon={<XCircle className="h-4 w-4 text-red-600" />}
                  emptyMessage="No render blocking resources"
                />
              </TabsContent>

              {/* Issues Tab */}
              <TabsContent value="issues" className="p-4 space-y-4">
                {/* Long Tasks */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 text-orange-600" />
                      Long Tasks ({longTasks.length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {longTasks.length === 0 ? (
                      <div className="text-sm text-gray-500">No long tasks detected</div>
                    ) : (
                      <div className="space-y-2">
                        {longTasks.slice(0, 5).map((task, i) => (
                          <div key={i} className="text-sm">
                            <div className="font-medium">{task.name}</div>
                            <div className="text-gray-500">
                              {task.duration.toFixed(0)}ms at {task.startTime.toFixed(0)}ms
                            </div>
                          </div>
                        ))}
                        {longTasks.length > 5 && (
                          <div className="text-xs text-gray-500">
                            +{longTasks.length - 5} more
                          </div>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Memory Leak */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm flex items-center gap-2">
                      {memoryLeak.detected ? (
                        <XCircle className="h-4 w-4 text-red-600" />
                      ) : (
                        <CheckCircle className="h-4 w-4 text-green-600" />
                      )}
                      Memory Leak Detection
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {memoryLeak.detected ? (
                      <div className="space-y-2">
                        <div className="text-sm text-red-600">
                          Potential memory leak detected
                        </div>
                        <div className="text-sm text-gray-500">
                          Memory trend: {memoryLeak.trend > 0 ? '+' : ''}
                          {memoryLeak.trend.toFixed(1)}%
                        </div>
                      </div>
                    ) : (
                      <div className="text-sm text-green-600">
                        No memory leaks detected
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Recommendations */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Zap className="h-4 w-4 text-blue-600" />
                      Recommendations
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 text-sm">
                      {fps < 30 && (
                        <div>• Reduce animations or enable hardware acceleration</div>
                      )}
                      {slowResources.length > 0 && (
                        <div>• Optimize slow resources ({slowResources.length} found)</div>
                      )}
                      {largeResources.length > 0 && (
                        <div>• Compress large resources ({largeResources.length} found)</div>
                      )}
                      {renderBlocking.length > 0 && (
                        <div>• Defer render blocking resources ({renderBlocking.length} found)</div>
                      )}
                      {longTasks.length > 5 && (
                        <div>• Break up long tasks into smaller chunks</div>
                      )}
                      {memoryLeak.detected && (
                        <div>• Investigate potential memory leaks</div>
                      )}
                      {fps >= 50 && slowResources.length === 0 && !memoryLeak.detected && (
                        <div className="text-green-600">✓ Performance looks good!</div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </ScrollArea>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}

// Helper Components

interface MetricCardProps {
  title: string;
  value?: number;
  unit: string;
  threshold: number;
  description: string;
  decimals?: number;
}

function MetricCard({ title, value, unit, threshold, description, decimals = 0 }: MetricCardProps) {
  const isGood = value !== undefined && value <= threshold;
  const displayValue = value !== undefined ? value.toFixed(decimals) : 'N/A';

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm">{title}</CardTitle>
          {value !== undefined && (
            isGood ? (
              <CheckCircle className="h-4 w-4 text-green-600" />
            ) : (
              <AlertTriangle className="h-4 w-4 text-orange-600" />
            )
          )}
        </div>
        <CardDescription className="text-xs">{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-end justify-between">
          <div>
            <div className="text-2xl font-bold">
              {displayValue}
              {unit && <span className="text-sm text-gray-500 ml-1">{unit}</span>}
            </div>
            <div className="text-xs text-gray-500">
              Target: {threshold}{unit}
            </div>
          </div>
          {value !== undefined && (
            isGood ? (
              <TrendingUp className="h-5 w-5 text-green-600" />
            ) : (
              <TrendingDown className="h-5 w-5 text-orange-600" />
            )
          )}
        </div>
      </CardContent>
    </Card>
  );
}

interface Resource {
  name: string;
  duration?: number;
  size: number;
}

interface ResourceSectionProps {
  title: string;
  resources: Resource[];
  icon: React.ReactNode;
  emptyMessage: string;
}

function ResourceSection({ title, resources, icon, emptyMessage }: ResourceSectionProps) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          {icon}
          {title} ({resources.length})
        </CardTitle>
      </CardHeader>
      <CardContent>
        {resources.length === 0 ? (
          <div className="text-sm text-gray-500">{emptyMessage}</div>
        ) : (
          <div className="space-y-2">
            {resources.slice(0, 5).map((resource, i) => (
              <div key={i} className="text-sm">
                <div className="font-medium truncate">{resource.name.split('/').pop()}</div>
                <div className="text-gray-500">
                  {resource.duration?.toFixed(0)}ms • {(resource.size / 1000).toFixed(0)}KB
                </div>
              </div>
            ))}
            {resources.length > 5 && (
              <div className="text-xs text-gray-500">
                +{resources.length - 5} more
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}