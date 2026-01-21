import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { 
  Users, 
  Phone, 
  Mail, 
  Calendar, 
  MessageSquare, 
  TrendingUp,
  DollarSign,
  Clock,
  Star,
  Filter,
  Plus,
  Search
} from 'lucide-react';

interface Lead {
  id: string;
  name: string;
  email: string;
  phone: string;
  source: string;
  status: 'new' | 'contacted' | 'qualified' | 'showing' | 'offer' | 'closed' | 'lost';
  priority: 'low' | 'medium' | 'high';
  budget: number;
  propertyType: string;
  location: string;
  lastContact: string;
  nextFollowUp: string;
  notes: string;
  score: number;
}

interface Client {
  id: string;
  name: string;
  email: string;
  phone: string;
  type: 'buyer' | 'seller';
  status: 'active' | 'under_contract' | 'closed';
  properties: string[];
  totalValue: number;
  commission: number;
  startDate: string;
}

export default function AgentCRM() {
  const [activeTab, setActiveTab] = useState('leads');
  const [filterStatus, setFilterStatus] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  const [leads] = useState<Lead[]>([
    {
      id: '1',
      name: 'John Smith',
      email: 'john.smith@email.com',
      phone: '(555) 123-4567',
      source: 'Website',
      status: 'qualified',
      priority: 'high',
      budget: 800000,
      propertyType: 'Single Family',
      location: 'Beverly Hills',
      lastContact: '2024-09-01',
      nextFollowUp: '2024-09-03',
      notes: 'Looking for 3+ bedroom home, pre-approved for $800K',
      score: 85
    },
    {
      id: '2',
      name: 'Sarah Johnson',
      email: 'sarah.j@email.com',
      phone: '(555) 987-6543',
      source: 'Referral',
      status: 'showing',
      priority: 'high',
      budget: 1200000,
      propertyType: 'Condo',
      location: 'Santa Monica',
      lastContact: '2024-08-30',
      nextFollowUp: '2024-09-02',
      notes: 'Interested in luxury condos near the beach',
      score: 92
    },
    {
      id: '3',
      name: 'Mike Davis',
      email: 'mike.davis@email.com',
      phone: '(555) 456-7890',
      source: 'Social Media',
      status: 'new',
      priority: 'medium',
      budget: 600000,
      propertyType: 'Townhouse',
      location: 'Pasadena',
      lastContact: '2024-09-01',
      nextFollowUp: '2024-09-04',
      notes: 'First-time buyer, needs education on process',
      score: 65
    }
  ]);

  const [clients] = useState<Client[]>([
    {
      id: '1',
      name: 'Robert Wilson',
      email: 'robert.w@email.com',
      phone: '(555) 111-2222',
      type: 'buyer',
      status: 'under_contract',
      properties: ['123 Main St, Beverly Hills'],
      totalValue: 2500000,
      commission: 75000,
      startDate: '2024-08-15'
    },
    {
      id: '2',
      name: 'Lisa Chen',
      email: 'lisa.chen@email.com',
      phone: '(555) 333-4444',
      type: 'seller',
      status: 'active',
      properties: ['456 Oak Ave, Santa Monica'],
      totalValue: 1800000,
      commission: 54000,
      startDate: '2024-08-20'
    }
  ]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'new': return 'bg-blue-100 text-blue-800';
      case 'contacted': return 'bg-yellow-100 text-yellow-800';
      case 'qualified': return 'bg-green-100 text-green-800';
      case 'showing': return 'bg-purple-100 text-purple-800';
      case 'offer': return 'bg-orange-100 text-orange-800';
      case 'closed': return 'bg-emerald-100 text-emerald-800';
      case 'lost': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'low': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const filteredLeads = leads.filter(lead => {
    const matchesStatus = filterStatus === 'all' || lead.status === filterStatus;
    const matchesSearch = lead.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         lead.email.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Agent CRM</h1>
        <p className="text-gray-600">Manage leads, clients, and track your sales pipeline</p>
      </div>

      {/* Dashboard Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Active Leads</p>
                <p className="text-2xl font-bold text-gray-900">{leads.length}</p>
              </div>
              <Users className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Active Clients</p>
                <p className="text-2xl font-bold text-gray-900">{clients.length}</p>
              </div>
              <Star className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Pipeline Value</p>
                <p className="text-2xl font-bold text-gray-900">$4.3M</p>
              </div>
              <TrendingUp className="h-8 w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Est. Commission</p>
                <p className="text-2xl font-bold text-gray-900">$129K</p>
              </div>
              <DollarSign className="h-8 w-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="leads">Leads</TabsTrigger>
          <TabsTrigger value="clients">Clients</TabsTrigger>
          <TabsTrigger value="pipeline">Pipeline</TabsTrigger>
          <TabsTrigger value="activities">Activities</TabsTrigger>
          <TabsTrigger value="reports">Reports</TabsTrigger>
        </TabsList>

        <TabsContent value="leads" className="space-y-6">
          {/* Filters and Search */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search leads..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 w-64"
                />
              </div>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="new">New</SelectItem>
                  <SelectItem value="contacted">Contacted</SelectItem>
                  <SelectItem value="qualified">Qualified</SelectItem>
                  <SelectItem value="showing">Showing</SelectItem>
                  <SelectItem value="offer">Offer</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Lead
            </Button>
          </div>

          {/* Leads List */}
          <div className="space-y-4">
            {filteredLeads.map((lead) => (
              <Card key={lead.id}>
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <h3 className="font-semibold text-gray-900">{lead.name}</h3>
                        <Badge className={getStatusColor(lead.status)}>
                          {lead.status.toUpperCase()}
                        </Badge>
                        <Badge className={getPriorityColor(lead.priority)}>
                          {lead.priority.toUpperCase()}
                        </Badge>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm text-gray-600">
                        <div>
                          <p className="font-medium">Contact</p>
                          <p>{lead.email}</p>
                          <p>{lead.phone}</p>
                        </div>
                        <div>
                          <p className="font-medium">Budget</p>
                          <p>${lead.budget.toLocaleString()}</p>
                          <p>{lead.propertyType}</p>
                        </div>
                        <div>
                          <p className="font-medium">Location</p>
                          <p>{lead.location}</p>
                          <p>Source: {lead.source}</p>
                        </div>
                        <div>
                          <p className="font-medium">Follow-up</p>
                          <p>{new Date(lead.nextFollowUp).toLocaleDateString()}</p>
                          <p>Score: {lead.score}/100</p>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Button variant="outline" size="sm">
                        <Phone className="h-4 w-4" />
                      </Button>
                      <Button variant="outline" size="sm">
                        <Mail className="h-4 w-4" />
                      </Button>
                      <Button variant="outline" size="sm">
                        <MessageSquare className="h-4 w-4" />
                      </Button>
                      <Button size="sm">View Details</Button>
                    </div>
                  </div>
                  {lead.notes && (
                    <div className="p-3 bg-gray-50 rounded-lg">
                      <p className="text-sm text-gray-700">{lead.notes}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="clients" className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold text-gray-900">Active Clients</h2>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Client
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {clients.map((client) => (
              <Card key={client.id}>
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="font-semibold text-gray-900 mb-1">{client.name}</h3>
                      <div className="flex items-center space-x-2">
                        <Badge className={client.type === 'buyer' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'}>
                          {client.type.toUpperCase()}
                        </Badge>
                        <Badge className={getStatusColor(client.status)}>
                          {client.status.replace('_', ' ').toUpperCase()}
                        </Badge>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-gray-900">
                        ${client.totalValue.toLocaleString()}
                      </p>
                      <p className="text-sm text-gray-600">
                        Est. Commission: ${client.commission.toLocaleString()}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-2 text-sm text-gray-600">
                    <div className="flex justify-between">
                      <span>Email:</span>
                      <span>{client.email}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Phone:</span>
                      <span>{client.phone}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Start Date:</span>
                      <span>{new Date(client.startDate).toLocaleDateString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Properties:</span>
                      <span>{client.properties.length}</span>
                    </div>
                  </div>

                  <div className="mt-4 flex space-x-2">
                    <Button variant="outline" size="sm" className="flex-1">
                      <Phone className="h-4 w-4 mr-1" />
                      Call
                    </Button>
                    <Button variant="outline" size="sm" className="flex-1">
                      <Mail className="h-4 w-4 mr-1" />
                      Email
                    </Button>
                    <Button size="sm" className="flex-1">
                      View Details
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="pipeline" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Sales Pipeline</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {['New', 'Contacted', 'Qualified', 'Showing', 'Offer', 'Closed'].map((stage, index) => {
                  const stageLeads = leads.filter(lead => lead.status === stage.toLowerCase());
                  const stageValue = stageLeads.reduce((sum, lead) => sum + lead.budget, 0);
                  
                  return (
                    <div key={stage} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                      <div className="flex items-center space-x-4">
                        <div className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-semibold">
                          {index + 1}
                        </div>
                        <div>
                          <h3 className="font-semibold text-gray-900">{stage}</h3>
                          <p className="text-sm text-gray-600">{stageLeads.length} leads</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-gray-900">${stageValue.toLocaleString()}</p>
                        <p className="text-sm text-gray-600">Pipeline Value</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="activities" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Recent Activities</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-start space-x-3 p-3 bg-blue-50 rounded-lg">
                  <Clock className="h-5 w-5 text-blue-600 mt-0.5" />
                  <div>
                    <p className="font-medium text-gray-900">Follow-up call scheduled</p>
                    <p className="text-sm text-gray-600">John Smith - Tomorrow at 2:00 PM</p>
                  </div>
                </div>
                <div className="flex items-start space-x-3 p-3 bg-green-50 rounded-lg">
                  <MessageSquare className="h-5 w-5 text-green-600 mt-0.5" />
                  <div>
                    <p className="font-medium text-gray-900">Email sent</p>
                    <p className="text-sm text-gray-600">Sarah Johnson - Property recommendations</p>
                  </div>
                </div>
                <div className="flex items-start space-x-3 p-3 bg-purple-50 rounded-lg">
                  <Calendar className="h-5 w-5 text-purple-600 mt-0.5" />
                  <div>
                    <p className="font-medium text-gray-900">Showing scheduled</p>
                    <p className="text-sm text-gray-600">Mike Davis - 123 Main St, Friday 10:00 AM</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="reports" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Conversion Rates</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>Lead to Client</span>
                      <span>25%</span>
                    </div>
                    <Progress value={25} className="h-2" />
                  </div>
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>Showing to Offer</span>
                      <span>60%</span>
                    </div>
                    <Progress value={60} className="h-2" />
                  </div>
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>Offer to Close</span>
                      <span>80%</span>
                    </div>
                    <Progress value={80} className="h-2" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Monthly Performance</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between">
                    <span className="text-gray-600">New Leads</span>
                    <span className="font-semibold">12</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Closed Deals</span>
                    <span className="font-semibold">3</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Commission Earned</span>
                    <span className="font-semibold">$45,000</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Average Deal Size</span>
                    <span className="font-semibold">$1.5M</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}