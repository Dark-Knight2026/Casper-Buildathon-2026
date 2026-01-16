import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/hooks/useAuth';
import CalendarIntegration from '@/components/CalendarIntegration';
import {
  Wrench,
  Users,
  Calendar,
  CheckCircle,
  Clock,
  AlertTriangle,
  Phone,
  Mail,
  MapPin,
  DollarSign,
  Star,
  FileText,
  Receipt,
  Hammer,
  Settings
} from 'lucide-react';

export default function ContractorDashboard() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('overview');

  // Mock data for contractor dashboard
  const projects = [
    {
      id: 1,
      clientName: 'John & Sarah Smith',
      propertyAddress: '123 Main St, Virginia Beach, VA',
      projectType: 'Kitchen Renovation',
      status: 'In Progress',
      priority: 'High',
      startDate: '2024-01-10',
      completionDate: '2024-02-15',
      budget: 15000,
      spent: 8500,
      phone: '(757) 555-0123',
      email: 'john.smith@email.com'
    },
    {
      id: 2,
      clientName: 'Michael Johnson',
      propertyAddress: '456 Oak Ave, Norfolk, VA',
      projectType: 'Bathroom Repair',
      status: 'Planning',
      priority: 'Medium',
      startDate: '2024-01-20',
      completionDate: '2024-02-05',
      budget: 8500,
      spent: 0,
      phone: '(757) 555-0456',
      email: 'mjohnson@email.com'
    },
    {
      id: 3,
      clientName: 'Emily Davis',
      propertyAddress: '789 Pine Dr, Chesapeake, VA',
      projectType: 'Flooring Installation',
      status: 'Completed',
      priority: 'Low',
      startDate: '2024-01-05',
      completionDate: '2024-01-18',
      budget: 6200,
      spent: 5800,
      phone: '(757) 555-0789',
      email: 'emily.davis@email.com'
    }
  ];

  const taskList = [
    {
      id: 1,
      projectId: 1,
      task: 'Demolition - Remove old cabinets',
      status: 'Completed',
      assignee: 'Team A',
      dueDate: '2024-01-12',
      priority: 'High'
    },
    {
      id: 2,
      projectId: 1,
      task: 'Electrical - Install new outlets',
      status: 'In Progress',
      assignee: 'Electrician Joe',
      dueDate: '2024-01-16',
      priority: 'High'
    },
    {
      id: 3,
      projectId: 1,
      task: 'Plumbing - Install new sink',
      status: 'Pending',
      assignee: 'Plumber Mike',
      dueDate: '2024-01-20',
      priority: 'Medium'
    },
    {
      id: 4,
      projectId: 2,
      task: 'Assessment - Inspect water damage',
      status: 'Scheduled',
      assignee: 'Inspector Tom',
      dueDate: '2024-01-18',
      priority: 'High'
    }
  ];

  const invoices = [
    {
      id: 1,
      clientName: 'Robert Wilson',
      projectType: 'Roof Repair',
      amount: 4500,
      status: 'Paid',
      invoiceDate: '2024-01-10',
      dueDate: '2024-01-25'
    },
    {
      id: 2,
      clientName: 'Lisa Chen',
      projectType: 'Deck Construction',
      amount: 8200,
      status: 'Pending',
      invoiceDate: '2024-01-12',
      dueDate: '2024-01-27'
    },
    {
      id: 3,
      clientName: 'David Rodriguez',
      projectType: 'HVAC Installation',
      amount: 6800,
      status: 'Overdue',
      invoiceDate: '2024-01-05',
      dueDate: '2024-01-20'
    }
  ];

  const appointments = [
    {
      id: 1,
      type: 'Site Inspection',
      client: 'John & Sarah Smith',
      date: '2024-01-15',
      time: '10:00 AM',
      purpose: 'Kitchen renovation progress review'
    },
    {
      id: 2,
      type: 'Project Estimate',
      client: 'Maria Garcia',
      date: '2024-01-15',
      time: '2:00 PM',
      purpose: 'Basement finishing consultation'
    }
  ];

  const performance = {
    activeProjects: 8,
    completedProjects: 24,
    avgProjectDuration: 18,
    clientSatisfaction: 4.7,
    onTimeCompletion: 94.2
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Completed':
      case 'Paid': return 'bg-green-100 text-green-800';
      case 'In Progress': return 'bg-blue-100 text-blue-800';
      case 'Planning':
      case 'Scheduled':
      case 'Pending': return 'bg-yellow-100 text-yellow-800';
      case 'Overdue': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'High': return 'bg-red-100 text-red-800';
      case 'Medium': return 'bg-yellow-100 text-yellow-800';
      case 'Low': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'Completed':
      case 'Paid': return <CheckCircle className="h-4 w-4" />;
      case 'In Progress': return <Clock className="h-4 w-4" />;
      default: return <AlertTriangle className="h-4 w-4" />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Contractor Dashboard</h1>
          <p className="text-gray-600 mt-1">Welcome back, {user?.name || 'Contractor'}! Manage repair tasks, projects, and invoices.</p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="projects">Projects</TabsTrigger>
            <TabsTrigger value="tasks">Task Lists</TabsTrigger>
            <TabsTrigger value="invoices">Invoices</TabsTrigger>
            <TabsTrigger value="calendar">Calendar</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6 mt-6">
            {/* Quick Stats */}
            <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center">
                    <Wrench className="h-8 w-8 text-blue-500" />
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-600">Active Projects</p>
                      <p className="text-2xl font-bold text-gray-900">{performance.activeProjects}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center">
                    <CheckCircle className="h-8 w-8 text-green-500" />
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-600">Completed</p>
                      <p className="text-2xl font-bold text-gray-900">{performance.completedProjects}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center">
                    <Clock className="h-8 w-8 text-orange-500" />
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-600">Avg Duration</p>
                      <p className="text-2xl font-bold text-gray-900">{performance.avgProjectDuration} days</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center">
                    <Star className="h-8 w-8 text-purple-500" />
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-600">Client Rating</p>
                      <p className="text-2xl font-bold text-gray-900">{performance.clientSatisfaction}/5.0</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center">
                    <Settings className="h-8 w-8 text-indigo-500" />
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-600">On-Time Rate</p>
                      <p className="text-2xl font-bold text-gray-900">{performance.onTimeCompletion}%</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Recent Activity */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Current Projects</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {projects.filter(p => p.status !== 'Completed').slice(0, 3).map((project) => (
                      <div key={project.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div>
                          <p className="font-medium">{project.clientName}</p>
                          <p className="text-sm text-gray-600">{project.projectType}</p>
                          <p className="text-xs text-gray-500">Budget: ${project.budget.toLocaleString()}</p>
                        </div>
                        <div className="text-right">
                          <Badge className={getStatusColor(project.status)}>
                            {project.status}
                          </Badge>
                          <Badge className={`${getPriorityColor(project.priority)} ml-1`}>
                            {project.priority}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Today's Schedule</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {appointments.map((appointment) => (
                      <div key={appointment.id} className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                        <Calendar className="h-5 w-5 text-blue-600" />
                        <div className="flex-1">
                          <p className="font-medium">{appointment.type}</p>
                          <p className="text-sm text-gray-600">{appointment.client}</p>
                          <p className="text-xs text-gray-500">{appointment.time} - {appointment.purpose}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="projects" className="space-y-6 mt-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Construction Projects</CardTitle>
                  <Button>New Project</Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {projects.map((project) => (
                    <Card key={project.id}>
                      <CardContent className="p-6">
                        <div className="flex items-center justify-between mb-4">
                          <div>
                            <h3 className="text-lg font-semibold">{project.clientName}</h3>
                            <p className="text-gray-600 flex items-center">
                              <MapPin className="h-4 w-4 mr-1" />
                              {project.propertyAddress}
                            </p>
                            <p className="text-sm text-gray-500">{project.projectType}</p>
                          </div>
                          <div className="text-right">
                            <Badge className={getStatusColor(project.status)}>
                              {getStatusIcon(project.status)}
                              <span className="ml-1">{project.status}</span>
                            </Badge>
                            <Badge className={`${getPriorityColor(project.priority)} ml-2`}>
                              {project.priority} Priority
                            </Badge>
                          </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                          <div>
                            <p className="text-sm text-gray-600">Budget & Spent</p>
                            <p className="text-lg font-bold text-green-600">${project.budget.toLocaleString()}</p>
                            <p className="text-sm text-gray-500">Spent: ${project.spent.toLocaleString()}</p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-600">Start Date</p>
                            <p className="font-medium">{project.startDate}</p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-600">Completion</p>
                            <p className="font-medium">{project.completionDate}</p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-600">Contact</p>
                            <p className="text-sm">{project.phone}</p>
                          </div>
                        </div>
                        <div className="flex space-x-2 mt-4">
                          <Button size="sm" variant="outline">
                            <Phone className="h-4 w-4 mr-1" />
                            Call
                          </Button>
                          <Button size="sm" variant="outline">
                            <Mail className="h-4 w-4 mr-1" />
                            Email
                          </Button>
                          <Button size="sm" variant="outline">
                            <Hammer className="h-4 w-4 mr-1" />
                            View Tasks
                          </Button>
                          <Button size="sm" variant="outline">
                            <Receipt className="h-4 w-4 mr-1" />
                            Create Invoice
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="tasks" className="space-y-6 mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Project Task Lists</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {taskList.map((task) => (
                    <Card key={task.id}>
                      <CardContent className="p-6">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center space-x-3">
                            {getStatusIcon(task.status)}
                            <div>
                              <p className="font-medium">{task.task}</p>
                              <p className="text-sm text-gray-600">Assigned to: {task.assignee}</p>
                              <p className="text-xs text-gray-500">Due: {task.dueDate}</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <Badge className={getStatusColor(task.status)}>
                              {task.status}
                            </Badge>
                            <Badge className={`${getPriorityColor(task.priority)} ml-2`}>
                              {task.priority}
                            </Badge>
                          </div>
                        </div>
                        <div className="flex space-x-2 mt-4">
                          <Button size="sm" variant="outline">
                            Update Status
                          </Button>
                          <Button size="sm" variant="outline">
                            <FileText className="h-4 w-4 mr-1" />
                            Add Notes
                          </Button>
                          <Button size="sm" variant="outline">
                            Assign Worker
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="invoices" className="space-y-6 mt-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Project Invoices</CardTitle>
                  <Button>
                    <Receipt className="h-4 w-4 mr-2" />
                    Create Invoice
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {invoices.map((invoice) => (
                    <Card key={invoice.id}>
                      <CardContent className="p-6">
                        <div className="flex items-center justify-between mb-4">
                          <div>
                            <h3 className="text-lg font-semibold">{invoice.clientName}</h3>
                            <p className="text-gray-600">{invoice.projectType}</p>
                          </div>
                          <Badge className={getStatusColor(invoice.status)}>
                            {getStatusIcon(invoice.status)}
                            <span className="ml-1">{invoice.status}</span>
                          </Badge>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div>
                            <p className="text-sm text-gray-600">Invoice Amount</p>
                            <p className="text-2xl font-bold text-green-600">${invoice.amount.toLocaleString()}</p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-600">Invoice Date</p>
                            <p className="font-medium">{invoice.invoiceDate}</p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-600">Due Date</p>
                            <p className="font-medium">{invoice.dueDate}</p>
                          </div>
                        </div>
                        <div className="flex space-x-2 mt-4">
                          <Button size="sm" variant="outline">
                            <FileText className="h-4 w-4 mr-1" />
                            View Invoice
                          </Button>
                          <Button size="sm" variant="outline">
                            <Mail className="h-4 w-4 mr-1" />
                            Send Reminder
                          </Button>
                          <Button size="sm" variant="outline">
                            Mark as Paid
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="calendar" className="mt-6">
            <CalendarIntegration />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}