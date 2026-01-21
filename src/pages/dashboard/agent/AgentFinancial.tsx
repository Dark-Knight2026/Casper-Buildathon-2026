import FinancialDashboard from '@/components/agent/FinancialDashboard';

export default function AgentFinancial() {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold tracking-tight text-gray-900">Financial Overview</h1>
      <FinancialDashboard />
    </div>
  );
}