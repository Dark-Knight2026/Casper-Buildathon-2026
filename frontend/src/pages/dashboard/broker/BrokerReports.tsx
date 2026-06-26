/**
 * Broker Reports Page
 * Financial and performance reports generation
 */

import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FileText,
  Download,
  RefreshCw,
  AlertCircle,
  Plus,
  Calendar,
  TrendingUp,
  DollarSign,
  Users,
  Activity
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase/client';
import { brokerService, type BrokerReport } from '@/services/brokerService';
import { ErrorBoundary } from '@/components/ui/error-boundary';

const REPORT_TYPES = [
  { key: 'financial', label: 'Financial Report', icon: DollarSign, color: 'text-green-600' },
  { key: 'performance', label: 'Performance Report', icon: TrendingUp, color: 'text-blue-600' },
  { key: 'commission', label: 'Commission Report', icon: Users, color: 'text-purple-600' },
  { key: 'activity', label: 'Activity Report', icon: Activity, color: 'text-orange-600' }
];

export default function BrokerReports() {
  const [reports, setReports] = useState<BrokerReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const { toast } = useToast();
  const navigate = useNavigate();

  const loadReports = useCallback(async () => {
    if (!userId) return;

    setLoading(true);
    setError(null);

    try {
      const reportType = typeFilter !== 'all' ? typeFilter : undefined;
      const data = await brokerService.getReports(userId, reportType);
      setReports(data);
    } catch (err) {
      console.error('Error loading reports:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to load reports';
      setError(errorMessage);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: errorMessage
      });
    } finally {
      setLoading(false);
    }
  }, [userId, typeFilter, toast]);

  useEffect(() => {
    const initializeUser = async () => {
      const {
        data: { user }
      } = await supabase.auth.getUser();

      if (!user) {
        navigate('/auth/login');
        return;
      }

      setUserId(user.id);
    };

    initializeUser();
  }, [navigate]);

  useEffect(() => {
    if (userId) {
      loadReports();
    }
  }, [userId, loadReports]);

  const getReportTypeConfig = (type: string) => {
    return REPORT_TYPES.find((t) => t.key === type) || REPORT_TYPES[0];
  };

  const getReportTypeColor = (type: string) => {
    switch (type) {
      case 'financial':
        return 'bg-green-100 text-green-800';
      case 'performance':
        return 'bg-blue-100 text-blue-800';
      case 'commission':
        return 'bg-purple-100 text-purple-800';
      case 'activity':
        return 'bg-orange-100 text-orange-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const downloadReport = (report: BrokerReport) => {
    const jsonContent = JSON.stringify(report.data, null, 2);
    const blob = new Blob([jsonContent], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${report.reportType}-report-${new Date(report.generatedAt).toISOString().split('T')[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);

    toast({
      title: 'Success',
      description: 'Report downloaded successfully'
    });
  };

  if (loading && reports.length === 0) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  if (error && reports.length === 0) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">Reports</h1>
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
        <Button onClick={loadReports}>
          <RefreshCw className="mr-2 h-4 w-4" />
          Try Again
        </Button>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Reports</h1>
            <p className="text-gray-500 mt-1">
              Generate and download comprehensive business reports
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={loadReports} disabled={loading}>
              <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Generate Report
            </Button>
          </div>
        </div>

        {/* Report Type Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {REPORT_TYPES.map((type) => {
            const Icon = type.icon;
            const count = reports.filter((r) => r.reportType === type.key).length;

            return (
              <Card key={type.key} className="cursor-pointer hover:shadow-md transition-shadow">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">{type.label}</CardTitle>
                  <Icon className={`h-4 w-4 ${type.color}`} />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{count}</div>
                  <p className="text-xs text-gray-500 mt-1">Generated reports</p>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <Button
                variant={typeFilter === 'all' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setTypeFilter('all')}
              >
                All Reports
              </Button>
              {REPORT_TYPES.map((type) => (
                <Button
                  key={type.key}
                  variant={typeFilter === type.key ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setTypeFilter(type.key)}
                >
                  {type.label}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Reports List */}
        <Card>
          <CardHeader>
            <CardTitle>Generated Reports</CardTitle>
            <CardDescription>All your business reports in one place</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {reports.length === 0 ? (
                <div className="text-center py-12">
                  <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No reports found</h3>
                  <p className="text-gray-500 mb-4">
                    {typeFilter !== 'all'
                      ? 'Try selecting a different report type'
                      : 'Generate your first report to get started'}
                  </p>
                  <Button>
                    <Plus className="mr-2 h-4 w-4" />
                    Generate Report
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  {reports.map((report) => {
                    const config = getReportTypeConfig(report.reportType);
                    const Icon = config.icon;

                    return (
                      <div
                        key={report.id}
                        className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors"
                      >
                        <div className="flex items-center gap-4 flex-1">
                          <div className={`p-3 rounded-lg bg-gray-100 ${config.color}`}>
                            <Icon className="h-6 w-6" />
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <h4 className="font-medium">{report.title}</h4>
                              <Badge className={getReportTypeColor(report.reportType)}>
                                {config.label}
                              </Badge>
                            </div>
                            {report.description && (
                              <p className="text-sm text-gray-500 mb-2">{report.description}</p>
                            )}
                            <div className="flex items-center gap-4 text-sm text-gray-600">
                              <span className="flex items-center gap-1">
                                <Calendar className="h-4 w-4" />
                                {new Date(report.dateFrom).toLocaleDateString()} -{' '}
                                {new Date(report.dateTo).toLocaleDateString()}
                              </span>
                              <span>
                                Generated: {new Date(report.generatedAt).toLocaleDateString()}
                              </span>
                            </div>
                          </div>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => downloadReport(report)}
                        >
                          <Download className="mr-2 h-4 w-4" />
                          Download
                        </Button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </ErrorBoundary>
  );
}