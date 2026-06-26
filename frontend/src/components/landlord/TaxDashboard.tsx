import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import { FileText, DollarSign, Calendar, Calculator, TrendingUp, TrendingDown } from "lucide-react";
import { ScheduleEReport } from './tax/ScheduleEReport';
import { TaxCategoryBreakdown } from './tax/TaxCategoryBreakdown';
import { TaxDocumentsList } from './tax/TaxDocumentsList';
import { ScheduleECategory, TaxDocument } from '@/types/landlordTax';
import { useTaxData } from '@/hooks/useTaxData';
import { estimateTaxLiability } from '@/lib/utils/taxCalculations';

export const TaxDashboard: React.FC = () => {
  const [selectedYear, setSelectedYear] = useState<string>(new Date().getFullYear().toString());
  const [selectedProperty, setSelectedProperty] = useState<string>('all');
  const { toast } = useToast();

  // Use the custom hook to fetch data
  const { taxData, documents, loading, error } = useTaxData(parseInt(selectedYear), selectedProperty);

  const landlordProperties = useMemo(() => [
    { id: 'prop_1', name: 'Sunset Apartments' },
    { id: 'prop_2', name: 'Downtown Lofts' },
  ], []);

  const handleGenerateReport = () => {
    toast({
      title: "Generating Report",
      description: "Your tax report is being generated and will be ready for download shortly.",
    });
  };

  const handleDownloadDoc = (doc: TaxDocument) => {
    toast({
      title: "Downloading",
      description: `Downloading ${doc.documentType}...`,
    });
  };

  const handleViewDoc = (doc: TaxDocument) => {
    console.log('View doc:', doc.id);
  };

  // Prepare data for breakdown chart
  const breakdownData = useMemo(() => {
    if (!taxData) return [];
    const expenses = taxData.expenses;
    const items = [
      { category: 'advertising' as ScheduleECategory, amount: expenses.advertising },
      { category: 'auto-travel' as ScheduleECategory, amount: expenses.auto },
      { category: 'cleaning-maintenance' as ScheduleECategory, amount: expenses.cleaning },
      { category: 'insurance' as ScheduleECategory, amount: expenses.insurance },
      { category: 'legal-professional' as ScheduleECategory, amount: expenses.legal },
      { category: 'management-fees' as ScheduleECategory, amount: expenses.management },
      { category: 'mortgage-interest' as ScheduleECategory, amount: expenses.mortgageInterest },
      { category: 'repairs' as ScheduleECategory, amount: expenses.repairs },
      { category: 'supplies' as ScheduleECategory, amount: expenses.supplies },
      { category: 'taxes' as ScheduleECategory, amount: expenses.taxes },
      { category: 'utilities' as ScheduleECategory, amount: expenses.utilities },
      { category: 'depreciation' as ScheduleECategory, amount: expenses.depreciation },
      { category: 'other' as ScheduleECategory, amount: expenses.other.reduce((sum, item) => sum + item.amount, 0) },
    ];
    
    const total = items.reduce((sum, item) => sum + item.amount, 0);
    return items
      .filter(item => item.amount > 0)
      .map(item => ({
        ...item,
        percentage: (item.amount / total) * 100
      }));
  }, [taxData]);

  if (loading) {
    return <div className="p-8 text-center">Loading tax data...</div>;
  }

  if (error) {
    return (
      <div className="p-8 text-center text-red-500">
        <p>Error loading data: {error}</p>
        <Button variant="outline" onClick={() => window.location.reload()} className="mt-4">Retry</Button>
      </div>
    );
  }

  if (!taxData) {
    return <div className="p-8 text-center">No data available for the selected criteria.</div>;
  }

  const estimatedTax = estimateTaxLiability(taxData.netIncome);

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Tax Center</h2>
          <p className="text-muted-foreground">Manage your property tax obligations and generate reports.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Select value={selectedYear} onValueChange={setSelectedYear}>
            <SelectTrigger className="w-[120px]">
              <SelectValue placeholder="Year" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="2024">2024</SelectItem>
              <SelectItem value="2023">2023</SelectItem>
              <SelectItem value="2022">2022</SelectItem>
            </SelectContent>
          </Select>
          <Select value={selectedProperty} onValueChange={setSelectedProperty}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Property" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Properties</SelectItem>
              {landlordProperties.map(prop => (
                <SelectItem key={prop.id} value={prop.id}>{prop.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button onClick={handleGenerateReport}>
            <FileText className="mr-2 h-4 w-4" />
            Generate Report
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Income</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${taxData.totalIncome.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Gross rental income for {selectedYear}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Deductible Expenses</CardTitle>
            <Calculator className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${taxData.totalExpenses.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Total deductible expenses</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Net Taxable Income</CardTitle>
            {taxData.netIncome >= 0 ? (
              <TrendingUp className="h-4 w-4 text-green-500" />
            ) : (
              <TrendingDown className="h-4 w-4 text-red-500" />
            )}
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${taxData.netIncome >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              ${taxData.netIncome.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">Before credits and exemptions</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Est. Tax Liability</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${estimatedTax.toLocaleString(undefined, { maximumFractionDigits: 0 })}
            </div>
            <p className="text-xs text-muted-foreground">Estimated at 24% tax bracket</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="schedule-e" className="space-y-4">
        <TabsList>
          <TabsTrigger value="schedule-e">Schedule E Preview</TabsTrigger>
          <TabsTrigger value="breakdown">Expense Breakdown</TabsTrigger>
          <TabsTrigger value="documents">Tax Documents</TabsTrigger>
        </TabsList>

        <TabsContent value="schedule-e" className="space-y-4">
          <ScheduleEReport data={taxData} year={parseInt(selectedYear)} />
        </TabsContent>

        <TabsContent value="breakdown" className="space-y-4">
          <TaxCategoryBreakdown data={breakdownData} year={parseInt(selectedYear)} />
        </TabsContent>

        <TabsContent value="documents" className="space-y-4">
          <TaxDocumentsList 
            documents={documents} 
            onDownload={handleDownloadDoc}
            onView={handleViewDoc}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
};