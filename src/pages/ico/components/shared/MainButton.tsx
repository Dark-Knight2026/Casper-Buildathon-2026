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
          'relative px-6 py-3 bg-linear-to-r from-sky-800 via-sky-900 to-blue-900',
          'text-white rounded-xl overflow-hidden group duration-300',
          disabled || loading
            ? 'opacity-50 cursor-not-allowed'
            : 'cursor-pointer hover:scale-105',
          className
        )}
        {...props}
      >
        <span className="absolute inset-0 bg-white opacity-20 rotate-45 -translate-x-full group-hover:translate-x-full blur-sm transition-transform duration-500"></span>
        <span className="relative z-10">{text}</span>
      
      </button>
    );
  }
);
MainButton.displayName = 'MainButton';
