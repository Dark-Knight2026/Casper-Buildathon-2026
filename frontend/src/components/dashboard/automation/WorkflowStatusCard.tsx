import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Zap, CheckCircle2, Clock } from 'lucide-react';
import { workflowService, Workflow } from '@/services/workflowService';

export const WorkflowStatusCard = () => {
  const [workflows, setWorkflows] = useState<Workflow[]>([]);

  useEffect(() => {
    const load = async () => {
      const data = await workflowService.getWorkflows();
      setWorkflows(data.filter(w => w.isActive));
    };
    load();
  }, []);

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Zap className="h-5 w-5 text-yellow-500" />
          Active Automations
        </CardTitle>
        <CardDescription>Bots currently running on your account</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {workflows.slice(0, 3).map((wf) => (
            <div key={wf.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg border">
              <div className="space-y-1">
                <p className="font-medium text-sm">{wf.name}</p>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <CheckCircle2 className="h-3 w-3 text-green-500" />
                    Run {wf.runCount} times
                  </span>
                  <span>•</span>
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    Last run: {new Date(wf.lastRun).toLocaleDateString()}
                  </span>
                </div>
              </div>
              <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                Active
              </Badge>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};