import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Property } from '@/types/clientLandlord';
import {
  Calendar,
  Clock,
  AlertCircle,
  CheckCircle,
  RefreshCw,
  TrendingUp
} from 'lucide-react';

interface LeaseTimelineProps {
  properties: Property[];
  onRenewLease: (propertyId: string) => void;
  onViewProperty: (propertyId: string) => void;
}

interface LeaseStatus {
  property: Property;
  daysRemaining: number;
  status: 'active' | 'expiring-soon' | 'expiring-very-soon' | 'expired';
  renewalRecommended: boolean;
}

export default function LeaseTimeline({
  properties,
  onRenewLease,
  onViewProperty
}: LeaseTimelineProps) {
  const leaseStatuses = useMemo(() => {
    const today = new Date();
    
    return properties
      .filter(p => p.status === 'rented' && p.tenantIds.length > 0)
      .map(property => {
        // For demo purposes, calculate days remaining from listing date
        // In real app, this would use actual lease end date from tenant data
        const leaseEndDate = new Date(property.listingDate);
        leaseEndDate.setFullYear(leaseEndDate.getFullYear() + 1); // Assume 1-year lease
        
        const daysRemaining = Math.floor(
          (leaseEndDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
        );
        
        let status: LeaseStatus['status'] = 'active';
        if (daysRemaining < 0) {
          status = 'expired';
        } else if (daysRemaining <= 30) {
          status = 'expiring-very-soon';
        } else if (daysRemaining <= 90) {
          status = 'expiring-soon';
        }
        
        const monthlyIncome = property.financialInfo.monthlyIncome || 0;
        const monthlyExpenses = property.financialInfo.expenses
          .filter(exp => exp.recurring)
          .reduce((sum, exp) => sum + exp.amount, 0);
        const roi = property.details.price > 0
          ? (((monthlyIncome - monthlyExpenses) * 12) / property.details.price) * 100
          : 0;
        
        const renewalRecommended = roi >= 5 && daysRemaining <= 90 && daysRemaining > 0;
        
        return {
          property,
          daysRemaining,
          status,
          renewalRecommended
        };
      })
      .sort((a, b) => a.daysRemaining - b.daysRemaining);
  }, [properties]);

  const getStatusColor = (status: LeaseStatus['status']) => {
    switch (status) {
      case 'expired':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'expiring-very-soon':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'expiring-soon':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      default:
        return 'bg-green-100 text-green-800 border-green-200';
    }
  };

  const getStatusIcon = (status: LeaseStatus['status']) => {
    switch (status) {
      case 'expired':
        return <AlertCircle className="h-4 w-4" />;
      case 'expiring-very-soon':
        return <Clock className="h-4 w-4" />;
      case 'expiring-soon':
        return <Calendar className="h-4 w-4" />;
      default:
        return <CheckCircle className="h-4 w-4" />;
    }
  };

  const getStatusText = (status: LeaseStatus['status'], daysRemaining: number) => {
    if (status === 'expired') {
      return `Expired ${Math.abs(daysRemaining)} days ago`;
    }
    return `${daysRemaining} days remaining`;
  };

  const expiringCount = leaseStatuses.filter(
    ls => ls.status === 'expiring-soon' || ls.status === 'expiring-very-soon'
  ).length;

  const expiredCount = leaseStatuses.filter(ls => ls.status === 'expired').length;

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Active Leases</p>
                <p className="text-2xl font-bold text-green-600">
                  {leaseStatuses.filter(ls => ls.status === 'active').length}
                </p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Expiring Soon</p>
                <p className="text-2xl font-bold text-orange-600">{expiringCount}</p>
              </div>
              <Clock className="h-8 w-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Expired</p>
                <p className="text-2xl font-bold text-red-600">{expiredCount}</p>
              </div>
              <AlertCircle className="h-8 w-8 text-red-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Lease Timeline List */}
      <Card>
        <CardHeader>
          <CardTitle>Lease Timeline</CardTitle>
        </CardHeader>
        <CardContent>
          {leaseStatuses.length === 0 ? (
            <div className="text-center py-12">
              <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No Active Leases</h3>
              <p className="text-gray-600">
                You don't have any active leases at the moment.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {leaseStatuses.map(({ property, daysRemaining, status, renewalRecommended }) => (
                <div
                  key={property.id}
                  className={`border rounded-lg p-4 ${getStatusColor(status)}`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        {getStatusIcon(status)}
                        <h4 className="font-semibold">
                          {property.details.address.street}
                        </h4>
                        <Badge variant="outline" className="bg-white">
                          {property.tenantIds.length} tenant{property.tenantIds.length !== 1 ? 's' : ''}
                        </Badge>
                      </div>
                      
                      <p className="text-sm mb-2">
                        {property.details.address.city}, {property.details.address.state}
                      </p>
                      
                      <div className="flex items-center gap-4 text-sm">
                        <span className="font-medium">
                          {getStatusText(status, daysRemaining)}
                        </span>
                        <span className="text-gray-600">
                          Rent: ${property.financialInfo.monthlyIncome?.toLocaleString() || 0}/mo
                        </span>
                      </div>

                      {renewalRecommended && (
                        <div className="mt-3 flex items-center gap-2 text-sm">
                          <TrendingUp className="h-4 w-4 text-green-600" />
                          <span className="font-medium text-green-700">
                            Renewal recommended - Good ROI property
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="flex flex-col gap-2 ml-4">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => onViewProperty(property.id)}
                        className="bg-white"
                      >
                        View Details
                      </Button>
                      {(status === 'expiring-soon' || status === 'expiring-very-soon' || status === 'expired') && (
                        <Button
                          size="sm"
                          onClick={() => onRenewLease(property.id)}
                          className="bg-blue-600 hover:bg-blue-700 text-white"
                        >
                          <RefreshCw className="h-4 w-4 mr-2" />
                          Renew Lease
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* Timeline Bar */}
                  <div className="mt-4">
                    <div className="h-2 bg-white rounded-full overflow-hidden">
                      <div
                        className={`h-full ${
                          status === 'expired'
                            ? 'bg-red-500'
                            : status === 'expiring-very-soon'
                            ? 'bg-orange-500'
                            : status === 'expiring-soon'
                            ? 'bg-yellow-500'
                            : 'bg-green-500'
                        }`}
                        style={{
                          width: status === 'expired'
                            ? '100%'
                            : `${Math.max(5, Math.min(100, ((365 - daysRemaining) / 365) * 100))}%`
                        }}
                      />
                    </div>
                    <div className="flex justify-between text-xs text-gray-600 mt-1">
                      <span>Lease Start</span>
                      <span>Lease End</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}