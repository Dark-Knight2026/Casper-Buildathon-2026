import React from 'react';
import { LeaseWidget } from '@/components/dashboard/landlord/LeaseWidget';

const TestLeaseWidgetPage: React.FC = () => {
  return (
    <div className="p-10 bg-gray-100 min-h-screen">
      <h1 className="text-2xl font-bold mb-6">Lease Widget Test Page</h1>
      <div className="max-w-4xl mx-auto">
        <LeaseWidget />
      </div>
    </div>
  );
};

export default TestLeaseWidgetPage;