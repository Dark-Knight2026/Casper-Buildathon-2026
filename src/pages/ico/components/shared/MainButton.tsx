import * as React from 'react';
import { Button, buttonVariants } from '@/components/ui/button';
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
  ({ text, className, loading = false, type = 'button', ...props }, ref) => {
    return (
      <button
        className={cn(
          'relative px-6 py-3 bg-gradient-to-r from-sky-800 via-sky-900 to-blue-900',
          'text-white rounded-xl overflow-hidden group cursor-pointer hover:scale-105 duration-300',
          className
        )}
        {...props}
      >
        <span className="absolute inset-0 bg-white opacity-20 rotate-45 translate-x-[-100%] group-hover:translate-x-[100%] blur-sm transition-transform duration-500"></span>
        <span className="relative z-10">{text}</span>
      
      </button>
    );
  }
);
MainButton.displayName = 'MainButton';
