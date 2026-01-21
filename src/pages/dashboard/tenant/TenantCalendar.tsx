import CalendarIntegration from '@/components/CalendarIntegration';

export default function TenantCalendar() {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold tracking-tight text-gray-900">Calendar</h1>
      <CalendarIntegration userRole="tenant" />
    </div>
  );
}