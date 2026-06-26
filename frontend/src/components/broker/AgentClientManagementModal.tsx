import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Agent } from '@/types/agent';
import { useAgent } from '@/contexts/AgentContext';
import { useClients } from '@/contexts/ClientContext';
import { useToast } from '@/hooks/use-toast';
import { 
  Users, 
  Search, 
  Plus, 
  Minus, 
  Mail, 
  Phone, 
  MapPin,
  Calendar,
  User,
  Filter,
  ArrowRight,
  Check,
  X
} from 'lucide-react';

interface AgentClientManagementModalProps {
  agent: Agent;
  trigger?: React.ReactNode;
}

export default function AgentClientManagementModal({ agent, trigger }: AgentClientManagementModalProps) {
  const { assignClientToAgent, unassignClientFromAgent, getAgentClients } = useAgent();
  const { clients } = useClients();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [isLoading, setIsLoading] = useState(false);

  const assignedClientIds = getAgentClients(agent.id);
  const assignedClients = clients.filter(client => assignedClientIds.includes(client.id));
  const availableClients = clients.filter(client => !assignedClientIds.includes(client.id));

  const filteredAssignedClients = assignedClients.filter(client => {
    const matchesSearch = searchTerm === '' || (
      (client.name?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
      (client.email?.toLowerCase() || '').includes(searchTerm.toLowerCase())
    );
    const matchesStatus = filterStatus === 'all' || client.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  const filteredAvailableClients = availableClients.filter(client => {
    const matchesSearch = searchTerm === '' || (
      (client.name?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
      (client.email?.toLowerCase() || '').includes(searchTerm.toLowerCase())
    );
    const matchesStatus = filterStatus === 'all' || client.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  const handleAssignClient = async (clientId: string) => {
    setIsLoading(true);
    try {
      await assignClientToAgent(agent.id, clientId);
      const client = clients.find(c => c.id === clientId);
      toast({
        title: "Client Assigned",
        description: `${client?.name || 'Client'} has been assigned to ${agent.name || 'agent'}.`,
      });
    } catch (error) {
      toast({
        title: "Assignment Failed",
        description: "There was an error assigning the client. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleUnassignClient = async (clientId: string) => {
    setIsLoading(true);
    try {
      await unassignClientFromAgent(agent.id, clientId);
      const client = clients.find(c => c.id === clientId);
      toast({
        title: "Client Unassigned",
        description: `${client?.name || 'Client'} has been unassigned from ${agent.name || 'agent'}.`,
      });
    } catch (error) {
      toast({
        title: "Unassignment Failed",
        description: "There was an error unassigning the client. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'inactive': return 'bg-gray-100 text-gray-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'lead': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm">
            <Users className="h-4 w-4 mr-2" />
            Manage Clients
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <div className="flex items-center">
              <Users className="h-5 w-5 mr-2" />
              Client Management - {agent.name || 'Agent'}
            </div>
            <Badge variant="secondary">
              {assignedClientIds.length} Assigned Clients
            </Badge>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Search and Filter */}
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search clients by name or email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-full sm:w-48">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="lead">Lead</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Assigned Clients */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center">
                    <Check className="h-5 w-5 mr-2 text-green-500" />
                    Assigned Clients ({filteredAssignedClients.length})
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4 max-h-96 overflow-y-auto">
                  {filteredAssignedClients.length > 0 ? (
                    filteredAssignedClients.map((client) => (
                      <Card key={client.id} className="border-l-4 border-l-green-500">
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex-1">
                              <div className="flex items-center space-x-2 mb-1">
                                <h3 className="font-semibold">{client.name || 'Unknown Client'}</h3>
                                <Badge className={getStatusColor(client.status)}>
                                  {client.status}
                                </Badge>
                              </div>
                              <div className="space-y-1 text-sm text-gray-600">
                                <div className="flex items-center">
                                  <Mail className="h-3 w-3 mr-2" />
                                  {client.email || 'No email'}
                                </div>
                                <div className="flex items-center">
                                  <Phone className="h-3 w-3 mr-2" />
                                  {client.phone || 'No phone'}
                                </div>
                                {client.location && (
                                  <div className="flex items-center">
                                    <MapPin className="h-3 w-3 mr-2" />
                                    {client.location}
                                  </div>
                                )}
                                <div className="flex items-center">
                                  <Calendar className="h-3 w-3 mr-2" />
                                  Added: {formatDate(client.createdAt)}
                                </div>
                              </div>
                            </div>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleUnassignClient(client.id)}
                              disabled={isLoading}
                              className="ml-2"
                            >
                              <Minus className="h-4 w-4" />
                            </Button>
                          </div>
                          
                          {client.preferences && (
                            <div className="mt-3 pt-3 border-t">
                              <p className="text-xs text-gray-500 mb-1">Preferences:</p>
                              <div className="flex flex-wrap gap-1">
                                {client.preferences.budget && (
                                  <Badge variant="outline" className="text-xs">
                                    Budget: ${client.preferences.budget.toLocaleString()}
                                  </Badge>
                                )}
                                {client.preferences.propertyType && (
                                  <Badge variant="outline" className="text-xs">
                                    {client.preferences.propertyType}
                                  </Badge>
                                )}
                                {client.preferences.bedrooms && (
                                  <Badge variant="outline" className="text-xs">
                                    {client.preferences.bedrooms} bed
                                  </Badge>
                                )}
                              </div>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    ))
                  ) : (
                    <div className="text-center py-8">
                      <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-600">
                        {searchTerm || filterStatus !== 'all' 
                          ? 'No assigned clients match your search criteria'
                          : 'No clients assigned yet'
                        }
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Available Clients */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center">
                    <Plus className="h-5 w-5 mr-2 text-blue-500" />
                    Available Clients ({filteredAvailableClients.length})
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4 max-h-96 overflow-y-auto">
                  {filteredAvailableClients.length > 0 ? (
                    filteredAvailableClients.map((client) => (
                      <Card key={client.id} className="border-l-4 border-l-blue-500">
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex-1">
                              <div className="flex items-center space-x-2 mb-1">
                                <h3 className="font-semibold">{client.name || 'Unknown Client'}</h3>
                                <Badge className={getStatusColor(client.status)}>
                                  {client.status}
                                </Badge>
                              </div>
                              <div className="space-y-1 text-sm text-gray-600">
                                <div className="flex items-center">
                                  <Mail className="h-3 w-3 mr-2" />
                                  {client.email || 'No email'}
                                </div>
                                <div className="flex items-center">
                                  <Phone className="h-3 w-3 mr-2" />
                                  {client.phone || 'No phone'}
                                </div>
                                {client.location && (
                                  <div className="flex items-center">
                                    <MapPin className="h-3 w-3 mr-2" />
                                    {client.location}
                                  </div>
                                )}
                                <div className="flex items-center">
                                  <Calendar className="h-3 w-3 mr-2" />
                                  Added: {formatDate(client.createdAt)}
                                </div>
                              </div>
                            </div>
                            <Button
                              size="sm"
                              onClick={() => handleAssignClient(client.id)}
                              disabled={isLoading}
                              className="ml-2"
                            >
                              <Plus className="h-4 w-4" />
                            </Button>
                          </div>
                          
                          {client.preferences && (
                            <div className="mt-3 pt-3 border-t">
                              <p className="text-xs text-gray-500 mb-1">Preferences:</p>
                              <div className="flex flex-wrap gap-1">
                                {client.preferences.budget && (
                                  <Badge variant="outline" className="text-xs">
                                    Budget: ${client.preferences.budget.toLocaleString()}
                                  </Badge>
                                )}
                                {client.preferences.propertyType && (
                                  <Badge variant="outline" className="text-xs">
                                    {client.preferences.propertyType}
                                  </Badge>
                                )}
                                {client.preferences.bedrooms && (
                                  <Badge variant="outline" className="text-xs">
                                    {client.preferences.bedrooms} bed
                                  </Badge>
                                )}
                              </div>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    ))
                  ) : (
                    <div className="text-center py-8">
                      <User className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-600">
                        {searchTerm || filterStatus !== 'all' 
                          ? 'No available clients match your search criteria'
                          : 'All clients are currently assigned'
                        }
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Summary Statistics */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Users className="h-5 w-5 mr-2" />
                Assignment Summary
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="text-center p-4 bg-green-50 rounded-lg">
                  <div className="text-2xl font-bold text-green-600">
                    {assignedClientIds.length}
                  </div>
                  <div className="text-sm text-gray-600">Assigned Clients</div>
                </div>
                <div className="text-center p-4 bg-blue-50 rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">
                    {availableClients.length}
                  </div>
                  <div className="text-sm text-gray-600">Available Clients</div>
                </div>
                <div className="text-center p-4 bg-purple-50 rounded-lg">
                  <div className="text-2xl font-bold text-purple-600">
                    {assignedClients.filter(c => c.status === 'active').length}
                  </div>
                  <div className="text-sm text-gray-600">Active Clients</div>
                </div>
                <div className="text-center p-4 bg-orange-50 rounded-lg">
                  <div className="text-2xl font-bold text-orange-600">
                    {assignedClients.filter(c => c.status === 'lead').length}
                  </div>
                  <div className="text-sm text-gray-600">Leads</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className="flex justify-end space-x-4 pt-6 border-t">
            <Button variant="outline" onClick={() => setOpen(false)}>
              Close
            </Button>
            <Button>
              <ArrowRight className="h-4 w-4 mr-2" />
              View Agent Performance
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}