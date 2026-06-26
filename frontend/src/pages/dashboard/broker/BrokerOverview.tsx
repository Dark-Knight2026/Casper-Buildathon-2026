import React, { useState } from 'react';
import { TemplateSelector } from '@/components/dashboard/TemplateSelector';
import { DashboardTemplate } from '@/types/dashboard';
import { GridTemplate } from '@/components/dashboard/templates/GridTemplate';
import { ListTemplate } from '@/components/dashboard/templates/ListTemplate';
import { CompactTemplate } from '@/components/dashboard/templates/CompactTemplate';
import { ConversionFunnel } from '@/components/dashboard/viz/ConversionFunnel';
import { ForecastChart } from '@/components/dashboard/analytics/ForecastChart';
import { TeamPresence } from '@/components/dashboard/collaboration/TeamPresence';
import { ActivityStream } from '@/components/dashboard/collaboration/ActivityStream';
import { AutomationLog } from '@/components/dashboard/automation/AutomationLog';
import { ConnectedServicesList } from '@/components/dashboard/integrations/ConnectedServicesList';
import { BulkActionBar } from '@/components/common/BulkActionBar';
import { predictiveService, FinancialDataPoint } from '@/services/predictiveService';

const BrokerOverview = () => {
  const [currentTemplate, setCurrentTemplate] = useState<DashboardTemplate>('grid');
  const [financialData, setFinancialData] = useState<FinancialDataPoint[]>([]);

  React.useEffect(() => {
    const loadData = async () => {
      const data = await predictiveService.getFinancialForecast('12m');
      setFinancialData(data);
    };
    loadData();
  }, []);

  const renderTemplate = () => {
    const commonProps = {
      role: 'broker' as const,
      userName: 'Robert Broker',
    };

    const widgets = (
      <div className="space-y-6 mb-8">
        {/* Top Row: Team Presence & Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
          <div className="md:col-span-8 h-[400px]">
             <ForecastChart 
              data={financialData} 
              title="Firm Revenue Forecast" 
              description="Projected commission revenue vs. operational costs"
            />
          </div>
          <div className="md:col-span-4 space-y-6">
            <TeamPresence />
            <div className="h-[280px]">
              <ActivityStream />
            </div>
          </div>
        </div>

        {/* Middle Row: Funnel & Automation Log */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
          <div className="md:col-span-7 h-[400px]">
            <ConversionFunnel />
          </div>
          <div className="md:col-span-5 h-[400px]">
            <AutomationLog />
          </div>
        </div>

        {/* Bottom Row: Integrations */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
          <div className="md:col-span-4 h-[300px]">
            <ConnectedServicesList />
          </div>
        </div>
      </div>
    );

    return (
      <div className="space-y-6">
        {widgets}
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
          <h1 className="text-3xl font-bold tracking-tight">Broker Dashboard</h1>
          <p className="text-muted-foreground">
            Oversee your agency's performance, agents, and deal flow.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <BulkActionBar 
            selectedCount={0} 
            onClearSelection={() => {}} 
            onExport={() => console.log('Exporting broker data...')} 
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

export default BrokerOverview;