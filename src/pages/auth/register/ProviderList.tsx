import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { ProviderDef } from './constants';
import { SOCIAL_PROVIDERS } from './constants';

interface ProviderListProps {
  providers: ProviderDef[];
  connectingProvider: string | null;
  onConnect: (providerKey: string) => void;
  onCancel: () => void;
  disabled?: boolean;
}

export function ProviderList({ providers, connectingProvider, onConnect, onCancel, disabled }: ProviderListProps) {
  return (
    <div className="space-y-2">
      <p className="text-xs font-medium text-muted-foreground text-center">
        Choose your wallet provider
      </p>

      {providers.map(provider => {
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

      <div className="relative my-3">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t" />
        </div>
        <div className="relative flex justify-center text-xs">
          <span className="bg-white px-2 text-muted-foreground">or continue with</span>
        </div>
      </div>

      {SOCIAL_PROVIDERS.map(provider => (
        <Button
          key={provider.key}
          variant="outline"
          className="w-full justify-start gap-3 opacity-50 cursor-not-allowed"
          disabled
          title="Available on CSPR Click paid plan"
        >
          <span className="shrink-0">{provider.icon}</span>
          <span className="flex-1 text-left">{provider.label}</span>
          <span className="ml-auto text-[10px] font-medium text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
            Soon
          </span>
        </Button>
      ))}
    </div>
  );
}
