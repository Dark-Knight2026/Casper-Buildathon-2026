import React, { useState, useEffect } from 'react';
import { TemplateSelector } from '@/components/dashboard/TemplateSelector';
import { DashboardTemplate } from '@/types/dashboard';
import { GridTemplate } from '@/components/dashboard/templates/GridTemplate';
import { ListTemplate } from '@/components/dashboard/templates/ListTemplate';
import { CompactTemplate } from '@/components/dashboard/templates/CompactTemplate';
import { AIInsightsWidget } from '@/components/dashboard/ai/AIInsightsWidget';
import { MarketTrendCard } from '@/components/dashboard/ai/MarketTrendCard';
import { SmartActionCenter } from '@/components/dashboard/ai/SmartActionCenter';
import { ForecastChart } from '@/components/dashboard/analytics/ForecastChart';
import { RiskHeatmap } from '@/components/dashboard/analytics/RiskHeatmap';
import { ComparisonChart } from '@/components/dashboard/viz/ComparisonChart';
import { LiveChatWidget } from '@/components/dashboard/collaboration/LiveChatWidget';
import { ActivityStream } from '@/components/dashboard/collaboration/ActivityStream';
import { QuickBot } from '@/components/dashboard/automation/QuickBot';
import { IntegrationCard } from '@/components/dashboard/integrations/IntegrationCard';
import { aiService, Insight, MarketTrend } from '@/services/aiService';
import { predictiveService, FinancialDataPoint, OccupancyPrediction } from '@/services/predictiveService';
import { integrationService, Integration } from '@/services/integrationService';

const AgentOverview = () => {
  const [currentTemplate, setCurrentTemplate] = useState<DashboardTemplate>('grid');
  const [insights, setInsights] = useState<Insight[]>([]);
  const [marketTrends, setMarketTrends] = useState<MarketTrend[]>([]);
  const [marketForecast, setMarketForecast] = useState<FinancialDataPoint[]>([]);
  const [churnRisk, setChurnRisk] = useState<OccupancyPrediction | null>(null);
  const [calendarIntegration, setCalendarIntegration] = useState<Integration | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const [aiInsights, trends, forecast, risk, integrations] = await Promise.all([
          aiService.getRecommendations('agent_123', 'agent'),
          aiService.getMarketInsights('90210'),
          predictiveService.getFinancialForecast('12m'), // Reusing mock for market trend graph
          predictiveService.getOccupancyPrediction('prop_001'),
          integrationService.getIntegrations()
        ]);
        setInsights(aiInsights);
        setMarketTrends(trends);
        setMarketForecast(forecast);
        setChurnRisk(risk);
        setCalendarIntegration(integrations.find(i => i.id === 'int_google_calendar') || null);
      } catch (error) {
        console.error("Failed to load agent dashboard data", error);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  const renderTemplate = () => {
    const commonProps = {
      role: 'agent' as const,
      userName: 'Sarah Agent',
    };

    // AI & Analytics Widgets Section
    const widgets = (
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 mb-8">
        {/* Top Row: AI Insights & Smart Actions */}
        <div className="md:col-span-8">
          <AIInsightsWidget insights={insights} isLoading={loading} />
        </div>
        <div className="md:col-span-4">
          <SmartActionCenter role="agent" />
        </div>

        {/* Middle Row: Market Trends & Risk Heatmap */}
        <div className="md:col-span-8 grid grid-cols-1 sm:grid-cols-3 gap-4">
          {marketTrends.map((trend, index) => (
            <MarketTrendCard key={index} trend={trend} />
          ))}
        </div>
        <div className="md:col-span-4 h-[320px]">
           {churnRisk && <RiskHeatmap data={churnRisk} />}
        </div>

        {/* Bottom Row: Market Forecast & Comparison */}
        <div className="md:col-span-8 h-[400px]">
          <ForecastChart 
            data={marketForecast} 
            title="Market Value Forecast" 
            description="Projected property value trends for your top zip codes" 
          />
        </div>
        <div className="md:col-span-4 h-[400px]">
          <ComparisonChart />
        </div>

        {/* Collaboration & Automation Row */}
        <div className="md:col-span-4 h-[400px]">
          <ActivityStream />
        </div>
        <div className="md:col-span-4 h-[400px]">
          <LiveChatWidget />
        </div>
        <div className="md:col-span-4 space-y-6">
          <div className="h-[200px]">
            <QuickBot />
          </div>
          <div className="h-[180px]">
            {calendarIntegration && (
               <IntegrationCard 
                 integration={calendarIntegration} 
                 onUpdate={(updated) => setCalendarIntegration(updated)}
               />
             )}
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
          <h1 className="text-3xl font-bold tracking-tight">Agent Dashboard</h1>
          <p className="text-muted-foreground">
            Monitor your listings, leads, and market performance.
          </p>
        </div>
        <TemplateSelector
          currentTemplate={currentTemplate}
          onTemplateChange={setCurrentTemplate}
        />
      </div>

      {renderTemplate()}
    </div>
  );
};

export default AgentOverview;