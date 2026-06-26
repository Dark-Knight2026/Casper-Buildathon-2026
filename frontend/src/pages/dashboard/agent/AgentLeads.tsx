/**
 * Agent Leads Page
 * Lead scoring, prioritization, and conversion tracking
 */

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import LeadPrioritizationDashboard from '@/components/agent/LeadPrioritizationDashboard';
import { ErrorBoundary } from '@/components/ui/error-boundary';

export default function AgentLeads() {
  return (
    <ErrorBoundary>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Lead Management</h1>
          <p className="text-gray-500 mt-1">
            AI-powered lead scoring and prioritization to maximize conversions
          </p>
        </div>
        <LeadPrioritizationDashboard />
      </div>
    </ErrorBoundary>
  );
}