import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { MaintenanceAnalytics } from '@/services/analyticsService';
import { Wrench, Clock, DollarSign } from 'lucide-react';

interface MaintenanceAnalyticsCardProps {
  analytics: MaintenanceAnalytics;
  loading?: boolean;
}

export default function MaintenanceAnalyticsCard({ analytics, loading }: MaintenanceAnalyticsCardProps) {
  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Maintenance Analytics</CardTitle>
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

  const costData = Object.entries(analytics.costByCategory).map(([category, cost]) => ({
    category,
    cost,
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle>Maintenance Analytics</CardTitle>
        <CardDescription>Request volume and performance metrics</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center p-3 bg-blue-50 rounded-lg">
            <Wrench className="h-5 w-5 mx-auto mb-2 text-blue-600" />
            <p className="text-2xl font-bold text-blue-600">{analytics.totalRequests}</p>
            <p className="text-xs text-blue-800">Total Requests</p>
          </div>
          <div className="text-center p-3 bg-green-50 rounded-lg">
            <Clock className="h-5 w-5 mx-auto mb-2 text-green-600" />
            <p className="text-2xl font-bold text-green-600">{analytics.avgResolutionTime}</p>
            <p className="text-xs text-green-800">Avg Days</p>
          </div>
          <div className="text-center p-3 bg-orange-50 rounded-lg">
            <DollarSign className="h-5 w-5 mx-auto mb-2 text-orange-600" />
            <p className="text-2xl font-bold text-orange-600">
              ${Object.values(analytics.costByCategory).reduce((sum, cost) => sum + cost, 0).toLocaleString()}
            </p>
            <p className="text-xs text-orange-800">Total Cost</p>
          </div>
        </div>

        {costData.length > 0 && (
          <div>
            <h4 className="text-sm font-medium mb-3">Cost by Category</h4>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={costData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="category" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="cost" fill="#3b82f6" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {analytics.commonIssues.length > 0 && (
          <div className="pt-4 border-t">
            <h4 className="text-sm font-medium mb-3">Common Issues</h4>
            <div className="space-y-2">
              {analytics.commonIssues.map((issue, index) => (
                <div key={index} className="flex items-center justify-between">
                  <span className="text-sm capitalize">{issue.category}</span>
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-24 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-blue-600"
                        style={{
                          width: `${(issue.count / analytics.totalRequests) * 100}%`,
                        }}
                      />
                    </div>
                    <span className="text-sm font-semibold w-8 text-right">{issue.count}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}