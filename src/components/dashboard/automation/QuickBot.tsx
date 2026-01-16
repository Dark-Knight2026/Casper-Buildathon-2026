import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Bot } from 'lucide-react';
import { workflowService, Workflow } from '@/services/workflowService';
import { useToast } from '@/components/ui/use-toast';

export const QuickBot = () => {
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    const load = async () => {
      const data = await workflowService.getWorkflows();
      setWorkflows(data);
    };
    load();
  }, []);

  const handleToggle = async (id: string, currentState: boolean) => {
    const updated = await workflowService.toggleWorkflow(id);
    if (updated) {
      setWorkflows(prev => prev.map(w => w.id === id ? updated : w));
      toast({
        title: updated.isActive ? "Bot Activated" : "Bot Deactivated",
        description: `${updated.name} is now ${updated.isActive ? 'running' : 'stopped'}.`,
      });
    }
  };

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bot className="h-5 w-5 text-indigo-500" />
          Quick Bots
        </CardTitle>
        <CardDescription>Toggle your personal assistants</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {workflows.map((wf) => (
            <div key={wf.id} className="flex items-center justify-between">
              <div className="space-y-0.5">
                <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                  {wf.name}
                </label>
                <p className="text-xs text-muted-foreground">
                  {wf.description}
                </p>
              </div>
              <Switch
                checked={wf.isActive}
                onCheckedChange={() => handleToggle(wf.id, wf.isActive)}
              />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};