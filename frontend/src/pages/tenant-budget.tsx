'use client';

import React from 'react';
import BudgetDashboard from '@/components/tenant/BudgetDashboard';

const TenantBudgetPage = () => {
  // In production, get tenant ID from authentication context
  const tenantId = 'tenant-123';

  return (
    <div className="min-h-screen bg-background">
      <BudgetDashboard tenantId={tenantId} />
    </div>
  );
};

export default TenantBudgetPage;