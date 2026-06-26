import React from 'react';
import { TaxYearEndSummary } from '@/components/buyer/TaxYearEndSummary';
import { TaxDeductionCalculator } from '@/components/buyer/TaxDeductionCalculator';
import { TaxExpenseTracker } from '@/components/buyer/TaxExpenseTracker';
import { TaxPlanning } from '@/components/buyer/TaxPlanning';
import { StateTaxGuidance } from '@/components/buyer/StateTaxGuidance';
import { TaxChecklist } from '@/components/buyer/TaxChecklist';
import { TaxDocumentVault } from '@/components/buyer/TaxDocumentVault';
import { TaxDocumentOCR } from '@/components/buyer/TaxDocumentOCR';
import { TaxFormGenerator } from '@/components/buyer/TaxFormGenerator';
import { CPACollaboration } from '@/components/buyer/CPACollaboration';
import { TaxAuditProtection } from '@/components/buyer/TaxAuditProtection';
import { TaxIntegrations } from '@/components/buyer/TaxIntegrations';

export default function BuyerTaxes() {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold tracking-tight text-gray-900">Tax Center</h1>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <TaxYearEndSummary />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <TaxDeductionCalculator />
            <TaxExpenseTracker />
          </div>
          <TaxPlanning />
          <StateTaxGuidance />
        </div>
        <div className="space-y-6">
          <TaxChecklist />
          <TaxDocumentVault />
          <TaxDocumentOCR />
          <TaxFormGenerator />
          <CPACollaboration />
          <TaxAuditProtection />
          <TaxIntegrations />
        </div>
      </div>
    </div>
  );
}