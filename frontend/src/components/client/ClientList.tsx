import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { useClients } from '@/contexts/ClientContext';
import { useToast } from '@/hooks/use-toast';
import { Client } from '@/types/client';
import { 
  Search, 
  Filter, 
  Phone, 
  Mail, 
  Calendar, 
  User, 
  MapPin,
  DollarSign,
  Star,
  MoreVertical,
  Edit,
  Trash2,
  MessageSquare,
  Eye
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import AddClientModal from './AddClientModal';
import ClientProfileModal from './ClientProfileModal';

interface ClientListProps {
  showAddButton?: boolean;
  maxHeight?: string;
  compact?: boolean;
}

export default function ClientList({ showAddButton = true, maxHeight, compact = false }: ClientListProps) {
  const { filteredClients, filters, setFilters, updateClientStatus, deleteClient, isLoading } = useClients();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState(filters.searchTerm || '');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [selectedPriority, setSelectedPriority] = useState<string>('all');
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);

  const handleSearch = (value: string) => {
    setSearchTerm(value);
    setFilters({ ...filters, searchTerm: value || undefined });
  };

  const handleStatusFilter = (status: string) => {
    setSelectedStatus(status);
    setFilters({ 
      ...filters, 
      status: status === 'all' ? undefined : [status] 
    });
  };

  const handleTypeFilter = (type: string) => {
    setSelectedType(type);
    setFilters({ 
      ...filters, 
      type: type === 'all' ? undefined : [type] 
    });
  };

  const handlePriorityFilter = (priority: string) => {
    setSelectedPriority(priority);
    setFilters({ 
      ...filters, 
      priority: priority === 'all' ? undefined : [priority] 
    });
  };

  const handleViewProfile = (clientId: string) => {
    setSelectedClientId(clientId);
    setIsProfileModalOpen(true);
  };

  const getStatusColor = (status: Client['status']) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'inactive': return 'bg-gray-100 text-gray-800';
      case 'closed': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityColor = (priority: Client['priority']) => {
    switch (priority) {
      case 'urgent': return 'bg-red-100 text-red-800';
      case 'high': return 'bg-orange-100 text-orange-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'low': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getTypeIcon = (type: Client['type']) => {
    switch (type) {
      case 'buyer': return '🏠';
      case 'seller': return '💰';
      case 'renter': return '🔑';
      case 'investor': return '📊';
      default: return '👤';
    }
  };

  const formatBudget = (budget?: { min: number; max: number }) => {
    if (!budget) return 'Not specified';
    const min = budget.min ? `$${budget.min.toLocaleString()}` : 'No min';
    const max = budget.max ? `$${budget.max.toLocaleString()}` : 'No max';
    return `${min} - ${max}`;
  };

  const handleStatusChange = async (clientId: string, newStatus: Client['status']) => {
    try {
      await updateClientStatus(clientId, newStatus);
      toast({
        title: "Status Updated",
        description: "Client status has been updated successfully.",
      });
    } catch (error) {
      console.error('Failed to update client status:', error);
      toast({
        title: "Error",
        description: "Failed to update client status.",
        variant: "destructive",
      });
    }
  };

  const handleDeleteClient = async (clientId: string) => {
    if (window.confirm('Are you sure you want to delete this client?')) {
      try {
        await deleteClient(clientId);
        toast({
          title: "Client Deleted",
          description: "Client has been removed successfully.",
        });
      } catch (error) {
        console.error('Failed to delete client:', error);
        toast({
          title: "Error",
          description: "Failed to delete client.",
          variant: "destructive",
        });
      }
    }
  };

  return (
    <div className="space-y-4">
      {/* Header and Controls */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex items-center space-x-2">
          <h2 className="text-xl font-semibold">Clients</h2>
          <Badge variant="outline">{filteredClients.length}</Badge>
        </div>
        {showAddButton && <AddClientModal />}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search clients..."
            value={searchTerm}
            onChange={(e) => handleSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={selectedStatus} onValueChange={handleStatusFilter}>
          <SelectTrigger className="w-full sm:w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="inactive">Inactive</SelectItem>
            <SelectItem value="closed">Closed</SelectItem>
          </SelectContent>
        </Select>
        <Select value={selectedType} onValueChange={handleTypeFilter}>
          <SelectTrigger className="w-full sm:w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="buyer">Buyer</SelectItem>
            <SelectItem value="seller">Seller</SelectItem>
            <SelectItem value="renter">Renter</SelectItem>
            <SelectItem value="investor">Investor</SelectItem>
          </SelectContent>
        </Select>
        <Select value={selectedPriority} onValueChange={handlePriorityFilter}>
          <SelectTrigger className="w-full sm:w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Priority</SelectItem>
            <SelectItem value="urgent">Urgent</SelectItem>
            <SelectItem value="high">High</SelectItem>
            <SelectItem value="medium">Medium</SelectItem>
            <SelectItem value="low">Low</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Client List */}
      <div 
        className="space-y-3"
        style={{ maxHeight: maxHeight, overflowY: maxHeight ? 'auto' : 'visible' }}
      >
        {isLoading ? (
          // Loading Skeletons
          Array.from({ length: 3 }).map((_, index) => (
            <Card key={index} className="hover:shadow-md transition-shadow">
              <CardContent className={compact ? "p-4" : "p-6"}>
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-start space-x-3 w-full">
                    <Skeleton className="h-8 w-8 rounded-full" />
                    <div className="w-full space-y-2">
                      <Skeleton className="h-6 w-1/3" />
                      <div className="flex space-x-2">
                        <Skeleton className="h-5 w-16" />
                        <Skeleton className="h-5 w-16" />
                        <Skeleton className="h-5 w-16" />
                      </div>
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-full" />
                </div>
              </CardContent>
            </Card>
          ))
        ) : filteredClients.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <User className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No clients found</h3>
              <p className="text-gray-500 mb-4">
                {searchTerm || selectedStatus !== 'all' || selectedType !== 'all' || selectedPriority !== 'all'
                  ? 'Try adjusting your filters to see more results.'
                  : 'Get started by adding your first client.'}
              </p>
              {showAddButton && <AddClientModal />}
            </CardContent>
          </Card>
        ) : (
          filteredClients.map((client) => (
            <Card key={client.id} className="hover:shadow-md transition-shadow">
              <CardContent className={compact ? "p-4" : "p-6"}>
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-start space-x-3">
                    <div className="text-2xl">{getTypeIcon(client.type)}</div>
                    <div>
                      <h3 className="text-lg font-semibold">
                        {client.firstName} {client.lastName}
                      </h3>
                      <div className="flex items-center space-x-2 mt-1">
                        <Badge className={getStatusColor(client.status)}>
                          {client.status}
                        </Badge>
                        <Badge className={getPriorityColor(client.priority)}>
                          {client.priority}
                        </Badge>
                        <Badge variant="outline">
                          {client.type}
                        </Badge>
                        {client.leadScore && (
                          <Badge variant="secondary">
                            Score: {client.leadScore}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => handleViewProfile(client.id)}>
                        <Eye className="h-4 w-4 mr-2" />
                        View Profile
                      </DropdownMenuItem>
                      <DropdownMenuItem>
                        <Edit className="h-4 w-4 mr-2" />
                        Edit Client
                      </DropdownMenuItem>
                      <DropdownMenuItem>
                        <MessageSquare className="h-4 w-4 mr-2" />
                        Add Note
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        onClick={() => handleStatusChange(client.id, 'closed')}
                        disabled={client.status === 'closed'}
                      >
                        <Star className="h-4 w-4 mr-2" />
                        Mark as Closed
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        onClick={() => handleDeleteClient(client.id)}
                        className="text-red-600"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete Client
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
                  <div className="flex items-center space-x-2">
                    <Mail className="h-4 w-4 text-gray-400" />
                    <span className="truncate">{client.email}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Phone className="h-4 w-4 text-gray-400" />
                    <span>{client.phone}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Calendar className="h-4 w-4 text-gray-400" />
                    <span>Last: {new Date(client.lastContact).toLocaleDateString()}</span>
                  </div>
                  {client.preferences?.budget && (
                    <div className="flex items-center space-x-2">
                      <DollarSign className="h-4 w-4 text-gray-400" />
                      <span className="truncate">{formatBudget(client.preferences.budget)}</span>
                    </div>
                  )}
                </div>

                {client.preferences?.location && client.preferences.location.length > 0 && (
                  <div className="flex items-center space-x-2 mt-2 text-sm">
                    <MapPin className="h-4 w-4 text-gray-400" />
                    <div className="flex flex-wrap gap-1">
                      {client.preferences.location.slice(0, 3).map((location, index) => (
                        <Badge key={index} variant="outline" className="text-xs">
                          {location}
                        </Badge>
                      ))}
                      {client.preferences.location.length > 3 && (
                        <Badge variant="outline" className="text-xs">
                          +{client.preferences.location.length - 3} more
                        </Badge>
                      )}
                    </div>
                  </div>
                )}

                {client.tags && client.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {client.tags.slice(0, 4).map((tag, index) => (
                      <Badge key={index} variant="secondary" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                    {client.tags.length > 4 && (
                      <Badge variant="secondary" className="text-xs">
                        +{client.tags.length - 4} more
                      </Badge>
                    )}
                  </div>
                )}

                {!compact && (
                  <div className="flex space-x-2 mt-4">
                    <Button size="sm" variant="outline">
                      <Phone className="h-4 w-4 mr-1" />
                      Call
                    </Button>
                    <Button size="sm" variant="outline">
                      <Mail className="h-4 w-4 mr-1" />
                      Email
                    </Button>
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => handleViewProfile(client.id)}
                    >
                      <Eye className="h-4 w-4 mr-1" />
                      View Profile
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Client Profile Modal */}
      {selectedClientId && (
        <ClientProfileModal
          clientId={selectedClientId}
          open={isProfileModalOpen}
          onOpenChange={(open) => {
            setIsProfileModalOpen(open);
            if (!open) {
              setSelectedClientId(null);
            }
          }}
        />
      )}
    </div>
  );
}