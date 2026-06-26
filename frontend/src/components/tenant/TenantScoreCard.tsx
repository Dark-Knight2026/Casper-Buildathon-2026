import { Link } from 'react-router-dom';
import { Award, ArrowRight, Sparkles } from 'lucide-react';

import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import {
  BAND_LABEL,
  BAND_SUMMARY,
  COMPONENT_LABEL,
  type ScoreBand,
  type TenantScore,
} from '@/types/tenantScore';

interface TenantScoreCardProps {
  score: TenantScore;
  variant?: 'compact' | 'full';
  className?: string;
}

const BAND_TONE: Record<ScoreBand, string> = {
  excellent: 'text-emerald-700 bg-emerald-50 border-emerald-200',
  good: 'text-blue-700 bg-blue-50 border-blue-200',
  fair: 'text-amber-700 bg-amber-50 border-amber-200',
  poor: 'text-rose-700 bg-rose-50 border-rose-200',
};

const PROGRESS_TONE: Record<ScoreBand, string> = {
  excellent: '[&>div]:bg-emerald-500',
  good: '[&>div]:bg-blue-500',
  fair: '[&>div]:bg-amber-500',
  poor: '[&>div]:bg-rose-500',
};

export function TenantScoreCard({ score, variant = 'compact', className }: TenantScoreCardProps) {
  const isCompact = variant === 'compact';

  // ── Unscored ───────────────────────────────────────────────────────────────
  if (score.status === 'unscored') {
    if (isCompact) {
      // Single-row dashboard widget: icon + headline + CTA.
      return (
        <Card className={cn('border-dashed', className)}>
          <CardContent className="flex items-center justify-between gap-3 p-3">
            <div className="flex min-w-0 items-center gap-2">
              <Sparkles className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">Tenant Score — coming soon</p>
                <p className="truncate text-xs text-muted-foreground">
                  Builds with on-time payments and logged maintenance.
                </p>
              </div>
            </div>
            <Link
              to="/tenant/score"
              className="inline-flex shrink-0 items-center text-sm font-medium text-primary hover:underline"
            >
              Learn more
              <ArrowRight className="ml-0.5 h-4 w-4" aria-hidden="true" />
            </Link>
          </CardContent>
        </Card>
      );
    }
    return (
      <Card className={cn('border-dashed', className)}>
        <CardContent className="space-y-3 p-5">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
            <h3 className="text-base font-semibold">Tenant Score — coming soon</h3>
          </div>
          <p className="text-sm text-muted-foreground">
            We'll start scoring you after your first few rent payments and maintenance entries.
            Your score reflects on-time payments, tenancy duration, and maintenance you log.
          </p>
          <p className="text-xs text-muted-foreground">
            Why not credit-based? LeaseFi rewards what you actually do as a tenant — paying on
            time, taking care of the home, staying long-term.
          </p>
        </CardContent>
      </Card>
    );
  }

  // ── Scored ─────────────────────────────────────────────────────────────────
  const band = score.band!;
  const overall = score.overall!;

  if (isCompact) {
    // Compact dashboard widget: header + score + band + CTA on a single row.
    // No component breakdown, no band summary copy — those live on /tenant/score.
    return (
      <Card className={className}>
        <CardContent className="flex items-center justify-between gap-3 p-3">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted">
              <Award className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground">Tenant Score</p>
              <div className="flex items-baseline gap-1.5">
                <span
                  className="text-xl font-bold leading-none"
                  aria-label={`Score ${overall} out of 100`}
                >
                  {overall}
                </span>
                <span className="text-xs text-muted-foreground">/100</span>
                <Badge
                  variant="outline"
                  className={cn('ml-1 px-1.5 py-0 text-[10px]', BAND_TONE[band])}
                >
                  {BAND_LABEL[band]}
                </Badge>
              </div>
            </div>
          </div>
          <Link
            to="/tenant/score"
            className="inline-flex shrink-0 items-center text-sm font-medium text-primary hover:underline"
          >
            <span className="hidden sm:inline">View details</span>
            <ArrowRight className="ml-0.5 h-4 w-4 sm:ml-1" aria-hidden="true" />
          </Link>
        </CardContent>
      </Card>
    );
  }

  // ── Full (used on /tenant/score) ───────────────────────────────────────────
  return (
    <Card className={className}>
      <CardContent className="space-y-4 p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Award className="h-4 w-4" aria-hidden="true" />
              Tenant Score
            </div>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="text-3xl font-bold" aria-label={`Score ${overall} out of 100`}>
                {overall}
              </span>
              <span className="text-sm text-muted-foreground">/ 100</span>
            </div>
          </div>
          <Badge variant="outline" className={cn('shrink-0', BAND_TONE[band])}>
            {BAND_LABEL[band]}
          </Badge>
        </div>

        <p className="text-sm text-muted-foreground">{BAND_SUMMARY[band]}</p>

        <div className="space-y-3 border-t pt-3">
          {score.components.map((component) => (
            <div key={component.key} className="space-y-1">
              <div className="flex items-baseline justify-between text-sm">
                <span className="font-medium">{COMPONENT_LABEL[component.key]}</span>
                <span className="text-xs text-muted-foreground" aria-hidden="true">
                  {component.value}/100
                </span>
              </div>
              <Progress
                value={component.value}
                aria-label={`${COMPONENT_LABEL[component.key]}: ${component.value} out of 100`}
                className={PROGRESS_TONE[band]}
              />
              <p className="text-xs text-muted-foreground">{component.detail}</p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
