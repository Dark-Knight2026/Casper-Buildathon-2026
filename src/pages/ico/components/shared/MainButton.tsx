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
          'inline-flex items-center justify-center gap-2',
          disabled || loading
            ? 'opacity-50 cursor-not-allowed'
            : 'cursor-pointer hover:bg-[hsl(var(--ico-form-button-hover))]',
          className
        )}
        {...props}
      >
        {loading && (
          <svg
            className="w-4 h-4 animate-spin shrink-0"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12" cy="12" r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
            />
          </svg>
        )}
        <span className="relative z-10">{text}</span>
      </button>
    );
  }
);
MainButton.displayName = 'MainButton';
