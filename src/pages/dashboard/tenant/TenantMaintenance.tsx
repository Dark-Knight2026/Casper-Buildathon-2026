import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Wrench } from 'lucide-react';
import { useTenantDashboard } from '@/hooks/useTenantDashboard';
import { useNavigate } from 'react-router-dom';

export default function TenantMaintenance() {
  const navigate = useNavigate();
  const { maintenanceRequests } = useTenantDashboard();

  const getMaintenanceStatusColor = (status: string) => {
    switch (status) {
      case 'Completed': return 'bg-green-100 text-green-800';
      case 'In Progress': return 'bg-blue-100 text-blue-800';
      case 'Submitted': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'High': return 'bg-red-100 text-red-800';
      case 'Medium': return 'bg-yellow-100 text-yellow-800';
      case 'Low': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const handleNewMaintenanceRequest = () => {
    navigate('/maintenance-marketplace');
  };

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold tracking-tight text-gray-900">Maintenance</h1>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Maintenance Requests</CardTitle>
            <Button onClick={handleNewMaintenanceRequest} aria-label="Submit new maintenance request">
              <Wrench className="h-4 w-4 mr-2" />
              New Request
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {maintenanceRequests.map((request) => (
              <Card key={request.id}>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="text-lg font-semibold">{request.issue}</h3>
                      <p className="text-muted-foreground">{request.description}</p>
                    </div>
                    <div className="text-right">
                      <Badge className={getMaintenanceStatusColor(request.status)}>
                        {request.status}
                      </Badge>
                      <Badge className={getPriorityColor(request.priority)} variant="outline">
                        {request.priority}
                      </Badge>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Date Submitted</p>
                      <p className="font-medium">{request.dateSubmitted}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Assigned To</p>
                      <p className="font-medium">{request.assignedTo}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">
                        {request.status === 'Completed' ? 'Completed Date' : 'Est. Completion'}
                      </p>
                      <p className="font-medium">
                        {request.completedDate || request.estimatedCompletion}
                      </p>
                    </div>
                  </div>
                  <div className="flex space-x-2 mt-4">
                    <Button size="sm" variant="outline" aria-label="View maintenance request details">
                      View Details
                    </Button>
                    {request.status !== 'Completed' && (
                      <Button size="sm" variant="outline" aria-label="Update maintenance request">
                        Update Request
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}