import { SlidersHorizontal, ChevronDown } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { ICOState } from '@/types/ico';

const STATE_LABELS: Record<ICOState, string> = {
  1: 'Countdown',
  2: 'Active Sale',
  3: 'Dashboard',
};

interface DevStateSelectorProps {
  currentState: ICOState;
  onStateChange: (state: ICOState | null) => void;
  isDevOverride: boolean;
}

/**
 * ICO State Selector — intentionally visible in production.
 * Allows the client (and all users) to manually switch between ICO states
 * (Countdown / Active Sale / Dashboard) for preview and demo purposes.
 * Do NOT guard with import.meta.env.DEV — removal is deferred until the
 * ICO lifecycle is finalized and manual state overrides are no longer needed.
 */
export function DevStateSelector({ currentState, onStateChange, isDevOverride }: DevStateSelectorProps) {
  return (
    <div className="fixed right-4 top-28 z-[100]">
      <DropdownMenu>
        <DropdownMenuTrigger className="flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-amber-500/50 bg-amber-500/10 text-amber-400 text-xs font-medium cursor-pointer hover:bg-amber-500/20 transition-colors backdrop-blur-sm shadow-lg">
          <SlidersHorizontal className="w-4 h-4" />
          <span className="hidden sm:inline">Preview: {currentState ? STATE_LABELS[currentState] : 'Auto'}</span>
          <ChevronDown className="w-3 h-3 hidden sm:inline" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="bg-[hsl(var(--ico-bg-card))] border-[hsl(var(--ico-border-color))]">
          {isDevOverride && (
            <DropdownMenuItem
              onClick={() => onStateChange(null)}
              className="text-[hsl(var(--ico-text-secondary))] text-xs cursor-pointer"
            >
              Auto (live)
            </DropdownMenuItem>
          )}
          {([1, 2, 3] as ICOState[]).map((s) => (
            <DropdownMenuItem
              key={s}
              onClick={() => onStateChange(s)}
              className={`text-xs cursor-pointer ${
                currentState === s && isDevOverride
                  ? 'text-amber-400'
                  : 'text-[hsl(var(--ico-text-secondary))]'
              }`}
            >
              {STATE_LABELS[s]}
              {currentState === s && isDevOverride && ' ✓'}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
