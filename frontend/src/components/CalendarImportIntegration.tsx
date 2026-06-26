import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Calendar,
  Upload,
  Download,
  ExternalLink,
  CheckCircle,
  Clock,
  AlertCircle,
  FileText,
  RefreshCw,
  Globe2
} from 'lucide-react';

interface CalendarEvent {
  id: string;
  title: string;
  date: string;
  time: string;
  type: string;
  source: string;
}

export default function CalendarImportIntegration() {
  const [activeTab, setActiveTab] = useState('import');
  const [importedEvents, setImportedEvents] = useState<CalendarEvent[]>([
    {
      id: '1',
      title: 'Property Showing - 123 Main St',
      date: '2024-01-16',
      time: '10:00 AM',
      type: 'Showing',
      source: 'Google Calendar'
    },
    {
      id: '2',
      title: 'Client Meeting - John Smith',
      date: '2024-01-17',
      time: '2:00 PM',
      type: 'Meeting',
      source: 'Outlook'
    },
    {
      id: '3',
      title: 'Inspection - 456 Oak Ave',
      date: '2024-01-18',
      time: '11:30 AM',
      type: 'Inspection',
      source: 'iCalendar'
    }
  ]);

  const [syncStatus, setSyncStatus] = useState({
    google: 'Connected',
    outlook: 'Connected',
    ical: 'Not Connected'
  });

  const handleFileImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Mock file processing
      console.log('Processing file:', file.name);
      // In a real implementation, you would parse the calendar file here
      // and add the events to importedEvents
    }
  };

  const handleSync = (provider: string) => {
    setSyncStatus(prev => ({
      ...prev,
      [provider]: 'Syncing...'
    }));
    
    // Mock sync process
    setTimeout(() => {
      setSyncStatus(prev => ({
        ...prev,
        [provider]: 'Connected'
      }));
    }, 2000);
  };

  const exportCalendar = (format: string) => {
    // Mock export functionality
    console.log(`Exporting calendar in ${format} format`);
    // In a real implementation, you would generate and download the calendar file
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Connected': return 'bg-green-100 text-green-800';
      case 'Syncing...': return 'bg-blue-100 text-blue-800';
      case 'Not Connected': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'Connected': return <CheckCircle className="h-4 w-4" />;
      case 'Syncing...': return <Clock className="h-4 w-4" />;
      case 'Not Connected': return <AlertCircle className="h-4 w-4" />;
      default: return <AlertCircle className="h-4 w-4" />;
    }
  };

  return (
    <div className="space-y-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Calendar Integration</h2>
        <p className="text-gray-600 mt-1">Import, export, and sync your calendar events across platforms.</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="import">Import Events</TabsTrigger>
          <TabsTrigger value="sync">Platform Sync</TabsTrigger>
          <TabsTrigger value="export">Export Calendar</TabsTrigger>
        </TabsList>

        <TabsContent value="import" className="space-y-6 mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Upload className="h-5 w-5 mr-2" />
                Import Calendar Events
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="calendar-file">Upload Calendar File (.ics, .csv)</Label>
                <Input
                  id="calendar-file"
                  type="file"
                  accept=".ics,.csv"
                  onChange={handleFileImport}
                  className="cursor-pointer"
                />
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Button variant="outline" className="flex items-center justify-center">
                  <Globe2 className="h-4 w-4 mr-2" />
                  Import from Google
                </Button>
                <Button variant="outline" className="flex items-center justify-center">
                  <Globe2 className="h-4 w-4 mr-2" />
                  Import from Outlook
                </Button>
                <Button variant="outline" className="flex items-center justify-center">
                  <Calendar className="h-4 w-4 mr-2" />
                  Import from iCal
                </Button>
              </div>

              {importedEvents.length > 0 && (
                <div className="mt-6">
                  <h3 className="text-lg font-semibold mb-4">Imported Events</h3>
                  <div className="space-y-3">
                    {importedEvents.map((event) => (
                      <Card key={event.id}>
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between">
                            <div>
                              <h4 className="font-medium">{event.title}</h4>
                              <p className="text-sm text-gray-600">{event.date} at {event.time}</p>
                              <Badge variant="outline" className="mt-1">
                                {event.type}
                              </Badge>
                            </div>
                            <div className="text-right">
                              <p className="text-sm text-gray-500">From: {event.source}</p>
                              <Button size="sm" className="mt-2">
                                Add to Calendar
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="sync" className="space-y-6 mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <RefreshCw className="h-5 w-5 mr-2" />
                Platform Synchronization
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center">
                        <Globe2 className="h-8 w-8 text-blue-600 mr-3" />
                        <div>
                          <h3 className="font-semibold">Google Calendar</h3>
                          <p className="text-sm text-gray-600">Sync with Google</p>
                        </div>
                      </div>
                      <Badge className={getStatusColor(syncStatus.google)}>
                        {getStatusIcon(syncStatus.google)}
                        <span className="ml-1">{syncStatus.google}</span>
                      </Badge>
                    </div>
                    <Button 
                      onClick={() => handleSync('google')} 
                      className="w-full"
                      disabled={syncStatus.google === 'Syncing...'}
                    >
                      {syncStatus.google === 'Connected' ? 'Resync' : 'Connect'}
                    </Button>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center">
                        <Globe2 className="h-8 w-8 text-blue-800 mr-3" />
                        <div>
                          <h3 className="font-semibold">Outlook</h3>
                          <p className="text-sm text-gray-600">Sync with Microsoft</p>
                        </div>
                      </div>
                      <Badge className={getStatusColor(syncStatus.outlook)}>
                        {getStatusIcon(syncStatus.outlook)}
                        <span className="ml-1">{syncStatus.outlook}</span>
                      </Badge>
                    </div>
                    <Button 
                      onClick={() => handleSync('outlook')} 
                      className="w-full"
                      disabled={syncStatus.outlook === 'Syncing...'}
                    >
                      {syncStatus.outlook === 'Connected' ? 'Resync' : 'Connect'}
                    </Button>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center">
                        <Calendar className="h-8 w-8 text-gray-600 mr-3" />
                        <div>
                          <h3 className="font-semibold">iCalendar</h3>
                          <p className="text-sm text-gray-600">Standard calendar</p>
                        </div>
                      </div>
                      <Badge className={getStatusColor(syncStatus.ical)}>
                        {getStatusIcon(syncStatus.ical)}
                        <span className="ml-1">{syncStatus.ical}</span>
                      </Badge>
                    </div>
                    <Button 
                      onClick={() => handleSync('ical')} 
                      className="w-full"
                      disabled={syncStatus.ical === 'Syncing...'}
                    >
                      {syncStatus.ical === 'Connected' ? 'Resync' : 'Connect'}
                    </Button>
                  </CardContent>
                </Card>
              </div>

              <div className="bg-blue-50 p-4 rounded-lg">
                <h3 className="font-semibold text-blue-900 mb-2">Sync Settings</h3>
                <div className="space-y-2 text-sm text-blue-800">
                  <div className="flex items-center justify-between">
                    <span>Auto-sync frequency:</span>
                    <Badge variant="outline">Every 15 minutes</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Two-way sync:</span>
                    <Badge className="bg-green-100 text-green-800">Enabled</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Conflict resolution:</span>
                    <Badge variant="outline">Latest wins</Badge>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="export" className="space-y-6 mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Download className="h-5 w-5 mr-2" />
                Export Calendar
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center mb-4">
                      <FileText className="h-8 w-8 text-green-600 mr-3" />
                      <div>
                        <h3 className="font-semibold">iCalendar (.ics)</h3>
                        <p className="text-sm text-gray-600">Standard calendar format</p>
                      </div>
                    </div>
                    <Button 
                      onClick={() => exportCalendar('ics')} 
                      className="w-full"
                      variant="outline"
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Export as .ics
                    </Button>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center mb-4">
                      <FileText className="h-8 w-8 text-blue-600 mr-3" />
                      <div>
                        <h3 className="font-semibold">CSV Format</h3>
                        <p className="text-sm text-gray-600">Spreadsheet compatible</p>
                      </div>
                    </div>
                    <Button 
                      onClick={() => exportCalendar('csv')} 
                      className="w-full"
                      variant="outline"
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Export as .csv
                    </Button>
                  </CardContent>
                </Card>
              </div>

              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="font-semibold mb-3">Export Options</h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Date range:</span>
                    <div className="flex space-x-2">
                      <Input type="date" className="w-32" defaultValue="2024-01-01" />
                      <span className="text-sm text-gray-500 self-center">to</span>
                      <Input type="date" className="w-32" defaultValue="2024-12-31" />
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Include:</span>
                    <div className="flex space-x-4">
                      <label className="flex items-center text-sm">
                        <input type="checkbox" className="mr-2" defaultChecked />
                        Appointments
                      </label>
                      <label className="flex items-center text-sm">
                        <input type="checkbox" className="mr-2" defaultChecked />
                        Showings
                      </label>
                      <label className="flex items-center text-sm">
                        <input type="checkbox" className="mr-2" />
                        Reminders
                      </label>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex space-x-4">
                <Button className="flex-1">
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Share Calendar Link
                </Button>
                <Button variant="outline" className="flex-1">
                  <Calendar className="h-4 w-4 mr-2" />
                  Subscribe URL
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}