import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { FileText, CheckCircle, XCircle, Clock } from 'lucide-react';
import { workflowService, AutomationLogEntry } from '@/services/workflowService';
import { formatDistanceToNow } from 'date-fns';

export const AutomationLog = () => {
  const [logs, setLogs] = useState<AutomationLogEntry[]>([]);

  useEffect(() => {
    const load = async () => {
      const data = await workflowService.getHistory();
      setLogs(data);
    };
    load();
  }, []);

  const getStatusIcon = (status: AutomationLogEntry['status']) => {
    switch (status) {
      case 'success': return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'failed': return <XCircle className="h-4 w-4 text-red-500" />;
      case 'pending': return <Clock className="h-4 w-4 text-yellow-500" />;
    }
  };

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5 text-slate-500" />
          Automation Log
        </CardTitle>
        <CardDescription>Audit trail of automated actions</CardDescription>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[300px] pr-4">
          <div className="space-y-4">
            {logs.map((log) => (
              <div key={log.id} className="flex gap-3 text-sm border-b pb-3 last:border-0 last:pb-0">
                <div className="mt-0.5">{getStatusIcon(log.status)}</div>
                <div className="grid gap-1">
                  <p className="font-medium text-foreground">{log.workflowName}</p>
                  <p className="text-muted-foreground">{log.action}</p>
                  <p className="text-xs text-slate-400">
                    {formatDistanceToNow(log.timestamp, { addSuffix: true })}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
};