import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Activity,
  Cpu,
  HardDrive,
  Wifi,
  WifiOff,
  TrendingUp,
  TrendingDown,
  AlertCircle
} from 'lucide-react';
import { getMemoryUsage, getNetworkStatus } from '@/utils/performance';

interface PerformanceMetrics {
  fps: number;
  memoryUsage: number;
  networkStatus: {
    online: boolean;
    effectiveType?: string;
    downlink?: number;
    rtt?: number;
  };
  renderTime: number;
  bundleSize: number;
}

export default function PerformanceMonitor() {
  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    fps: 60,
    memoryUsage: 0,
    networkStatus: { online: true },
    renderTime: 0,
    bundleSize: 986.72
  });
  const [isVisible, setIsVisible] = useState(false);
  const [history, setHistory] = useState<number[]>([]);

  useEffect(() => {
    if (!isVisible) return;

    // FPS monitoring
    let frameCount = 0;
    let lastTime = performance.now();
    let animationFrameId: number;

    const measureFPS = () => {
      frameCount++;
      const currentTime = performance.now();
      
      if (currentTime >= lastTime + 1000) {
        const fps = Math.round((frameCount * 1000) / (currentTime - lastTime));
        setMetrics(prev => ({ ...prev, fps }));
        setHistory(prev => [...prev.slice(-29), fps]);
        frameCount = 0;
        lastTime = currentTime;
      }
      
      animationFrameId = requestAnimationFrame(measureFPS);
    };

    animationFrameId = requestAnimationFrame(measureFPS);

    // Memory monitoring
    const memoryInterval = setInterval(() => {
      const memory = getMemoryUsage();
      if (memory) {
        const usageMB = Math.round(memory.usedJSHeapSize / 1024 / 1024);
        setMetrics(prev => ({ ...prev, memoryUsage: usageMB }));
      }
    }, 2000);

    // Network monitoring
    const networkInterval = setInterval(() => {
      const networkStatus = getNetworkStatus();
      setMetrics(prev => ({ ...prev, networkStatus }));
    }, 5000);

    // Render time monitoring
    const renderObserver = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      const lastEntry = entries[entries.length - 1];
      if (lastEntry) {
        setMetrics(prev => ({
          ...prev,
          renderTime: Math.round(lastEntry.duration)
        }));
      }
    });

    try {
      renderObserver.observe({ entryTypes: ['measure'] });
    } catch (e) {
      console.warn('Performance Observer not supported');
    }

    return () => {
      cancelAnimationFrame(animationFrameId);
      clearInterval(memoryInterval);
      clearInterval(networkInterval);
      renderObserver.disconnect();
    };
  }, [isVisible]);

  const getPerformanceStatus = () => {
    if (metrics.fps < 30) return { status: 'critical', color: 'red' };
    if (metrics.fps < 50) return { status: 'warning', color: 'yellow' };
    return { status: 'good', color: 'green' };
  };

  const getMemoryStatus = () => {
    if (metrics.memoryUsage > 500) return { status: 'critical', color: 'red' };
    if (metrics.memoryUsage > 300) return { status: 'warning', color: 'yellow' };
    return { status: 'good', color: 'green' };
  };

  const performanceStatus = getPerformanceStatus();
  const memoryStatus = getMemoryStatus();

  if (!isVisible) {
    return (
      <Button
        onClick={() => setIsVisible(true)}
        variant="outline"
        size="sm"
        className="fixed bottom-4 right-4 z-50"
      >
        <Activity className="h-4 w-4 mr-2" />
        Show Performance
      </Button>
    );
  }

  return (
    <Card className="fixed bottom-4 right-4 z-50 w-96 shadow-lg">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Performance Monitor
          </CardTitle>
          <Button
            onClick={() => setIsVisible(false)}
            variant="ghost"
            size="sm"
          >
            ×
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* FPS */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Cpu className="h-4 w-4 text-gray-600" />
            <span className="text-sm font-medium">FPS</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-lg font-bold">{metrics.fps}</span>
            <Badge
              className={`bg-${performanceStatus.color}-100 text-${performanceStatus.color}-800`}
            >
              {performanceStatus.status}
            </Badge>
          </div>
        </div>

        {/* FPS History Graph */}
        {history.length > 0 && (
          <div className="h-16 flex items-end gap-0.5">
            {history.map((fps, index) => (
              <div
                key={index}
                className="flex-1 bg-blue-500 rounded-t"
                style={{
                  height: `${(fps / 60) * 100}%`,
                  opacity: 0.3 + (index / history.length) * 0.7
                }}
              />
            ))}
          </div>
        )}

        {/* Memory Usage */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <HardDrive className="h-4 w-4 text-gray-600" />
            <span className="text-sm font-medium">Memory</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-lg font-bold">{metrics.memoryUsage} MB</span>
            <Badge
              className={`bg-${memoryStatus.color}-100 text-${memoryStatus.color}-800`}
            >
              {memoryStatus.status}
            </Badge>
          </div>
        </div>

        {/* Network Status */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {metrics.networkStatus.online ? (
              <Wifi className="h-4 w-4 text-green-600" />
            ) : (
              <WifiOff className="h-4 w-4 text-red-600" />
            )}
            <span className="text-sm font-medium">Network</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm">
              {metrics.networkStatus.online ? 'Online' : 'Offline'}
            </span>
            {metrics.networkStatus.effectiveType && (
              <Badge variant="outline">
                {metrics.networkStatus.effectiveType}
              </Badge>
            )}
          </div>
        </div>

        {/* Network Details */}
        {metrics.networkStatus.online && (
          <div className="grid grid-cols-2 gap-2 text-xs text-gray-600">
            {metrics.networkStatus.downlink && (
              <div className="flex items-center gap-1">
                <TrendingDown className="h-3 w-3" />
                <span>{metrics.networkStatus.downlink.toFixed(1)} Mbps</span>
              </div>
            )}
            {metrics.networkStatus.rtt && (
              <div className="flex items-center gap-1">
                <TrendingUp className="h-3 w-3" />
                <span>{metrics.networkStatus.rtt}ms RTT</span>
              </div>
            )}
          </div>
        )}

        {/* Render Time */}
        {metrics.renderTime > 0 && (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-gray-600" />
              <span className="text-sm font-medium">Last Render</span>
            </div>
            <span className="text-sm">{metrics.renderTime}ms</span>
          </div>
        )}

        {/* Bundle Size */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <HardDrive className="h-4 w-4 text-gray-600" />
            <span className="text-sm font-medium">Bundle Size</span>
          </div>
          <span className="text-sm">{metrics.bundleSize} KB</span>
        </div>

        {/* Performance Warnings */}
        {(performanceStatus.status !== 'good' || memoryStatus.status !== 'good') && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
            <div className="flex items-start gap-2">
              <AlertCircle className="h-4 w-4 text-yellow-600 mt-0.5" />
              <div className="text-xs text-yellow-800">
                {performanceStatus.status !== 'good' && (
                  <p>Low FPS detected. Consider reducing animations or data load.</p>
                )}
                {memoryStatus.status !== 'good' && (
                  <p>High memory usage. Consider clearing cache or reducing data.</p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Quick Actions */}
        <div className="flex gap-2 pt-2">
          <Button
            variant="outline"
            size="sm"
            className="flex-1"
            onClick={() => {
              setHistory([]);
              console.clear();
            }}
          >
            Clear History
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="flex-1"
            onClick={() => {
              console.log('Performance Metrics:', metrics);
              console.log('FPS History:', history);
            }}
          >
            Log Data
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}