/**
 * Maintenance Request List Page
 * Displays all maintenance requests for a tenant
 */

import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, Calendar, Wrench } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import type { MaintenanceRequest, RequestStatus, Priority } from '@/services/maintenanceService';

const STATUS_COLORS: Record<RequestStatus, string> = {
  submitted:   'bg-blue-100 text-blue-800',
  assigned:    'bg-yellow-100 text-yellow-800',
  in_progress: 'bg-orange-100 text-orange-800',
  completed:   'bg-green-100 text-green-800',
  closed:      'bg-secondary text-secondary-foreground',
};

const PRIORITY_COLORS: Record<Priority, string> = {
  low:       'bg-secondary text-secondary-foreground',
  medium:    'bg-blue-100 text-blue-800',
  high:      'bg-orange-100 text-orange-800',
  emergency: 'bg-red-100 text-red-800',
};

// TODO: remove when GET /api/v1/maintenance?tenantId=me is ready
const MOCK_REQUESTS: MaintenanceRequest[] = [
  {
    id: 'mr-001',
    propertyId: 'mock-prop-1',
    tenantId: 'mock-tenant-1',
    landlordId: 'mock-landlord-1',
    vendorId: null,
    title: 'Leaking kitchen faucet',
    description: 'The kitchen faucet has been dripping constantly for the past week.',
    issueType: 'plumbing',
    priority: 'medium',
    status: 'in_progress',
    preferredAccessTime: new Date('2026-04-10T10:00:00'),
    permissionToEnter: true,
    estimatedCost: 120,
    actualCost: null,
    completedAt: null,
    rating: null,
    review: null,
    photos: [],
    createdAt: new Date('2026-04-01'),
    updatedAt: new Date('2026-04-03'),
    property: { title: '123 Demo Street', address: '123 Demo Street', city: 'New York', state: 'NY' },
  },
  {
    id: 'mr-002',
    propertyId: 'mock-prop-1',
    tenantId: 'mock-tenant-1',
    landlordId: 'mock-landlord-1',
    vendorId: null,
    title: 'Broken bedroom window latch',
    description: 'The latch on the north-facing bedroom window is broken and won\'t lock.',
    issueType: 'structural',
    priority: 'high',
    status: 'submitted',
    preferredAccessTime: null,
    permissionToEnter: true,
    estimatedCost: null,
    actualCost: null,
    completedAt: null,
    rating: null,
    review: null,
    photos: [],
    createdAt: new Date('2026-04-05'),
    updatedAt: new Date('2026-04-05'),
    property: { title: '123 Demo Street', address: '123 Demo Street', city: 'New York', state: 'NY' },
  },
  {
    id: 'mr-003',
    propertyId: 'mock-prop-1',
    tenantId: 'mock-tenant-1',
    landlordId: 'mock-landlord-1',
    vendorId: 'vendor-1',
    title: 'AC not cooling properly',
    description: 'Air conditioner runs but the apartment does not cool below 80°F.',
    issueType: 'hvac',
    priority: 'high',
    status: 'assigned',
    preferredAccessTime: new Date('2026-04-08T14:00:00'),
    permissionToEnter: true,
    estimatedCost: 250,
    actualCost: null,
    completedAt: null,
    rating: null,
    review: null,
    photos: [],
    createdAt: new Date('2026-03-28'),
    updatedAt: new Date('2026-04-02'),
    property: { title: '123 Demo Street', address: '123 Demo Street', city: 'New York', state: 'NY' },
  },
  {
    id: 'mr-004',
    propertyId: 'mock-prop-1',
    tenantId: 'mock-tenant-1',
    landlordId: 'mock-landlord-1',
    vendorId: 'vendor-2',
    title: 'Replace bathroom light fixture',
    description: 'Overhead light in the main bathroom stopped working.',
    issueType: 'electrical',
    priority: 'low',
    status: 'completed',
    preferredAccessTime: null,
    permissionToEnter: true,
    estimatedCost: 80,
    actualCost: 75,
    completedAt: new Date('2026-03-15'),
    rating: 5,
    review: 'Quick fix, very professional.',
    photos: [],
    createdAt: new Date('2026-03-10'),
    updatedAt: new Date('2026-03-15'),
    property: { title: '123 Demo Street', address: '123 Demo Street', city: 'New York', state: 'NY' },
  },
];

const formatDate = (date: Date) =>
  new Intl.DateTimeFormat('en-US', { year: 'numeric', month: 'short', day: 'numeric' }).format(new Date(date));

const getStatusLabel = (status: RequestStatus) =>
  status.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());

const getPriorityLabel = (priority: Priority) =>
  priority.charAt(0).toUpperCase() + priority.slice(1);

export default function MaintenanceRequestList() {
  const navigate = useNavigate();

  // TODO: replace with GET /api/v1/maintenance?tenantId=me when backend is ready
  const requests = MOCK_REQUESTS;

  const [search, setSearch]               = useState('');
  const [statusFilter, setStatusFilter]   = useState<RequestStatus | 'all'>('all');
  const [priorityFilter, setPriorityFilter] = useState<Priority | 'all'>('all');

  const filteredRequests = useMemo(() => {
    return requests.filter(r => {
      const statusOk   = statusFilter   === 'all' || r.status   === statusFilter;
      const priorityOk = priorityFilter === 'all' || r.priority === priorityFilter;
      const searchOk   = !search || r.title.toLowerCase().includes(search.toLowerCase())
                                 || r.description.toLowerCase().includes(search.toLowerCase());
      return statusOk && priorityOk && searchOk;
    });
  }, [requests, search, statusFilter, priorityFilter]);

  return (
    <div className="container mx-auto py-8 px-4">
      {/* Header */}
      <div className="flex justify-between items-start gap-3 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Maintenance Requests</h1>
          <p className="text-muted-foreground mt-1">Track and manage your maintenance requests</p>
        </div>
        <Button
          onClick={() => navigate('/tenant/maintenance/create')}
          size="icon"
          className="sm:size-auto sm:px-4"
          aria-label="New Request"
        >
          <Plus className="h-4 w-4 sm:mr-2" />
          <span className="hidden sm:inline">New Request</span>
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total</CardDescription>
            <CardTitle className="text-3xl text-foreground">{requests.length}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Pending</CardDescription>
            <CardTitle className="text-3xl text-foreground">
              {requests.filter(r => r.status === 'submitted' || r.status === 'assigned').length}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>In Progress</CardDescription>
            <CardTitle className="text-3xl text-foreground">
              {requests.filter(r => r.status === 'in_progress').length}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Completed</CardDescription>
            <CardTitle className="text-3xl text-foreground">
              {requests.filter(r => r.status === 'completed' || r.status === 'closed').length}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search requests..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>

        <Select value={statusFilter} onValueChange={v => setStatusFilter(v as RequestStatus | 'all')}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder="All Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="submitted">Submitted</SelectItem>
            <SelectItem value="assigned">Assigned</SelectItem>
            <SelectItem value="in_progress">In Progress</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="closed">Closed</SelectItem>
          </SelectContent>
        </Select>

        <Select value={priorityFilter} onValueChange={v => setPriorityFilter(v as Priority | 'all')}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder="All Priority" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Priority</SelectItem>
            <SelectItem value="low">Low</SelectItem>
            <SelectItem value="medium">Medium</SelectItem>
            <SelectItem value="high">High</SelectItem>
            <SelectItem value="emergency">Emergency</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table / Empty */}
      {filteredRequests.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <Wrench className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-2">No requests found</h3>
            <p className="text-sm text-muted-foreground mb-4">
              {search || statusFilter !== 'all' || priorityFilter !== 'all'
                ? 'Try adjusting your filters'
                : 'Submit your first maintenance request'}
            </p>
            {!search && statusFilter === 'all' && priorityFilter === 'all' && (
              <Button onClick={() => navigate('/tenant/maintenance/create')}>
                <Plus className="mr-2 h-4 w-4" />
                New Request
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>Title</TableHead>
                <TableHead>Property</TableHead>
                <TableHead>Priority</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Created</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredRequests.map(request => (
                <TableRow
                  key={request.id}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => navigate(`/tenant/maintenance/${request.id}`, { state: { request } })}
                >
                  <TableCell className="font-mono text-sm text-muted-foreground">
                    #{request.id.slice(-4)}
                  </TableCell>
                  <TableCell>
                    <p className="font-medium text-foreground">{request.title}</p>
                    <p className="text-sm text-muted-foreground capitalize">
                      {request.issueType.replace('_', ' ')}
                    </p>
                  </TableCell>
                  <TableCell>
                    <p className="text-sm text-foreground">{request.property?.title}</p>
                    <p className="text-xs text-muted-foreground">{request.property?.city}, {request.property?.state}</p>
                  </TableCell>
                  <TableCell>
                    <Badge className={PRIORITY_COLORS[request.priority]}>
                      {getPriorityLabel(request.priority)}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge className={STATUS_COLORS[request.status]}>
                      {getStatusLabel(request.status)}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Calendar className="h-3 w-3 shrink-0" />
                      {formatDate(request.createdAt)}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={e => {
                        e.stopPropagation();
                        navigate(`/tenant/maintenance/${request.id}`, { state: { request } });
                      }}
                    >
                      View
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}
    </div>
  );
}
