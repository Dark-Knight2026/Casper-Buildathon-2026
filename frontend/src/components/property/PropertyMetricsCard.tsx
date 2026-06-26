import { memo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Property } from '@/types/clientLandlord';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Home,
  Users,
  AlertCircle,
  Calendar,
  Percent
} from 'lucide-react';

interface PropertyMetrics {
  monthlyIncome: number;
  monthlyExpenses: number;
  netIncome: number;
  roi: number;
  occupancyRate: number;
  daysVacant: number;
  maintenanceRequestCount?: number;
  averageMaintenanceResponseTime?: number;
}

interface PropertyMetricsCardProps {
  property: Property;
  metrics: PropertyMetrics;
  showTrend?: boolean;
  compact?: boolean;
}

function PropertyMetricsCard({ 
  property, 
  metrics, 
  showTrend = true,
  compact = false 
}: PropertyMetricsCardProps) {
  const getStatusColor = (status: Property['status']) => {
    switch (status) {
      case 'rented':
        return 'bg-green-100 text-green-800';
      case 'available':
        return 'bg-blue-100 text-blue-800';
      case 'maintenance':
        return 'bg-yellow-100 text-yellow-800';
      case 'pending':
        return 'bg-orange-100 text-orange-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getROIStatus = (roi: number) => {
    if (roi >= 10) return { color: 'text-green-600', icon: TrendingUp, label: 'Excellent' };
    if (roi >= 6) return { color: 'text-blue-600', icon: TrendingUp, label: 'Good' };
    if (roi >= 3) return { color: 'text-yellow-600', icon: TrendingUp, label: 'Fair' };
    return { color: 'text-red-600', icon: TrendingDown, label: 'Poor' };
  };

  const roiStatus = getROIStatus(metrics.roi);
  const ROIIcon = roiStatus.icon;

  if (compact) {
    return (
      <Card className="hover:shadow-md transition-shadow">
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Home className="h-5 w-5 text-blue-600" />
              <h3 className="font-semibold text-sm truncate">
                {property.details.address.street}
              </h3>
            </div>
            <Badge className={getStatusColor(property.status)}>
              {property.status}
            </Badge>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <p className="text-xs text-gray-600">Monthly Income</p>
              <p className="text-sm font-bold text-green-600">
                ${metrics.monthlyIncome.toLocaleString()}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-600">Net Income</p>
              <p className="text-sm font-bold">
                ${metrics.netIncome.toLocaleString()}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-600">ROI</p>
              <p className={`text-sm font-bold ${roiStatus.color}`}>
                {metrics.roi.toFixed(1)}%
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">
            {property.details.address.street}
          </CardTitle>
          <Badge className={getStatusColor(property.status)}>
            {property.status}
          </Badge>
        </div>
        <p className="text-sm text-gray-600">
          {property.details.address.city}, {property.details.address.state}
        </p>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Financial Metrics */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <div className="flex items-center text-gray-600">
              <DollarSign className="h-4 w-4 mr-1" />
              <span className="text-sm">Monthly Income</span>
            </div>
            <p className="text-2xl font-bold text-green-600">
              ${metrics.monthlyIncome.toLocaleString()}
            </p>
          </div>

          <div className="space-y-1">
            <div className="flex items-center text-gray-600">
              <DollarSign className="h-4 w-4 mr-1" />
              <span className="text-sm">Monthly Expenses</span>
            </div>
            <p className="text-2xl font-bold text-red-600">
              ${metrics.monthlyExpenses.toLocaleString()}
            </p>
          </div>
        </div>

        {/* Net Income */}
        <div className="bg-gray-50 rounded-lg p-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-700">Net Monthly Income</span>
            <span className={`text-xl font-bold ${metrics.netIncome >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              ${metrics.netIncome.toLocaleString()}
            </span>
          </div>
        </div>

        {/* ROI */}
        <div className="bg-blue-50 rounded-lg p-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Percent className="h-4 w-4 text-blue-600" />
              <span className="text-sm font-medium text-gray-700">Annual ROI</span>
            </div>
            <div className="flex items-center gap-2">
              <span className={`text-xl font-bold ${roiStatus.color}`}>
                {metrics.roi.toFixed(2)}%
              </span>
              {showTrend && (
                <div className="flex items-center gap-1">
                  <ROIIcon className={`h-4 w-4 ${roiStatus.color}`} />
                  <Badge variant="secondary" className="text-xs">
                    {roiStatus.label}
                  </Badge>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Occupancy */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <div className="flex items-center text-gray-600">
              <Users className="h-4 w-4 mr-1" />
              <span className="text-sm">Occupancy</span>
            </div>
            <p className="text-lg font-bold">
              {metrics.occupancyRate.toFixed(0)}%
            </p>
            <p className="text-xs text-gray-500">
              {property.tenantIds.length} tenant{property.tenantIds.length !== 1 ? 's' : ''}
            </p>
          </div>

          {metrics.daysVacant > 0 && (
            <div className="space-y-1">
              <div className="flex items-center text-gray-600">
                <Calendar className="h-4 w-4 mr-1" />
                <span className="text-sm">Days Vacant</span>
              </div>
              <p className="text-lg font-bold text-orange-600">
                {metrics.daysVacant}
              </p>
              <p className="text-xs text-gray-500">
                Since {property.listingDate.toLocaleDateString()}
              </p>
            </div>
          )}
        </div>

        {/* Alerts */}
        {(metrics.daysVacant > 30 || metrics.roi < 3 || metrics.netIncome < 0) && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3">
            <div className="flex items-start gap-2">
              <AlertCircle className="h-4 w-4 text-red-600 mt-0.5 flex-shrink-0" />
              <div className="space-y-1">
                <p className="text-sm font-medium text-red-800">Attention Required</p>
                <ul className="text-xs text-red-700 space-y-1">
                  {metrics.daysVacant > 30 && (
                    <li>• Property vacant for {metrics.daysVacant} days</li>
                  )}
                  {metrics.roi < 3 && (
                    <li>• ROI below target ({metrics.roi.toFixed(2)}%)</li>
                  )}
                  {metrics.netIncome < 0 && (
                    <li>• Negative cash flow (${Math.abs(metrics.netIncome).toLocaleString()})</li>
                  )}
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* Property Details Summary */}
        <div className="pt-3 border-t">
          <div className="grid grid-cols-3 gap-2 text-center">
            <div>
              <p className="text-xs text-gray-600">Bedrooms</p>
              <p className="text-sm font-semibold">{property.details.bedrooms}</p>
            </div>
            <div>
              <p className="text-xs text-gray-600">Bathrooms</p>
              <p className="text-sm font-semibold">{property.details.bathrooms}</p>
            </div>
            <div>
              <p className="text-xs text-gray-600">Sq Ft</p>
              <p className="text-sm font-semibold">{property.details.squareFootage.toLocaleString()}</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Export memoized component with custom comparison function
export default memo(PropertyMetricsCard, (prevProps, nextProps) => {
  // Custom comparison to prevent unnecessary re-renders
  return (
    prevProps.property.id === nextProps.property.id &&
    prevProps.property.status === nextProps.property.status &&
    prevProps.metrics.monthlyIncome === nextProps.metrics.monthlyIncome &&
    prevProps.metrics.monthlyExpenses === nextProps.metrics.monthlyExpenses &&
    prevProps.metrics.netIncome === nextProps.metrics.netIncome &&
    prevProps.metrics.roi === nextProps.metrics.roi &&
    prevProps.metrics.occupancyRate === nextProps.metrics.occupancyRate &&
    prevProps.metrics.daysVacant === nextProps.metrics.daysVacant &&
    prevProps.showTrend === nextProps.showTrend &&
    prevProps.compact === nextProps.compact
  );
});