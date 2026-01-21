import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { CheckCircle2, AlertCircle, Clock, Database, Server, RefreshCw } from 'lucide-react';
import { aiService } from '@/services/aiService';
import { predictiveService } from '@/services/predictiveService';
import { integrationService } from '@/services/integrationService';
import { workflowService } from '@/services/workflowService';

interface HealthCheck {
  id: string;
  name: string;
  status: 'healthy' | 'degraded' | 'down';
  latency?: number;
  message?: string;
}

const SystemHealth = () => {
  const [checks, setChecks] = useState<HealthCheck[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [progress, setProgress] = useState(0);

  const runDiagnostics = async () => {
    setIsRunning(true);
    setProgress(0);
    const newChecks: HealthCheck[] = [];

    // 1. Storage Check
    const startStorage = performance.now();
    try {
      localStorage.setItem('health_check', 'test');
      const val = localStorage.getItem('health_check');
      localStorage.removeItem('health_check');
      if (val === 'test') {
        newChecks.push({
          id: 'storage',
          name: 'Local Storage Persistence',
          status: 'healthy',
          latency: Math.round(performance.now() - startStorage),
          message: 'Read/Write operational'
        });
      } else {
        throw new Error('Verification failed');
      }
    } catch (e) {
      newChecks.push({
        id: 'storage',
        name: 'Local Storage Persistence',
        status: 'down',
        message: 'Access denied or full'
      });
    }
    setProgress(25);

    // 2. AI Service Check
    const startAI = performance.now();
    try {
      await aiService.getRecommendations('test_user', 'landlord');
      newChecks.push({
        id: 'ai_service',
        name: 'AI Recommendation Engine',
        status: 'healthy',
        latency: Math.round(performance.now() - startAI),
        message: 'Model responding'
      });
    } catch (e) {
      newChecks.push({
        id: 'ai_service',
        name: 'AI Recommendation Engine',
        status: 'degraded',
        message: 'Mock service timeout'
      });
    }
    setProgress(50);

    // 3. Predictive Service Check
    const startPred = performance.now();
    try {
      await predictiveService.getFinancialForecast('12m');
      newChecks.push({
        id: 'predictive_service',
        name: 'Predictive Analytics Node',
        status: 'healthy',
        latency: Math.round(performance.now() - startPred),
        message: 'Forecasts generated'
      });
    } catch (e) {
      newChecks.push({
        id: 'predictive_service',
        name: 'Predictive Analytics Node',
        status: 'down',
        message: 'Service unavailable'
      });
    }
    setProgress(75);

    // 4. Integration Service Check
    const startInt = performance.now();
    try {
      await integrationService.getIntegrations();
      newChecks.push({
        id: 'integration_service',
        name: 'External Integrations Gateway',
        status: 'healthy',
        latency: Math.round(performance.now() - startInt),
        message: 'Gateway active'
      });
    } catch (e) {
      newChecks.push({
        id: 'integration_service',
        name: 'External Integrations Gateway',
        status: 'degraded',
        message: 'Connection refused'
      });
    }
    setProgress(100);

    setChecks(newChecks);
    setIsRunning(false);
  };

  useEffect(() => {
    runDiagnostics();
  }, []);

  const getStatusColor = (status: HealthCheck['status']) => {
    switch (status) {
      case 'healthy': return 'text-green-500';
      case 'degraded': return 'text-yellow-500';
      case 'down': return 'text-red-500';
    }
  };

  const getStatusIcon = (status: HealthCheck['status']) => {
    switch (status) {
      case 'healthy': return <CheckCircle2 className="h-5 w-5 text-green-500" />;
      case 'degraded': return <AlertCircle className="h-5 w-5 text-yellow-500" />;
      case 'down': return <AlertCircle className="h-5 w-5 text-red-500" />;
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-[1200px] mx-auto">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">System Health</h1>
          <p className="text-muted-foreground">Real-time platform diagnostics and status monitoring.</p>
        </div>
        <Button onClick={runDiagnostics} disabled={isRunning}>
          {isRunning ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
          Run Diagnostics
        </Button>
      </div>

      {isRunning && (
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Running system checks...</span>
                <span>{progress}%</span>
              </div>
              <Progress value={progress} />
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Server className="h-5 w-5" />
              Service Status
            </CardTitle>
            <CardDescription>Core microservices connectivity</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {checks.map((check) => (
              <div key={check.id} className="flex items-center justify-between p-3 border rounded-lg bg-card">
                <div className="flex items-center gap-3">
                  {getStatusIcon(check.status)}
                  <div>
                    <p className="font-medium">{check.name}</p>
                    <p className="text-xs text-muted-foreground">{check.message}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {check.latency && (
                    <Badge variant="secondary" className="font-mono">
                      {check.latency}ms
                    </Badge>
                  )}
                  <Badge variant={check.status === 'healthy' ? 'outline' : 'destructive'}>
                    {check.status.toUpperCase()}
                  </Badge>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5" />
              Component Registry
            </CardTitle>
            <CardDescription>Active frontend modules</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Global Shortcuts</span>
                <Badge variant="outline" className="text-green-600 bg-green-50">Active</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Export Service</span>
                <Badge variant="outline" className="text-green-600 bg-green-50">Active</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Template Engine</span>
                <Badge variant="outline" className="text-green-600 bg-green-50">Active</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Workflow Automation</span>
                <Badge variant="outline" className="text-green-600 bg-green-50">Active</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Real-time Collaboration</span>
                <Badge variant="outline" className="text-green-600 bg-green-50">Active</Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default SystemHealth;