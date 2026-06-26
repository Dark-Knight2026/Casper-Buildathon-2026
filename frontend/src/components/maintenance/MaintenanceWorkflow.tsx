import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Wrench,
  Clock,
  CheckCircle,
  AlertCircle,
  User,
  DollarSign,
  MessageSquare,
  Image as ImageIcon,
  Calendar,
  TrendingUp
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface MaintenanceRequest {
  id: string;
  propertyId: string;
  propertyAddress: string;
  tenantName: string;
  title: string;
  description: string;
  category: 'plumbing' | 'electrical' | 'hvac' | 'appliance' | 'structural' | 'other';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'new' | 'assigned' | 'in-progress' | 'completed' | 'cancelled';
  assignedVendor?: string;
  estimatedCost?: number;
  actualCost?: number;
  createdDate: Date;
  assignedDate?: Date;
  completedDate?: Date;
  photos: string[];
  messages: MaintenanceMessage[];
}

interface MaintenanceMessage {
  id: string;
  senderId: string;
  senderName: string;
  senderRole: 'tenant' | 'landlord' | 'vendor';
  message: string;
  timestamp: Date;
  read: boolean;
}

interface MaintenanceWorkflowProps {
  requests: MaintenanceRequest[];
  onUpdateRequest: (requestId: string, updates: Partial<MaintenanceRequest>) => void;
  onAddMessage: (requestId: string, message: string) => void;
}

const PRIORITY_CONFIG = {
  low: { color: 'bg-gray-100 text-gray-800', icon: Clock },
  medium: { color: 'bg-blue-100 text-blue-800', icon: Clock },
  high: { color: 'bg-orange-100 text-orange-800', icon: AlertCircle },
  urgent: { color: 'bg-red-100 text-red-800', icon: AlertCircle }
};

const STATUS_CONFIG = {
  new: { color: 'bg-purple-100 text-purple-800', label: 'New' },
  assigned: { color: 'bg-blue-100 text-blue-800', label: 'Assigned' },
  'in-progress': { color: 'bg-yellow-100 text-yellow-800', label: 'In Progress' },
  completed: { color: 'bg-green-100 text-green-800', label: 'Completed' },
  cancelled: { color: 'bg-gray-100 text-gray-800', label: 'Cancelled' }
};

const CATEGORY_OPTIONS = [
  { value: 'plumbing', label: 'Plumbing' },
  { value: 'electrical', label: 'Electrical' },
  { value: 'hvac', label: 'HVAC' },
  { value: 'appliance', label: 'Appliance' },
  { value: 'structural', label: 'Structural' },
  { value: 'other', label: 'Other' }
];

export default function MaintenanceWorkflow({
  requests,
  onUpdateRequest,
  onAddMessage
}: MaintenanceWorkflowProps) {
  const { toast } = useToast();
  const [selectedRequest, setSelectedRequest] = useState<MaintenanceRequest | null>(null);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  const [newMessage, setNewMessage] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterPriority, setFilterPriority] = useState<string>('all');

  const filteredRequests = requests.filter(request => {
    if (filterStatus !== 'all' && request.status !== filterStatus) return false;
    if (filterPriority !== 'all' && request.priority !== filterPriority) return false;
    return true;
  });

  const handleStatusChange = (requestId: string, newStatus: MaintenanceRequest['status']) => {
    onUpdateRequest(requestId, { 
      status: newStatus,
      ...(newStatus === 'assigned' && { assignedDate: new Date() }),
      ...(newStatus === 'completed' && { completedDate: new Date() })
    });
    toast({
      title: 'Status Updated',
      description: `Request status changed to ${STATUS_CONFIG[newStatus].label}`
    });
  };

  const handleAssignVendor = (requestId: string, vendor: string) => {
    onUpdateRequest(requestId, { 
      assignedVendor: vendor,
      status: 'assigned',
      assignedDate: new Date()
    });
    toast({
      title: 'Vendor Assigned',
      description: `Request assigned to ${vendor}`
    });
  };

  const handleUpdateCost = (requestId: string, type: 'estimated' | 'actual', cost: number) => {
    onUpdateRequest(requestId, {
      [type === 'estimated' ? 'estimatedCost' : 'actualCost']: cost
    });
    toast({
      title: 'Cost Updated',
      description: `${type === 'estimated' ? 'Estimated' : 'Actual'} cost updated to $${cost.toLocaleString()}`
    });
  };

  const handleSendMessage = () => {
    if (selectedRequest && newMessage.trim()) {
      onAddMessage(selectedRequest.id, newMessage);
      setNewMessage('');
      toast({
        title: 'Message Sent',
        description: 'Your message has been sent'
      });
    }
  };

  const handleViewDetails = (request: MaintenanceRequest) => {
    setSelectedRequest(request);
    setShowDetailsDialog(true);
  };

  const getRequestStats = () => {
    return {
      total: requests.length,
      new: requests.filter(r => r.status === 'new').length,
      inProgress: requests.filter(r => r.status === 'in-progress' || r.status === 'assigned').length,
      completed: requests.filter(r => r.status === 'completed').length,
      urgent: requests.filter(r => r.priority === 'urgent').length
    };
  };

  const stats = getRequestStats();

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total</p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>
              <Wrench className="h-8 w-8 text-gray-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">New</p>
                <p className="text-2xl font-bold text-purple-600">{stats.new}</p>
              </div>
              <AlertCircle className="h-8 w-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">In Progress</p>
                <p className="text-2xl font-bold text-blue-600">{stats.inProgress}</p>
              </div>
              <Clock className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Completed</p>
                <p className="text-2xl font-bold text-green-600">{stats.completed}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Urgent</p>
                <p className="text-2xl font-bold text-red-600">{stats.urgent}</p>
              </div>
              <AlertCircle className="h-8 w-8 text-red-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex gap-4">
            <div className="flex-1">
              <Label>Status</Label>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="new">New</SelectItem>
                  <SelectItem value="assigned">Assigned</SelectItem>
                  <SelectItem value="in-progress">In Progress</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex-1">
              <Label>Priority</Label>
              <Select value={filterPriority} onValueChange={setFilterPriority}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Priorities</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Requests List */}
      <div className="space-y-4">
        {filteredRequests.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <Wrench className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No Maintenance Requests</h3>
              <p className="text-gray-600">
                {filterStatus !== 'all' || filterPriority !== 'all'
                  ? 'No requests match your filters'
                  : 'No maintenance requests at the moment'}
              </p>
            </CardContent>
          </Card>
        ) : (
          filteredRequests.map(request => {
            const PriorityIcon = PRIORITY_CONFIG[request.priority].icon;
            
            return (
              <Card key={request.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <PriorityIcon className="h-5 w-5 text-gray-600" />
                        <h3 className="font-semibold text-lg">{request.title}</h3>
                        <Badge className={PRIORITY_CONFIG[request.priority].color}>
                          {request.priority}
                        </Badge>
                        <Badge className={STATUS_CONFIG[request.status].color}>
                          {STATUS_CONFIG[request.status].label}
                        </Badge>
                      </div>

                      <p className="text-sm text-gray-600 mb-3">{request.description}</p>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <span className="text-gray-500">Property:</span>
                          <p className="font-medium">{request.propertyAddress}</p>
                        </div>
                        <div>
                          <span className="text-gray-500">Tenant:</span>
                          <p className="font-medium">{request.tenantName}</p>
                        </div>
                        <div>
                          <span className="text-gray-500">Category:</span>
                          <p className="font-medium capitalize">{request.category}</p>
                        </div>
                        <div>
                          <span className="text-gray-500">Created:</span>
                          <p className="font-medium">{request.createdDate.toLocaleDateString()}</p>
                        </div>
                      </div>

                      {request.assignedVendor && (
                        <div className="mt-3 flex items-center gap-2 text-sm">
                          <User className="h-4 w-4 text-blue-600" />
                          <span className="text-gray-600">Assigned to:</span>
                          <span className="font-medium">{request.assignedVendor}</span>
                        </div>
                      )}

                      {(request.estimatedCost || request.actualCost) && (
                        <div className="mt-2 flex items-center gap-4 text-sm">
                          {request.estimatedCost && (
                            <div className="flex items-center gap-1">
                              <DollarSign className="h-4 w-4 text-gray-600" />
                              <span className="text-gray-600">Est:</span>
                              <span className="font-medium">${request.estimatedCost.toLocaleString()}</span>
                            </div>
                          )}
                          {request.actualCost && (
                            <div className="flex items-center gap-1">
                              <DollarSign className="h-4 w-4 text-green-600" />
                              <span className="text-gray-600">Actual:</span>
                              <span className="font-medium text-green-600">${request.actualCost.toLocaleString()}</span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="flex flex-col gap-2 ml-4">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleViewDetails(request)}
                      >
                        View Details
                      </Button>

                      {request.status === 'new' && (
                        <Button
                          size="sm"
                          onClick={() => handleStatusChange(request.id, 'assigned')}
                          className="bg-blue-600 hover:bg-blue-700"
                        >
                          Assign
                        </Button>
                      )}

                      {request.status === 'assigned' && (
                        <Button
                          size="sm"
                          onClick={() => handleStatusChange(request.id, 'in-progress')}
                          className="bg-yellow-600 hover:bg-yellow-700"
                        >
                          Start Work
                        </Button>
                      )}

                      {request.status === 'in-progress' && (
                        <Button
                          size="sm"
                          onClick={() => handleStatusChange(request.id, 'completed')}
                          className="bg-green-600 hover:bg-green-700"
                        >
                          Complete
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      {/* Request Details Dialog */}
      <Dialog open={showDetailsDialog} onOpenChange={setShowDetailsDialog}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedRequest?.title}</DialogTitle>
            <DialogDescription>
              Maintenance request details and communication
            </DialogDescription>
          </DialogHeader>

          {selectedRequest && (
            <div className="space-y-6">
              {/* Request Info */}
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <Label>Status</Label>
                  <Select
                    value={selectedRequest.status}
                    onValueChange={(value) => handleStatusChange(selectedRequest.id, value as MaintenanceRequest['status'])}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="new">New</SelectItem>
                      <SelectItem value="assigned">Assigned</SelectItem>
                      <SelectItem value="in-progress">In Progress</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                      <SelectItem value="cancelled">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Priority</Label>
                  <Select
                    value={selectedRequest.priority}
                    onValueChange={(value) => onUpdateRequest(selectedRequest.id, { priority: value as MaintenanceRequest['priority'] })}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="urgent">Urgent</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Assign Vendor</Label>
                  <Input
                    placeholder="Vendor name"
                    value={selectedRequest.assignedVendor || ''}
                    onChange={(e) => handleAssignVendor(selectedRequest.id, e.target.value)}
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label>Category</Label>
                  <Select
                    value={selectedRequest.category}
                    onValueChange={(value) => onUpdateRequest(selectedRequest.id, { category: value as MaintenanceRequest['category'] })}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CATEGORY_OPTIONS.map(option => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Estimated Cost</Label>
                  <div className="relative mt-1">
                    <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      type="number"
                      placeholder="0"
                      value={selectedRequest.estimatedCost || ''}
                      onChange={(e) => handleUpdateCost(selectedRequest.id, 'estimated', parseFloat(e.target.value) || 0)}
                      className="pl-9"
                    />
                  </div>
                </div>

                <div>
                  <Label>Actual Cost</Label>
                  <div className="relative mt-1">
                    <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      type="number"
                      placeholder="0"
                      value={selectedRequest.actualCost || ''}
                      onChange={(e) => handleUpdateCost(selectedRequest.id, 'actual', parseFloat(e.target.value) || 0)}
                      className="pl-9"
                    />
                  </div>
                </div>
              </div>

              {/* Photos */}
              {selectedRequest.photos.length > 0 && (
                <div>
                  <Label>Photos</Label>
                  <div className="grid grid-cols-3 gap-2 mt-2">
                    {selectedRequest.photos.map((photo, index) => (
                      <div key={index} className="aspect-square bg-gray-100 rounded-lg flex items-center justify-center">
                        <ImageIcon className="h-8 w-8 text-gray-400" />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Messages */}
              <div>
                <Label>Communication Thread</Label>
                <div className="mt-2 space-y-3 max-h-60 overflow-y-auto border rounded-lg p-3">
                  {selectedRequest.messages.length === 0 ? (
                    <p className="text-sm text-gray-500 text-center py-4">No messages yet</p>
                  ) : (
                    selectedRequest.messages.map(msg => (
                      <div key={msg.id} className="flex gap-3">
                        <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                          <User className="h-4 w-4 text-blue-600" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium text-sm">{msg.senderName}</span>
                            <Badge variant="outline" className="text-xs">
                              {msg.senderRole}
                            </Badge>
                            <span className="text-xs text-gray-500">
                              {msg.timestamp.toLocaleString()}
                            </span>
                          </div>
                          <p className="text-sm text-gray-700">{msg.message}</p>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                <div className="mt-3 flex gap-2">
                  <Textarea
                    placeholder="Type your message..."
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    rows={2}
                    className="flex-1"
                  />
                  <Button onClick={handleSendMessage} disabled={!newMessage.trim()}>
                    <MessageSquare className="h-4 w-4 mr-2" />
                    Send
                  </Button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}