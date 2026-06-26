import { useQuery } from '@tanstack/react-query';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Gauge } from 'lucide-react';
import {
  getApplicationScore,
  type ScoreFactorKind,
} from '@/services/applicationService';

const FACTOR_LABELS: Record<ScoreFactorKind, string> = {
  income: 'Income',
  credit: 'Credit',
  employment: 'Employment',
  references: 'References',
  background: 'Background',
};

/**
 * Applicant score widget (PL-47). Reads the server-computed breakdown from
 * `GET /applications/{id}/score` and renders the total (out of 100) plus each
 * weighted factor's contribution. The scoring is stubbed on the backend
 * (hackathon) — the values are illustrative. Hidden on error (it's a supplement
 * to the application, not load-critical).
 */
export function ApplicationScore({ applicationId }: { applicationId: string }) {
  const {
    data: score,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ['application-score', applicationId],
    queryFn: () => getApplicationScore(applicationId),
  });

  if (isError) return null;

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Gauge className="h-5 w-5" />
          Applicant score
        </CardTitle>
        <CardDescription>
          Automated, weighted out of 100 (illustrative — scoring is stubbed).
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading || !score ? (
          <Skeleton className="h-40 w-full" />
        ) : (
          <div className="flex flex-col sm:flex-row items-center gap-8">
            <div className="text-center shrink-0">
              <div className="text-5xl font-bold text-primary">
                {score.total}
              </div>
              <p className="text-sm text-muted-foreground">out of 100</p>
            </div>
            <div className="flex-1 w-full space-y-3">
              {score.breakdown.map((factor) => (
                <ScoreBar
                  key={factor.factor}
                  label={FACTOR_LABELS[factor.factor]}
                  score={factor.score}
                  weight={factor.weight}
                />
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function ScoreBar({
  label,
  score,
  weight,
}: {
  label: string;
  score: number;
  weight: number;
}) {
  const percentage = weight > 0 ? (score / weight) * 100 : 0;
  return (
    <div>
      <div className="flex justify-between mb-1 text-sm">
        <span className="font-medium">{label}</span>
        <span className="text-muted-foreground">
          {score}/{weight}
        </span>
      </div>
      <div className="w-full bg-muted rounded-full h-2">
        <div
          className="bg-primary h-2 rounded-full transition-all"
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}
