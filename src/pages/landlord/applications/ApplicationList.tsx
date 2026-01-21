import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { ApplicationService } from '@/services/applicationService';
import type { TenantApplication, ApplicationFilters } from '@/types/application';
import { Search, Filter, Download, Eye, CheckCircle, XCircle, Clock } from 'lucide-react';
import { format } from 'date-fns';

const statusColors: Record<string, string> = {
  draft: 'bg-gray-500',
  pending: 'bg-yellow-500',
  under_review: 'bg-blue-500',
  approved: 'bg-green-500',
  denied: 'bg-red-500',
  conditional: 'bg-orange-500',
};

const statusLabels: Record<string, string> = {
  draft: 'Draft',
  pending: 'Pending Review',
  under_review: 'Under Review',
  approved: 'Approved',
  denied: 'Denied',
  conditional: 'Conditional',
};

export default function ApplicationList() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const [applications, setApplications] = useState<TenantApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<ApplicationFilters>({
    status: [],
    searchTerm: '',
  });

  const loadApplications = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const data = await ApplicationService.getApplicationsByLandlord(user.id, filters);
      setApplications(data);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to load applications',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [filters, user, toast]);

  useEffect(() => {
    loadApplications();
  }, [loadApplications]);

  const handleStatusFilter = (status: string) => {
    setFilters((prev) => {
      const currentStatuses = prev.status || [];
      const newStatuses = currentStatuses.includes(status)
        ? currentStatuses.filter((s) => s !== status)
        : [...currentStatuses, status];
      return { ...prev, status: newStatuses };
    });
  };

  const handleSearch = (searchTerm: string) => {
    setFilters((prev) => ({ ...prev, searchTerm }));
  };

  const handleViewApplication = (id: string) => {
    navigate(`/landlord/applications/${id}`);
  };

  const handleExportCSV = () => {
    // TODO: Implement CSV export
    toast({
      title: 'Export',
      description: 'CSV export feature coming soon',
    });
  };

  const getScoreColor = (score?: number) => {
    if (!score) return 'text-gray-500';
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-blue-600';
    if (score >= 40) return 'text-orange-600';
    return 'text-red-600';
  };

  const getScoreLabel = (score?: number) => {
    if (!score) return 'Not scored';
    if (score >= 80) return 'Excellent';
    if (score >= 60) return 'Good';
    if (score >= 40) return 'Fair';
    return 'Poor';
  };

  if (!user) {
    return (
      <div className="container mx-auto py-8">
        <p className="text-center text-gray-500">Please log in to view applications</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Tenant Applications</h1>
        <p className="text-gray-600">Review and manage tenant applications for your properties</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Total Applications</CardDescription>
            <CardTitle className="text-3xl">{applications.length}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Pending Review</CardDescription>
            <CardTitle className="text-3xl">
              {applications.filter((a) => a.applicationStatus === 'pending').length}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Under Review</CardDescription>
            <CardTitle className="text-3xl">
              {applications.filter((a) => a.applicationStatus === 'under_review').length}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Approved</CardDescription>
            <CardTitle className="text-3xl text-green-600">
              {applications.filter((a) => a.applicationStatus === 'approved').length}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Search by name, email, or phone..."
                  className="pl-10"
                  value={filters.searchTerm}
                  onChange={(e) => handleSearch(e.target.value)}
                />
              </div>
            </div>
            <div className="flex gap-2 flex-wrap">
              <Button
                variant={filters.status?.includes('pending') ? 'default' : 'outline'}
                size="sm"
                onClick={() => handleStatusFilter('pending')}
              >
                Pending
              </Button>
              <Button
                variant={filters.status?.includes('under_review') ? 'default' : 'outline'}
                size="sm"
                onClick={() => handleStatusFilter('under_review')}
              >
                Under Review
              </Button>
              <Button
                variant={filters.status?.includes('approved') ? 'default' : 'outline'}
                size="sm"
                onClick={() => handleStatusFilter('approved')}
              >
                Approved
              </Button>
              <Button
                variant={filters.status?.includes('denied') ? 'default' : 'outline'}
                size="sm"
                onClick={() => handleStatusFilter('denied')}
              >
                Denied
              </Button>
              <Button variant="outline" size="sm" onClick={handleExportCSV}>
                <Download className="mr-2 h-4 w-4" />
                Export CSV
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Applications Table */}
      <Card>
        <CardContent className="pt-6">
          {loading ? (
            <div className="text-center py-12">
              <p className="text-gray-500">Loading applications...</p>
            </div>
          ) : applications.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500">No applications found</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Applicant</TableHead>
                  <TableHead>Property</TableHead>
                  <TableHead>Submitted</TableHead>
                  <TableHead>Score</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {applications.map((application) => (
                  <TableRow key={application.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">
                          {application.personalInfo.firstName} {application.personalInfo.lastName}
                        </p>
                        <p className="text-sm text-gray-500">{application.personalInfo.email}</p>
                        <p className="text-sm text-gray-500">{application.personalInfo.phone}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <p className="text-sm">Property #{application.propertyId.slice(0, 8)}</p>
                    </TableCell>
                    <TableCell>
                      {application.submittedAt ? (
                        <p className="text-sm">
                          {format(new Date(application.submittedAt), 'MMM d, yyyy')}
                        </p>
                      ) : (
                        <p className="text-sm text-gray-400">Not submitted</p>
                      )}
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className={`font-semibold ${getScoreColor(application.applicationScore)}`}>
                          {application.applicationScore || '-'}
                        </p>
                        <p className="text-xs text-gray-500">
                          {getScoreLabel(application.applicationScore)}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={statusColors[application.applicationStatus]}>
                        {statusLabels[application.applicationStatus]}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleViewApplication(application.id)}
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          View
                        </Button>
                        {application.applicationStatus === 'pending' && (
                          <>
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-green-600 hover:text-green-700"
                            >
                              <CheckCircle className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-red-600 hover:text-red-700"
                            >
                              <XCircle className="h-4 w-4" />
                            </Button>
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}