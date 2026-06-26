import { TaxDocumentVault } from '@/components/buyer/TaxDocumentVault';
import { TaxExpenseTracker } from '@/components/buyer/TaxExpenseTracker';
import { TaxDeductionCalculator } from '@/components/buyer/TaxDeductionCalculator';
import { TaxYearEndSummary } from '@/components/buyer/TaxYearEndSummary';
import { TaxChecklist } from '@/components/buyer/TaxChecklist';
import { TaxPlanning } from '@/components/buyer/TaxPlanning';
import { TaxDocumentOCR } from '@/components/buyer/TaxDocumentOCR';
import { CPACollaboration } from '@/components/buyer/CPACollaboration';
import { TaxAuditProtection } from '@/components/buyer/TaxAuditProtection';
import { StateTaxGuidance } from '@/components/buyer/StateTaxGuidance';

export default function AgentTaxes() {
  return (
    <div className="space-y-6" data-tour="tax-center">
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
          <CPACollaboration />
          <TaxAuditProtection />
        </div>
      </div>
    </div>
  );
}