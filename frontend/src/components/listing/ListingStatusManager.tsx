import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import type { ListingStatus } from '@/types/listing-enhanced';
import {
  FileText,
  Eye,
  Clock,
  CheckCircle,
  XCircle,
  Archive,
  AlertCircle,
  TrendingUp,
} from 'lucide-react';

interface ListingStatusManagerProps {
  currentStatus: ListingStatus;
  listingId: string;
  onStatusChange: (newStatus: ListingStatus, reason?: string) => void;
}

export default function ListingStatusManager({ 
  currentStatus, 
  listingId, 
  onStatusChange 
}: ListingStatusManagerProps) {
  const { toast } = useToast();
  const [selectedStatus, setSelectedStatus] = useState<ListingStatus>(currentStatus);
  const [reason, setReason] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);

  const statusConfig: Record<ListingStatus, { 
    label: string; 
    icon: React.ReactNode; 
    color: string;
    description: string;
  }> = {
    draft: {
      label: 'Draft',
      icon: <FileText className="h-4 w-4" />,
      color: 'bg-gray-100 text-gray-800 border-gray-200',
      description: 'Not visible to public, still being prepared',
    },
    coming_soon: {
      label: 'Coming Soon',
      icon: <Clock className="h-4 w-4" />,
      color: 'bg-blue-100 text-blue-800 border-blue-200',
      description: 'Pre-marketing phase, generates interest',
    },
    active: {
      label: 'Active',
      icon: <Eye className="h-4 w-4" />,
      color: 'bg-green-100 text-green-800 border-green-200',
      description: 'Live and visible to all buyers',
    },
    pending: {
      label: 'Pending',
      icon: <Clock className="h-4 w-4" />,
      color: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      description: 'Offer accepted, awaiting contingencies',
    },
    under_contract: {
      label: 'Under Contract',
      icon: <CheckCircle className="h-4 w-4" />,
      color: 'bg-purple-100 text-purple-800 border-purple-200',
      description: 'In escrow, moving toward closing',
    },
    sold: {
      label: 'Sold',
      icon: <CheckCircle className="h-4 w-4" />,
      color: 'bg-green-100 text-green-800 border-green-200',
      description: 'Successfully closed',
    },
    rented: {
      label: 'Rented',
      icon: <CheckCircle className="h-4 w-4" />,
      color: 'bg-blue-100 text-blue-800 border-blue-200',
      description: 'Lease signed, tenant moved in',
    },
    off_market: {
      label: 'Off Market',
      icon: <XCircle className="h-4 w-4" />,
      color: 'bg-gray-100 text-gray-800 border-gray-200',
      description: 'Temporarily removed from market',
    },
    expired: {
      label: 'Expired',
      icon: <AlertCircle className="h-4 w-4" />,
      color: 'bg-red-100 text-red-800 border-red-200',
      description: 'Listing period ended',
    },
    archived: {
      label: 'Archived',
      icon: <Archive className="h-4 w-4" />,
      color: 'bg-gray-100 text-gray-800 border-gray-200',
      description: 'Moved to archive',
    },
  };

  const statusFlow: Record<ListingStatus, ListingStatus[]> = {
    draft: ['coming_soon', 'active'],
    coming_soon: ['active', 'draft', 'off_market'],
    active: ['pending', 'under_contract', 'off_market', 'expired'],
    pending: ['under_contract', 'active', 'expired'],
    under_contract: ['sold', 'rented', 'active'],
    sold: ['archived'],
    rented: ['archived'],
    off_market: ['active', 'archived'],
    expired: ['active', 'archived'],
    archived: [],
  };

  const handleStatusUpdate = async () => {
    if (selectedStatus === currentStatus) {
      toast({
        title: 'No change',
        description: 'Status is already set to this value.',
        variant: 'destructive',
      });
      return;
    }

    setIsUpdating(true);

    try {
      await onStatusChange(selectedStatus, reason);
      
      toast({
        title: 'Status updated',
        description: `Listing status changed to ${statusConfig[selectedStatus].label}`,
      });
      
      setReason('');
    } catch (error) {
      toast({
        title: 'Update failed',
        description: 'Failed to update listing status. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const allowedNextStatuses = statusFlow[currentStatus] || [];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <TrendingUp className="h-5 w-5 mr-2" />
          Listing Status Management
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Current Status */}
        <div>
          <Label className="mb-2 block">Current Status</Label>
          <Badge className={`${statusConfig[currentStatus].color} border text-base px-4 py-2`}>
            {statusConfig[currentStatus].icon}
            <span className="ml-2">{statusConfig[currentStatus].label}</span>
          </Badge>
          <p className="text-sm text-gray-600 mt-2">
            {statusConfig[currentStatus].description}
          </p>
        </div>

        {/* Status Workflow */}
        {allowedNextStatuses.length > 0 && (
          <div>
            <Label className="mb-2 block">Available Status Changes</Label>
            <div className="grid grid-cols-2 gap-2">
              {allowedNextStatuses.map((status) => (
                <Button
                  key={status}
                  variant={selectedStatus === status ? 'default' : 'outline'}
                  onClick={() => setSelectedStatus(status)}
                  className="justify-start"
                >
                  {statusConfig[status].icon}
                  <span className="ml-2">{statusConfig[status].label}</span>
                </Button>
              ))}
            </div>
          </div>
        )}

        {/* Change Reason */}
        {selectedStatus !== currentStatus && (
          <div>
            <Label htmlFor="reason">Reason for Change (Optional)</Label>
            <Textarea
              id="reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g., Offer accepted, buyer financing approved..."
              rows={3}
            />
          </div>
        )}

        {/* Update Button */}
        {selectedStatus !== currentStatus && (
          <Button 
            onClick={handleStatusUpdate} 
            disabled={isUpdating}
            className="w-full"
          >
            {isUpdating ? 'Updating...' : `Update to ${statusConfig[selectedStatus].label}`}
          </Button>
        )}

        {/* Status History Preview */}
        <div className="pt-4 border-t">
          <p className="text-sm font-medium text-gray-700 mb-2">Status Workflow</p>
          <div className="flex items-center space-x-2 overflow-x-auto pb-2">
            {Object.entries(statusConfig).map(([status, config], index) => (
              <div key={status} className="flex items-center">
                <Badge 
                  variant="outline" 
                  className={`whitespace-nowrap ${
                    status === currentStatus ? config.color : ''
                  }`}
                >
                  {config.icon}
                  <span className="ml-1 text-xs">{config.label}</span>
                </Badge>
                {index < Object.keys(statusConfig).length - 1 && (
                  <span className="mx-1 text-gray-400">→</span>
                )}
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}