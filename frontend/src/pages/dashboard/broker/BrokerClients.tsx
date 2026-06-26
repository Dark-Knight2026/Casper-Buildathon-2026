import ClientList from '@/components/client/ClientList';

export default function BrokerClients() {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold tracking-tight text-gray-900">Client Management</h1>
      <ClientList showAddButton={true} />
    </div>
  );
}