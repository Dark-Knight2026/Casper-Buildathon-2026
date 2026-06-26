import TransactionPipelineBoard from '@/components/agent/TransactionPipelineBoard';

export default function AgentPipeline() {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold tracking-tight text-gray-900">Transaction Pipeline</h1>
      <TransactionPipelineBoard />
    </div>
  );
}