import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Agent } from '@/types/broker';
import { 
  Search, 
  Plus, 
  User, 
  Phone, 
  Mail, 
  Calendar,
  Shield,
  AlertTriangle,
  CheckCircle,
  MoreHorizontal,
  UserPlus,
  UserMinus
} from 'lucide-react';

export default function AgentRoster() {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [isAddAgentOpen, setIsAddAgentOpen] = useState(false);

  // Mock agent data
  const agents: Agent[] = [
    {
      id: 'agent-1',
      firstName: 'Emily',
      lastName: 'Rodriguez',
      email: 'emily.rodriguez@brokerage.com',
      phone: '(555) 123-4567',
      licenseNumber: 'RE123456789',
      status: 'active',
      hireDate: new Date('2022-03-15'),
      team: 'Downtown Team',
      region: 'Central District',
      brokerage: 'Premier Real Estate Group',
      licenseExpiry: new Date('2025-03-15'),
      enoInsuranceExpiry: new Date('2024-12-31')
    },
    {
      id: 'agent-2',
      firstName: 'Michael',
      lastName: 'Chen',
      email: 'michael.chen@brokerage.com',
      phone: '(555) 987-6543',
      licenseNumber: 'RE987654321',
      status: 'active',
      hireDate: new Date('2021-08-20'),
      team: 'Luxury Team',
      region: 'North District',
      brokerage: 'Premier Real Estate Group',
      licenseExpiry: new Date('2024-08-20'),
      enoInsuranceExpiry: new Date('2024-12-31')
    },
    {
      id: 'agent-3',
      firstName: 'Sarah',
      lastName: 'Williams',
      email: 'sarah.williams@brokerage.com',
      phone: '(555) 456-7890',
      licenseNumber: 'RE456789123',
      status: 'suspended',
      hireDate: new Date('2023-01-10'),
      team: 'Residential Team',
      region: 'South District',
      brokerage: 'Premier Real Estate Group',
      licenseExpiry: new Date('2026-01-10'),
      enoInsuranceExpiry: new Date('2024-12-31')
    }
  ];

  const filteredAgents = agents.filter(agent => {
    const matchesSearch = `${agent.firstName} ${agent.lastName}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         agent.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         agent.licenseNumber.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filterStatus === 'all' || agent.status === filterStatus;
    return matchesSearch && matchesFilter;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800 border-green-200';
      case 'suspended': return 'bg-red-100 text-red-800 border-red-200';
      case 'inactive': return 'bg-gray-100 text-gray-800 border-gray-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getExpiryStatus = (expiryDate: Date) => {
    const now = new Date();
    const daysUntilExpiry = Math.ceil((expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    
    if (daysUntilExpiry < 0) return { status: 'expired', color: 'text-red-600', icon: AlertTriangle };
    if (daysUntilExpiry < 90) return { status: 'expiring', color: 'text-yellow-600', icon: AlertTriangle };
    return { status: 'valid', color: 'text-green-600', icon: CheckCircle };
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Agent Roster</h2>
          <p className="text-gray-600">Manage your agent team and assignments</p>
        </div>
        <Dialog open={isAddAgentOpen} onOpenChange={setIsAddAgentOpen}>
          <DialogTrigger asChild>
            <Button className="bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-700 hover:to-orange-700">
              <Plus className="h-4 w-4 mr-2" />
              Invite Agent
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Invite New Agent</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>First Name</Label>
                  <Input placeholder="Enter first name" />
                </div>
                <div className="space-y-2">
                  <Label>Last Name</Label>
                  <Input placeholder="Enter last name" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input type="email" placeholder="Enter email" />
                </div>
                <div className="space-y-2">
                  <Label>Phone</Label>
                  <Input placeholder="Enter phone number" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>License Number</Label>
                  <Input placeholder="Enter license number" />
                </div>
                <div className="space-y-2">
                  <Label>License Expiry</Label>
                  <Input type="date" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Team</Label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Select team" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="downtown">Downtown Team</SelectItem>
                      <SelectItem value="luxury">Luxury Team</SelectItem>
                      <SelectItem value="residential">Residential Team</SelectItem>
                      <SelectItem value="commercial">Commercial Team</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Region</Label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Select region" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="central">Central District</SelectItem>
                      <SelectItem value="north">North District</SelectItem>
                      <SelectItem value="south">South District</SelectItem>
                      <SelectItem value="east">East District</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={() => setIsAddAgentOpen(false)}>
                  Cancel
                </Button>
                <Button className="bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-700 hover:to-orange-700">
                  Send Invitation
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters */}
      <div className="flex items-center space-x-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            placeholder="Search agents..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="suspended">Suspended</SelectItem>
            <SelectItem value="inactive">Inactive</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Agent Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredAgents.map((agent) => {
          const licenseExpiry = getExpiryStatus(agent.licenseExpiry);
          const insuranceExpiry = getExpiryStatus(agent.enoInsuranceExpiry);
          const LicenseIcon = licenseExpiry.icon;
          const InsuranceIcon = insuranceExpiry.icon;

          return (
            <Card key={agent.id} className="hover:shadow-lg transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-gradient-to-r from-red-400 to-orange-400 rounded-full flex items-center justify-center">
                      <User className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">{agent.firstName} {agent.lastName}</CardTitle>
                      <Badge className={`${getStatusColor(agent.status)} border text-xs mt-1`}>
                        {agent.status}
                      </Badge>
                    </div>
                  </div>
                  <Button variant="ghost" size="sm">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center text-sm text-gray-600">
                    <Mail className="h-4 w-4 mr-2" />
                    {agent.email}
                  </div>
                  <div className="flex items-center text-sm text-gray-600">
                    <Phone className="h-4 w-4 mr-2" />
                    {agent.phone}
                  </div>
                  <div className="flex items-center text-sm text-gray-600">
                    <Shield className="h-4 w-4 mr-2" />
                    {agent.licenseNumber}
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="text-sm">
                    <span className="font-medium">Team:</span> {agent.team}
                  </div>
                  <div className="text-sm">
                    <span className="font-medium">Region:</span> {agent.region}
                  </div>
                  <div className="text-sm">
                    <span className="font-medium">Hire Date:</span> {agent.hireDate.toLocaleDateString()}
                  </div>
                </div>

                <div className="space-y-2 pt-2 border-t">
                  <div className="flex items-center justify-between text-sm">
                    <span>License Status:</span>
                    <div className={`flex items-center ${licenseExpiry.color}`}>
                      <LicenseIcon className="h-4 w-4 mr-1" />
                      {agent.licenseExpiry.toLocaleDateString()}
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span>E&O Insurance:</span>
                    <div className={`flex items-center ${insuranceExpiry.color}`}>
                      <InsuranceIcon className="h-4 w-4 mr-1" />
                      {agent.enoInsuranceExpiry.toLocaleDateString()}
                    </div>
                  </div>
                </div>

                <div className="flex space-x-2 pt-2">
                  <Button size="sm" variant="outline" className="flex-1">
                    <UserPlus className="h-4 w-4 mr-1" />
                    Assign
                  </Button>
                  <Button size="sm" variant="outline" className="flex-1">
                    <Calendar className="h-4 w-4 mr-1" />
                    Schedule
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {filteredAgents.length === 0 && (
        <div className="text-center py-12">
          <User className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No agents found</h3>
          <p className="text-gray-600">Try adjusting your search or filter criteria.</p>
        </div>
      )}
    </div>
  );
}