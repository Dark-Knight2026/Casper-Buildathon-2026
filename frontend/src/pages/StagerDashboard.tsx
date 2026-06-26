import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/hooks/useAuth';
import CalendarIntegration from '@/components/CalendarIntegration';
import {
  Home,
  Users,
  Calendar,
  CheckCircle,
  Clock,
  AlertTriangle,
  Phone,
  Mail,
  Camera,
  Package,
  Palette,
  MapPin,
  DollarSign,
  Star,
  Upload,
  Eye,
  Truck
} from 'lucide-react';

export default function StagerDashboard() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('overview');

  // Mock data for stager dashboard
  const projects = [
    {
      id: 1,
      clientName: 'John & Sarah Smith',
      propertyAddress: '123 Main St, Virginia Beach, VA',
      propertyType: 'Single Family Home',
      rooms: 5,
      sqft: 2800,
      status: 'In Progress',
      priority: 'High',
      startDate: '2024-01-10',
      completionDate: '2024-01-20',
      budget: 8500,
      phone: '(757) 555-0123',
      email: 'john.smith@email.com'
    },
    {
      id: 2,
      clientName: 'Michael Johnson',
      propertyAddress: '456 Oak Ave, Norfolk, VA',
      propertyType: 'Townhouse',
      rooms: 3,
      sqft: 1850,
      status: 'Planning',
      priority: 'Medium',
      startDate: '2024-01-18',
      completionDate: '2024-01-25',
      budget: 5200,
      phone: '(757) 555-0456',
      email: 'mjohnson@email.com'
    },
    {
      id: 3,
      clientName: 'Emily Davis',
      propertyAddress: '789 Pine Dr, Chesapeake, VA',
      propertyType: 'Condo',
      rooms: 2,
      sqft: 1200,
      status: 'Completed',
      priority: 'Low',
      startDate: '2024-01-05',
      completionDate: '2024-01-12',
      budget: 3800,
      phone: '(757) 555-0789',
      email: 'emily.davis@email.com'
    }
  ];

  const stagingTasks = [
    {
      id: 1,
      projectId: 1,
      room: 'Living Room',
      tasks: [
        { task: 'Furniture arrangement', status: 'Completed', assignee: 'Team A' },
        { task: 'Accent lighting setup', status: 'In Progress', assignee: 'Team B' },
        { task: 'Artwork installation', status: 'Pending', assignee: 'Team A' },
        { task: 'Final styling', status: 'Pending', assignee: 'Team C' }
      ]
    },
    {
      id: 2,
      projectId: 1,
      room: 'Master Bedroom',
      tasks: [
        { task: 'Bed staging', status: 'Completed', assignee: 'Team A' },
        { task: 'Closet organization', status: 'In Progress', assignee: 'Team B' },
        { task: 'Window treatments', status: 'Pending', assignee: 'Team C' }
      ]
    }
  ];

  const inventory = [
    {
      id: 1,
      category: 'Living Room',
      items: [
        { name: 'Modern Sectional Sofa', quantity: 3, status: 'Available', location: 'Warehouse A' },
        { name: 'Coffee Table Set', quantity: 5, status: 'In Use', location: 'Project #1' },
        { name: 'Table Lamps', quantity: 8, status: 'Available', location: 'Warehouse B' }
      ]
    },
    {
      id: 2,
      category: 'Bedroom',
      items: [
        { name: 'Queen Bed Frame', quantity: 4, status: 'Available', location: 'Warehouse A' },
        { name: 'Nightstand Pair', quantity: 6, status: 'Available', location: 'Warehouse A' },
        { name: 'Dresser Mirror', quantity: 2, status: 'In Use', location: 'Project #2' }
      ]
    }
  ];

  const appointments = [
    {
      id: 1,
      type: 'Initial Consultation',
      client: 'David Rodriguez',
      date: '2024-01-15',
      time: '10:00 AM',
      purpose: 'Property walkthrough and staging assessment'
    },
    {
      id: 2,
      type: 'Progress Review',
      client: 'John & Sarah Smith',
      date: '2024-01-15',
      time: '2:00 PM',
      purpose: 'Review staging progress and final touches'
    }
  ];

  const performance = {
    activeProjects: 8,
    completedProjects: 24,
    avgCompletionTime: 7.5,
    clientSatisfaction: 4.9,
    onTimeDelivery: 96.2
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Completed': return 'bg-green-100 text-green-800';
      case 'In Progress': return 'bg-blue-100 text-blue-800';
      case 'Planning':
      case 'Pending': return 'bg-yellow-100 text-yellow-800';
      case 'Available': return 'bg-green-100 text-green-800';
      case 'In Use': return 'bg-orange-100 text-orange-800';
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
      case 'Completed': return <CheckCircle className="h-4 w-4" />;
      case 'In Progress': return <Clock className="h-4 w-4" />;
      default: return <AlertTriangle className="h-4 w-4" />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Stager Dashboard</h1>
          <p className="text-gray-600 mt-1">Welcome back, {user?.name || 'Stager'}! Manage staging projects, inventory, and media uploads.</p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="projects">Projects</TabsTrigger>
            <TabsTrigger value="tasks">Tasks</TabsTrigger>
            <TabsTrigger value="inventory">Inventory</TabsTrigger>
            <TabsTrigger value="calendar">Calendar</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6 mt-6">
            {/* Quick Stats */}
            <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center">
                    <Home className="h-8 w-8 text-blue-500" />
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
                      <p className="text-sm font-medium text-gray-600">Avg Completion</p>
                      <p className="text-2xl font-bold text-gray-900">{performance.avgCompletionTime} days</p>
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
                    <Truck className="h-8 w-8 text-indigo-500" />
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-600">On-Time Delivery</p>
                      <p className="text-2xl font-bold text-gray-900">{performance.onTimeDelivery}%</p>
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
                          <p className="text-sm text-gray-600">{project.propertyType} • {project.rooms} rooms</p>
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
                  <CardTitle>Today's Appointments</CardTitle>
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
                  <CardTitle>Staging Projects</CardTitle>
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
                            <p className="text-sm text-gray-500">{project.propertyType}</p>
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
                            <p className="text-sm text-gray-600">Budget</p>
                            <p className="text-lg font-bold text-green-600">${project.budget.toLocaleString()}</p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-600">Rooms/Sq Ft</p>
                            <p className="font-medium">{project.rooms} rooms • {project.sqft.toLocaleString()} sq ft</p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-600">Start Date</p>
                            <p className="font-medium">{project.startDate}</p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-600">Completion</p>
                            <p className="font-medium">{project.completionDate}</p>
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
                            <Camera className="h-4 w-4 mr-1" />
                            Photos
                          </Button>
                          <Button size="sm" variant="outline">
                            <Palette className="h-4 w-4 mr-1" />
                            View Plan
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
                <CardTitle>Staging Task Checklist</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {stagingTasks.map((roomTasks) => (
                    <Card key={roomTasks.id}>
                      <CardContent className="p-6">
                        <h3 className="text-lg font-semibold mb-4">{roomTasks.room}</h3>
                        <div className="space-y-3">
                          {roomTasks.tasks.map((task, index) => (
                            <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                              <div className="flex items-center space-x-3">
                                {getStatusIcon(task.status)}
                                <div>
                                  <p className="font-medium">{task.task}</p>
                                  <p className="text-sm text-gray-600">Assigned to: {task.assignee}</p>
                                </div>
                              </div>
                              <Badge className={getStatusColor(task.status)}>
                                {task.status}
                              </Badge>
                            </div>
                          ))}
                        </div>
                        <div className="flex space-x-2 mt-4">
                          <Button size="sm" variant="outline">
                            <Upload className="h-4 w-4 mr-1" />
                            Upload Photos
                          </Button>
                          <Button size="sm" variant="outline">
                            <Eye className="h-4 w-4 mr-1" />
                            View Progress
                          </Button>
                          <Button size="sm" variant="outline">
                            Update Status
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="inventory" className="space-y-6 mt-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Staging Inventory</CardTitle>
                  <Button>
                    <Package className="h-4 w-4 mr-2" />
                    Add Item
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {inventory.map((category) => (
                    <Card key={category.id}>
                      <CardContent className="p-6">
                        <h3 className="text-lg font-semibold mb-4">{category.category}</h3>
                        <div className="space-y-3">
                          {category.items.map((item, index) => (
                            <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                              <div className="flex items-center space-x-3">
                                <Package className="h-5 w-5 text-gray-400" />
                                <div>
                                  <p className="font-medium">{item.name}</p>
                                  <p className="text-sm text-gray-600">Location: {item.location}</p>
                                </div>
                              </div>
                              <div className="text-right">
                                <p className="font-medium">Qty: {item.quantity}</p>
                                <Badge className={getStatusColor(item.status)}>
                                  {item.status}
                                </Badge>
                              </div>
                            </div>
                          ))}
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