import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  TrendingUp,
  TrendingDown,
  Minus,
  Lightbulb,
  ShieldCheck,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ErrorBoundary } from '@/components/ui/error-boundary';
import { TenantScoreCard } from '@/components/tenant/TenantScoreCard';
import { useTenantScore } from '@/hooks/useTenantScore';
import {
  COMPONENT_LABEL,
  SCORE_WEIGHTS,
  type ScoreEvent,
  type ScoreEventDirection,
} from '@/types/tenantScore';

const dateFormatter = new Intl.DateTimeFormat('en-US', {
  year: 'numeric',
  month: 'short',
  day: 'numeric',
});

const DIRECTION_ICON: Record<ScoreEventDirection, typeof TrendingUp> = {
  positive: TrendingUp,
  negative: TrendingDown,
  neutral: Minus,
};

const DIRECTION_TONE: Record<ScoreEventDirection, string> = {
  positive: 'text-emerald-700 bg-emerald-50',
  negative: 'text-rose-700 bg-rose-50',
  neutral: 'text-muted-foreground bg-muted',
};

const TIPS = [
  'Pay rent on or before the due date — on-time payments are the largest factor.',
  'Log routine maintenance with a photo (filter changes, lawn care). Verified entries lift your score.',
  'Stay long-term in one property. Tenancy duration adds steadily over months.',
  'Communicate early with your landlord about delays — paying within the grace period is better than missing.',
];

function ScoreEventRow({ event }: { event: ScoreEvent }) {
  const Icon = DIRECTION_ICON[event.direction];
  return (
    <li className="flex items-start gap-3 py-3 border-b last:border-b-0">
      <div className={`shrink-0 rounded-full p-1.5 ${DIRECTION_TONE[event.direction]}`}>
        <Icon className="h-4 w-4" aria-hidden="true" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline justify-between gap-2">
          <p className="text-sm font-medium">{event.title}</p>
          <time className="shrink-0 text-xs text-muted-foreground" dateTime={event.occurredAt.toISOString()}>
            {dateFormatter.format(event.occurredAt)}
          </time>
        </div>
        <p className="text-xs text-muted-foreground">{event.detail}</p>
        {event.delta && (
          <p className="mt-0.5 text-xs font-medium text-foreground/80">{event.delta}</p>
        )}
      </div>
    </li>
  );
}

export default function TenantScore() {
  const navigate = useNavigate();
  const { score, events } = useTenantScore();

  return (
    <ErrorBoundary>
      <div className="container mx-auto px-4 py-8 space-y-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => navigate(-1)} aria-label="Back">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">My Tenant Score</h1>
            <p className="text-muted-foreground">
              Behaviour-based reputation. Updated{' '}
              {dateFormatter.format(score.computedAt)}.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[2fr_3fr]">
          <TenantScoreCard score={score} variant="full" />

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <ShieldCheck className="h-4 w-4" />
                How this is calculated
              </CardTitle>
              <CardDescription>
                LeaseFi rewards real tenant behaviour over credit history.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {score.components.map((c) => (
                <div key={c.key} className="flex items-baseline justify-between gap-3 text-sm">
                  <span className="font-medium">{COMPONENT_LABEL[c.key]}</span>
                  <Badge variant="secondary">
                    {Math.round(SCORE_WEIGHTS[c.key] * 100)}% of total
                  </Badge>
                </div>
              ))}
              <p className="pt-2 text-xs text-muted-foreground">
                Weights are subject to change while the scoring model is being finalised. The
                formula and exact weights will be confirmed before the public launch.
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[3fr_2fr]">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Recent activity</CardTitle>
              <CardDescription>
                Events the system uses to adjust your score.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {events.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No score-affecting activity yet. Pay rent on time and log maintenance to start
                  building your score.
                </p>
              ) : (
                <ul>
                  {events.map((event) => (
                    <ScoreEventRow key={event.id} event={event} />
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Lightbulb className="h-4 w-4" />
                Tips to improve
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm text-muted-foreground">
                {TIPS.map((tip) => (
                  <li key={tip} className="flex items-start gap-2">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                    <span>{tip}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>
    </ErrorBoundary>
  );
}
