import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SOCIAL_PROVIDERS } from './constants';

interface ProviderListProps {
  connectingProvider: string | null;
  onConnect: (providerKey: string) => void;
  onCancel: () => void;
  disabled?: boolean;
}

export function ProviderList({ connectingProvider, onConnect, onCancel, disabled }: ProviderListProps) {
  return (
    <div className="space-y-2">
      <p className="text-xs font-medium text-muted-foreground text-center">
        Continue with
      </p>

      {SOCIAL_PROVIDERS.map(provider => {
        const isConnecting = connectingProvider === provider.key;
        return (
          <div key={provider.key} className="flex items-center gap-2">
            <Button
              variant="outline"
              className="flex-1 justify-start gap-3"
              onClick={() => onConnect(provider.key)}
              disabled={disabled || !!connectingProvider}
            >
              {isConnecting
                ? <Loader2 className="h-5 w-5 animate-spin shrink-0" />
                : <span className="shrink-0">{provider.icon}</span>
              }
              <span>{isConnecting ? 'Connecting…' : provider.label}</span>
            </Button>
            {isConnecting && (
              <button
                type="button"
                className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-2 whitespace-nowrap"
                onClick={onCancel}
              >
                Cancel
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}
