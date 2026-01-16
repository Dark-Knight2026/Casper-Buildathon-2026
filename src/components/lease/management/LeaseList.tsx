/**
 * Lease List Component
 * Displays leases in list or grid view with sorting and filtering
 */

import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  FileText,
  MoreVertical,
  Eye,
  Edit,
  RefreshCw,
  XCircle,
  Download,
  Send,
  Grid3x3,
  List,
  ArrowUpDown,
  Calendar,
  DollarSign,
  User,
  Building
} from 'lucide-react';
import { LeaseAgreement } from '@/types/lease';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

interface LeaseListProps {
  leases: LeaseAgreement[];
  selectedLeases: string[];
  onSelectLease: (leaseId: string) => void;
  onSelectAll: (selected: boolean) => void;
  onView: (leaseId: string) => void;
  onEdit: (leaseId: string) => void;
  onRenew: (leaseId: string) => void;
  onTerminate: (leaseId: string) => void;
  onDownload: (leaseId: string) => void;
  onSendForSignature: (leaseId: string) => void;
  sortBy: string;
  sortOrder: 'asc' | 'desc';
  onSort: (field: string) => void;
  viewMode: 'list' | 'grid';
  onViewModeChange: (mode: 'list' | 'grid') => void;
}

export default function LeaseList({
  leases,
  selectedLeases,
  onSelectLease,
  onSelectAll,
  onView,
  onEdit,
  onRenew,
  onTerminate,
  onDownload,
  onSendForSignature,
  sortBy,
  sortOrder,
  onSort,
  viewMode,
  onViewModeChange
}: LeaseListProps) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'draft':
        return 'bg-gray-100 text-gray-800 border-gray-200';
      case 'pending-signatures':
      case 'pending_approval':
      case 'under-review':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'expired':
      case 'terminated':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'expiring-soon':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      default:
        return 'bg-blue-100 text-blue-800 border-blue-200';
    }
  };

  const formatStatus = (status: string) => {
    return status.split(/[-_]/).map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  };

  const getDaysUntilExpiration = (endDate: Date) => {
    const today = new Date();
    const end = new Date(endDate);
    return Math.ceil((end.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  };

  const SortButton = ({ field, label }: { field: string; label: string }) => (
    <Button
      variant="ghost"
      size="sm"
      onClick={() => onSort(field)}
      className="h-8 px-2"
    >
      {label}
      <ArrowUpDown className={cn(
        "ml-2 h-4 w-4",
        sortBy === field && "text-blue-600"
      )} />
    </Button>
  );

  if (viewMode === 'grid') {
    return (
      <div className="space-y-4">
        {/* View Mode Toggle */}
        <div className="flex justify-end gap-2">
          <Button
            variant={viewMode === 'list' ? 'outline' : 'ghost'}
            size="sm"
            onClick={() => onViewModeChange('list')}
          >
            <List className="h-4 w-4" />
          </Button>
          <Button
            variant={viewMode === 'grid' ? 'outline' : 'ghost'}
            size="sm"
            onClick={() => onViewModeChange('grid')}
          >
            <Grid3x3 className="h-4 w-4" />
          </Button>
        </div>

        {/* Grid View */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {leases.map(lease => {
            const daysUntil = getDaysUntilExpiration(lease.endDate);
            const isExpiringSoon = daysUntil <= 90 && daysUntil > 0;
            
            return (
              <Card 
                key={lease.id}
                className={cn(
                  "hover:shadow-lg transition-shadow cursor-pointer",
                  selectedLeases.includes(lease.id) && "ring-2 ring-blue-500"
                )}
              >
                <CardContent className="pt-6">
                  <div className="space-y-4">
                    {/* Header */}
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <Checkbox
                          checked={selectedLeases.includes(lease.id)}
                          onCheckedChange={() => onSelectLease(lease.id)}
                          onClick={(e) => e.stopPropagation()}
                        />
                        <div className="flex-1">
                          <h3 className="font-semibold text-lg truncate">
                            {lease.propertyId}
                          </h3>
                          <p className="text-sm text-gray-600">
                            {lease.type.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
                          </p>
                        </div>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                          <Button variant="ghost" size="sm">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => onView(lease.id)}>
                            <Eye className="h-4 w-4 mr-2" />
                            View Details
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => onEdit(lease.id)}>
                            <Edit className="h-4 w-4 mr-2" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => onRenew(lease.id)}>
                            <RefreshCw className="h-4 w-4 mr-2" />
                            Renew
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => onDownload(lease.id)}>
                            <Download className="h-4 w-4 mr-2" />
                            Download
                          </DropdownMenuItem>
                          {lease.status === 'draft' && (
                            <DropdownMenuItem onClick={() => onSendForSignature(lease.id)}>
                              <Send className="h-4 w-4 mr-2" />
                              Send for Signature
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem 
                            onClick={() => onTerminate(lease.id)}
                            className="text-red-600"
                          >
                            <XCircle className="h-4 w-4 mr-2" />
                            Terminate
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>

                    {/* Status Badge */}
                    <div className="flex items-center gap-2">
                      <Badge className={getStatusColor(lease.status)}>
                        {formatStatus(lease.status)}
                      </Badge>
                      {isExpiringSoon && (
                        <Badge variant="outline" className="border-orange-300 text-orange-700">
                          {daysUntil} days left
                        </Badge>
                      )}
                    </div>

                    {/* Details */}
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center gap-2 text-gray-600">
                        <User className="h-4 w-4" />
                        <span>{lease.tenantIds.length} tenant(s)</span>
                      </div>
                      <div className="flex items-center gap-2 text-gray-600">
                        <DollarSign className="h-4 w-4" />
                        <span>${lease.monthlyRent.toLocaleString()}/mo</span>
                      </div>
                      <div className="flex items-center gap-2 text-gray-600">
                        <Calendar className="h-4 w-4" />
                        <span>
                          {format(new Date(lease.startDate), 'MMM d, yyyy')} - {format(new Date(lease.endDate), 'MMM d, yyyy')}
                        </span>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2 pt-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onView(lease.id)}
                        className="flex-1"
                      >
                        <Eye className="h-4 w-4 mr-2" />
                        View
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onEdit(lease.id)}
                        className="flex-1"
                      >
                        <Edit className="h-4 w-4 mr-2" />
                        Edit
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    );
  }

  // List View
  return (
    <div className="space-y-4">
      {/* View Mode Toggle */}
      <div className="flex justify-end gap-2">
        <Button
          variant={viewMode === 'list' ? 'outline' : 'ghost'}
          size="sm"
          onClick={() => onViewModeChange('list')}
        >
          <List className="h-4 w-4" />
        </Button>
        <Button
          variant={viewMode === 'grid' ? 'outline' : 'ghost'}
          size="sm"
          onClick={() => onViewModeChange('grid')}
        >
          <Grid3x3 className="h-4 w-4" />
        </Button>
      </div>

      {/* Table View */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">
                  <Checkbox
                    checked={selectedLeases.length === leases.length && leases.length > 0}
                    onCheckedChange={onSelectAll}
                  />
                </TableHead>
                <TableHead>
                  <SortButton field="propertyId" label="Property" />
                </TableHead>
                <TableHead>
                  <SortButton field="status" label="Status" />
                </TableHead>
                <TableHead>Tenants</TableHead>
                <TableHead>
                  <SortButton field="startDate" label="Start Date" />
                </TableHead>
                <TableHead>
                  <SortButton field="endDate" label="End Date" />
                </TableHead>
                <TableHead>
                  <SortButton field="monthlyRent" label="Rent" />
                </TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {leases.map(lease => {
                const daysUntil = getDaysUntilExpiration(lease.endDate);
                const isExpiringSoon = daysUntil <= 90 && daysUntil > 0;

                return (
                  <TableRow 
                    key={lease.id}
                    className={cn(
                      "cursor-pointer hover:bg-gray-50",
                      selectedLeases.includes(lease.id) && "bg-blue-50"
                    )}
                    onClick={() => onView(lease.id)}
                  >
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <Checkbox
                        checked={selectedLeases.includes(lease.id)}
                        onCheckedChange={() => onSelectLease(lease.id)}
                      />
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Building className="h-4 w-4 text-gray-400" />
                        <div>
                          <p className="font-medium">{lease.propertyId}</p>
                          <p className="text-xs text-gray-500">
                            {lease.type.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1">
                        <Badge className={getStatusColor(lease.status)}>
                          {formatStatus(lease.status)}
                        </Badge>
                        {isExpiringSoon && (
                          <Badge variant="outline" className="border-orange-300 text-orange-700 text-xs">
                            {daysUntil} days left
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-gray-400" />
                        <span>{lease.tenantIds.length}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {format(new Date(lease.startDate), 'MMM d, yyyy')}
                    </TableCell>
                    <TableCell>
                      {format(new Date(lease.endDate), 'MMM d, yyyy')}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <DollarSign className="h-4 w-4 text-gray-400" />
                        <span className="font-medium">
                          {lease.monthlyRent.toLocaleString()}
                        </span>
                        <span className="text-xs text-gray-500">/mo</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => onView(lease.id)}>
                            <Eye className="h-4 w-4 mr-2" />
                            View Details
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => onEdit(lease.id)}>
                            <Edit className="h-4 w-4 mr-2" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => onRenew(lease.id)}>
                            <RefreshCw className="h-4 w-4 mr-2" />
                            Renew
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => onDownload(lease.id)}>
                            <Download className="h-4 w-4 mr-2" />
                            Download
                          </DropdownMenuItem>
                          {lease.status === 'draft' && (
                            <DropdownMenuItem onClick={() => onSendForSignature(lease.id)}>
                              <Send className="h-4 w-4 mr-2" />
                              Send for Signature
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem 
                            onClick={() => onTerminate(lease.id)}
                            className="text-red-600"
                          >
                            <XCircle className="h-4 w-4 mr-2" />
                            Terminate
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}