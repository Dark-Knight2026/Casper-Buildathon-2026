import React from 'react';
import { cn } from '@/lib/utils';
import { Separator } from '@/components/ui/separator';

interface ListTemplateProps {
  children: React.ReactNode;
  className?: string;
  spacing?: 'tight' | 'normal' | 'loose';
  showDividers?: boolean;
}

/**
 * List Template - Vertical list layout
 * Best for: Data-heavy dashboards with tables and detailed information
 * 
 * @example
 * <ListTemplate spacing="normal" showDividers>
 *   <ListSection>Section 1</ListSection>
 *   <ListSection>Section 2</ListSection>
 *   <ListSection>Section 3</ListSection>
 * </ListTemplate>
 */
export function ListTemplate({
  children,
  className,
  spacing = 'normal',
  showDividers = true,
}: ListTemplateProps) {
  const spacingMap = {
    tight: 'space-y-2',
    normal: 'space-y-4 sm:space-y-6',
    loose: 'space-y-6 sm:space-y-8',
  };

  const childrenArray = React.Children.toArray(children);

  return (
    <div className={cn('w-full', spacingMap[spacing], className)}>
      {showDividers
        ? childrenArray.map((child, index) => (
            <React.Fragment key={index}>
              {child}
              {index < childrenArray.length - 1 && (
                <Separator className="my-4 sm:my-6" />
              )}
            </React.Fragment>
          ))
        : children}
    </div>
  );
}

interface ListSectionProps {
  children: React.ReactNode;
  className?: string;
  title?: string;
  description?: string;
  action?: React.ReactNode;
}

/**
 * List Section - Individual section in list layout
 */
export function ListSection({
  children,
  className,
  title,
  description,
  action,
}: ListSectionProps) {
  return (
    <section className={cn('w-full', className)}>
      {(title || description || action) && (
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-4">
          <div>
            {title && (
              <h2 className="text-lg sm:text-xl font-semibold">{title}</h2>
            )}
            {description && (
              <p className="text-sm text-muted-foreground mt-1">
                {description}
              </p>
            )}
          </div>
          {action && <div className="flex-shrink-0">{action}</div>}
        </div>
      )}
      {children}
    </section>
  );
}