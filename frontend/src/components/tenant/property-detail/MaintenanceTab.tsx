import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, Plus, Search, Wrench } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import type { Property } from '@/types/property';
import type { MockMaintenanceRequest, MaintenanceStatus, MaintenancePriority } from '@/data/tenantLeases';
import { buildMaintenanceRequest } from '@/data/leaseDetailMapper';
import {
  formatDateLong,
  MAINTENANCE_PRIORITY_BADGE,
  MAINTENANCE_STATUS_BADGE,
} from './shared';

interface MaintenanceTabProps {
  requests: MockMaintenanceRequest[];
  property: Property;
}

export function MaintenanceTab({ requests, property }: MaintenanceTabProps) {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<MaintenanceStatus | 'all'>('all');
  const [priorityFilter, setPriorityFilter] = useState<MaintenancePriority | 'all'>('all');

  const filtered = useMemo(
    () =>
      requests.filter((r) => {
        const statusOk = statusFilter === 'all' || r.status === statusFilter;
        const priorityOk = priorityFilter === 'all' || r.priority === priorityFilter;
        const searchOk =
          !search ||
          r.title.toLowerCase().includes(search.toLowerCase()) ||
          r.description.toLowerCase().includes(search.toLowerCase());
        return statusOk && priorityOk && searchOk;
      }),
    [requests, search, statusFilter, priorityFilter],
  );

  const total = requests.length;
  const open = requests.filter((r) => r.status === 'open').length;
  const inProgress = requests.filter((r) => r.status === 'in_progress').length;
  const resolved = requests.filter((r) => r.status === 'resolved').length;

  const goToDetail = (req: MockMaintenanceRequest) =>
    navigate(`/tenant/maintenance/${req.id}`, {
      state: { request: buildMaintenanceRequest(req, property) },
    });

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center gap-4 flex-wrap">
        <div>
          <h2 className="text-xl font-semibold">Maintenance Requests</h2>
          <p className="text-sm text-muted-foreground">
            Track and manage requests for this property
          </p>
        </div>
        <Button onClick={() => navigate('/tenant/maintenance/create', { state: { propertyId: property.id } })}>
          <Plus className="mr-2 h-4 w-4" />
          New Request
        </Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total</CardDescription>
            <CardTitle className="text-3xl">{total}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Open</CardDescription>
            <CardTitle className="text-3xl">{open}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>In Progress</CardDescription>
            <CardTitle className="text-3xl">{inProgress}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Resolved</CardDescription>
            <CardTitle className="text-3xl">{resolved}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search requests..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select
          value={statusFilter}
          onValueChange={(v) => setStatusFilter(v as MaintenanceStatus | 'all')}
        >
          <SelectTrigger className="w-44">
            <SelectValue placeholder="All Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="open">Open</SelectItem>
            <SelectItem value="in_progress">In Progress</SelectItem>
            <SelectItem value="resolved">Resolved</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
          </SelectContent>
        </Select>
        <Select
          value={priorityFilter}
          onValueChange={(v) => setPriorityFilter(v as MaintenancePriority | 'all')}
        >
          <SelectTrigger className="w-44">
            <SelectValue placeholder="All Priority" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Priority</SelectItem>
            <SelectItem value="low">Low</SelectItem>
            <SelectItem value="medium">Medium</SelectItem>
            <SelectItem value="high">High</SelectItem>
            <SelectItem value="urgent">Urgent</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {filtered.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <Wrench className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No requests found</h3>
            <p className="text-sm text-muted-foreground mb-4">
              {search || statusFilter !== 'all' || priorityFilter !== 'all'
                ? 'Try adjusting your filters'
                : 'Submit your first maintenance request'}
            </p>
            {!search && statusFilter === 'all' && priorityFilter === 'all' && (
              <Button onClick={() => navigate('/tenant/maintenance/create', { state: { propertyId: property.id } })}>
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
                <TableHead>Priority</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Created</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((req) => (
                <TableRow
                  key={req.id}
                  role="button"
                  tabIndex={0}
                  className="cursor-pointer hover:bg-muted/50 focus-visible:bg-muted/50 focus-visible:outline-none"
                  onClick={() => goToDetail(req)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      goToDetail(req);
                    }
                  }}
                  aria-label={`Open maintenance request: ${req.title}`}
                >
                  <TableCell className="font-mono text-sm text-muted-foreground">
                    #{req.id.slice(-4)}
                  </TableCell>
                  <TableCell>
                    <p className="font-medium">{req.title}</p>
                    <p className="text-sm text-muted-foreground line-clamp-1">{req.description}</p>
                  </TableCell>
                  <TableCell>
                    <Badge className={MAINTENANCE_PRIORITY_BADGE[req.priority]}>
                      {req.priority.toUpperCase()}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge className={MAINTENANCE_STATUS_BADGE[req.status]}>
                      {req.status.replace('_', ' ').toUpperCase()}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Calendar className="h-3 w-3 shrink-0" />
                      {formatDateLong(req.createdAt)}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        goToDetail(req);
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
