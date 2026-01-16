/**
 * Enhanced Maintenance Workflow Component
 * Advanced maintenance tracking with real-time updates and vendor management
 */

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  Wrench,
  Clock,
  CheckCircle,
  AlertCircle,
  DollarSign,
  Calendar,
  MapPin,
  User,
  MessageSquare,
  Image as ImageIcon,
  Upload,
  Star,
  TrendingUp,
  Filter,
  Search,
  Send,
  Phone,
  Mail,
  FileText,
  BarChart3
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface MaintenanceRequest {
  id: string;
  propertyId: string;
  propertyAddress: string;
  tenantName: string;
  tenantPhone: string;
  tenantEmail: string;
  title: string;
  description: string;
  category: 'plumbing' | 'electrical' | 'hvac' | 'appliance' | 'structural' | 'landscaping' | 'pest_control' | 'other';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'new' | 'assigned' | 'in-progress' | 'on-hold' | 'completed' | 'cancelled';
  assignedVendor?: Vendor;
  estimatedCost?: number;
  actualCost?: number;
  createdDate: Date;
  assignedDate?: Date;
  startedDate?: Date;
  completedDate?: Date;
  dueDate?: Date;
  photos: Photo[];
  messages: Message[];
  timeline: TimelineEvent[];
  satisfactionRating?: number;
  completionProgress: number;
}

interface Vendor {
  id: string;
  name: string;
  company: string;
  phone: string;
  email: string;
  specialty: string[];
  rating: number;
  completedJobs: number;
  avgResponseTime: string;
  avgCost: number;
}

interface Photo {
  id: string;
  url: string;
  uploadedBy: 'tenant' | 'landlord' | 'vendor';
  uploadedDate: Date;
  caption?: string;
  type: 'before' | 'during' | 'after';
}

interface Message {
  id: string;
  senderId: string;
  senderName: string;
  senderRole: 'tenant' | 'landlord' | 'vendor';
  message: string;
  timestamp: Date;
  read: boolean;
  attachments?: string[];
}

interface TimelineEvent {
  id: string;
  date: Date;
  event: string;
  description: string;
  user: string;
  type: 'status_change' | 'assignment' | 'message' | 'cost_update' | 'completion';
}

interface MaintenanceWorkflowEnhancedProps {
  requests: MaintenanceRequest[];
  vendors: Vendor[];
  onUpdateRequest: (requestId: string, updates: Partial<MaintenanceRequest>) => void;
  onAssignVendor: (requestId: string, vendorId: string) => void;
  onSendMessage: (requestId: string, message: string) => void;
  onUploadPhoto: (requestId: string, photo: File, type: Photo['type']) => void;
  onCompleteRequest: (requestId: string, rating: number) => void;
}

export default function MaintenanceWorkflowEnhanced({
  requests,
  vendors,
  onUpdateRequest,
  onAssignVendor,
  onSendMessage,
  onUploadPhoto,
  onCompleteRequest
}: MaintenanceWorkflowEnhancedProps) {
  const { toast } = useToast();
  const [selectedRequest, setSelectedRequest] = useState<MaintenanceRequest | null>(null);
  const [showRequestDialog, setShowRequestDialog] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [newMessage, setNewMessage] = useState('');
  const [satisfactionRating, setSatisfactionRating] = useState(0);

  // Filter requests
  const filteredRequests = requests.filter(request => {
    const matchesSearch = 
      request.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      request.propertyAddress.toLowerCase().includes(searchQuery.toLowerCase()) ||
      request.tenantName.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || request.status === statusFilter;
    const matchesPriority = priorityFilter === 'all' || request.priority === priorityFilter;
    const matchesCategory = categoryFilter === 'all' || request.category === categoryFilter;
    
    return matchesSearch && matchesStatus && matchesPriority && matchesCategory;
  });

  // Calculate statistics
  const stats = {
    total: requests.length,
    new: requests.filter(r => r.status === 'new').length,
    inProgress: requests.filter(r => r.status === 'in-progress').length,
    completed: requests.filter(r => r.status === 'completed').length,
    urgent: requests.filter(r => r.priority === 'urgent').length,
    avgCompletionTime: '3.5 days',
    totalCost: requests.reduce((sum, r) => sum + (r.actualCost || 0), 0),
    avgSatisfaction: requests
      .filter(r => r.satisfactionRating)
      .reduce((sum, r) => sum + (r.satisfactionRating || 0), 0) / 
      requests.filter(r => r.satisfactionRating).length || 0
  };

  const handleViewRequest = (request: MaintenanceRequest) => {
    setSelectedRequest(request);
    setShowRequestDialog(true);
  };

  const handleSendMessage = () => {
    if (!selectedRequest || !newMessage.trim()) return;

    onSendMessage(selectedRequest.id, newMessage);
    toast({
      title: 'Message Sent',
      description: 'Your message has been sent successfully'
    });
    setNewMessage('');
  };

  const handleCompleteRequest = () => {
    if (!selectedRequest || satisfactionRating === 0) {
      toast({
        title: 'Rating Required',
        description: 'Please provide a satisfaction rating',
        variant: 'destructive'
      });
      return;
    }

    onCompleteRequest(selectedRequest.id, satisfactionRating);
    toast({
      title: 'Request Completed',
      description: 'Maintenance request has been marked as completed'
    });
    setShowRequestDialog(false);
    setSatisfactionRating(0);
  };

  const getStatusBadge = (status: MaintenanceRequest['status']) => {
    const config = {
      'new': { variant: 'secondary' as const, color: 'text-purple-600' },
      'assigned': { variant: 'secondary' as const, color: 'text-blue-600' },
      'in-progress': { variant: 'default' as const, color: 'text-blue-600' },
      'on-hold': { variant: 'secondary' as const, color: 'text-orange-600' },
      'completed': { variant: 'default' as const, color: 'text-green-600' },
      'cancelled': { variant: 'destructive' as const, color: 'text-red-600' }
    };
    const { variant, color } = config[status];
    return <Badge variant={variant} className={color}>{status.replace('-', ' ')}</Badge>;
  };

  const getPriorityBadge = (priority: MaintenanceRequest['priority']) => {
    const config = {
      low: { variant: 'outline' as const, color: 'text-gray-600' },
      medium: { variant: 'secondary' as const, color: 'text-blue-600' },
      high: { variant: 'secondary' as const, color: 'text-orange-600' },
      urgent: { variant: 'destructive' as const, color: 'text-red-600' }
    };
    const { variant, color } = config[priority];
    return <Badge variant={variant} className={color}>{priority}</Badge>;
  };

  const getCategoryIcon = (category: MaintenanceRequest['category']) => {
    const icons = {
      plumbing: Wrench,
      electrical: Wrench,
      hvac: Wrench,
      appliance: Wrench,
      structural: Wrench,
      landscaping: Wrench,
      pest_control: Wrench,
      other: Wrench
    };
    const Icon = icons[category];
    return <Icon className="h-4 w-4" />;
  };

  return (
    <div className="space-y-6">
      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Total Requests</p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>
              <Wrench className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">In Progress</p>
                <p className="text-2xl font-bold text-blue-600">{stats.inProgress}</p>
              </div>
              <Clock className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Urgent</p>
                <p className="text-2xl font-bold text-red-600">{stats.urgent}</p>
              </div>
              <AlertCircle className="h-8 w-8 text-red-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Avg Satisfaction</p>
                <p className="text-2xl font-bold text-yellow-600">{stats.avgSatisfaction.toFixed(1)}</p>
              </div>
              <Star className="h-8 w-8 text-yellow-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Maintenance Requests</CardTitle>
          <CardDescription>Search and filter maintenance requests</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search by title, property, or tenant..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="new">New</SelectItem>
                  <SelectItem value="assigned">Assigned</SelectItem>
                  <SelectItem value="in-progress">In Progress</SelectItem>
                  <SelectItem value="on-hold">On Hold</SelectItem>
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
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                </SelectContent>
              </Select>

              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Filter by category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  <SelectItem value="plumbing">Plumbing</SelectItem>
                  <SelectItem value="electrical">Electrical</SelectItem>
                  <SelectItem value="hvac">HVAC</SelectItem>
                  <SelectItem value="appliance">Appliance</SelectItem>
                  <SelectItem value="structural">Structural</SelectItem>
                  <SelectItem value="landscaping">Landscaping</SelectItem>
                  <SelectItem value="pest_control">Pest Control</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Requests Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredRequests.map((request) => (
          <Card key={request.id} className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                    {getCategoryIcon(request.category)}
                  </div>
                  <div>
                    <CardTitle className="text-base">{request.title}</CardTitle>
                    <p className="text-sm text-gray-500">{request.category.replace('_', ' ')}</p>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-2">
                {getStatusBadge(request.status)}
                {getPriorityBadge(request.priority)}
              </div>

              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2 text-gray-600">
                  <MapPin className="h-4 w-4" />
                  <span className="truncate">{request.propertyAddress}</span>
                </div>
                <div className="flex items-center gap-2 text-gray-600">
                  <User className="h-4 w-4" />
                  <span>{request.tenantName}</span>
                </div>
                <div className="flex items-center gap-2 text-gray-600">
                  <Calendar className="h-4 w-4" />
                  <span>{request.createdDate.toLocaleDateString()}</span>
                </div>
                {request.assignedVendor && (
                  <div className="flex items-center gap-2 text-gray-600">
                    <Wrench className="h-4 w-4" />
                    <span>{request.assignedVendor.name}</span>
                  </div>
                )}
              </div>

              {request.status === 'in-progress' && (
                <div className="pt-2">
                  <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
                    <span>Progress</span>
                    <span>{request.completionProgress}%</span>
                  </div>
                  <Progress value={request.completionProgress} />
                </div>
              )}

              <div className="flex items-center justify-between pt-2 border-t">
                <div className="text-sm">
                  {request.estimatedCost && (
                    <span className="text-gray-500">
                      Est: ${request.estimatedCost.toLocaleString()}
                    </span>
                  )}
                </div>
                {request.messages.filter(m => !m.read).length > 0 && (
                  <Badge variant="secondary">
                    {request.messages.filter(m => !m.read).length} new
                  </Badge>
                )}
              </div>

              <Button
                onClick={() => handleViewRequest(request)}
                className="w-full"
                variant="outline"
              >
                View Details
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Request Details Dialog */}
      <Dialog open={showRequestDialog} onOpenChange={setShowRequestDialog}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedRequest?.title}</DialogTitle>
            <DialogDescription>
              {selectedRequest?.propertyAddress}
            </DialogDescription>
          </DialogHeader>

          {selectedRequest && (
            <Tabs defaultValue="overview" className="w-full">
              <TabsList className="grid w-full grid-cols-5">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="vendor">Vendor</TabsTrigger>
                <TabsTrigger value="photos">Photos</TabsTrigger>
                <TabsTrigger value="messages">Messages</TabsTrigger>
                <TabsTrigger value="timeline">Timeline</TabsTrigger>
              </TabsList>

              {/* Overview Tab */}
              <TabsContent value="overview" className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Request Details</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div>
                        <Label className="text-sm text-gray-500">Status</Label>
                        <div className="mt-1">
                          <Select
                            value={selectedRequest.status}
                            onValueChange={(value) => 
                              onUpdateRequest(selectedRequest.id, { status: value as MaintenanceRequest['status'] })
                            }
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="new">New</SelectItem>
                              <SelectItem value="assigned">Assigned</SelectItem>
                              <SelectItem value="in-progress">In Progress</SelectItem>
                              <SelectItem value="on-hold">On Hold</SelectItem>
                              <SelectItem value="completed">Completed</SelectItem>
                              <SelectItem value="cancelled">Cancelled</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div>
                        <Label className="text-sm text-gray-500">Priority</Label>
                        <div className="mt-1">
                          <Select
                            value={selectedRequest.priority}
                            onValueChange={(value) => 
                              onUpdateRequest(selectedRequest.id, { priority: value as MaintenanceRequest['priority'] })
                            }
                          >
                            <SelectTrigger>
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
                      </div>
                      <div>
                        <Label className="text-sm text-gray-500">Category</Label>
                        <p className="font-medium capitalize">{selectedRequest.category.replace('_', ' ')}</p>
                      </div>
                      <div>
                        <Label className="text-sm text-gray-500">Description</Label>
                        <p className="text-sm">{selectedRequest.description}</p>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Cost Information</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div>
                        <Label>Estimated Cost</Label>
                        <Input
                          type="number"
                          placeholder="0.00"
                          value={selectedRequest.estimatedCost || ''}
                          onChange={(e) => 
                            onUpdateRequest(selectedRequest.id, { estimatedCost: parseFloat(e.target.value) })
                          }
                        />
                      </div>
                      <div>
                        <Label>Actual Cost</Label>
                        <Input
                          type="number"
                          placeholder="0.00"
                          value={selectedRequest.actualCost || ''}
                          onChange={(e) => 
                            onUpdateRequest(selectedRequest.id, { actualCost: parseFloat(e.target.value) })
                          }
                        />
                      </div>
                      {selectedRequest.estimatedCost && selectedRequest.actualCost && (
                        <div className="pt-2 border-t">
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-gray-500">Variance:</span>
                            <span className={`font-medium ${
                              selectedRequest.actualCost > selectedRequest.estimatedCost 
                                ? 'text-red-600' 
                                : 'text-green-600'
                            }`}>
                              {selectedRequest.actualCost > selectedRequest.estimatedCost ? '+' : ''}
                              ${(selectedRequest.actualCost - selectedRequest.estimatedCost).toLocaleString()}
                            </span>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Tenant Information</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-gray-500" />
                      <span className="font-medium">{selectedRequest.tenantName}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4 text-gray-500" />
                      <span className="text-sm">{selectedRequest.tenantPhone}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4 text-gray-500" />
                      <span className="text-sm">{selectedRequest.tenantEmail}</span>
                    </div>
                  </CardContent>
                </Card>

                {selectedRequest.status === 'completed' && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Completion & Rating</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div>
                        <Label>Satisfaction Rating</Label>
                        <div className="flex items-center gap-2 mt-2">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <Star
                              key={star}
                              className={`h-8 w-8 cursor-pointer ${
                                star <= (selectedRequest.satisfactionRating || satisfactionRating)
                                  ? 'text-yellow-500 fill-yellow-500'
                                  : 'text-gray-300'
                              }`}
                              onClick={() => setSatisfactionRating(star)}
                            />
                          ))}
                        </div>
                      </div>
                      {selectedRequest.completedDate && (
                        <div>
                          <Label className="text-sm text-gray-500">Completed Date</Label>
                          <p className="font-medium">{selectedRequest.completedDate.toLocaleDateString()}</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              {/* Vendor Tab */}
              <TabsContent value="vendor" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Assign Vendor</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Select
                      value={selectedRequest.assignedVendor?.id || ''}
                      onValueChange={(value) => onAssignVendor(selectedRequest.id, value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select a vendor" />
                      </SelectTrigger>
                      <SelectContent>
                        {vendors.map((vendor) => (
                          <SelectItem key={vendor.id} value={vendor.id}>
                            {vendor.name} - {vendor.company}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </CardContent>
                </Card>

                {selectedRequest.assignedVendor && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Vendor Details</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex items-center gap-3">
                        <Avatar>
                          <AvatarFallback>{selectedRequest.assignedVendor.name[0]}</AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium">{selectedRequest.assignedVendor.name}</p>
                          <p className="text-sm text-gray-500">{selectedRequest.assignedVendor.company}</p>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4 pt-3 border-t">
                        <div>
                          <Label className="text-sm text-gray-500">Rating</Label>
                          <div className="flex items-center gap-1 mt-1">
                            {[...Array(5)].map((_, i) => (
                              <Star
                                key={i}
                                className={`h-4 w-4 ${
                                  i < selectedRequest.assignedVendor!.rating
                                    ? 'text-yellow-500 fill-yellow-500'
                                    : 'text-gray-300'
                                }`}
                              />
                            ))}
                          </div>
                        </div>
                        <div>
                          <Label className="text-sm text-gray-500">Completed Jobs</Label>
                          <p className="font-medium">{selectedRequest.assignedVendor.completedJobs}</p>
                        </div>
                        <div>
                          <Label className="text-sm text-gray-500">Avg Response Time</Label>
                          <p className="font-medium">{selectedRequest.assignedVendor.avgResponseTime}</p>
                        </div>
                        <div>
                          <Label className="text-sm text-gray-500">Avg Cost</Label>
                          <p className="font-medium">${selectedRequest.assignedVendor.avgCost.toLocaleString()}</p>
                        </div>
                      </div>
                      <div className="pt-3 border-t">
                        <Label className="text-sm text-gray-500">Contact</Label>
                        <div className="space-y-2 mt-2">
                          <div className="flex items-center gap-2 text-sm">
                            <Phone className="h-4 w-4 text-gray-500" />
                            <span>{selectedRequest.assignedVendor.phone}</span>
                          </div>
                          <div className="flex items-center gap-2 text-sm">
                            <Mail className="h-4 w-4 text-gray-500" />
                            <span>{selectedRequest.assignedVendor.email}</span>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              {/* Photos Tab */}
              <TabsContent value="photos" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Upload Photo</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="border-2 border-dashed rounded-lg p-8 text-center">
                      <Upload className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                      <p className="text-sm text-gray-600 mb-2">Click to upload or drag and drop</p>
                      <p className="text-xs text-gray-400">JPG, PNG (max 10MB)</p>
                      <Button variant="outline" className="mt-4">
                        Choose File
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Photos ({selectedRequest.photos.length})</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-3 gap-4">
                      {selectedRequest.photos.map((photo) => (
                        <div key={photo.id} className="relative group">
                          <div className="aspect-square bg-gray-100 rounded-lg overflow-hidden">
                            <ImageIcon className="h-full w-full p-8 text-gray-400" />
                          </div>
                          <Badge className="absolute top-2 right-2">{photo.type}</Badge>
                          {photo.caption && (
                            <p className="text-xs text-gray-500 mt-1">{photo.caption}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Messages Tab */}
              <TabsContent value="messages" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Send Message</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <Textarea
                      placeholder="Type your message..."
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      rows={4}
                    />
                    <Button onClick={handleSendMessage} className="w-full">
                      <Send className="h-4 w-4 mr-2" />
                      Send Message
                    </Button>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Message History</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ScrollArea className="h-[400px]">
                      <div className="space-y-4">
                        {selectedRequest.messages.map((message) => (
                          <div
                            key={message.id}
                            className={`p-3 rounded-lg ${
                              message.senderRole === 'landlord'
                                ? 'bg-blue-50 ml-8'
                                : message.senderRole === 'tenant'
                                ? 'bg-gray-50 mr-8'
                                : 'bg-green-50'
                            }`}
                          >
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-2">
                                <Avatar className="h-6 w-6">
                                  <AvatarFallback className="text-xs">
                                    {message.senderName[0]}
                                  </AvatarFallback>
                                </Avatar>
                                <span className="font-medium text-sm">{message.senderName}</span>
                                <Badge variant="outline" className="text-xs">
                                  {message.senderRole}
                                </Badge>
                              </div>
                              <span className="text-xs text-gray-500">
                                {message.timestamp.toLocaleString()}
                              </span>
                            </div>
                            <p className="text-sm">{message.message}</p>
                            {!message.read && message.senderRole !== 'landlord' && (
                              <Badge variant="secondary" className="mt-2">Unread</Badge>
                            )}
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Timeline Tab */}
              <TabsContent value="timeline" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Activity Timeline</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ScrollArea className="h-[500px]">
                      <div className="space-y-4">
                        {selectedRequest.timeline.map((event, index) => (
                          <div key={event.id} className="flex gap-4">
                            <div className="flex flex-col items-center">
                              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                                {event.type === 'status_change' && <Clock className="h-4 w-4 text-blue-600" />}
                                {event.type === 'assignment' && <User className="h-4 w-4 text-blue-600" />}
                                {event.type === 'message' && <MessageSquare className="h-4 w-4 text-blue-600" />}
                                {event.type === 'cost_update' && <DollarSign className="h-4 w-4 text-blue-600" />}
                                {event.type === 'completion' && <CheckCircle className="h-4 w-4 text-green-600" />}
                              </div>
                              {index < selectedRequest.timeline.length - 1 && (
                                <div className="w-0.5 h-full bg-gray-200 mt-2"></div>
                              )}
                            </div>
                            <div className="flex-1 pb-4">
                              <p className="font-medium">{event.event}</p>
                              <p className="text-sm text-gray-600">{event.description}</p>
                              <div className="flex items-center gap-2 mt-1">
                                <span className="text-xs text-gray-400">{event.user}</span>
                                <span className="text-xs text-gray-400">•</span>
                                <span className="text-xs text-gray-400">
                                  {event.date.toLocaleString()}
                                </span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}