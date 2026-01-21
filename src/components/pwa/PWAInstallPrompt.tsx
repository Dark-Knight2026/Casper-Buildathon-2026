import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Download, X } from 'lucide-react';
import { usePWA } from '@/hooks/usePWA';

export function PWAInstallPrompt() {
  const { isInstallable, installPWA } = usePWA();
  const [isVisible, setIsVisible] = React.useState(true);

  if (!isInstallable || !isVisible) return null;

  return (
    <div className="fixed bottom-20 left-4 right-4 md:left-auto md:right-4 md:bottom-4 md:w-96 z-50">
      <Card className="bg-primary text-primary-foreground shadow-lg">
        <CardContent className="p-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="bg-white/20 p-2 rounded-full">
              <Download className="h-5 w-5" />
            </div>
            <div>
              <p className="font-semibold">Install App</p>
              <p className="text-sm opacity-90">Add to home screen for better experience</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Button 
              variant="secondary" 
              size="sm" 
              onClick={installPWA}
              className="whitespace-nowrap"
            >
              Install
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsVisible(false)}
              className="text-primary-foreground hover:bg-white/20"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}