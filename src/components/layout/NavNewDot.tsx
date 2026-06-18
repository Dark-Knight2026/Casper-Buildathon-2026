import { cn } from '@/lib/utils';

/**
 * Small red dot signalling "there's something new" on a nav link (no count).
 * Renders nothing when `show` is false, so callers drop it in unconditionally.
 */
export function NavNewDot({
  show,
  className,
  label = 'new items',
}: {
  show: boolean;
  className?: string;
  label?: string;
}) {
  if (!show) return null;
  return (
    <span
      role="status"
      aria-label={label}
      className={cn('inline-block h-2 w-2 rounded-full bg-red-500', className)}
    />
  );
}
