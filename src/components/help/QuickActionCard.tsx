import { Link } from 'react-router-dom';
import { ArrowRight, Clock, CheckCircle2, type LucideIcon } from 'lucide-react';

import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface QuickActionCardProps {
  icon: LucideIcon;
  title: string;
  description: string;
  href?: string;
  onClick?: () => void;
  disabled?: boolean;
  badge?: string;
  duration?: string;
  requirements?: string;
}

export function QuickActionCard({
  icon: Icon,
  title,
  description,
  href,
  onClick,
  disabled,
  badge,
  duration,
  requirements,
}: QuickActionCardProps) {
  const cardClasses = cn(
    'group h-full transition-all w-full',
    disabled
      ? 'opacity-60 cursor-not-allowed'
      : 'hover:shadow-md hover:border-primary/40 focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none cursor-pointer',
  );

  const inner = (
    <CardContent className="flex h-full flex-col p-6">
      <div className="mb-4 flex items-start justify-between">
        <div className="rounded-lg bg-primary/10 p-3 text-primary">
          <Icon className="h-6 w-6" aria-hidden="true" />
        </div>
        {badge && (
          <Badge variant="secondary" className="ml-2">
            {badge}
          </Badge>
        )}
      </div>
      <h3 className="mb-2 text-lg font-semibold">{title}</h3>
      <p className="mb-4 text-sm text-muted-foreground">{description}</p>

      {(duration || requirements) && (
        <div className="mb-4 flex-1 space-y-1.5 border-t border-border/60 pt-3 text-xs text-muted-foreground">
          {duration && (
            <div className="flex items-start gap-1.5">
              <Clock className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              <span>Takes {duration}</span>
            </div>
          )}
          {requirements && (
            <div className="flex items-start gap-1.5">
              <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              <span>You'll need: {requirements}</span>
            </div>
          )}
        </div>
      )}

      {!duration && !requirements && <div className="flex-1" />}

      {!disabled && (
        <div className="flex items-center text-sm font-medium text-primary">
          Get started
          <ArrowRight className="ml-1 h-4 w-4 transition-transform group-hover:translate-x-1" aria-hidden="true" />
        </div>
      )}
    </CardContent>
  );

  if (disabled) {
    return (
      <Card className={cardClasses} aria-disabled="true">
        {inner}
      </Card>
    );
  }

  if (href) {
    return (
      <Link to={href} aria-label={title} className="block focus-visible:outline-none">
        <Card className={cardClasses}>{inner}</Card>
      </Link>
    );
  }

  return (
    <Card
      className={cardClasses}
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick?.();
        }
      }}
      aria-label={title}
    >
      {inner}
    </Card>
  );
}
