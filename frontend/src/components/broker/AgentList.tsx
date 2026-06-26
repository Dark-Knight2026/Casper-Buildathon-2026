import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { useAgent } from '@/contexts/AgentContext';
import { useToast } from '@/hooks/use-toast';
import { Agent } from '@/types/agent';
import AddAgentModal from './AddAgentModal';
import AgentProfileModal from './AgentProfileModal';
import AgentPerformanceModal from './AgentPerformanceModal';
import AgentClientManagementModal from './AgentClientManagementModal';
import { 
  Search, 
  Filter, 
  Star, 
  Users, 
  Home, 
  DollarSign,
  TrendingUp,
  MapPin,
  Award,
  Phone,
  Mail,
  Calendar,
  MoreVertical,
  Trash2,
  Edit
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface AgentListProps {
  showAddButton?: boolean;
}

export default function AgentList({ showAddButton = true }: AgentListProps) {
  const { agents, isLoading, updateAgentStatus, deleteAgent } = useAgent();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<Agent['status'] | 'all'>('all');
  const [roleFilter, setRoleFilter] = useState<Agent['role'] | 'all'>('all');
  const [territoryFilter, setTerritoryFilter] = useState<string>('all');

  const filteredAgents = agents.filter(agent => {
    // Safe string comparison with null checks
    const matchesSearch = searchTerm === '' || (
      (agent.name?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
      (agent.email?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
      (agent.licenseNumber?.toLowerCase() || '').includes(searchTerm.toLowerCase())
    );
    
    const matchesStatus = statusFilter === 'all' || agent.status === statusFilter;
    const matchesRole = roleFilter === 'all' || agent.role === roleFilter;
    const matchesTerritory = territoryFilter === 'all' || (agent.territory && agent.territory.includes(territoryFilter));
    
    return matchesSearch && matchesStatus && matchesRole && matchesTerritory;
  });

  const getStatusColor = (status: Agent['status']) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'inactive': return 'bg-gray-100 text-gray-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getRoleColor = (role: Agent['role']) => {
    switch (role) {
      case 'team-lead': return 'bg-purple-100 text-purple-800';
      case 'senior-agent': return 'bg-blue-100 text-blue-800';
      case 'agent': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount || 0);
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const handleStatusChange = async (agentId: string, newStatus: Agent['status']) => {
    try {
      if (updateAgentStatus) {
        await updateAgentStatus(agentId, newStatus);
        toast({
          title: "Status Updated",
          description: `Agent status changed to ${newStatus}.`,
        });
      }
    } catch (error) {
      console.error('Failed to update agent status:', error);
      toast({
        title: "Error",
        description: "Failed to update agent status.",
        variant: "destructive",
      });
    }
  };

  const handleDeleteAgent = async (agentId: string) => {
    if (window.confirm('Are you sure you want to delete this agent?')) {
      try {
        if (deleteAgent) {
          await deleteAgent(agentId);
          toast({
            title: "Agent Deleted",
            description: "Agent has been removed successfully.",
          });
        }
      } catch (error) {
        console.error('Failed to delete agent:', error);
        toast({
          title: "Error",
          description: "Failed to delete agent.",
          variant: "destructive",
        });
      }
    }
  };

  const allTerritories = [...new Set(agents.flatMap(agent => agent.territory || []))];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Agent Management</h2>
          <p className="text-gray-600">Manage your team of real estate agents</p>
        </div>
        {showAddButton && (
          <AddAgentModal />
        )}
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search agents..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <Select value={statusFilter} onValueChange={(value: Agent['status'] | 'all') => setStatusFilter(value)}>
              <SelectTrigger>
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>

            <Select value={roleFilter} onValueChange={(value: Agent['role'] | 'all') => setRoleFilter(value)}>
              <SelectTrigger>
                <SelectValue placeholder="Filter by role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Roles</SelectItem>
                <SelectItem value="agent">Agent</SelectItem>
                <SelectItem value="senior-agent">Senior Agent</SelectItem>
                <SelectItem value="team-lead">Team Lead</SelectItem>
              </SelectContent>
            </Select>

            <Select value={territoryFilter} onValueChange={setTerritoryFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Filter by territory" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Territories</SelectItem>
                {allTerritories.map((territory) => (
                  <SelectItem key={territory} value={territory}>
                    {territory}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Agent List */}
      <div className="space-y-4">
        {isLoading ? (
          // Loading Skeletons
          Array.from({ length: 3 }).map((_, index) => (
            <Card key={index} className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center space-x-3">
                          <Skeleton className="h-6 w-48" />
                          <Skeleton className="h-5 w-20" />
                          <Skeleton className="h-5 w-24" />
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                          <Skeleton className="h-4 w-32" />
                          <Skeleton className="h-4 w-32" />
                          <Skeleton className="h-4 w-40" />
                          <Skeleton className="h-4 w-36" />
                        </div>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mt-4">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Skeleton key={i} className="h-16 w-full rounded-lg" />
                      ))}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        ) : filteredAgents.length > 0 ? (
          filteredAgents.map((agent) => (
            <Card key={agent.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  {/* Agent Info */}
                  <div className="flex-1">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-2">
                          <h3 className="text-lg font-semibold">{agent.name || 'Unknown Agent'}</h3>
                          <Badge className={getStatusColor(agent.status)}>
                            {agent.status}
                          </Badge>
                          <Badge className={getRoleColor(agent.role)}>
                            {agent.role?.replace('-', ' ') || 'agent'}
                          </Badge>
                          
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm" className="ml-2">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="start">
                              <DropdownMenuItem onClick={() => handleStatusChange(agent.id, 'active')}>
                                Mark as Active
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleStatusChange(agent.id, 'inactive')}>
                                Mark as Inactive
                              </DropdownMenuItem>
                              <DropdownMenuItem 
                                onClick={() => handleDeleteAgent(agent.id)}
                                className="text-red-600"
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Delete Agent
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-gray-600">
                          <div className="flex items-center">
                            <Mail className="h-4 w-4 mr-2" />
                            {agent.email || 'No email'}
                          </div>
                          <div className="flex items-center">
                            <Phone className="h-4 w-4 mr-2" />
                            {agent.phone || 'No phone'}
                          </div>
                          <div className="flex items-center">
                            <Award className="h-4 w-4 mr-2" />
                            License: {agent.licenseNumber || 'N/A'}
                          </div>
                          <div className="flex items-center">
                            <Calendar className="h-4 w-4 mr-2" />
                            Joined: {formatDate(agent.joinDate)}
                          </div>
                        </div>

                        {/* Specialties and Territory */}
                        <div className="mt-3 space-y-2">
                          <div className="flex flex-wrap gap-1">
                            {(agent.specialties || []).slice(0, 3).map((specialty) => (
                              <Badge key={specialty} variant="secondary" className="text-xs">
                                {specialty}
                              </Badge>
                            ))}
                            {(agent.specialties || []).length > 3 && (
                              <Badge variant="secondary" className="text-xs">
                                +{(agent.specialties || []).length - 3} more
                              </Badge>
                            )}
                          </div>
                          <div className="flex items-center text-sm text-gray-600">
                            <MapPin className="h-4 w-4 mr-2" />
                            {(agent.territory || []).join(', ') || 'No territory assigned'}
                          </div>
                        </div>
                      </div>

                      {/* Performance Rating */}
                      <div className="text-right">
                        <div className="flex items-center mb-1">
                          <Star className="h-4 w-4 text-yellow-500 mr-1" />
                          <span className="font-medium">
                            {agent.performance?.clientSatisfactionScore?.toFixed(1) || '0.0'}
                          </span>
                        </div>
                        <p className="text-xs text-gray-500">Client Rating</p>
                      </div>
                    </div>

                    {/* Performance Metrics */}
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
                      <div className="text-center p-3 bg-gray-50 rounded-lg">
                        <div className="font-semibold text-gray-900">
                          {(agent.assignedClients || []).length}
                        </div>
                        <div className="text-gray-600">Clients</div>
                      </div>
                      <div className="text-center p-3 bg-blue-50 rounded-lg">
                        <div className="font-semibold text-blue-900">
                          {agent.performance?.activeListings || 0}
                        </div>
                        <div className="text-gray-600">Active Listings</div>
                      </div>
                      <div className="text-center p-3 bg-green-50 rounded-lg">
                        <div className="font-semibold text-green-900">
                          {agent.performance?.closedDeals || 0}
                        </div>
                        <div className="text-gray-600">Closed Deals</div>
                      </div>
                      <div className="text-center p-3 bg-purple-50 rounded-lg">
                        <div className="font-semibold text-purple-900">
                          {formatCurrency(agent.performance?.totalVolume || 0)}
                        </div>
                        <div className="text-gray-600">Total Sales</div>
                      </div>
                      <div className="text-center p-3 bg-orange-50 rounded-lg">
                        <div className="font-semibold text-orange-900">
                          {agent.performance?.conversionRate || 0}%
                        </div>
                        <div className="text-gray-600">Conversion</div>
                      </div>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex flex-col space-y-2 lg:ml-6">
                    <AgentProfileModal 
                      agent={agent}
                      trigger={
                        <Button size="sm" variant="outline" className="w-full lg:w-auto">
                          View Profile
                        </Button>
                      }
                    />
                    <AgentPerformanceModal 
                      agent={agent}
                      trigger={
                        <Button size="sm" variant="outline" className="w-full lg:w-auto">
                          Performance Report
                        </Button>
                      }
                    />
                    <AgentClientManagementModal 
                      agent={agent}
                      trigger={
                        <Button size="sm" variant="outline" className="w-full lg:w-auto">
                          Manage Clients
                        </Button>
                      }
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        ) : (
          <Card>
            <CardContent className="p-12">
              <div className="text-center">
                <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  {searchTerm || statusFilter !== 'all' || roleFilter !== 'all' || territoryFilter !== 'all'
                    ? 'No agents match your filters'
                    : 'No agents found'
                  }
                </h3>
                <p className="text-gray-600 mb-4">
                  {searchTerm || statusFilter !== 'all' || roleFilter !== 'all' || territoryFilter !== 'all'
                    ? 'Try adjusting your search criteria or filters'
                    : 'Get started by adding your first agent to the brokerage'
                  }
                </p>
                {showAddButton && (
                  <AddAgentModal 
                    trigger={
                      <Button>
                        <Users className="h-4 w-4 mr-2" />
                        Add First Agent
                      </Button>
                    }
                  />
                )}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}