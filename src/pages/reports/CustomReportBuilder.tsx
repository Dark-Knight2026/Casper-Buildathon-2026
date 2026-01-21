/**
 * Custom Report Builder Page
 * Main page for building and managing custom reports
 */

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, FileText, Clock } from 'lucide-react';
import { ReportBuilder } from '@/components/reports/ReportBuilder';
import { ReportViewer } from '@/components/reports/ReportViewer';
import { ComparativeAnalytics } from '@/components/reports/ComparativeAnalytics';
import { reportService } from '@/services/reportService';
import type { ReportTemplate, ReportConfig } from '@/types/report';

export default function CustomReportBuilder() {
  const [activeTab, setActiveTab] = useState('builder');
  const [selectedTemplate, setSelectedTemplate] = useState<ReportTemplate | null>(null);
  const [previewConfig, setPreviewConfig] = useState<ReportConfig | null>(null);

  const { data: templates, isLoading: templatesLoading } = useQuery({
    queryKey: ['report-templates'],
    queryFn: () => reportService.getTemplates(),
  });

  const handleUseTemplate = (template: ReportTemplate) => {
    setSelectedTemplate(template);
    setPreviewConfig(template);
    setActiveTab('preview');
  };

  const handleNewReport = () => {
    setSelectedTemplate(null);
    setPreviewConfig(null);
    setActiveTab('builder');
  };

  return (
    <div className="container mx-auto py-8 max-w-7xl">
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2">Advanced Reporting</h1>
            <p className="text-gray-600">Build custom reports, analyze trends, and export data</p>
          </div>
          <Button onClick={handleNewReport}>
            <Plus className="mr-2 h-4 w-4" />
            New Report
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="builder">Report Builder</TabsTrigger>
          <TabsTrigger value="templates">Templates</TabsTrigger>
          <TabsTrigger value="preview" disabled={!previewConfig}>
            Preview
          </TabsTrigger>
          <TabsTrigger value="comparative" disabled={!previewConfig}>
            Comparative
          </TabsTrigger>
        </TabsList>

        <TabsContent value="builder" className="mt-6">
          <ReportBuilder />
        </TabsContent>

        <TabsContent value="templates" className="mt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {templatesLoading ? (
              <div className="col-span-full flex items-center justify-center py-12">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                  <p className="text-gray-600">Loading templates...</p>
                </div>
              </div>
            ) : templates && templates.length > 0 ? (
              templates.map((template) => (
                <Card key={template.id} className="hover:shadow-lg transition-shadow cursor-pointer">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <FileText className="h-8 w-8 text-blue-600 mb-2" />
                      <span className="text-xs text-gray-500">{template.usageCount} uses</span>
                    </div>
                    <CardTitle className="text-lg">{template.name}</CardTitle>
                    {template.description && <CardDescription>{template.description}</CardDescription>}
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 mb-4">
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Clock className="h-4 w-4" />
                        <span>{template.fields.length} metrics</span>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {template.groupBy.slice(0, 3).map((group) => (
                          <span key={group} className="text-xs bg-gray-100 px-2 py-1 rounded">
                            {group}
                          </span>
                        ))}
                      </div>
                    </div>
                    <Button className="w-full" onClick={() => handleUseTemplate(template)}>
                      Use Template
                    </Button>
                  </CardContent>
                </Card>
              ))
            ) : (
              <div className="col-span-full text-center py-12">
                <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">No templates available</p>
                <Button variant="outline" className="mt-4" onClick={handleNewReport}>
                  Create Your First Report
                </Button>
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="preview" className="mt-6">
          {previewConfig ? (
            <ReportViewer config={previewConfig} />
          ) : (
            <Card>
              <CardContent className="flex items-center justify-center py-12">
                <p className="text-gray-600">No report selected</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="comparative" className="mt-6">
          {previewConfig ? (
            <ComparativeAnalytics config={previewConfig} />
          ) : (
            <Card>
              <CardContent className="flex items-center justify-center py-12">
                <p className="text-gray-600">No report selected</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}