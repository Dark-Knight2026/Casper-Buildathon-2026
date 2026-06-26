import React, { useEffect, useState } from 'react';
import { TaxSummaryCard } from '@/components/tax/shared/TaxSummaryCard';
import { TaxCalendar } from '@/components/tax/shared/TaxCalendar';
import { TaxDeductionTracker } from '@/components/tax/shared/TaxDeductionTracker';
import { TaxDocumentManager } from '@/components/tax/shared/TaxDocumentManager';
import { ExpenseBreakdownChart } from '@/components/tax/charts/ExpenseBreakdownChart';
import { NetIncomeTrendChart } from '@/components/tax/charts/NetIncomeTrendChart';
import { taxService, TaxSummary, TaxDeduction, TaxDocument, TaxCalendarEvent } from '@/services/taxService';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export const AgentTaxView = () => {
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<TaxSummary | null>(null);
  const [deductions, setDeductions] = useState<TaxDeduction[]>([]);
  const [documents, setDocuments] = useState<TaxDocument[]>([]);
  const [events, setEvents] = useState<TaxCalendarEvent[]>([]);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        // Using getSellerTaxSummary as a proxy for Agent for now, or we can add specific agent method
        const [sum, deds, docs, evts] = await Promise.all([
          taxService.getSellerTaxSummary('agent_123'),
          taxService.getTaxDeductions('agent_123'),
          taxService.getTaxDocuments('agent_123'),
          taxService.getTaxCalendar(2025)
        ]);
        setSummary(sum);
        setDeductions(deds);
        setDocuments(docs);
        setEvents(evts);
      } catch (error) {
        console.error('Failed to load agent tax data', error);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  return (
    <div className="space-y-6">
      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="deductions">Expenses & Deductions</TabsTrigger>
          <TabsTrigger value="documents">Documents</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <TaxSummaryCard summary={summary} isLoading={loading} role="Agent" />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <NetIncomeTrendChart />
                <ExpenseBreakdownChart />
              </div>
            </div>
            <div className="space-y-6">
              <TaxCalendar events={events} isLoading={loading} />
            </div>
          </div>
        </TabsContent>

        <TabsContent value="deductions">
          <TaxDeductionTracker 
            deductions={deductions} 
            isLoading={loading} 
            role="Agent"
            onAddDeduction={async (deduction) => {
              await taxService.addTaxDeduction(deduction);
              // Refresh logic would go here
            }}
          />
        </TabsContent>

        <TabsContent value="documents">
          <TaxDocumentManager 
            documents={documents} 
            isLoading={loading}
            onUpload={async (file, category, year) => {
              await taxService.uploadTaxDocument(file, category, year);
              // Refresh logic would go here
            }}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
};