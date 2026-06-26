import { AgentLeaseWidget } from '@/components/dashboard/agent/AgentLeaseWidget';

export default function AgentLeases() {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold tracking-tight text-gray-900">Lease Management</h1>
      <AgentLeaseWidget />
    </div>
  );
}