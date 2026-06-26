/**
 * Report Builder Component
 * Drag-and-drop interface for building custom reports
 */

import { useState } from 'react';
import { DndContext, DragEndEvent, DragOverlay, DragStartEvent, closestCenter } from '@dnd-kit/core';
import { SortableContext, arrayMove, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Plus, Save, Play, Download, GripVertical, X } from 'lucide-react';
import { reportService, availableMetrics } from '@/services/reportService';
import type { ReportConfig, ReportField, ReportFilter, ReportMetric, ReportGrouping, ReportDateRange } from '@/types/report';
import { SortableField } from './SortableField';
import { FilterBuilder } from './FilterBuilder';

export function ReportBuilder() {
  const [reportName, setReportName] = useState('');
  const [reportDescription, setReportDescription] = useState('');
  const [selectedFields, setSelectedFields] = useState<ReportField[]>([]);
  const [filters, setFilters] = useState<ReportFilter[]>([]);
  const [groupBy, setGroupBy] = useState<ReportGrouping[]>([]);
  const [dateRange, setDateRange] = useState<ReportDateRange>('last_30_days');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [chartType, setChartType] = useState<'bar' | 'line' | 'pie' | 'area' | 'table'>('table');
  const [activeId, setActiveId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      setSelectedFields((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id);
        const newIndex = items.findIndex((item) => item.id === over.id);
        return arrayMove(items, oldIndex, newIndex);
      });
    }

    setActiveId(null);
  };

  const handleAddField = (metric: ReportMetric) => {
    const metricInfo = availableMetrics.find((m) => m.id === metric);
    if (!metricInfo) return;

    const newField: ReportField = {
      id: `field_${Date.now()}`,
      label: metricInfo.label,
      metric: metricInfo.id,
      aggregation: metricInfo.defaultAggregation,
      format: metricInfo.format,
    };

    setSelectedFields([...selectedFields, newField]);
  };

  const handleRemoveField = (fieldId: string) => {
    setSelectedFields(selectedFields.filter((f) => f.id !== fieldId));
  };

  const handleAddGroupBy = (group: ReportGrouping) => {
    if (!groupBy.includes(group)) {
      setGroupBy([...groupBy, group]);
    }
  };

  const handleRemoveGroupBy = (group: ReportGrouping) => {
    setGroupBy(groupBy.filter((g) => g !== group));
  };

  const handleSaveTemplate = async () => {
    if (!reportName.trim()) {
      alert('Please enter a report name');
      return;
    }

    if (selectedFields.length === 0) {
      alert('Please add at least one field');
      return;
    }

    setIsSaving(true);
    try {
      const config: ReportConfig = {
        name: reportName,
        description: reportDescription,
        fields: selectedFields,
        filters,
        groupBy,
        dateRange: {
          type: dateRange,
          startDate: dateRange === 'custom' ? customStartDate : undefined,
          endDate: dateRange === 'custom' ? customEndDate : undefined,
        },
        chartType,
      };

      await reportService.saveTemplate(config);
      alert('Report template saved successfully!');
    } catch (error) {
      console.error('Error saving template:', error);
      alert('Failed to save report template');
    } finally {
      setIsSaving(false);
    }
  };

  const handleGenerateReport = async () => {
    if (selectedFields.length === 0) {
      alert('Please add at least one field');
      return;
    }

    setIsGenerating(true);
    try {
      const config: ReportConfig = {
        name: reportName || 'Untitled Report',
        fields: selectedFields,
        filters,
        groupBy,
        dateRange: {
          type: dateRange,
          startDate: dateRange === 'custom' ? customStartDate : undefined,
          endDate: dateRange === 'custom' ? customEndDate : undefined,
        },
        chartType,
      };

      const data = await reportService.generateReport(config);
      // In production, this would navigate to a report view page
      console.log('Generated report:', data);
      alert('Report generated successfully! Check console for data.');
    } catch (error) {
      console.error('Error generating report:', error);
      alert('Failed to generate report');
    } finally {
      setIsGenerating(false);
    }
  };

  const metricsByCategory = availableMetrics.reduce((acc, metric) => {
    if (!acc[metric.category]) {
      acc[metric.category] = [];
    }
    acc[metric.category].push(metric);
    return acc;
  }, {} as Record<string, typeof availableMetrics>);

  return (
    <div className="container mx-auto py-8 max-w-7xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Custom Report Builder</h1>
        <p className="text-gray-600">Create custom reports with drag-and-drop fields and filters</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Panel - Available Fields */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>Available Metrics</CardTitle>
            <CardDescription>Drag metrics to add them to your report</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="financial">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="financial">Financial</TabsTrigger>
                <TabsTrigger value="occupancy">Occupancy</TabsTrigger>
              </TabsList>
              <TabsContent value="financial" className="space-y-2 mt-4">
                <ScrollArea className="h-[400px] pr-4">
                  {metricsByCategory.financial?.map((metric) => (
                    <div
                      key={metric.id}
                      className="p-3 border rounded-lg mb-2 hover:bg-gray-50 cursor-pointer"
                      onClick={() => handleAddField(metric.id)}
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="font-medium text-sm">{metric.label}</p>
                          <p className="text-xs text-gray-600 mt-1">{metric.description}</p>
                        </div>
                        <Plus className="h-4 w-4 text-gray-400 flex-shrink-0 mt-1" />
                      </div>
                    </div>
                  ))}
                </ScrollArea>
              </TabsContent>
              <TabsContent value="occupancy" className="space-y-2 mt-4">
                <ScrollArea className="h-[400px] pr-4">
                  {metricsByCategory.occupancy?.map((metric) => (
                    <div
                      key={metric.id}
                      className="p-3 border rounded-lg mb-2 hover:bg-gray-50 cursor-pointer"
                      onClick={() => handleAddField(metric.id)}
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="font-medium text-sm">{metric.label}</p>
                          <p className="text-xs text-gray-600 mt-1">{metric.description}</p>
                        </div>
                        <Plus className="h-4 w-4 text-gray-400 flex-shrink-0 mt-1" />
                      </div>
                    </div>
                  ))}
                </ScrollArea>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        {/* Right Panel - Report Configuration */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Report Configuration</CardTitle>
            <CardDescription>Configure your custom report</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Report Details */}
            <div className="space-y-4">
              <div>
                <Label htmlFor="report-name">Report Name *</Label>
                <Input
                  id="report-name"
                  placeholder="e.g., Monthly Financial Summary"
                  value={reportName}
                  onChange={(e) => setReportName(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="report-description">Description</Label>
                <Input
                  id="report-description"
                  placeholder="Brief description of this report"
                  value={reportDescription}
                  onChange={(e) => setReportDescription(e.target.value)}
                />
              </div>
            </div>

            <Separator />

            {/* Selected Fields */}
            <div>
              <Label className="mb-3 block">Selected Fields ({selectedFields.length})</Label>
              {selectedFields.length === 0 ? (
                <div className="text-center py-8 text-gray-500 border-2 border-dashed rounded-lg">
                  <p>No fields selected</p>
                  <p className="text-sm mt-1">Add metrics from the left panel</p>
                </div>
              ) : (
                <DndContext
                  collisionDetection={closestCenter}
                  onDragStart={handleDragStart}
                  onDragEnd={handleDragEnd}
                >
                  <SortableContext items={selectedFields.map((f) => f.id)} strategy={verticalListSortingStrategy}>
                    <div className="space-y-2">
                      {selectedFields.map((field) => (
                        <SortableField key={field.id} field={field} onRemove={handleRemoveField} />
                      ))}
                    </div>
                  </SortableContext>
                  <DragOverlay>
                    {activeId ? (
                      <div className="bg-white border-2 border-blue-500 rounded-lg p-3 shadow-lg">
                        <GripVertical className="h-4 w-4 text-gray-400" />
                      </div>
                    ) : null}
                  </DragOverlay>
                </DndContext>
              )}
            </div>

            <Separator />

            {/* Filters */}
            <div>
              <Label className="mb-3 block">Filters</Label>
              <FilterBuilder filters={filters} onChange={setFilters} />
            </div>

            <Separator />

            {/* Group By */}
            <div>
              <Label className="mb-3 block">Group By</Label>
              <div className="flex flex-wrap gap-2 mb-3">
                {groupBy.map((group) => (
                  <Badge key={group} variant="secondary" className="cursor-pointer" onClick={() => handleRemoveGroupBy(group)}>
                    {group.replace('_', ' ')}
                    <X className="h-3 w-3 ml-1" />
                  </Badge>
                ))}
              </div>
              <Select onValueChange={(value) => handleAddGroupBy(value as ReportGrouping)}>
                <SelectTrigger>
                  <SelectValue placeholder="Add grouping" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="property">Property</SelectItem>
                  <SelectItem value="month">Month</SelectItem>
                  <SelectItem value="quarter">Quarter</SelectItem>
                  <SelectItem value="year">Year</SelectItem>
                  <SelectItem value="tenant">Tenant</SelectItem>
                  <SelectItem value="unit_type">Unit Type</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Separator />

            {/* Date Range */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="date-range">Date Range</Label>
                <Select value={dateRange} onValueChange={(value) => setDateRange(value as ReportDateRange)}>
                  <SelectTrigger id="date-range">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="last_7_days">Last 7 Days</SelectItem>
                    <SelectItem value="last_30_days">Last 30 Days</SelectItem>
                    <SelectItem value="last_90_days">Last 90 Days</SelectItem>
                    <SelectItem value="last_year">Last Year</SelectItem>
                    <SelectItem value="year_to_date">Year to Date</SelectItem>
                    <SelectItem value="custom">Custom Range</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="chart-type">Chart Type</Label>
                <Select value={chartType} onValueChange={(value) => setChartType(value as typeof chartType)}>
                  <SelectTrigger id="chart-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="table">Table</SelectItem>
                    <SelectItem value="bar">Bar Chart</SelectItem>
                    <SelectItem value="line">Line Chart</SelectItem>
                    <SelectItem value="pie">Pie Chart</SelectItem>
                    <SelectItem value="area">Area Chart</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {dateRange === 'custom' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="start-date">Start Date</Label>
                  <Input
                    id="start-date"
                    type="date"
                    value={customStartDate}
                    onChange={(e) => setCustomStartDate(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="end-date">End Date</Label>
                  <Input
                    id="end-date"
                    type="date"
                    value={customEndDate}
                    onChange={(e) => setCustomEndDate(e.target.value)}
                  />
                </div>
              </div>
            )}

            <Separator />

            {/* Actions */}
            <div className="flex gap-3">
              <Button onClick={handleGenerateReport} disabled={isGenerating || selectedFields.length === 0}>
                <Play className="mr-2 h-4 w-4" />
                {isGenerating ? 'Generating...' : 'Generate Report'}
              </Button>
              <Button variant="outline" onClick={handleSaveTemplate} disabled={isSaving}>
                <Save className="mr-2 h-4 w-4" />
                {isSaving ? 'Saving...' : 'Save Template'}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}