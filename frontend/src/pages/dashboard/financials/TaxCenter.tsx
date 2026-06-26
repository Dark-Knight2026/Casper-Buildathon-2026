import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { TaxSummaryCard } from '@/components/dashboard/tax/TaxSummaryCard';
import { DeductionTracker } from '@/components/dashboard/tax/DeductionTracker';
import { TaxDocumentUploader } from '@/components/dashboard/tax/TaxDocumentUploader';
import { TaxCalendar } from '@/components/dashboard/tax/TaxCalendar';
import { TaxSavingsCalculator } from '@/components/dashboard/tax/TaxSavingsCalculator';
import { 
  taxService, 
  TaxSummary, 
  TaxDeduction, 
  TaxDocument, 
  TaxCalendarEvent, 
  RentalIncomeData 
} from '@/services/taxService';
import { Download, FileText, PieChart, TrendingUp } from 'lucide-react';
import { toast } from 'sonner';

export default function TaxCenter() {
  const [loading, setLoading] = useState(true);
  const [taxSummary, setTaxSummary] = useState<TaxSummary | null>(null);
  const [deductions, setDeductions] = useState<TaxDeduction[]>([]);
  const [documents, setDocuments] = useState<TaxDocument[]>([]);
  const [calendarEvents, setCalendarEvents] = useState<TaxCalendarEvent[]>([]);
  const [rentalData, setRentalData] = useState<RentalIncomeData[]>([]);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const [summary, deds, docs, events, rental] = await Promise.all([
          taxService.getLandlordTaxSummary('landlord_123'),
          taxService.getTaxDeductions('landlord_123'),
          taxService.getTaxDocuments('landlord_123'),
          taxService.getTaxCalendar(2025),
          taxService.getRentalIncomeData()
        ]);
        setTaxSummary(summary);
        setDeductions(deds);
        setDocuments(docs);
        setCalendarEvents(events);
        setRentalData(rental);
      } catch (error) {
        console.error('Failed to load tax data', error);
        toast.error('Failed to load tax data');
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  const handleExportReport = () => {
    toast.success('Tax report generated and downloaded');
  };

  // Extract properties for dropdowns
  const properties = rentalData.map(d => ({
    id: d.propertyId,
    name: d.propertyName
  }));

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">Tax Center</h1>
          <p className="text-muted-foreground mt-1">Manage your rental property taxes, deductions, and documents.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleExportReport}>
            <Download className="mr-2 h-4 w-4" />
            Export Schedule E
          </Button>
          <Button onClick={handleExportReport}>
            <FileText className="mr-2 h-4 w-4" />
            Generate Tax Report
          </Button>
        </div>
      </div>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="deductions">Deductions</TabsTrigger>
          <TabsTrigger value="documents">Documents</TabsTrigger>
          <TabsTrigger value="planning">Tax Planning</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <TaxSummaryCard summary={taxSummary} isLoading={loading} />
            </div>
            <div className="space-y-6">
              <TaxCalendar events={calendarEvents} isLoading={loading} />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <PieChart className="h-5 w-5 text-blue-600" />
                  Expense Breakdown
                </CardTitle>
                <CardDescription>Distribution of expenses by category</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[200px] flex items-center justify-center bg-muted/20 rounded-lg border border-dashed">
                  <p className="text-muted-foreground">Expense Chart Visualization</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-green-600" />
                  Net Income Trend
                </CardTitle>
                <CardDescription>Monthly net income after expenses</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[200px] flex items-center justify-center bg-muted/20 rounded-lg border border-dashed">
                  <p className="text-muted-foreground">Income Trend Visualization</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="deductions" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <DeductionTracker 
                deductions={deductions} 
                isLoading={loading}
                properties={properties}
              />
            </div>
            <div>
              <TaxSavingsCalculator onCalculate={taxService.calculateTaxSavings.bind(taxService)} />
            </div>
          </div>
        </TabsContent>

        <TabsContent value="documents" className="space-y-6">
          <TaxDocumentUploader documents={documents} isLoading={loading} />
        </TabsContent>

        <TabsContent value="planning" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <TaxSavingsCalculator onCalculate={taxService.calculateTaxSavings.bind(taxService)} />
            <Card>
              <CardHeader>
                <CardTitle>Depreciation Schedule</CardTitle>
                <CardDescription>Track depreciation for your properties</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {rentalData.map((property) => (
                    <div key={property.propertyId} className="flex items-center justify-between p-4 border rounded-lg">
                      <div>
                        <p className="font-medium">{property.propertyName}</p>
                        <p className="text-sm text-muted-foreground">Annual Depreciation</p>
                      </div>
                      <p className="font-bold text-lg">${property.depreciation.toLocaleString()}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}