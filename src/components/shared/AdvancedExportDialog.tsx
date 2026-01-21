/**
 * Advanced Export Dialog Component
 * Enhanced export with scheduling, templates, and custom formatting
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
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Download,
  FileText,
  Table,
  FileSpreadsheet,
  Calendar,
  Clock,
  Mail,
  Settings,
  Save,
  Sparkles,
  CheckCircle,
  Loader2
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface ExportField {
  id: string;
  label: string;
  selected: boolean;
  required?: boolean;
}

interface ExportTemplate {
  id: string;
  name: string;
  description: string;
  format: 'csv' | 'excel' | 'pdf';
  fields: string[];
  schedule?: ExportSchedule;
}

interface ExportSchedule {
  enabled: boolean;
  frequency: 'daily' | 'weekly' | 'monthly';
  time: string;
  email: string;
}

interface AdvancedExportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  exportType: 'properties' | 'tenants' | 'financials' | 'maintenance';
  data: Record<string, string | number>[];
  availableFields: ExportField[];
  onExport: (config: ExportConfig) => void;
}

interface ExportConfig {
  format: 'csv' | 'excel' | 'pdf';
  fields: string[];
  template?: string;
  schedule?: ExportSchedule;
  customOptions: {
    includeHeaders: boolean;
    dateFormat: string;
    numberFormat: string;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  };
}

export default function AdvancedExportDialog({
  open,
  onOpenChange,
  exportType,
  data,
  availableFields,
  onExport
}: AdvancedExportDialogProps) {
  const { toast } = useToast();
  const [selectedFormat, setSelectedFormat] = useState<'csv' | 'excel' | 'pdf'>('csv');
  const [selectedFields, setSelectedFields] = useState<string[]>(
    availableFields.filter(f => f.required).map(f => f.id)
  );
  const [savedTemplates, setSavedTemplates] = useState<ExportTemplate[]>([
    {
      id: 'default',
      name: 'Default Export',
      description: 'Standard export with all fields',
      format: 'csv',
      fields: availableFields.map(f => f.id)
    }
  ]);
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');
  const [templateName, setTemplateName] = useState('');
  const [templateDescription, setTemplateDescription] = useState('');
  const [scheduleEnabled, setScheduleEnabled] = useState(false);
  const [scheduleFrequency, setScheduleFrequency] = useState<'daily' | 'weekly' | 'monthly'>('weekly');
  const [scheduleTime, setScheduleTime] = useState('09:00');
  const [scheduleEmail, setScheduleEmail] = useState('');
  const [includeHeaders, setIncludeHeaders] = useState(true);
  const [dateFormat, setDateFormat] = useState('YYYY-MM-DD');
  const [numberFormat, setNumberFormat] = useState('1,234.56');
  const [sortBy, setSortBy] = useState('');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [isExporting, setIsExporting] = useState(false);

  const formats = [
    {
      id: 'csv',
      name: 'CSV',
      icon: Table,
      description: 'Comma-separated values',
      extension: '.csv'
    },
    {
      id: 'excel',
      name: 'Excel',
      icon: FileSpreadsheet,
      description: 'Microsoft Excel format',
      extension: '.xlsx'
    },
    {
      id: 'pdf',
      name: 'PDF',
      icon: FileText,
      description: 'Portable Document Format',
      extension: '.pdf'
    }
  ];

  const handleFieldToggle = (fieldId: string) => {
    const field = availableFields.find(f => f.id === fieldId);
    if (field?.required) return;

    if (selectedFields.includes(fieldId)) {
      setSelectedFields(selectedFields.filter(id => id !== fieldId));
    } else {
      setSelectedFields([...selectedFields, fieldId]);
    }
  };

  const handleSelectAllFields = () => {
    setSelectedFields(availableFields.map(f => f.id));
  };

  const handleSelectDefaultFields = () => {
    setSelectedFields(availableFields.filter(f => f.required).map(f => f.id));
  };

  const handleLoadTemplate = (templateId: string) => {
    const template = savedTemplates.find(t => t.id === templateId);
    if (template) {
      setSelectedFormat(template.format);
      setSelectedFields(template.fields);
      if (template.schedule) {
        setScheduleEnabled(template.schedule.enabled);
        setScheduleFrequency(template.schedule.frequency);
        setScheduleTime(template.schedule.time);
        setScheduleEmail(template.schedule.email);
      }
      toast({
        title: 'Template Loaded',
        description: `Loaded "${template.name}" template`
      });
    }
  };

  const handleSaveTemplate = () => {
    if (!templateName.trim()) {
      toast({
        title: 'Template Name Required',
        description: 'Please enter a name for the template',
        variant: 'destructive'
      });
      return;
    }

    const newTemplate: ExportTemplate = {
      id: Date.now().toString(),
      name: templateName,
      description: templateDescription,
      format: selectedFormat,
      fields: selectedFields,
      schedule: scheduleEnabled ? {
        enabled: scheduleEnabled,
        frequency: scheduleFrequency,
        time: scheduleTime,
        email: scheduleEmail
      } : undefined
    };

    setSavedTemplates([...savedTemplates, newTemplate]);
    toast({
      title: 'Template Saved',
      description: `"${templateName}" template has been saved`
    });
    setTemplateName('');
    setTemplateDescription('');
  };

  const handleExport = async () => {
    if (selectedFields.length === 0) {
      toast({
        title: 'No Fields Selected',
        description: 'Please select at least one field to export',
        variant: 'destructive'
      });
      return;
    }

    if (scheduleEnabled && !scheduleEmail) {
      toast({
        title: 'Email Required',
        description: 'Please enter an email address for scheduled exports',
        variant: 'destructive'
      });
      return;
    }

    setIsExporting(true);

    // Simulate export processing
    await new Promise(resolve => setTimeout(resolve, 2000));

    const config: ExportConfig = {
      format: selectedFormat,
      fields: selectedFields,
      template: selectedTemplate,
      schedule: scheduleEnabled ? {
        enabled: scheduleEnabled,
        frequency: scheduleFrequency,
        time: scheduleTime,
        email: scheduleEmail
      } : undefined,
      customOptions: {
        includeHeaders,
        dateFormat,
        numberFormat,
        sortBy: sortBy || undefined,
        sortOrder: sortOrder
      }
    };

    onExport(config);

    toast({
      title: scheduleEnabled ? 'Export Scheduled' : 'Export Complete',
      description: scheduleEnabled 
        ? `Export will be sent to ${scheduleEmail} ${scheduleFrequency}`
        : `${data.length} records exported successfully`
    });

    setIsExporting(false);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Advanced Export</DialogTitle>
          <DialogDescription>
            Configure export settings, save templates, and schedule automated exports
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="basic" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="basic">Basic</TabsTrigger>
            <TabsTrigger value="fields">Fields</TabsTrigger>
            <TabsTrigger value="schedule">Schedule</TabsTrigger>
            <TabsTrigger value="templates">Templates</TabsTrigger>
          </TabsList>

          {/* Basic Tab */}
          <TabsContent value="basic" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Export Format</CardTitle>
                <CardDescription>Choose the output format for your export</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-4">
                  {formats.map((format) => {
                    const Icon = format.icon;
                    return (
                      <Card
                        key={format.id}
                        className={`cursor-pointer transition-all ${
                          selectedFormat === format.id
                            ? 'border-blue-500 bg-blue-50'
                            : 'hover:border-gray-400'
                        }`}
                        onClick={() => setSelectedFormat(format.id as 'csv' | 'excel' | 'pdf')}
                      >
                        <CardContent className="pt-6 text-center">
                          <Icon className={`h-12 w-12 mx-auto mb-3 ${
                            selectedFormat === format.id ? 'text-blue-600' : 'text-gray-400'
                          }`} />
                          <h3 className="font-medium mb-1">{format.name}</h3>
                          <p className="text-xs text-gray-500">{format.description}</p>
                          <p className="text-xs text-gray-400 mt-1">{format.extension}</p>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Custom Options</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label>Include Headers</Label>
                  <Switch checked={includeHeaders} onCheckedChange={setIncludeHeaders} />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Date Format</Label>
                    <Select value={dateFormat} onValueChange={setDateFormat}>
                      <SelectTrigger className="mt-2">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="YYYY-MM-DD">YYYY-MM-DD</SelectItem>
                        <SelectItem value="MM/DD/YYYY">MM/DD/YYYY</SelectItem>
                        <SelectItem value="DD/MM/YYYY">DD/MM/YYYY</SelectItem>
                        <SelectItem value="MMMM DD, YYYY">MMMM DD, YYYY</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label>Number Format</Label>
                    <Select value={numberFormat} onValueChange={setNumberFormat}>
                      <SelectTrigger className="mt-2">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1,234.56">1,234.56</SelectItem>
                        <SelectItem value="1234.56">1234.56</SelectItem>
                        <SelectItem value="1.234,56">1.234,56</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Sort By</Label>
                    <Select value={sortBy} onValueChange={setSortBy}>
                      <SelectTrigger className="mt-2">
                        <SelectValue placeholder="No sorting" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">No sorting</SelectItem>
                        {availableFields.map(field => (
                          <SelectItem key={field.id} value={field.id}>
                            {field.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label>Sort Order</Label>
                    <Select value={sortOrder} onValueChange={(value) => setSortOrder(value as 'asc' | 'desc')}>
                      <SelectTrigger className="mt-2">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="asc">Ascending</SelectItem>
                        <SelectItem value="desc">Descending</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Export Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-4">
                  <div className="text-center p-4 bg-gray-50 rounded-lg">
                    <p className="text-2xl font-bold text-blue-600">{data.length}</p>
                    <p className="text-sm text-gray-600">Records</p>
                  </div>
                  <div className="text-center p-4 bg-gray-50 rounded-lg">
                    <p className="text-2xl font-bold text-green-600">{selectedFields.length}</p>
                    <p className="text-sm text-gray-600">Fields</p>
                  </div>
                  <div className="text-center p-4 bg-gray-50 rounded-lg">
                    <p className="text-2xl font-bold text-purple-600">{selectedFormat.toUpperCase()}</p>
                    <p className="text-sm text-gray-600">Format</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Fields Tab */}
          <TabsContent value="fields" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-base">Select Fields</CardTitle>
                    <CardDescription>Choose which fields to include in the export</CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={handleSelectDefaultFields}>
                      Default Fields
                    </Button>
                    <Button variant="outline" size="sm" onClick={handleSelectAllFields}>
                      Select All
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[400px] pr-4">
                  <div className="grid grid-cols-2 gap-4">
                    {availableFields.map((field) => (
                      <div key={field.id} className="flex items-center space-x-2">
                        <Checkbox
                          id={field.id}
                          checked={selectedFields.includes(field.id)}
                          onCheckedChange={() => handleFieldToggle(field.id)}
                          disabled={field.required}
                        />
                        <label
                          htmlFor={field.id}
                          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                        >
                          {field.label}
                          {field.required && (
                            <Badge variant="secondary" className="ml-2 text-xs">
                              Required
                            </Badge>
                          )}
                        </label>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Schedule Tab */}
          <TabsContent value="schedule" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-base">Automated Export Schedule</CardTitle>
                    <CardDescription>Set up recurring exports delivered via email</CardDescription>
                  </div>
                  <Switch checked={scheduleEnabled} onCheckedChange={setScheduleEnabled} />
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {scheduleEnabled ? (
                  <>
                    <div>
                      <Label>Frequency</Label>
                      <Select value={scheduleFrequency} onValueChange={(value) => setScheduleFrequency(value as 'daily' | 'weekly' | 'monthly')}>
                        <SelectTrigger className="mt-2">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="daily">Daily</SelectItem>
                          <SelectItem value="weekly">Weekly</SelectItem>
                          <SelectItem value="monthly">Monthly</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label>Time</Label>
                      <Input
                        type="time"
                        value={scheduleTime}
                        onChange={(e) => setScheduleTime(e.target.value)}
                        className="mt-2"
                      />
                    </div>

                    <div>
                      <Label>Email Address</Label>
                      <Input
                        type="email"
                        placeholder="your@email.com"
                        value={scheduleEmail}
                        onChange={(e) => setScheduleEmail(e.target.value)}
                        className="mt-2"
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        Exports will be sent to this email address
                      </p>
                    </div>

                    <Card className="bg-blue-50 border-blue-200">
                      <CardContent className="pt-6">
                        <div className="flex items-start gap-3">
                          <Calendar className="h-5 w-5 text-blue-600 mt-0.5" />
                          <div>
                            <p className="font-medium text-blue-900">Schedule Summary</p>
                            <p className="text-sm text-blue-700 mt-1">
                              Export will be sent {scheduleFrequency} at {scheduleTime} to {scheduleEmail || '[email not set]'}
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </>
                ) : (
                  <div className="text-center py-8">
                    <Clock className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                    <p className="text-sm text-gray-600">
                      Enable scheduling to set up automated exports
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Templates Tab */}
          <TabsContent value="templates" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Save Current Configuration</CardTitle>
                <CardDescription>Save your export settings as a reusable template</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Template Name</Label>
                  <Input
                    placeholder="e.g., Monthly Financial Report"
                    value={templateName}
                    onChange={(e) => setTemplateName(e.target.value)}
                    className="mt-2"
                  />
                </div>

                <div>
                  <Label>Description (Optional)</Label>
                  <Textarea
                    placeholder="Describe what this template is for..."
                    value={templateDescription}
                    onChange={(e) => setTemplateDescription(e.target.value)}
                    className="mt-2"
                    rows={3}
                  />
                </div>

                <Button onClick={handleSaveTemplate} className="w-full">
                  <Save className="h-4 w-4 mr-2" />
                  Save Template
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Saved Templates</CardTitle>
                <CardDescription>Load a previously saved export template</CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[300px]">
                  <div className="space-y-3">
                    {savedTemplates.map((template) => (
                      <Card key={template.id} className="hover:bg-gray-50 cursor-pointer">
                        <CardContent className="pt-4">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <h4 className="font-medium">{template.name}</h4>
                              {template.description && (
                                <p className="text-sm text-gray-600 mt-1">{template.description}</p>
                              )}
                              <div className="flex items-center gap-2 mt-2">
                                <Badge variant="outline">{template.format.toUpperCase()}</Badge>
                                <Badge variant="outline">{template.fields.length} fields</Badge>
                                {template.schedule?.enabled && (
                                  <Badge variant="secondary">
                                    <Clock className="h-3 w-3 mr-1" />
                                    Scheduled
                                  </Badge>
                                )}
                              </div>
                            </div>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleLoadTemplate(template.id)}
                            >
                              Load
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Action Buttons */}
        <div className="flex gap-2 pt-4 border-t">
          <Button
            onClick={handleExport}
            disabled={isExporting}
            className="flex-1"
          >
            {isExporting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Exporting...
              </>
            ) : scheduleEnabled ? (
              <>
                <Calendar className="h-4 w-4 mr-2" />
                Schedule Export
              </>
            ) : (
              <>
                <Download className="h-4 w-4 mr-2" />
                Export Now
              </>
            )}
          </Button>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isExporting}>
            Cancel
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}