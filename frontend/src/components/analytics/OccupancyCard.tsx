import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Home, Users, Calendar, TrendingUp } from 'lucide-react';
import { OccupancyMetrics } from '@/services/analyticsService';

interface OccupancyCardProps {
  metrics: OccupancyMetrics;
  loading?: boolean;
}

export default function OccupancyCard({ metrics, loading }: OccupancyCardProps) {
  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Occupancy Metrics</CardTitle>
          <CardDescription>Loading...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-muted rounded w-3/4"></div>
            <div className="h-4 bg-muted rounded w-1/2"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Occupancy Metrics</CardTitle>
        <CardDescription>Current property utilization</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Current Occupancy</span>
            <span className="text-2xl font-bold">{metrics.currentOccupancy.toFixed(1)}%</span>
          </div>
          <div className="h-3 bg-muted rounded-full overflow-hidden">
            <div
              className={`h-full ${
                metrics.currentOccupancy >= 90
                  ? 'bg-green-600'
                  : metrics.currentOccupancy >= 70
                  ? 'bg-blue-600'
                  : 'bg-orange-600'
              }`}
              style={{ width: `${metrics.currentOccupancy}%` }}
            />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4 pt-4 border-t">
          <div className="text-center">
            <Home className="h-5 w-5 mx-auto mb-1 text-muted-foreground" />
            <p className="text-2xl font-bold">{metrics.totalUnits}</p>
            <p className="text-xs text-muted-foreground">Total Units</p>
          </div>
          <div className="text-center">
            <Users className="h-5 w-5 mx-auto mb-1 text-green-600" />
            <p className="text-2xl font-bold text-green-600">{metrics.occupiedUnits}</p>
            <p className="text-xs text-muted-foreground">Occupied</p>
          </div>
          <div className="text-center">
            <Home className="h-5 w-5 mx-auto mb-1 text-orange-600" />
            <p className="text-2xl font-bold text-orange-600">{metrics.vacantUnits}</p>
            <p className="text-xs text-muted-foreground">Vacant</p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4 pt-4 border-t">
          <div>
            <div className="flex items-center gap-1 mb-1">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <p className="text-xs text-muted-foreground">Avg Lease</p>
            </div>
            <p className="text-lg font-semibold">{metrics.averageLeaseDuration} days</p>
          </div>
          <div>
            <div className="flex items-center gap-1 mb-1">
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
              <p className="text-xs text-muted-foreground">Turnover</p>
            </div>
            <p className="text-lg font-semibold">{metrics.turnoverRate}%</p>
          </div>
          <div>
            <div className="flex items-center gap-1 mb-1">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <p className="text-xs text-muted-foreground">Days to Lease</p>
            </div>
            <p className="text-lg font-semibold">{metrics.avgDaysToLease}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}