/**
 * Enhanced Delete Property Dialog
 * Shows warning about historical data and offers archive option
 */

import { useState, useEffect, useCallback } from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle, Archive, Trash2, Loader2 } from 'lucide-react';
import { propertyService } from '@/services/propertyService';
import type { Property, HistoricalDataCount } from '@/types/property';
import { useToast } from '@/hooks/use-toast';

interface DeletePropertyDialogProps {
  property: Property | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function DeletePropertyDialog({
  property,
  open,
  onOpenChange,
  onSuccess
}: DeletePropertyDialogProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [checkingData, setCheckingData] = useState(false);
  const [historicalData, setHistoricalData] = useState<HistoricalDataCount | null>(null);
  const [confirmationText, setConfirmationText] = useState('');
  const [action, setAction] = useState<'archive' | 'delete' | null>(null);

  const checkHistoricalData = useCallback(async () => {
    if (!property) return;

    setCheckingData(true);
    try {
      const data = await propertyService.getHistoricalDataCount(property.id);
      setHistoricalData(data);
    } catch (error) {
      console.error('Error checking historical data:', error);
      // Allow deletion if check fails
      setHistoricalData({
        leases: 0,
        payments: 0,
        maintenanceRequests: 0,
        applications: 0,
        hasHistoricalData: false
      });
    } finally {
      setCheckingData(false);
    }
  }, [property]);

  // Check for historical data when dialog opens
  useEffect(() => {
    if (open && property) {
      checkHistoricalData();
      setConfirmationText('');
      setAction(null);
    }
  }, [open, property, checkHistoricalData]);

  const handleArchive = async () => {
    if (!property) return;

    setLoading(true);
    try {
      await propertyService.archiveProperty(property.id, property.landlordId);
      
      toast({
        title: 'Property Archived',
        description: 'The property has been archived successfully. All historical data is preserved.',
      });

      onSuccess();
      onOpenChange(false);
    } catch (error) {
      console.error('Error archiving property:', error);
      toast({
        title: 'Archive Failed',
        description: error instanceof Error ? error.message : 'Failed to archive property',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!property) return;

    // Require confirmation text for deletion
    if (historicalData?.hasHistoricalData && confirmationText !== property.address) {
      toast({
        title: 'Confirmation Required',
        description: 'Please type the property address exactly to confirm deletion.',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    try {
      await propertyService.deleteProperty(property.id, property.landlordId);
      
      toast({
        title: 'Property Deleted',
        description: 'The property has been permanently deleted.',
      });

      onSuccess();
      onOpenChange(false);
    } catch (error) {
      console.error('Error deleting property:', error);
      toast({
        title: 'Delete Failed',
        description: error instanceof Error ? error.message : 'Failed to delete property',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAction = () => {
    if (action === 'archive') {
      handleArchive();
    } else if (action === 'delete') {
      handleDelete();
    }
  };

  if (!property) return null;

  const hasHistoricalData = historicalData?.hasHistoricalData;
  const isDeleteDisabled = hasHistoricalData && confirmationText !== property.address;

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-2xl">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            {hasHistoricalData ? 'Warning: Property Has Historical Data' : 'Delete Property'}
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-4">
              {checkingData ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  <span className="ml-2 text-sm text-muted-foreground">Checking historical data...</span>
                </div>
              ) : (
                <>
                  {hasHistoricalData ? (
                    <>
                      <Alert variant="destructive">
                        <AlertTriangle className="h-4 w-4" />
                        <AlertDescription>
                          This property has historical data that will be permanently lost if deleted.
                        </AlertDescription>
                      </Alert>

                      <div className="rounded-lg border bg-muted/50 p-4">
                        <h4 className="font-semibold mb-3">Associated Records:</h4>
                        <ul className="space-y-2 text-sm">
                          {historicalData.leases > 0 && (
                            <li className="flex items-center justify-between">
                              <span>Leases</span>
                              <span className="font-semibold">{historicalData.leases}</span>
                            </li>
                          )}
                          {historicalData.payments > 0 && (
                            <li className="flex items-center justify-between">
                              <span>Payments</span>
                              <span className="font-semibold">{historicalData.payments}</span>
                            </li>
                          )}
                          {historicalData.maintenanceRequests > 0 && (
                            <li className="flex items-center justify-between">
                              <span>Maintenance Requests</span>
                              <span className="font-semibold">{historicalData.maintenanceRequests}</span>
                            </li>
                          )}
                          {historicalData.applications > 0 && (
                            <li className="flex items-center justify-between">
                              <span>Applications</span>
                              <span className="font-semibold">{historicalData.applications}</span>
                            </li>
                          )}
                        </ul>
                      </div>

                      <Alert>
                        <Archive className="h-4 w-4" />
                        <AlertDescription>
                          <strong>Recommendation:</strong> Consider archiving this property instead of deleting it. 
                          Archiving will hide the property from your main list while preserving all historical records 
                          for reporting and compliance purposes.
                        </AlertDescription>
                      </Alert>

                      {action === 'delete' && (
                        <div className="space-y-2">
                          <Label htmlFor="confirmation" className="text-destructive">
                            Type the property address to confirm permanent deletion:
                          </Label>
                          <Input
                            id="confirmation"
                            placeholder={property.address}
                            value={confirmationText}
                            onChange={(e) => setConfirmationText(e.target.value)}
                            className="font-mono"
                          />
                          <p className="text-xs text-muted-foreground">
                            Address: <span className="font-semibold">{property.address}</span>
                          </p>
                        </div>
                      )}
                    </>
                  ) : (
                    <p>
                      Are you sure you want to delete <strong>{property.title}</strong>? 
                      This action cannot be undone.
                    </p>
                  )}
                </>
              )}
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>

        <AlertDialogFooter className="flex-col sm:flex-row gap-2">
          <AlertDialogCancel disabled={loading}>Cancel</AlertDialogCancel>
          
          {hasHistoricalData && (
            <>
              <AlertDialogAction
                onClick={() => {
                  setAction('archive');
                  handleArchive();
                }}
                disabled={loading || checkingData}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {loading && action === 'archive' && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                <Archive className="mr-2 h-4 w-4" />
                Archive Property
              </AlertDialogAction>

              <AlertDialogAction
                onClick={() => {
                  if (action !== 'delete') {
                    setAction('delete');
                  } else {
                    handleDelete();
                  }
                }}
                disabled={loading || checkingData || (action === 'delete' && isDeleteDisabled)}
                className="bg-destructive hover:bg-destructive/90"
              >
                {loading && action === 'delete' && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                <Trash2 className="mr-2 h-4 w-4" />
                {action === 'delete' ? 'Confirm Delete' : 'Delete Permanently'}
              </AlertDialogAction>
            </>
          )}

          {!hasHistoricalData && (
            <AlertDialogAction
              onClick={handleDelete}
              disabled={loading || checkingData}
              className="bg-destructive hover:bg-destructive/90"
            >
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              <Trash2 className="mr-2 h-4 w-4" />
              Delete Property
            </AlertDialogAction>
          )}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}