import { cn } from '@/lib/utils';

export type InputMode = 'spend' | 'receive';

interface InputModeToggleProps {
  value: InputMode;
  onChange: (mode: InputMode) => void;
  className?: string;
}

export function InputModeToggle({ value, onChange, className }: InputModeToggleProps) {
  return (
    <div className={cn('flex w-full rounded-md overflow-hidden border-0', className)}>
      <button
        type="button"
        onClick={() => onChange('spend')}
        className={cn(
          'flex-1 py-2 text-sm transition-colors',
          value === 'spend'
            ? 'bg-[hsl(var(--ico-brand-primary))] text-white'
            : 'bg-[hsl(var(--ico-bg-secondary))] text-[hsl(var(--ico-text-secondary))] hover:text-[hsl(var(--ico-text-primary))]'
        )}
      >
        I want to spend
      </button>
      <button
        type="button"
        onClick={() => onChange('receive')}
        className={cn(
          'flex-1 py-2 text-sm transition-colors',
          value === 'receive'
            ? 'bg-[hsl(var(--ico-brand-primary))] text-white'
            : 'bg-[hsl(var(--ico-bg-secondary))] text-[hsl(var(--ico-text-secondary))] hover:text-[hsl(var(--ico-text-primary))]'
        )}
      >
        I want to receive
      </button>
    </div>
  );
}

export default InputModeToggle;
