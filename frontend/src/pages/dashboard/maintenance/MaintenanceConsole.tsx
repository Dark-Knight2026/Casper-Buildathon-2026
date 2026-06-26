import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuLabel, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { 
  Wrench, 
  Plus, 
  MoreHorizontal, 
  Filter, 
  AlertCircle, 
  CheckCircle2, 
  Clock,
  Search
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';

// Mock Data Types
type Priority = 'High' | 'Medium' | 'Low';
type Status = 'Open' | 'In Progress' | 'Resolved';

interface MaintenanceRequest {
  id: string;
  title: string;
  property: string;
  unit?: string;
  priority: Priority;
  status: Status;
  date: Date;
  description: string;
  assignedTo?: string;
}

export const MaintenanceConsole: React.FC = () => {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState('');

  // Mock Data
  const [requests, setRequests] = useState<MaintenanceRequest[]>([
    {
      id: 'req-1',
      title: 'Leaking Faucet in Kitchen',
      property: '123 Main St',
      unit: '4B',
      priority: 'Low',
      status: 'Open',
      date: new Date(Date.now() - 86400000 * 1), // 1 day ago
      description: 'The kitchen faucet is dripping constantly.',
    },
    {
      id: 'req-2',
      title: 'HVAC Not Cooling',
      property: '456 Oak Ave',
      priority: 'High',
      status: 'In Progress',
      date: new Date(Date.now() - 86400000 * 2), // 2 days ago
      description: 'AC unit is blowing warm air. Temperature inside is 80 degrees.',
      assignedTo: 'CoolAir Services'
    },
    {
      id: 'req-3',
      title: 'Broken Window Latch',
      property: '789 Pine Ln',
      unit: '2A',
      priority: 'Medium',
      status: 'Open',
      date: new Date(Date.now() - 86400000 * 5), // 5 days ago
      description: 'Bedroom window latch is broken and window won\'t lock.',
    },
    {
      id: 'req-4',
      title: 'Clogged Bathtub Drain',
      property: '321 Elm St',
      unit: '101',
      priority: 'Medium',
      status: 'Resolved',
      date: new Date(Date.now() - 86400000 * 10), // 10 days ago
      description: 'Bathtub is draining very slowly.',
      assignedTo: 'Joe Plumber'
    },
    {
      id: 'req-5',
      title: 'Roof Leak',
      property: '123 Main St',
      priority: 'High',
      status: 'Resolved',
      date: new Date(Date.now() - 86400000 * 15), // 15 days ago
      description: 'Water spot appearing on ceiling in living room.',
      assignedTo: 'Top Roofers Inc.'
    }
  ]);

  const getPriorityColor = (priority: Priority) => {
    switch (priority) {
      case 'High': return 'bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-400';
      case 'Medium': return 'bg-yellow-100 text-yellow-700 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-400';
      case 'Low': return 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const getStatusIcon = (status: Status) => {
    switch (status) {
      case 'Open': return <AlertCircle className="h-4 w-4 text-orange-500" />;
      case 'In Progress': return <Clock className="h-4 w-4 text-blue-500" />;
      case 'Resolved': return <CheckCircle2 className="h-4 w-4 text-green-500" />;
    }
  };

  const handleNewRequest = () => {
    toast({
      title: "New Request",
      description: "Opening new maintenance request form...",
    });
  };

  const handleStatusChange = (id: string, newStatus: Status) => {
    setRequests(requests.map(req => 
      req.id === id ? { ...req, status: newStatus } : req
    ));
    toast({
      title: "Status Updated",
      description: `Request ${id} marked as ${newStatus}`,
    });
  };

  const filteredRequests = (statusFilter: string) => {
    return requests.filter(req => {
      const matchesStatus = statusFilter === 'all' || req.status.toLowerCase() === statusFilter.toLowerCase();
      const matchesSearch = 
        req.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        req.property.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesStatus && matchesSearch;
    });
  };

  const RequestTable = ({ data }: { data: MaintenanceRequest[] }) => (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Request</TableHead>
            <TableHead>Property</TableHead>
            <TableHead>Priority</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Date</TableHead>
            <TableHead>Assigned To</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.length === 0 ? (
            <TableRow>
              <TableCell colSpan={7} className="h-24 text-center">
                No maintenance requests found.
              </TableCell>
            </TableRow>
          ) : (
            data.map((req) => (
              <TableRow key={req.id}>
                <TableCell>
                  <div className="flex flex-col">
                    <span className="font-medium">{req.title}</span>
                    <span className="text-xs text-muted-foreground truncate max-w-[200px]">
                      {req.description}
                    </span>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex flex-col">
                    <span>{req.property}</span>
                    {req.unit && <span className="text-xs text-muted-foreground">Unit {req.unit}</span>}
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className={getPriorityColor(req.priority)}>
                    {req.priority}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    {getStatusIcon(req.status)}
                    <span>{req.status}</span>
                  </div>
                </TableCell>
                <TableCell>
                  {format(req.date, 'MMM d, yyyy')}
                </TableCell>
                <TableCell>
                  {req.assignedTo || <span className="text-muted-foreground italic">Unassigned</span>}
                </TableCell>
                <TableCell className="text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" className="h-8 w-8 p-0">
                        <span className="sr-only">Open menu</span>
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuLabel>Actions</DropdownMenuLabel>
                      <DropdownMenuItem onClick={() => handleStatusChange(req.id, 'In Progress')}>
                        Mark In Progress
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleStatusChange(req.id, 'Resolved')}>
                        Mark Resolved
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem>View Details</DropdownMenuItem>
                      <DropdownMenuItem>Assign Vendor</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Maintenance</h1>
          <p className="text-muted-foreground">
            Track and manage property maintenance requests and work orders.
          </p>
        </div>
        <Button onClick={handleNewRequest}>
          <Plus className="mr-2 h-4 w-4" />
          New Request
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Open Requests</CardTitle>
            <AlertCircle className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{requests.filter(r => r.status === 'Open').length}</div>
            <p className="text-xs text-muted-foreground">Requires attention</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">In Progress</CardTitle>
            <Clock className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{requests.filter(r => r.status === 'In Progress').length}</div>
            <p className="text-xs text-muted-foreground">Currently being worked on</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg. Resolution Time</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">2.4 Days</div>
            <p className="text-xs text-muted-foreground">-0.5 days from last month</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <CardTitle>Request Console</CardTitle>
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <div className="relative w-full sm:w-[300px]">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search requests..."
                  className="pl-8"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <Button variant="outline" size="icon">
                <Filter className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="all" className="space-y-4">
            <TabsList>
              <TabsTrigger value="all">All Requests</TabsTrigger>
              <TabsTrigger value="open">Open</TabsTrigger>
              <TabsTrigger value="in progress">In Progress</TabsTrigger>
              <TabsTrigger value="resolved">Resolved</TabsTrigger>
            </TabsList>
            
            <TabsContent value="all" className="space-y-4">
              <RequestTable data={filteredRequests('all')} />
            </TabsContent>
            <TabsContent value="open" className="space-y-4">
              <RequestTable data={filteredRequests('open')} />
            </TabsContent>
            <TabsContent value="in progress" className="space-y-4">
              <RequestTable data={filteredRequests('in progress')} />
            </TabsContent>
            <TabsContent value="resolved" className="space-y-4">
              <RequestTable data={filteredRequests('resolved')} />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};