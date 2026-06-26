import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar, CreditCard, Briefcase, FileSignature, Mail, Check, Plug, Loader2 } from 'lucide-react';
import { integrationService, Integration } from '@/services/integrationService';
import { useToast } from '@/components/ui/use-toast';

interface IntegrationCardProps {
  integration: Integration;
  onUpdate?: (updated: Integration) => void;
}

export const IntegrationCard = ({ integration, onUpdate }: IntegrationCardProps) => {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const getIcon = (name: Integration['iconName']) => {
    switch (name) {
      case 'calendar': return <Calendar className="h-8 w-8 text-blue-500" />;
      case 'credit-card': return <CreditCard className="h-8 w-8 text-indigo-500" />;
      case 'briefcase': return <Briefcase className="h-8 w-8 text-sky-500" />;
      case 'file-signature': return <FileSignature className="h-8 w-8 text-yellow-500" />;
      case 'mail': return <Mail className="h-8 w-8 text-red-500" />;
      default: return <Plug className="h-8 w-8 text-gray-500" />;
    }
  };

  const handleToggle = async () => {
    setIsLoading(true);
    try {
      let updated;
      if (integration.isConnected) {
        updated = await integrationService.disconnectService(integration.id);
        toast({ title: "Disconnected", description: `Successfully disconnected ${integration.name}.` });
      } else {
        updated = await integrationService.connectService(integration.id);
        toast({ title: "Connected", description: `Successfully connected ${integration.name}.` });
      }
      if (updated && onUpdate) {
        onUpdate(updated);
      }
    } catch (error) {
      toast({ title: "Error", description: "Failed to update integration.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="flex-row gap-4 items-start space-y-0 pb-2">
        <div className="p-2 bg-muted rounded-lg">
          {getIcon(integration.iconName)}
        </div>
        <div className="space-y-1">
          <CardTitle className="text-base">{integration.name}</CardTitle>
          <CardDescription className="text-xs">{integration.description}</CardDescription>
        </div>
      </CardHeader>
      <CardContent className="flex-1 pt-2">
        <div className="flex items-center gap-2">
          {integration.isConnected ? (
            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 flex gap-1 items-center">
              <Check className="h-3 w-3" /> Connected
            </Badge>
          ) : (
            <Badge variant="outline" className="bg-gray-50 text-gray-500 border-gray-200">
              Not Connected
            </Badge>
          )}
        </div>
      </CardContent>
      <CardFooter className="pt-0">
        <Button 
          variant={integration.isConnected ? "outline" : "default"} 
          className="w-full"
          onClick={handleToggle}
          disabled={isLoading}
        >
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
          ) : integration.isConnected ? (
            "Disconnect"
          ) : (
            "Connect"
          )}
        </Button>
      </CardFooter>
    </Card>
  );
};