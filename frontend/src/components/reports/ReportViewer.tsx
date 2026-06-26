/**
 * Report Viewer Component
 * Display generated reports with charts and tables
 */

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Download, FileText, FileSpreadsheet, FileImage } from 'lucide-react';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import type { ReportConfig, ReportData, ExportFormat } from '@/types/report';
import { reportService } from '@/services/reportService';

interface ReportViewerProps {
  config: ReportConfig;
  data?: ReportData;
}

const COLORS = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899'];

export function ReportViewer({ config, data: initialData }: ReportViewerProps) {
  const [data, setData] = useState<ReportData | null>(initialData || null);
  const [isLoading, setIsLoading] = useState(!initialData);
  const [isExporting, setIsExporting] = useState(false);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const result = await reportService.generateReport(config);
      setData(result);
    } catch (error) {
      console.error('Error loading report data:', error);
    } finally {
      setIsLoading(false);
    }
  }, [config]);

  useEffect(() => {
    if (!initialData) {
      loadData();
    }
  }, [initialData, loadData]);

  const handleExport = async (format: ExportFormat) => {
    if (!data) return;

    setIsExporting(true);
    try {
      const blob = await reportService.exportReport(config, format);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${config.name.replace(/\s+/g, '_')}.${format === 'excel' ? 'xlsx' : format}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error exporting report:', error);
      alert('Failed to export report');
    } finally {
      setIsExporting(false);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Generating report...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!data) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <p className="text-gray-600">No data available</p>
        </CardContent>
      </Card>
    );
  }

  const chartData = data.chartData
    ? data.chartData.labels.map((label, index) => {
        const point: Record<string, string | number> = { name: label };
        data.chartData?.datasets.forEach((dataset) => {
          point[dataset.label] = dataset.data[index];
        });
        return point;
      })
    : [];

  const renderChart = () => {
    if (!data.chartData || config.chartType === 'table') return null;

    const commonProps = {
      data: chartData,
      margin: { top: 5, right: 30, left: 20, bottom: 5 },
    };

    switch (config.chartType) {
      case 'bar':
        return (
          <ResponsiveContainer width="100%" height={400}>
            <BarChart {...commonProps}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Legend />
              {data.chartData.datasets.map((dataset, index) => (
                <Bar key={dataset.label} dataKey={dataset.label} fill={COLORS[index % COLORS.length]} />
              ))}
            </BarChart>
          </ResponsiveContainer>
        );

      case 'line':
        return (
          <ResponsiveContainer width="100%" height={400}>
            <LineChart {...commonProps}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Legend />
              {data.chartData.datasets.map((dataset, index) => (
                <Line
                  key={dataset.label}
                  type="monotone"
                  dataKey={dataset.label}
                  stroke={COLORS[index % COLORS.length]}
                  strokeWidth={2}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        );

      case 'area':
        return (
          <ResponsiveContainer width="100%" height={400}>
            <AreaChart {...commonProps}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Legend />
              {data.chartData.datasets.map((dataset, index) => (
                <Area
                  key={dataset.label}
                  type="monotone"
                  dataKey={dataset.label}
                  fill={COLORS[index % COLORS.length]}
                  stroke={COLORS[index % COLORS.length]}
                />
              ))}
            </AreaChart>
          </ResponsiveContainer>
        );

      case 'pie': {
        const pieData = data.chartData.datasets[0]?.data.map((value, index) => ({
          name: data.chartData!.labels[index],
          value,
        }));
        return (
          <ResponsiveContainer width="100%" height={400}>
            <PieChart>
              <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={120} label>
                {pieData?.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        );
      }

      default:
        return null;
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle>{config.name}</CardTitle>
            {config.description && <CardDescription className="mt-1">{config.description}</CardDescription>}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => handleExport('csv')} disabled={isExporting}>
              <FileText className="mr-2 h-4 w-4" />
              CSV
            </Button>
            <Button variant="outline" size="sm" onClick={() => handleExport('excel')} disabled={isExporting}>
              <FileSpreadsheet className="mr-2 h-4 w-4" />
              Excel
            </Button>
            <Button variant="outline" size="sm" onClick={() => handleExport('pdf')} disabled={isExporting}>
              <FileImage className="mr-2 h-4 w-4" />
              PDF
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue={config.chartType === 'table' ? 'table' : 'chart'}>
          <TabsList>
            {config.chartType !== 'table' && <TabsTrigger value="chart">Chart</TabsTrigger>}
            <TabsTrigger value="table">Table</TabsTrigger>
            {data.summary && <TabsTrigger value="summary">Summary</TabsTrigger>}
          </TabsList>

          {config.chartType !== 'table' && (
            <TabsContent value="chart" className="mt-6">
              {renderChart()}
            </TabsContent>
          )}

          <TabsContent value="table" className="mt-6">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b bg-gray-50">
                    {data.headers.map((header) => (
                      <th key={header} className="px-4 py-3 text-left text-sm font-semibold text-gray-900">
                        {header}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {data.rows.map((row, index) => (
                    <tr key={index} className="border-b hover:bg-gray-50">
                      {data.headers.map((header) => {
                        const key = header.toLowerCase().replace(/ /g, '_');
                        const value = row[key];
                        return (
                          <td key={header} className="px-4 py-3 text-sm text-gray-900">
                            {typeof value === 'number' ? value.toLocaleString() : value}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </TabsContent>

          {data.summary && (
            <TabsContent value="summary" className="mt-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {Object.entries(data.summary).map(([key, value]) => (
                  <Card key={key}>
                    <CardContent className="pt-6">
                      <p className="text-sm text-gray-600 mb-1">{key.replace(/_/g, ' ').toUpperCase()}</p>
                      <p className="text-2xl font-bold">{value.toLocaleString()}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>
          )}
        </Tabs>
      </CardContent>
    </Card>
  );
}