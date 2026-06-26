import { useEffect, useState, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { supabase } from '@/lib/supabase/client';
import { Wrench, AlertCircle, Clock, CheckCircle, XCircle, Search, DollarSign } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';

interface MaintenanceRequest {
  id: string;
  category: string;
  priority: string;
  status: string;
  description: string;
  photos: string[];
  assigned_to: string | null;
  estimated_cost: number | null;
  actual_cost: number | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  properties: {
    id: string;
    address: string;
    city: string;
    state: string;
  };
  tenants: {
    full_name: string;
    email: string;
    phone: string;
  };
}

interface MaintenanceUpdateData {
  status: string;
  actual_cost?: number;
}

export default function LandlordMaintenance() {
  const [searchParams] = useSearchParams();
  const [requests, setRequests] = useState<MaintenanceRequest[]>([]);
  const [filteredRequests, setFilteredRequests] = useState<MaintenanceRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState(searchParams.get('filter') || 'all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [selectedRequest, setSelectedRequest] = useState<MaintenanceRequest | null>(null);
  const [assignTo, setAssignTo] = useState('');
  const [estimatedCost, setEstimatedCost] = useState('');
  const [notes, setNotes] = useState('');

  const fetchRequests = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('maintenance_requests')
        .select(`
          *,
          properties!inner (
            landlord_id,
            id,
            address,
            city,
            state
          ),
          tenants (
            full_name,
            email,
            phone
          )
        `)
        .eq('properties.landlord_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setRequests(data || []);
      setFilteredRequests(data || []);
    } catch (error) {
      console.error('Error fetching maintenance requests:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  useEffect(() => {
    let filtered = requests;

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(
        (request) =>
          request.properties.address.toLowerCase().includes(searchTerm.toLowerCase()) ||
          request.tenants.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          request.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
          request.description.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter((request) => request.status === statusFilter);
    }

    // Priority filter
    if (priorityFilter !== 'all') {
      filtered = filtered.filter((request) => request.priority === priorityFilter);
    }

    setFilteredRequests(filtered);
  }, [searchTerm, statusFilter, priorityFilter, requests]);

  const handleAssignRequest = async () => {
    if (!selectedRequest) return;

    try {
      const { error } = await supabase
        .from('maintenance_requests')
        .update({
          status: 'in-progress',
          assigned_to: assignTo,
          estimated_cost: estimatedCost ? parseFloat(estimatedCost) : null,
          notes: notes,
        })
        .eq('id', selectedRequest.id);

      if (error) throw error;

      await fetchRequests();
      setSelectedRequest(null);
      setAssignTo('');
      setEstimatedCost('');
      setNotes('');
    } catch (error) {
      console.error('Error assigning request:', error);
    }
  };

  const handleUpdateStatus = async (requestId: string, newStatus: string, actualCost?: number) => {
    try {
      const updates: MaintenanceUpdateData = { status: newStatus };
      if (actualCost !== undefined) {
        updates.actual_cost = actualCost;
      }

      const { error } = await supabase
        .from('maintenance_requests')
        .update(updates)
        .eq('id', requestId);

      if (error) throw error;

      await fetchRequests();
    } catch (error) {
      console.error('Error updating status:', error);
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return 'destructive';
      case 'high':
        return 'default';
      case 'medium':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Clock className="h-4 w-4" />;
      case 'in-progress':
        return <Wrench className="h-4 w-4" />;
      case 'completed':
        return <CheckCircle className="h-4 w-4" />;
      case 'cancelled':
        return <XCircle className="h-4 w-4" />;
      default:
        return <AlertCircle className="h-4 w-4" />;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-lg">Loading maintenance requests...</div>
      </div>
    );
  }

  const pendingRequests = requests.filter((r) => r.status === 'pending');
  const urgentRequests = requests.filter((r) => r.priority === 'urgent' && r.status !== 'completed');

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Maintenance Requests</h1>
          <p className="text-muted-foreground">Manage property maintenance and repairs</p>
        </div>
      </div>

      {/* Urgent Requests Alert */}
      {urgentRequests.length > 0 && (
        <Card className="border-red-200 bg-red-50">
          <CardHeader>
            <div className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-red-600" />
              <CardTitle className="text-red-900">Urgent Requests</CardTitle>
            </div>
            <CardDescription className="text-red-700">
              {urgentRequests.length} urgent request{urgentRequests.length > 1 ? 's' : ''} requiring immediate attention
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {urgentRequests.slice(0, 3).map((request) => (
                <div key={request.id} className="flex items-center justify-between p-3 bg-white rounded-lg">
                  <div>
                    <p className="font-medium">{request.category}</p>
                    <p className="text-sm text-muted-foreground">
                      {request.properties.address} - {request.tenants.full_name}
                    </p>
                  </div>
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setSelectedRequest(request)}
                      >
                        Assign
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Assign Maintenance Request</DialogTitle>
                        <DialogDescription>
                          Assign this request to a vendor and provide cost estimate
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div>
                          <Label htmlFor="assignTo">Assign To</Label>
                          <Input
                            id="assignTo"
                            placeholder="Vendor name or company"
                            value={assignTo}
                            onChange={(e) => setAssignTo(e.target.value)}
                          />
                        </div>
                        <div>
                          <Label htmlFor="estimatedCost">Estimated Cost ($)</Label>
                          <Input
                            id="estimatedCost"
                            type="number"
                            placeholder="0.00"
                            value={estimatedCost}
                            onChange={(e) => setEstimatedCost(e.target.value)}
                          />
                        </div>
                        <div>
                          <Label htmlFor="notes">Notes</Label>
                          <Textarea
                            id="notes"
                            placeholder="Additional notes or instructions..."
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                          />
                        </div>
                        <Button onClick={handleAssignRequest} className="w-full">
                          Assign Request
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Requests</CardTitle>
            <Wrench className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{requests.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
            <Clock className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {pendingRequests.length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">In Progress</CardTitle>
            <Wrench className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {requests.filter((r) => r.status === 'in-progress').length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Costs</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${requests.reduce((sum, r) => sum + (r.actual_cost || 0), 0).toLocaleString()}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filter Requests</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by property, tenant, or category..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="in-progress">In Progress</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
            <Select value={priorityFilter} onValueChange={setPriorityFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Filter by priority" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Priorities</SelectItem>
                <SelectItem value="urgent">Urgent</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="low">Low</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Requests List */}
      {filteredRequests.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center">
            <Wrench className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No maintenance requests found</h3>
            <p className="text-muted-foreground">
              {requests.length === 0
                ? "Maintenance requests will appear here"
                : "Try adjusting your filters"}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredRequests.map((request) => (
            <Card key={request.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <CardTitle className="flex items-center gap-2">
                      {getStatusIcon(request.status)}
                      {request.category}
                    </CardTitle>
                    <CardDescription>
                      {request.properties.address}, {request.properties.city}, {request.properties.state}
                    </CardDescription>
                    <p className="text-sm text-muted-foreground">
                      Reported by: {request.tenants.full_name} ({request.tenants.phone})
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Badge variant={getPriorityColor(request.priority)}>
                      {request.priority}
                    </Badge>
                    <Badge variant={
                      request.status === 'completed' ? 'default' :
                      request.status === 'in-progress' ? 'secondary' :
                      'outline'
                    }>
                      {request.status}
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-sm font-medium mb-1">Description:</p>
                  <p className="text-sm text-muted-foreground">{request.description}</p>
                </div>
                {request.photos && request.photos.length > 0 && (
                  <div>
                    <p className="text-sm font-medium mb-2">Photos:</p>
                    <div className="flex gap-2 flex-wrap">
                      {request.photos.map((photo, index) => (
                        <img
                          key={index}
                          src={photo}
                          alt={`Maintenance ${index + 1}`}
                          className="w-24 h-24 object-cover rounded-lg"
                        />
                      ))}
                    </div>
                  </div>
                )}
                {request.assigned_to && (
                  <div className="grid gap-2 md:grid-cols-3 text-sm">
                    <div>
                      <p className="text-muted-foreground">Assigned To:</p>
                      <p className="font-medium">{request.assigned_to}</p>
                    </div>
                    {request.estimated_cost && (
                      <div>
                        <p className="text-muted-foreground">Estimated Cost:</p>
                        <p className="font-medium">${request.estimated_cost.toLocaleString()}</p>
                      </div>
                    )}
                    {request.actual_cost && (
                      <div>
                        <p className="text-muted-foreground">Actual Cost:</p>
                        <p className="font-medium">${request.actual_cost.toLocaleString()}</p>
                      </div>
                    )}
                  </div>
                )}
                {request.notes && (
                  <div>
                    <p className="text-sm font-medium mb-1">Notes:</p>
                    <p className="text-sm text-muted-foreground">{request.notes}</p>
                  </div>
                )}
                <div className="flex gap-2">
                  {request.status === 'pending' && (
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSelectedRequest(request)}
                        >
                          Assign
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Assign Maintenance Request</DialogTitle>
                          <DialogDescription>
                            Assign this request to a vendor and provide cost estimate
                          </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4">
                          <div>
                            <Label htmlFor="assignTo">Assign To</Label>
                            <Input
                              id="assignTo"
                              placeholder="Vendor name or company"
                              value={assignTo}
                              onChange={(e) => setAssignTo(e.target.value)}
                            />
                          </div>
                          <div>
                            <Label htmlFor="estimatedCost">Estimated Cost ($)</Label>
                            <Input
                              id="estimatedCost"
                              type="number"
                              placeholder="0.00"
                              value={estimatedCost}
                              onChange={(e) => setEstimatedCost(e.target.value)}
                            />
                          </div>
                          <div>
                            <Label htmlFor="notes">Notes</Label>
                            <Textarea
                              id="notes"
                              placeholder="Additional notes or instructions..."
                              value={notes}
                              onChange={(e) => setNotes(e.target.value)}
                            />
                          </div>
                          <Button onClick={handleAssignRequest} className="w-full">
                            Assign Request
                          </Button>
                        </div>
                      </DialogContent>
                    </Dialog>
                  )}
                  {request.status === 'in-progress' && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const cost = prompt('Enter actual cost:');
                        if (cost) {
                          handleUpdateStatus(request.id, 'completed', parseFloat(cost));
                        }
                      }}
                    >
                      Mark Complete
                    </Button>
                  )}
                  <Button variant="outline" size="sm">
                    Contact Tenant
                  </Button>
                  {request.status !== 'completed' && request.status !== 'cancelled' && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleUpdateStatus(request.id, 'cancelled')}
                    >
                      Cancel
                    </Button>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  Created: {new Date(request.created_at).toLocaleString()}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}