import AgentBenchmarkDashboard from '@/components/broker/AgentBenchmarkDashboard';

export default function BrokerBenchmarks() {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold tracking-tight text-gray-900">Agent Benchmarks</h1>
      <AgentBenchmarkDashboard />
    </div>
  );
}