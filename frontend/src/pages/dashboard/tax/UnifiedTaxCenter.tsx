import React, { useState } from 'react';
import { TaxPageHeader } from '@/components/tax/shared/TaxPageHeader';
import { AgentTaxView } from './views/AgentTaxView';
import { LandlordTaxView } from './views/LandlordTaxView';
import { TenantTaxView } from './views/TenantTaxView';
import { BuyerTaxView } from './views/BuyerTaxView';

export const UnifiedTaxCenter = () => {
  const [currentRole, setCurrentRole] = useState<string>('landlord');

  const renderView = () => {
    switch (currentRole) {
      case 'agent':
        return <AgentTaxView />;
      case 'landlord':
        return <LandlordTaxView />;
      case 'tenant':
        return <TenantTaxView />;
      case 'buyer':
        return <BuyerTaxView />;
      default:
        return <LandlordTaxView />;
    }
  };

  return (
    <div className="container mx-auto py-8 px-4 space-y-8">
      <TaxPageHeader 
        title="Tax Center"
        description="Manage your tax obligations, deductions, and documents in one place."
        currentRole={currentRole}
        onRoleChange={setCurrentRole}
      />
      
      <div className="min-h-[600px]">
        {renderView()}
      </div>
    </div>
  );
};