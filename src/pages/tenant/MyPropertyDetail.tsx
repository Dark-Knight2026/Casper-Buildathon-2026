import { useNavigate, useParams } from 'react-router-dom';
import { useMemo, useState } from 'react';
import { ArrowLeft, Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FilterBar } from '@/components/ui/filter-bar';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorBoundary } from '@/components/ui/error-boundary';
import { useToast } from '@/hooks/use-toast';
import { FEATURED_PROPERTIES } from '@/data/featuredProperties';
import {
  getLeasesByProperty,
  getPaymentsByProperty,
  getMaintenanceByProperty,
  getMessagesByProperty,
} from '@/data/tenantLeases';
import {
  PropertyHeader,
  LeaseCard,
  PaymentCard,
  PaymentsSummary,
  MaintenanceCard,
  MessageCard,
} from '@/components/tenant/property-detail';
import { formatCurrency, formatDateLong } from '@/components/tenant/property-detail/shared';

export default function MyPropertyDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [paymentStatusFilter, setPaymentStatusFilter] = useState('all');
  const [paymentYearFilter, setPaymentYearFilter] = useState('all');

  const property = useMemo(
    () => (id ? FEATURED_PROPERTIES.find((p) => p.id === id) ?? null : null),
    [id],
  );
  const leases = useMemo(() => (id ? getLeasesByProperty(id) : []), [id]);
  const payments = useMemo(() => (id ? getPaymentsByProperty(id) : []), [id]);
  const maintenance = useMemo(() => (id ? getMaintenanceByProperty(id) : []), [id]);
  const messages = useMemo(() => (id ? getMessagesByProperty(id) : []), [id]);

  const propertyAddress = property
    ? `${property.address}, ${property.city}, ${property.state} ${property.zipCode}`
    : '';

  const filteredPayments = useMemo(
    () =>
      payments.filter((p) => {
        const statusOk = paymentStatusFilter === 'all' || p.status === paymentStatusFilter;
        const yearOk =
          paymentYearFilter === 'all' ||
          new Date(p.paymentDate).getFullYear() === parseInt(paymentYearFilter);
        return statusOk && yearOk;
      }),
    [payments, paymentStatusFilter, paymentYearFilter],
  );

  const paymentYears = useMemo(() => {
    const years = new Set(payments.map((p) => new Date(p.paymentDate).getFullYear()));
    return Array.from(years).sort((a, b) => b - a);
  }, [payments]);

  const totalPaid = useMemo(
    () =>
      filteredPayments.filter((p) => p.status === 'completed').reduce((s, p) => s + p.amount, 0),
    [filteredPayments],
  );
  const completedCount = filteredPayments.filter((p) => p.status === 'completed').length;
  const pendingCount = filteredPayments.filter((p) => p.status === 'pending').length;

  const handleReceipt = (paymentId: string) => {
    toast({
      title: 'Receipt (mock)',
      description: `Receipt for payment ${paymentId} — available after backend integration`,
    });
  };

  if (!property || leases.length === 0) {
    return (
      <ErrorBoundary>
        <div className="container mx-auto px-4 py-8">
          <Button variant="ghost" onClick={() => navigate('/tenant/properties')} className="mb-4">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to My Properties
          </Button>
          <EmptyState
            icon={Mail}
            title="Property Not Found"
            description="This property is not part of your lease history."
            action={{ label: 'Back to My Properties', onClick: () => navigate('/tenant/properties') }}
          />
        </div>
      </ErrorBoundary>
    );
  }

  const currentLease = leases.find((l) => l.status === 'active') ?? leases[0];

  return (
    <ErrorBoundary>
      <div className="container mx-auto px-4 py-8 space-y-6">
        <Button variant="ghost" onClick={() => navigate('/tenant/properties')}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to My Properties
        </Button>

        <PropertyHeader property={property} currentLease={currentLease} />

        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid w-full grid-cols-2 md:grid-cols-5">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="leases">Leases ({leases.length})</TabsTrigger>
            <TabsTrigger value="payments">Payments ({payments.length})</TabsTrigger>
            <TabsTrigger value="maintenance">Maintenance ({maintenance.length})</TabsTrigger>
            <TabsTrigger value="messages">Messages ({messages.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="mt-6 space-y-4">
            <Card>
              <CardContent className="p-6 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Current Rent</p>
                  <p className="text-xl font-semibold">
                    {formatCurrency(currentLease.monthlyRent)}/mo
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Lease Period</p>
                  <p className="font-medium">
                    {formatDateLong(currentLease.startDate)} – {formatDateLong(currentLease.endDate)}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Security Deposit</p>
                  <p className="font-medium">{formatCurrency(currentLease.securityDeposit)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Payment Due</p>
                  <p className="font-medium">Day {currentLease.paymentDueDay} of month</p>
                </div>
              </CardContent>
            </Card>
            {property.description && (
              <Card>
                <CardContent className="p-6 space-y-2">
                  <h3 className="font-semibold">About this property</h3>
                  <p className="text-sm text-muted-foreground whitespace-pre-line">
                    {property.description}
                  </p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="leases" className="mt-6 space-y-4">
            {leases.length === 0 ? (
              <p className="text-sm text-muted-foreground italic">No leases for this property.</p>
            ) : (
              leases.map((l) => (
                <LeaseCard
                  key={l.id}
                  lease={l}
                  propertyAddress={propertyAddress}
                  landlordId={property.landlordId}
                />
              ))
            )}
          </TabsContent>

          <TabsContent value="payments" className="mt-6 space-y-4">
            <PaymentsSummary
              totalPaid={totalPaid}
              completedCount={completedCount}
              pendingCount={pendingCount}
              totalCount={filteredPayments.length}
              yearLabel={paymentYearFilter === 'all' ? 'All time' : `Year ${paymentYearFilter}`}
            />

            <FilterBar
              filters={[
                {
                  value: paymentStatusFilter,
                  onChange: setPaymentStatusFilter,
                  placeholder: 'Filter by status',
                  options: [
                    { value: 'all',       label: 'All Statuses' },
                    { value: 'completed', label: 'Completed' },
                    { value: 'pending',   label: 'Pending' },
                    { value: 'failed',    label: 'Failed' },
                  ],
                },
                {
                  value: paymentYearFilter,
                  onChange: setPaymentYearFilter,
                  placeholder: 'Filter by year',
                  options: [
                    { value: 'all', label: 'All Years' },
                    ...paymentYears.map((y) => ({ value: y.toString(), label: y.toString() })),
                  ],
                },
              ]}
              count={filteredPayments.length}
              countLabel="payment"
            />

            {filteredPayments.length === 0 ? (
              <p className="text-sm text-muted-foreground italic">No payments match your filters.</p>
            ) : (
              <div className="space-y-3">
                {filteredPayments.map((p) => (
                  <PaymentCard key={p.id} payment={p} onReceipt={handleReceipt} />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="maintenance" className="mt-6 space-y-3">
            {maintenance.length === 0 ? (
              <p className="text-sm text-muted-foreground italic">No maintenance requests.</p>
            ) : (
              maintenance.map((m) => <MaintenanceCard key={m.id} request={m} />)
            )}
          </TabsContent>

          <TabsContent value="messages" className="mt-6 space-y-3">
            {messages.length === 0 ? (
              <p className="text-sm text-muted-foreground italic">No messages yet.</p>
            ) : (
              messages.map((m) => <MessageCard key={m.id} message={m} />)
            )}
          </TabsContent>
        </Tabs>
      </div>
    </ErrorBoundary>
  );
}
