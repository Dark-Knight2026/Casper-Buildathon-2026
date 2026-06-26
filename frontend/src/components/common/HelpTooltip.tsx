import React from 'react';
import { HelpCircle } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

interface HelpTooltipProps {
  content: string | React.ReactNode;
  side?: 'top' | 'right' | 'bottom' | 'left';
  align?: 'start' | 'center' | 'end';
  className?: string;
  iconClassName?: string;
  maxWidth?: number;
}

/**
 * Contextual help tooltip component
 * 
 * @example
 * <HelpTooltip content="This field is required for processing your request" />
 * 
 * @example
 * <HelpTooltip 
 *   content={
 *     <div>
 *       <p className="font-semibold mb-1">Commission Rate</p>
 *       <p>Standard rate is 3%. Premium agents may have different rates.</p>
 *     </div>
 *   }
 *   side="right"
 * />
 */
export const HelpTooltip: React.FC<HelpTooltipProps> = ({
  content,
  side = 'top',
  align = 'center',
  className,
  iconClassName,
  maxWidth = 300,
}) => {
  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            className={cn(
              'inline-flex items-center justify-center',
              'text-muted-foreground hover:text-foreground',
              'transition-colors',
              'focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
              'rounded-full',
              className
            )}
            aria-label="Help information"
          >
            <HelpCircle className={cn('h-4 w-4', iconClassName)} />
          </button>
        </TooltipTrigger>
        <TooltipContent
          side={side}
          align={align}
          className="max-w-xs text-sm"
          style={{ maxWidth: `${maxWidth}px` }}
        >
          {typeof content === 'string' ? <p>{content}</p> : content}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

interface InlineHelpProps {
  label: string;
  helpText: string | React.ReactNode;
  required?: boolean;
  className?: string;
}

/**
 * Label with inline help tooltip
 * 
 * @example
 * <InlineHelp 
 *   label="Email Address" 
 *   helpText="We'll never share your email with anyone else"
 *   required
 * />
 */
export const InlineHelp: React.FC<InlineHelpProps> = ({
  label,
  helpText,
  required = false,
  className,
}) => {
  return (
    <div className={cn('flex items-center gap-1', className)}>
      <span className="text-sm font-medium">
        {label}
        {required && <span className="text-destructive ml-1">*</span>}
      </span>
      <HelpTooltip content={helpText} />
    </div>
  );
};

interface HelpSectionProps {
  title: string;
  description: string | React.ReactNode;
  children?: React.ReactNode;
  className?: string;
}

/**
 * Help section with title and description
 * 
 * @example
 * <HelpSection
 *   title="Dashboard Overview"
 *   description="This dashboard shows your key performance metrics and recent activity"
 * />
 */
export const HelpSection: React.FC<HelpSectionProps> = ({
  title,
  description,
  children,
  className,
}) => {
  return (
    <div className={cn('space-y-2', className)}>
      <div className="flex items-start gap-2">
        <HelpCircle className="h-5 w-5 text-muted-foreground mt-0.5 flex-shrink-0" />
        <div className="space-y-1">
          <h4 className="text-sm font-semibold">{title}</h4>
          <div className="text-sm text-muted-foreground">
            {typeof description === 'string' ? <p>{description}</p> : description}
          </div>
          {children}
        </div>
      </div>
    </div>
  );
};