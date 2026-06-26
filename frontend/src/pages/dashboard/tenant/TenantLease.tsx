import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useTenantDashboard } from '@/hooks/useTenantDashboard';
import {
  Phone,
  Mail,
  MapPin,
  FileText,
} from 'lucide-react';

export default function TenantLease() {
  const { isLoading, leaseInfo } = useTenantDashboard();

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold tracking-tight text-gray-900">Lease Information</h1>
      <Card>
        <CardHeader>
          <CardTitle>Lease Details</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading || !leaseInfo ? (
             <Skeleton className="h-64 w-full" />
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-lg font-semibold mb-4">Property Details</h3>
                  <div className="space-y-3">
                    <div>
                      <p className="text-sm text-muted-foreground">Property</p>
                      <p className="font-medium">{leaseInfo.property}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Unit</p>
                      <p className="font-medium">{leaseInfo.unit}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Address</p>
                      <p className="font-medium flex items-center">
                        <MapPin className="h-4 w-4 mr-1" />
                        {leaseInfo.address}
                      </p>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-semibold mb-4">Lease Terms</h3>
                  <div className="space-y-3">
                    <div>
                      <p className="text-sm text-muted-foreground">Monthly Rent</p>
                      <p className="font-medium text-green-600">${leaseInfo.monthlyRent.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Lease Period</p>
                      <p className="font-medium">{leaseInfo.leaseStart} to {leaseInfo.leaseEnd}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Security Deposit</p>
                      <p className="font-medium">${leaseInfo.deposit.toLocaleString()}</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-6 pt-6 border-t">
                <h3 className="text-lg font-semibold mb-4">Landlord Contact</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Company</p>
                    <p className="font-medium">{leaseInfo.landlord}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Phone</p>
                    <p className="font-medium flex items-center">
                      <Phone className="h-4 w-4 mr-1" />
                      {leaseInfo.landlordPhone}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Email</p>
                    <p className="font-medium flex items-center">
                      <Mail className="h-4 w-4 mr-1" />
                      {leaseInfo.landlordEmail}
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex space-x-2 mt-6">
                <Button variant="outline" aria-label="Download lease agreement">
                  <FileText className="h-4 w-4 mr-2" />
                  Download Lease
                </Button>
                <Button variant="outline" aria-label="Contact landlord">
                  <Phone className="h-4 w-4 mr-2" />
                  Contact Landlord
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}