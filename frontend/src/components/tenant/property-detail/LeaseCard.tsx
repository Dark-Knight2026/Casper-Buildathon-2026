import { useNavigate } from 'react-router-dom';
import { Calendar, DollarSign, Download, Eye, FileText, Home } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { TenantLease } from '@/data/tenantLeases';
import { buildDetailLease } from '@/data/leaseDetailMapper';
import { formatCurrency, formatDateLong, LEASE_STATUS_BADGE } from './shared';

interface LeaseCardProps {
  lease: TenantLease;
  propertyAddress: string;
  landlordId: string;
}

export function LeaseCard({ lease, propertyAddress, landlordId }: LeaseCardProps) {
  const navigate = useNavigate();
  const daysRemaining = Math.ceil((lease.endDate.getTime() - Date.now()) / 86400000);

  const goToDetail = () =>
    navigate(`/tenant/leases/${lease.id}`, {
      state: { lease: buildDetailLease(lease, propertyAddress, landlordId) },
    });

  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 mb-1 flex-wrap">
              <CardTitle className="text-xl truncate">
                {formatDateLong(lease.startDate)} – {formatDateLong(lease.endDate)}
              </CardTitle>
              <Badge className={LEASE_STATUS_BADGE[lease.status]}>
                {lease.status.toUpperCase()}
              </Badge>
            </div>
            <CardDescription>Lease ID: {lease.id}</CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={goToDetail}>
            <Eye className="mr-2 h-4 w-4" />
            View Details
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="flex items-start gap-3">
            <Calendar className="h-5 w-5 text-muted-foreground mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-medium text-foreground">Lease Period</p>
              <p className="text-sm text-muted-foreground">
                {formatDateLong(lease.startDate)} – {formatDateLong(lease.endDate)}
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <DollarSign className="h-5 w-5 text-muted-foreground mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-medium text-foreground">Monthly Rent</p>
              <p className="text-lg font-bold text-primary">{formatCurrency(lease.monthlyRent)}</p>
              <p className="text-xs text-muted-foreground">Due on day {lease.paymentDueDay}</p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <Home className="h-5 w-5 text-muted-foreground mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-medium text-foreground">Security Deposit</p>
              <p className="text-lg font-bold text-foreground">
                {formatCurrency(lease.securityDeposit)}
              </p>
            </div>
          </div>
        </div>

        <div className="mt-4 pt-4 border-t flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <FileText className="h-4 w-4" />
            <span>
              {lease.status === 'active'
                ? `${daysRemaining} days remaining`
                : `Ended ${formatDateLong(lease.endDate)}`}
            </span>
          </div>
          <Button variant="ghost" size="sm" onClick={goToDetail}>
            <Download className="mr-2 h-4 w-4" />
            Documents
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
