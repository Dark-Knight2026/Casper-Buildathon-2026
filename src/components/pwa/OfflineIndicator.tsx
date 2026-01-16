import React from 'react';
import { WifiOff } from 'lucide-react';
import { usePWA } from '@/hooks/usePWA';

export function OfflineIndicator() {
  const { isOnline } = usePWA();

  if (isOnline) return null;

  return (
    <div className="fixed top-0 left-0 right-0 bg-yellow-500 text-white px-4 py-2 z-[100] flex items-center justify-center space-x-2 text-sm font-medium animate-in slide-in-from-top duration-300">
      <WifiOff className="h-4 w-4" />
      <span>You are currently offline. Some features may be unavailable.</span>
    </div>
  );
}