import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import AILeadScoring from '@/components/phase2/enhanced/AILeadScoring';
import AutomatedFollowUp from '@/components/phase2/enhanced/AutomatedFollowUp';
import AgentCRM from '@/components/phase2/AgentCRM';

export default function EnhancedAgentCRM() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto p-6">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Enhanced Agent CRM</h1>
          <p className="text-gray-600">AI-powered lead management and automated follow-up system</p>
        </div>

        <Tabs defaultValue="crm" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="crm">CRM Dashboard</TabsTrigger>
            <TabsTrigger value="ai-scoring">AI Lead Scoring</TabsTrigger>
            <TabsTrigger value="automation">Automated Follow-up</TabsTrigger>
          </TabsList>

          <TabsContent value="crm" className="space-y-6">
            <AgentCRM />
          </TabsContent>

          <TabsContent value="ai-scoring" className="space-y-6">
            <AILeadScoring />
          </TabsContent>

          <TabsContent value="automation" className="space-y-6">
            <AutomatedFollowUp />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}