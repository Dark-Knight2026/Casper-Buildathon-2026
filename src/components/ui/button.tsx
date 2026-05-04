import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { Loader2 } from 'lucide-react';

import { cn } from '@/lib/utils';

const buttonVariants = cva(
  'inline-flex items-center py-2 justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 cursor-pointer [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0',
  {
    variants: {
      variant: {
        default: 'bg-primary text-primary-foreground hover:bg-primary/90',
        destructive: 'bg-destructive text-destructive-foreground hover:bg-destructive/90',
        outline: 'border border-input bg-background hover:bg-accent hover:text-accent-foreground',
        secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/80',
        ghost: 'hover:bg-accent hover:text-accent-foreground',
        link: 'text-primary underline-offset-4 hover:underline',
        white: 'bg-transparent border border-white text-white hover:bg-white/10 focus-visible:ring-white focus-visible:ring-offset-0',
        'white-solid': 'bg-white text-primary hover:bg-white/90 focus-visible:ring-white focus-visible:ring-offset-0',
      },
      size: {
        default: 'h-10 px-4 py-2',
        sm: 'h-9 rounded-md px-3',
        lg: 'h-11 rounded-md px-8',
        icon: 'h-10 w-10',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
);

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  loading?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, type = 'button', loading = false, disabled, children, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button';
    
    // Add aria-disabled when disabled or loading
    const ariaProps = (disabled || loading) ? { 'aria-disabled': true as const } : {};
    
    // Slot (rendered when asChild=true) calls React.Children.only and
    // therefore accepts exactly one React element. Adding the loading
    // spinner alongside `children` breaks every `<Button asChild>` callsite
    // (navigation Links, etc.) with "React.Children.only expected to receive
    // a single React element child". The loading state only makes sense for
    // real <button> form actions anyway — Slot consumers (Links) don't have
    // an in-flight state to spin, so we silently skip the spinner there.
    const content = asChild ? (
      children
    ) : (
      <>
        {loading && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
        {children}
      </>
    );

    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        type={type}
        disabled={disabled || loading}
        {...ariaProps}
        {...props}
      >
        {content}
      </Comp>
    );
  }
);
Button.displayName = 'Button';

// eslint-disable-next-line react-refresh/only-export-components
export { Button, buttonVariants };