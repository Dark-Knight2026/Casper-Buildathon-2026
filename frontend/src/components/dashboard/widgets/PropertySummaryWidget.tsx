/**
 * Property Summary Widget
 * Displays property count, occupancy, and revenue summary
 */

import { Building, Users, DollarSign, TrendingUp } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { propertyService } from '@/services/propertyService';

export function PropertySummaryWidget() {
  const { data: properties, isLoading } = useQuery({
    queryKey: ['properties'],
    queryFn: () => propertyService.getAll(),
  });

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-16 bg-muted animate-pulse rounded" />
        ))}
      </div>
    );
  }

  const totalProperties = properties?.length || 0;
  const occupiedProperties = properties?.filter((p) => p.status === 'occupied').length || 0;
  const occupancyRate = totalProperties > 0 ? (occupiedProperties / totalProperties) * 100 : 0;
  const totalRevenue = properties?.reduce((sum, p) => sum + (p.rent || 0), 0) || 0;

  const stats = [
    {
      label: 'Total Properties',
      value: totalProperties,
      icon: Building,
      color: 'text-blue-600',
    },
    {
      label: 'Occupancy Rate',
      value: `${occupancyRate.toFixed(0)}%`,
      icon: Users,
      color: 'text-green-600',
    },
    {
      label: 'Monthly Revenue',
      value: `$${totalRevenue.toLocaleString()}`,
      icon: DollarSign,
      color: 'text-purple-600',
    },
  ];

  return (
    <div className="space-y-3">
      {stats.map((stat) => (
        <div key={stat.label} className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
          <div className={`p-2 rounded-lg bg-background ${stat.color}`}>
            <stat.icon className="h-5 w-5" />
          </div>
          <div className="flex-1">
            <p className="text-sm text-muted-foreground">{stat.label}</p>
            <p className="text-xl font-semibold">{stat.value}</p>
          </div>
        </div>
      ))}
    </div>
  );
}