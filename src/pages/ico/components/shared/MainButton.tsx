import * as React from 'react';
import { cn } from '@/lib/utils';

/**
 * MainButton for ICOPage, styled like cv/src/components/MainButton.jsx but without motion.
 * Uses shadcn Button as base.
 */
export interface MainButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  text: string;
  loading?: boolean;
}

export const MainButton = React.forwardRef<HTMLButtonElement, MainButtonProps>(
  ({ text, className, loading = false, disabled, type = 'button', ...props }, ref) => {
    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={cn(
          'relative px-6 py-3 bg-[hsl(var(--ico-form-button))]',
          'text-white font-medium rounded-md overflow-hidden transition-colors duration-200',
          disabled || loading
            ? 'opacity-50 cursor-not-allowed'
            : 'cursor-pointer hover:bg-[hsl(var(--ico-form-button-hover))]',
          className
        )}
        {...props}
      >
        <span className="relative z-10">{text}</span>
      </button>
    );
  }
);
MainButton.displayName = 'MainButton';
