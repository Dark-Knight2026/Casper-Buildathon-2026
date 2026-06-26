import DealHealthDashboard from '@/components/broker/DealHealthDashboard';

export default function BrokerDealHealth() {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold tracking-tight text-gray-900">Deal Health</h1>
      <DealHealthDashboard />
    </div>
  );
}