import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { TemplateSelector } from '@/components/dashboard/TemplateSelector';
import { DashboardTemplate } from '@/types/dashboard';
import { GridTemplate } from '@/components/dashboard/templates/GridTemplate';
import { ListTemplate } from '@/components/dashboard/templates/ListTemplate';
import { CompactTemplate } from '@/components/dashboard/templates/CompactTemplate';
import { AIInsightsWidget } from '@/components/dashboard/ai/AIInsightsWidget';
import { SmartActionCenter } from '@/components/dashboard/ai/SmartActionCenter';
import { ForecastChart } from '@/components/dashboard/analytics/ForecastChart';
import { SmartBudgetPlanner } from '@/components/dashboard/analytics/SmartBudgetPlanner';
import { GeospatialWidget } from '@/components/dashboard/viz/GeospatialWidget';
import { WorkflowStatusCard } from '@/components/dashboard/automation/WorkflowStatusCard';
import { IntegrationCard } from '@/components/dashboard/integrations/IntegrationCard';
import { TaxSummaryCard } from '@/components/dashboard/tax/TaxSummaryCard';
import { DeductionTracker } from '@/components/dashboard/tax/DeductionTracker';
import { TaxCalendar } from '@/components/dashboard/tax/TaxCalendar';
import { TaxDocumentUploader } from '@/components/dashboard/tax/TaxDocumentUploader';
import { BulkActionBar } from '@/components/common/BulkActionBar';
import { Button } from '@/components/ui/button';
import { aiService } from '@/services/aiService';
import { predictiveService, FinancialDataPoint, BudgetRecommendation } from '@/services/predictiveService';
import { integrationService, Integration } from '@/services/integrationService';
import { taxService } from '@/services/taxService';
import { Insight } from '@/services/aiService';
import { TaxSummary, TaxDeduction, TaxCalendarEvent, TaxDocument, RentalIncomeData } from '@/types/tax';
import { ArrowRight } from 'lucide-react';

const DashboardHome = () => {
  const navigate = useNavigate();
  const [currentTemplate, setCurrentTemplate] = useState<DashboardTemplate>('grid');
  const [insights, setInsights] = useState<Insight[]>([]);
  const [financialData, setFinancialData] = useState<FinancialDataPoint[]>([]);
  const [budgetRecs, setBudgetRecs] = useState<BudgetRecommendation[]>([]);
  const [stripeIntegration, setStripeIntegration] = useState<Integration | null>(null);
  const [loading, setLoading] = useState(true);

  // Tax Center State
  const [taxSummary, setTaxSummary] = useState<TaxSummary | null>(null);
  const [taxDeductions, setTaxDeductions] = useState<TaxDeduction[]>([]);
  const [taxCalendar, setTaxCalendar] = useState<TaxCalendarEvent[]>([]);
  const [taxDocuments, setTaxDocuments] = useState<TaxDocument[]>([]);
  const [rentalIncomeData, setRentalIncomeData] = useState<RentalIncomeData[]>([]);
  const [taxLoading, setTaxLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      setTaxLoading(true);
      try {
        const [aiInsights, forecast, budget, integrations, taxSum, deductions, calendar, documents, rentalData] = await Promise.all([
          aiService.getRecommendations('user_123', 'landlord'),
          predictiveService.getFinancialForecast('12m'),
          predictiveService.getSmartBudget(),
          integrationService.getIntegrations(),
          taxService.getLandlordTaxSummary('landlord_123'),
          taxService.getTaxDeductions('landlord_123'),
          taxService.getTaxCalendar(2025),
          taxService.getTaxDocuments('landlord_123'),
          taxService.getRentalIncomeData()
        ]);
        setInsights(aiInsights);
        setFinancialData(forecast);
        setBudgetRecs(budget);
        setStripeIntegration(integrations.find(i => i.id === 'int_stripe') || null);
        setTaxSummary(taxSum);
        setTaxDeductions(deductions);
        setTaxCalendar(calendar);
        setTaxDocuments(documents);
        setRentalIncomeData(rentalData);
      } catch (error) {
        console.error("Failed to load dashboard data", error);
      } finally {
        setLoading(false);
        setTaxLoading(false);
      }
    };
    loadData();
  }, []);

  // Extract properties for the dropdown
  const properties = rentalIncomeData.map(d => ({
    id: d.propertyId,
    name: d.propertyName
  }));

  const renderTemplate = () => {
    const commonProps = {
      role: 'landlord' as const,
      userName: 'Alex Johnson',
    };

    // AI & Analytics Widgets Section
    const widgets = (
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 mb-8">
        <div className="md:col-span-8">
          <AIInsightsWidget insights={insights} isLoading={loading} />
        </div>
        <div className="md:col-span-4">
          <SmartActionCenter role="landlord" />
        </div>
        
        {/* Phase 3.2 Analytics */}
        <div className="md:col-span-8 h-[400px]">
          <ForecastChart data={financialData} />
        </div>
        <div className="md:col-span-4 h-[400px]">
          <SmartBudgetPlanner recommendations={budgetRecs} />
        </div>

        {/* Phase 3.3 Advanced Viz & Phase 3.5 Automation */}
        <div className="md:col-span-8 h-[450px]">
          <GeospatialWidget />
        </div>
        <div className="md:col-span-4 space-y-6">
          <div className="h-[250px]">
            <WorkflowStatusCard />
          </div>
          <div className="h-[180px]">
             {stripeIntegration && (
               <IntegrationCard 
                 integration={stripeIntegration} 
                 onUpdate={(updated) => setStripeIntegration(updated)}
               />
             )}
          </div>
        </div>
      </div>
    );

    // Tax Center Section
    const taxSection = (
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">Tax Center</h2>
          <Button variant="ghost" className="text-primary" onClick={() => navigate('/dashboard/financials/taxes')}>
            View Full Tax Center <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <TaxSummaryCard summary={taxSummary} isLoading={taxLoading} />
          </div>
          <div>
            <TaxDocumentUploader documents={taxDocuments} isLoading={taxLoading} />
          </div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
          <DeductionTracker 
            deductions={taxDeductions} 
            isLoading={taxLoading}
            properties={properties} // Pass properties to enable linking
          />
          <TaxCalendar events={taxCalendar} isLoading={taxLoading} />
        </div>
      </div>
    );

    return (
      <div className="space-y-6">
        {widgets}
        {taxSection}
        {currentTemplate === 'grid' && <GridTemplate {...commonProps} />}
        {currentTemplate === 'list' && <ListTemplate {...commonProps} />}
        {currentTemplate === 'compact' && <CompactTemplate {...commonProps} />}
      </div>
    );
  };

  return (
    <div className="p-6 space-y-6 max-w-[1600px] mx-auto">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Landlord Dashboard</h1>
          <p className="text-muted-foreground">
            Manage your properties, tenants, and financial performance.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <BulkActionBar 
            selectedCount={0} 
            onClearSelection={() => {}} 
            onExport={() => console.log('Exporting landlord data...')} 
          />
          <TemplateSelector
            currentTemplate={currentTemplate}
            onTemplateChange={setCurrentTemplate}
          />
        </div>
      </div>

      {renderTemplate()}
    </div>
  );
};

export default DashboardHome;