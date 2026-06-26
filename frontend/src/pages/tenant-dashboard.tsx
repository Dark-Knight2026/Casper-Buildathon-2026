'use client';

import React from 'react';
import TenantDashboard from '@/components/tenant/TenantDashboard';

const TenantDashboardPage = () => {
  // In production, get tenant ID from authentication context
  const tenantId = 'tenant-123';

  return <TenantDashboard tenantId={tenantId} />;
};

export default TenantDashboardPage;