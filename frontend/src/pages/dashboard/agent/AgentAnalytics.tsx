/**
 * Agent Analytics Page
 * Performance metrics, charts, and goal tracking
 */

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import AgentPerformanceAnalytics from '@/components/agent/AgentPerformanceAnalytics';
import { ErrorBoundary } from '@/components/ui/error-boundary';

export default function AgentAnalytics() {
  return (
    <ErrorBoundary>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Performance Analytics</h1>
          <p className="text-gray-500 mt-1">
            Track your performance metrics and achieve your goals
          </p>
        </div>
        <AgentPerformanceAnalytics />
      </div>
    </ErrorBoundary>
  );
}