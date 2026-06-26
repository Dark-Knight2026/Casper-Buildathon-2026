import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Calendar, CreditCard, Briefcase, FileSignature, Mail, RefreshCw, CheckCircle2, AlertCircle } from 'lucide-react';
import { integrationService, Integration } from '@/services/integrationService';
import { formatDistanceToNow } from 'date-fns';

export const ConnectedServicesList = () => {
  const [integrations, setIntegrations] = useState<Integration[]>([]);

  useEffect(() => {
    const load = async () => {
      const data = await integrationService.getIntegrations();
      setIntegrations(data.filter(i => i.isConnected));
    };
    load();
  }, []);

  const getIcon = (name: Integration['iconName']) => {
    switch (name) {
      case 'calendar': return <Calendar className="h-4 w-4" />;
      case 'credit-card': return <CreditCard className="h-4 w-4" />;
      case 'briefcase': return <Briefcase className="h-4 w-4" />;
      case 'file-signature': return <FileSignature className="h-4 w-4" />;
      case 'mail': return <Mail className="h-4 w-4" />;
      default: return <RefreshCw className="h-4 w-4" />;
    }
  };

  const getStatusColor = (status: Integration['status']) => {
    switch (status) {
      case 'healthy': return 'text-green-500';
      case 'error': return 'text-red-500';
      case 'syncing': return 'text-blue-500';
      default: return 'text-gray-400';
    }
  };

  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <RefreshCw className="h-4 w-4 text-indigo-500" />
          Active Integrations
        </CardTitle>
        <CardDescription className="text-xs">System health & sync status</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {integrations.length === 0 ? (
             <p className="text-sm text-muted-foreground text-center py-4">No active integrations.</p>
          ) : (
            integrations.map((int) => (
              <div key={int.id} className="flex items-center justify-between text-sm border-b last:border-0 pb-2 last:pb-0">
                <div className="flex items-center gap-2">
                  <div className={`p-1.5 rounded-full bg-muted ${getStatusColor(int.status)}`}>
                    {getIcon(int.iconName)}
                  </div>
                  <div>
                    <p className="font-medium">{int.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {int.lastSync ? `Synced ${formatDistanceToNow(int.lastSync, { addSuffix: true })}` : 'Never synced'}
                    </p>
                  </div>
                </div>
                {int.status === 'healthy' ? (
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                ) : (
                  <AlertCircle className="h-4 w-4 text-yellow-500" />
                )}
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
};