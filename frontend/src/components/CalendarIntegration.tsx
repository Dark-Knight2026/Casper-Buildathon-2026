import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger,
  DialogFooter 
} from '@/components/ui/dialog';
import { 
  Calendar as CalendarIcon, 
  Clock, 
  MapPin, 
  User, 
  Phone, 
  Mail,
  Plus,
  Filter,
  Download,
  Upload,
  Settings,
  BarChart3,
  TrendingUp,
  Users,
  CheckCircle,
  AlertCircle,
  X
} from 'lucide-react';
import CalendarImportIntegration from './CalendarImportIntegration';
import { EnhancedCalendarFeatures } from './EnhancedCalendarFeatures';

interface Appointment {
  id: string;
  title: string;
  date: Date;
  time: string;
  duration: number;
  type: 'showing' | 'inspection' | 'meeting' | 'consultation' | 'closing';
  status: 'scheduled' | 'confirmed' | 'completed' | 'cancelled';
  client: {
    name: string;
    email: string;
    phone: string;
  };
  property?: {
    address: string;
    type: string;
  };
  notes?: string;
  reminders: boolean;
}

interface CalendarIntegrationProps {
  userRole: 'buyer' | 'seller' | 'agent' | 'broker' | 'landlord' | 'tenant';
}

const mockAppointments: Appointment[] = [
  {
    id: '1',
    title: 'Property Showing - 123 Main St',
    date: new Date(2024, 0, 15, 14, 0),
    time: '2:00 PM',
    duration: 60,
    type: 'showing',
    status: 'confirmed',
    client: {
      name: 'John Smith',
      email: 'john@example.com',
      phone: '(555) 123-4567'
    },
    property: {
      address: '123 Main St, Virginia Beach, VA',
      type: 'Single Family Home'
    },
    notes: 'First-time homebuyer, interested in the neighborhood schools',
    reminders: true
  },
  {
    id: '2',
    title: 'Home Inspection - 456 Oak Ave',
    date: new Date(2024, 0, 16, 10, 0),
    time: '10:00 AM',
    duration: 120,
    type: 'inspection',
    status: 'scheduled',
    client: {
      name: 'Sarah Johnson',
      email: 'sarah@example.com',
      phone: '(555) 987-6543'
    },
    property: {
      address: '456 Oak Ave, Norfolk, VA',
      type: 'Townhouse'
    },
    notes: 'Bring inspection checklist, focus on HVAC system',
    reminders: true
  },
  {
    id: '3',
    title: 'Client Consultation',
    date: new Date(2024, 0, 17, 9, 0),
    time: '9:00 AM',
    duration: 45,
    type: 'consultation',
    status: 'scheduled',
    client: {
      name: 'Mike Davis',
      email: 'mike@example.com',
      phone: '(555) 456-7890'
    },
    notes: 'Initial consultation for selling property',
    reminders: true
  }
];

export default function CalendarIntegration({ userRole }: CalendarIntegrationProps) {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [appointments, setAppointments] = useState<Appointment[]>(mockAppointments);
  const [showNewAppointment, setShowNewAppointment] = useState(false);
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [showEnhancedFeatures, setShowEnhancedFeatures] = useState(false);
  const [filterType, setFilterType] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');

  // New appointment form state
  const [newAppointment, setNewAppointment] = useState({
    title: '',
    date: new Date(),
    time: '',
    duration: 60,
    type: 'showing' as Appointment['type'],
    clientName: '',
    clientEmail: '',
    clientPhone: '',
    propertyAddress: '',
    propertyType: '',
    notes: '',
    reminders: true
  });

  const filteredAppointments = appointments.filter(appointment => {
    const matchesType = filterType === 'all' || appointment.type === filterType;
    const matchesStatus = filterStatus === 'all' || appointment.status === filterStatus;
    const matchesSearch = searchTerm === '' || 
      appointment.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      appointment.client.name.toLowerCase().includes(searchTerm.toLowerCase());
    
    return matchesType && matchesStatus && matchesSearch;
  });

  const todayAppointments = appointments.filter(appointment => {
    const today = new Date();
    return appointment.date.toDateString() === today.toDateString();
  });

  const upcomingAppointments = appointments.filter(appointment => {
    const today = new Date();
    const nextWeek = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
    return appointment.date > today && appointment.date <= nextWeek;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed': return 'bg-green-100 text-green-800';
      case 'scheduled': return 'bg-blue-100 text-blue-800';
      case 'completed': return 'bg-gray-100 text-gray-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'showing': return 'bg-purple-100 text-purple-800';
      case 'inspection': return 'bg-orange-100 text-orange-800';
      case 'meeting': return 'bg-blue-100 text-blue-800';
      case 'consultation': return 'bg-green-100 text-green-800';
      case 'closing': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const handleCreateAppointment = () => {
    const appointment: Appointment = {
      id: Date.now().toString(),
      title: newAppointment.title,
      date: new Date(newAppointment.date),
      time: newAppointment.time,
      duration: newAppointment.duration,
      type: newAppointment.type,
      status: 'scheduled',
      client: {
        name: newAppointment.clientName,
        email: newAppointment.clientEmail,
        phone: newAppointment.clientPhone
      },
      property: newAppointment.propertyAddress ? {
        address: newAppointment.propertyAddress,
        type: newAppointment.propertyType
      } : undefined,
      notes: newAppointment.notes,
      reminders: newAppointment.reminders
    };

    setAppointments([...appointments, appointment]);
    setShowNewAppointment(false);
    
    // Reset form
    setNewAppointment({
      title: '',
      date: new Date(),
      time: '',
      duration: 60,
      type: 'showing',
      clientName: '',
      clientEmail: '',
      clientPhone: '',
      propertyAddress: '',
      propertyType: '',
      notes: '',
      reminders: true
    });
  };

  const handleStatusUpdate = (appointmentId: string, newStatus: Appointment['status']) => {
    setAppointments(appointments.map(apt => 
      apt.id === appointmentId ? { ...apt, status: newStatus } : apt
    ));
  };

  const exportCalendar = () => {
    const icsContent = appointments.map(apt => {
      const startDate = apt.date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
      const endDate = new Date(apt.date.getTime() + apt.duration * 60000)
        .toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
      
      return [
        'BEGIN:VEVENT',
        `UID:${apt.id}@keychain.com`,
        `DTSTART:${startDate}`,
        `DTEND:${endDate}`,
        `SUMMARY:${apt.title}`,
        `DESCRIPTION:${apt.notes || ''}`,
        `STATUS:${apt.status.toUpperCase()}`,
        'END:VEVENT'
      ].join('\n');
    }).join('\n');

    const icsFile = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//KeyChain//Calendar//EN',
      icsContent,
      'END:VCALENDAR'
    ].join('\n');

    const blob = new Blob([icsFile], { type: 'text/calendar' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'keychain-calendar.ics';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Header with Actions */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Calendar Integration</h2>
          <p className="text-gray-600">Manage your appointments and schedule</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => setShowNewAppointment(true)}>
            <Plus className="h-4 w-4 mr-2" />
            New Appointment
          </Button>
          <Button variant="outline" onClick={() => setShowImportDialog(true)}>
            <Upload className="h-4 w-4 mr-2" />
            Import
          </Button>
          <Button variant="outline" onClick={exportCalendar}>
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          <Button variant="outline" onClick={() => setShowEnhancedFeatures(true)}>
            <Settings className="h-4 w-4 mr-2" />
            Advanced
          </Button>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <CalendarIcon className="h-8 w-8 text-blue-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Today's Appointments</p>
                <p className="text-2xl font-bold text-gray-900">{todayAppointments.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <TrendingUp className="h-8 w-8 text-green-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">This Week</p>
                <p className="text-2xl font-bold text-gray-900">{upcomingAppointments.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <CheckCircle className="h-8 w-8 text-purple-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Completion Rate</p>
                <p className="text-2xl font-bold text-gray-900">94%</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Calendar Interface */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Calendar */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>Calendar</CardTitle>
          </CardHeader>
          <CardContent>
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={setSelectedDate}
              className="rounded-md border"
            />
          </CardContent>
        </Card>

        {/* Appointments List */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <CardTitle>Appointments</CardTitle>
              <div className="flex flex-wrap gap-2 w-full sm:w-auto">
                <Input
                  placeholder="Search appointments..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full sm:w-48"
                />
                <Select value={filterType} onValueChange={(value: string) => setFilterType(value)}>
                  <SelectTrigger className="w-full sm:w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="showing">Showing</SelectItem>
                    <SelectItem value="inspection">Inspection</SelectItem>
                    <SelectItem value="meeting">Meeting</SelectItem>
                    <SelectItem value="consultation">Consultation</SelectItem>
                    <SelectItem value="closing">Closing</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={filterStatus} onValueChange={(value: string) => setFilterStatus(value)}>
                  <SelectTrigger className="w-full sm:w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="scheduled">Scheduled</SelectItem>
                    <SelectItem value="confirmed">Confirmed</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {filteredAppointments.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <CalendarIcon className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <p>No appointments found</p>
                </div>
              ) : (
                filteredAppointments.map((appointment) => (
                  <div key={appointment.id} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                    <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
                      <div className="flex-1">
                        <div className="flex flex-wrap items-center gap-2 mb-2">
                          <h3 className="font-semibold text-lg">{appointment.title}</h3>
                          <Badge className={getTypeColor(appointment.type)}>
                            {appointment.type}
                          </Badge>
                          <Badge className={getStatusColor(appointment.status)}>
                            {appointment.status}
                          </Badge>
                        </div>
                        
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm text-gray-600 mb-3">
                          <div className="flex items-center">
                            <CalendarIcon className="h-4 w-4 mr-2" />
                            {appointment.date.toLocaleDateString()}
                          </div>
                          <div className="flex items-center">
                            <Clock className="h-4 w-4 mr-2" />
                            {appointment.time} ({appointment.duration}min)
                          </div>
                          <div className="flex items-center">
                            <User className="h-4 w-4 mr-2" />
                            {appointment.client.name}
                          </div>
                          <div className="flex items-center">
                            <Phone className="h-4 w-4 mr-2" />
                            {appointment.client.phone}
                          </div>
                        </div>

                        {appointment.property && (
                          <div className="flex items-center text-sm text-gray-600 mb-2">
                            <MapPin className="h-4 w-4 mr-2" />
                            {appointment.property.address}
                          </div>
                        )}

                        {appointment.notes && (
                          <p className="text-sm text-gray-700 bg-gray-50 p-2 rounded">
                            {appointment.notes}
                          </p>
                        )}
                      </div>

                      <div className="flex flex-col gap-2">
                        {appointment.status === 'scheduled' && (
                          <Button 
                            size="sm" 
                            onClick={() => handleStatusUpdate(appointment.id, 'confirmed')}
                          >
                            Confirm
                          </Button>
                        )}
                        {(appointment.status === 'scheduled' || appointment.status === 'confirmed') && (
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => handleStatusUpdate(appointment.id, 'completed')}
                          >
                            Complete
                          </Button>
                        )}
                        <Button 
                          size="sm" 
                          variant="destructive"
                          onClick={() => handleStatusUpdate(appointment.id, 'cancelled')}
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* New Appointment Dialog */}
      <Dialog open={showNewAppointment} onOpenChange={setShowNewAppointment}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create New Appointment</DialogTitle>
            <DialogDescription>
              Schedule a new appointment with your client
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                value={newAppointment.title}
                onChange={(e) => setNewAppointment({...newAppointment, title: e.target.value})}
                placeholder="e.g., Property Showing - 123 Main St"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="type">Type</Label>
              <Select value={newAppointment.type} onValueChange={(value: Appointment['type']) => setNewAppointment({...newAppointment, type: value})}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="showing">Property Showing</SelectItem>
                  <SelectItem value="inspection">Home Inspection</SelectItem>
                  <SelectItem value="meeting">Meeting</SelectItem>
                  <SelectItem value="consultation">Consultation</SelectItem>
                  <SelectItem value="closing">Closing</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="date">Date</Label>
              <Input
                id="date"
                type="date"
                value={newAppointment.date.toISOString().split('T')[0]}
                onChange={(e) => setNewAppointment({...newAppointment, date: new Date(e.target.value)})}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="time">Time</Label>
              <Input
                id="time"
                type="time"
                value={newAppointment.time}
                onChange={(e) => setNewAppointment({...newAppointment, time: e.target.value})}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="duration">Duration (minutes)</Label>
              <Select value={newAppointment.duration.toString()} onValueChange={(value: string) => setNewAppointment({...newAppointment, duration: parseInt(value)})}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="30">30 minutes</SelectItem>
                  <SelectItem value="45">45 minutes</SelectItem>
                  <SelectItem value="60">1 hour</SelectItem>
                  <SelectItem value="90">1.5 hours</SelectItem>
                  <SelectItem value="120">2 hours</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="clientName">Client Name</Label>
              <Input
                id="clientName"
                value={newAppointment.clientName}
                onChange={(e) => setNewAppointment({...newAppointment, clientName: e.target.value})}
                placeholder="John Smith"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="clientEmail">Client Email</Label>
              <Input
                id="clientEmail"
                type="email"
                value={newAppointment.clientEmail}
                onChange={(e) => setNewAppointment({...newAppointment, clientEmail: e.target.value})}
                placeholder="john@example.com"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="clientPhone">Client Phone</Label>
              <Input
                id="clientPhone"
                value={newAppointment.clientPhone}
                onChange={(e) => setNewAppointment({...newAppointment, clientPhone: e.target.value})}
                placeholder="(555) 123-4567"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="propertyAddress">Property Address (Optional)</Label>
              <Input
                id="propertyAddress"
                value={newAppointment.propertyAddress}
                onChange={(e) => setNewAppointment({...newAppointment, propertyAddress: e.target.value})}
                placeholder="123 Main St, City, State"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="propertyType">Property Type (Optional)</Label>
              <Input
                id="propertyType"
                value={newAppointment.propertyType}
                onChange={(e) => setNewAppointment({...newAppointment, propertyType: e.target.value})}
                placeholder="Single Family Home"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Input
              id="notes"
              value={newAppointment.notes}
              onChange={(e) => setNewAppointment({...newAppointment, notes: e.target.value})}
              placeholder="Additional notes or special instructions"
            />
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNewAppointment(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateAppointment}>
              Create Appointment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Import Dialog */}
      {showImportDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <CalendarImportIntegration />
            <div className="p-4 border-t">
              <Button onClick={() => setShowImportDialog(false)}>
                Close
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Enhanced Features Dialog */}
      {showEnhancedFeatures && (
        <EnhancedCalendarFeatures 
          appointments={appointments}
          onClose={() => setShowEnhancedFeatures(false)}
        />
      )}
    </div>
  );
}