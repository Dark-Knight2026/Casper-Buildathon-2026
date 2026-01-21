import { useState, useEffect } from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { WifiOff, Wifi } from 'lucide-react';
import { pwaManager } from '@/lib/pwa';

export default function OfflineIndicator() {
  const [isOnline, setIsOnline] = useState(pwaManager.getIsOnline());
  const [showReconnected, setShowReconnected] = useState(false);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setShowReconnected(true);
      setTimeout(() => setShowReconnected(false), 3000);
    };

    const handleOffline = () => {
      setIsOnline(false);
      setShowReconnected(false);
    };

    window.addEventListener('pwa-online', handleOnline);
    window.addEventListener('pwa-offline', handleOffline);

    return () => {
      window.removeEventListener('pwa-online', handleOnline);
      window.removeEventListener('pwa-offline', handleOffline);
    };
  }, []);

  if (isOnline && !showReconnected) {
    return null;
  }

  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 animate-in slide-in-from-top-5">
      <Alert className={isOnline ? 'bg-green-50 border-green-200' : 'bg-orange-50 border-orange-200'}>
        <div className="flex items-center gap-2">
          {isOnline ? (
            <Wifi className="h-4 w-4 text-green-600" />
          ) : (
            <WifiOff className="h-4 w-4 text-orange-600" />
          )}
          <AlertDescription className={isOnline ? 'text-green-900' : 'text-orange-900'}>
            {isOnline ? 'Back online' : 'You are offline. Some features may be limited.'}
          </AlertDescription>
        </div>
      </Alert>
    </div>
  );
}