import { useEffect, useState, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { AnalyticsService } from '@/services/analyticsService';
import FinancialSummaryCard from '@/components/analytics/FinancialSummaryCard';
import { supabase } from '@/lib/supabase/client';
import { useNavigate } from 'react-router-dom';
import { CalendarIcon, Download, RefreshCw, Loader2, Building2 } from 'lucide-react';
import { format } from 'date-fns';

interface Property {
  id: string;
  address: string;
  city: string;
  state: string;
}

interface FinancialReport {
  period: string;
  totalRevenue: number;
  totalExpenses: number;
  netIncome: number;
  rentCollected: number;
  outstandingBalance: number;
  collectionRate: number;
}

export default function PropertyReports() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [properties, setProperties] = useState<Property[]>([]);
  const [selectedProperty, setSelectedProperty] = useState<string>('');
  const [financialReport, setFinancialReport] = useState<FinancialReport | null>(null);
  const [dateRange, setDateRange] = useState<{ from: Date; to: Date }>({
    from: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
    to: new Date(),
  });

  const loadProperties = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate('/auth/login');
        return;
      }

      const { data, error } = await supabase
        .from('properties')
        .select('id, address, city, state')
        .eq('landlord_id', user.id);

      if (error) throw error;
      setProperties(data || []);
      if (data && data.length > 0) {
        setSelectedProperty(data[0].id);
      }
    } catch (error) {
      console.error('Error loading properties:', error);
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  const loadReport = useCallback(async () => {
    if (!selectedProperty) return;

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const startDate = format(dateRange.from, 'yyyy-MM-dd');
      const endDate = format(dateRange.to, 'yyyy-MM-dd');

      // Use new AnalyticsService
      const analytics = await AnalyticsService.getFinancialAnalytics(
        user.id,
        { from: startDate, to: endDate },
        selectedProperty
      );

      // Map to legacy format
      setFinancialReport({
        period: `${startDate} to ${endDate}`,
        totalRevenue: analytics.overview.totalRevenue,
        totalExpenses: analytics.overview.totalExpenses,
        netIncome: analytics.overview.netOperatingIncome,
        rentCollected: analytics.overview.totalRevenue,
        outstandingBalance: 0,
        collectionRate: analytics.rentCollectionRate[analytics.rentCollectionRate.length - 1]?.rate || 0,
      });
    } catch (error) {
      console.error('Error loading report:', error);
    } finally {
      setLoading(false);
    }
  }, [selectedProperty, dateRange]);

  useEffect(() => {
    loadProperties();
  }, [loadProperties]);

  useEffect(() => {
    if (selectedProperty) {
      loadReport();
    }
  }, [selectedProperty, loadReport]);

  const handleExport = () => {
    if (!financialReport) return;

    const property = properties.find(p => p.id === selectedProperty);
    const exportData = [
      {
        property: property ? `${property.address}, ${property.city}` : 'Unknown',
        period: financialReport.period,
        totalRevenue: financialReport.totalRevenue,
        totalExpenses: financialReport.totalExpenses,
        netIncome: financialReport.netIncome,
        rentCollected: financialReport.rentCollected,
        outstandingBalance: financialReport.outstandingBalance,
        collectionRate: `${financialReport.collectionRate.toFixed(1)}%`,
      },
    ];

    AnalyticsService.exportToCSV(exportData, `property-report-${format(new Date(), 'yyyy-MM-dd')}`);
  };

  if (loading && properties.length === 0) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <Loader2 className="mx-auto h-8 w-8 animate-spin text-muted-foreground" />
            <p className="mt-4 text-muted-foreground">Loading properties...</p>
          </div>
        </div>
      </div>
    );
  }

  if (properties.length === 0) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="py-10 text-center">
            <Building2 className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Properties Found</h3>
            <p className="text-muted-foreground">Add properties to view reports.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const selectedPropertyData = properties.find(p => p.id === selectedProperty);

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Property Reports</h1>
          <p className="text-muted-foreground">Individual property financial analysis</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="icon" onClick={loadReport}>
            <RefreshCw className="h-4 w-4" />
          </Button>
          <Button onClick={handleExport} disabled={!financialReport}>
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
        </div>
      </div>

      <div className="flex gap-4">
        <Select value={selectedProperty} onValueChange={setSelectedProperty}>
          <SelectTrigger className="w-[300px]">
            <SelectValue placeholder="Select property" />
          </SelectTrigger>
          <SelectContent>
            {properties.map((property) => (
              <SelectItem key={property.id} value={property.id}>
                {property.address}, {property.city}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline">
              <CalendarIcon className="mr-2 h-4 w-4" />
              {format(dateRange.from, 'MMM dd')} - {format(dateRange.to, 'MMM dd, yyyy')}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="end">
            <Calendar
              mode="range"
              selected={{ from: dateRange.from, to: dateRange.to }}
              onSelect={(range) => {
                if (range?.from && range?.to) {
                  setDateRange({ from: range.from, to: range.to });
                }
              }}
              numberOfMonths={2}
            />
          </PopoverContent>
        </Popover>
      </div>

      {selectedPropertyData && (
        <Card>
          <CardHeader>
            <CardTitle>Property Information</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Address</p>
                <p className="font-medium">{selectedPropertyData.address}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">City</p>
                <p className="font-medium">{selectedPropertyData.city}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">State</p>
                <p className="font-medium">{selectedPropertyData.state}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {financialReport && <FinancialSummaryCard report={financialReport} loading={loading} />}
    </div>
  );
}