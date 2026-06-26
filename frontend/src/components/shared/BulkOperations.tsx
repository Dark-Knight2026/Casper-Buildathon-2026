/**
 * Bulk Operations Component
 * Advanced bulk operations for properties, tenants, and maintenance requests
 */

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import {
  CheckSquare,
  Square,
  Edit,
  Trash2,
  Mail,
  FileText,
  AlertCircle,
  CheckCircle,
  Loader2,
  Users,
  Home,
  Wrench
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface BulkItem {
  id: string;
  address?: string;
  name?: string;
  title?: string;
  city?: string;
  email?: string;
  propertyAddress?: string;
  status?: string;
}

interface BulkOperationsProps {
  items: BulkItem[];
  selectedItems: string[];
  onSelectionChange: (selectedIds: string[]) => void;
  onBulkAction: (action: BulkAction, selectedIds: string[], options?: Record<string, string>) => void;
  itemType: 'properties' | 'tenants' | 'maintenance';
}

interface BulkAction {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  description: string;
  requiresConfirmation: boolean;
  options?: BulkActionOption[];
}

interface BulkActionOption {
  id: string;
  label: string;
  type: 'select' | 'text' | 'number';
  options?: { value: string; label: string }[];
  required?: boolean;
}

export default function BulkOperations({
  items,
  selectedItems,
  onSelectionChange,
  onBulkAction,
  itemType
}: BulkOperationsProps) {
  const { toast } = useToast();
  const [showActionDialog, setShowActionDialog] = useState(false);
  const [selectedAction, setSelectedAction] = useState<BulkAction | null>(null);
  const [actionOptions, setActionOptions] = useState<Record<string, string>>({});
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingProgress, setProcessingProgress] = useState(0);

  // Define bulk actions based on item type
  const getBulkActions = (): BulkAction[] => {
    if (itemType === 'properties') {
      return [
        {
          id: 'update_status',
          label: 'Update Status',
          icon: Edit,
          description: 'Change status for selected properties',
          requiresConfirmation: false,
          options: [
            {
              id: 'status',
              label: 'New Status',
              type: 'select',
              options: [
                { value: 'available', label: 'Available' },
                { value: 'rented', label: 'Rented' },
                { value: 'maintenance', label: 'Under Maintenance' }
              ],
              required: true
            }
          ]
        },
        {
          id: 'export_documents',
          label: 'Export Documents',
          icon: FileText,
          description: 'Generate documents for selected properties',
          requiresConfirmation: false,
          options: [
            {
              id: 'document_type',
              label: 'Document Type',
              type: 'select',
              options: [
                { value: 'property_report', label: 'Property Report' },
                { value: 'financial_summary', label: 'Financial Summary' },
                { value: 'tax_document', label: 'Tax Document' }
              ],
              required: true
            }
          ]
        },
        {
          id: 'delete',
          label: 'Delete Properties',
          icon: Trash2,
          description: 'Permanently delete selected properties',
          requiresConfirmation: true
        }
      ];
    } else if (itemType === 'tenants') {
      return [
        {
          id: 'send_email',
          label: 'Send Email',
          icon: Mail,
          description: 'Send email to selected tenants',
          requiresConfirmation: false,
          options: [
            {
              id: 'email_template',
              label: 'Email Template',
              type: 'select',
              options: [
                { value: 'rent_reminder', label: 'Rent Reminder' },
                { value: 'lease_renewal', label: 'Lease Renewal Notice' },
                { value: 'maintenance_notice', label: 'Maintenance Notice' },
                { value: 'general', label: 'General Announcement' }
              ],
              required: true
            }
          ]
        },
        {
          id: 'update_status',
          label: 'Update Status',
          icon: Edit,
          description: 'Change status for selected tenants',
          requiresConfirmation: false,
          options: [
            {
              id: 'status',
              label: 'New Status',
              type: 'select',
              options: [
                { value: 'active', label: 'Active' },
                { value: 'inactive', label: 'Inactive' },
                { value: 'pending', label: 'Pending' }
              ],
              required: true
            }
          ]
        },
        {
          id: 'export_contacts',
          label: 'Export Contacts',
          icon: FileText,
          description: 'Export contact information for selected tenants',
          requiresConfirmation: false
        }
      ];
    } else {
      return [
        {
          id: 'assign_vendor',
          label: 'Assign Vendor',
          icon: Users,
          description: 'Assign vendor to selected maintenance requests',
          requiresConfirmation: false,
          options: [
            {
              id: 'vendor_id',
              label: 'Vendor',
              type: 'select',
              options: [
                { value: 'vendor1', label: 'ABC Plumbing' },
                { value: 'vendor2', label: 'XYZ Electric' },
                { value: 'vendor3', label: 'Pro HVAC Services' }
              ],
              required: true
            }
          ]
        },
        {
          id: 'update_priority',
          label: 'Update Priority',
          icon: AlertCircle,
          description: 'Change priority for selected requests',
          requiresConfirmation: false,
          options: [
            {
              id: 'priority',
              label: 'New Priority',
              type: 'select',
              options: [
                { value: 'low', label: 'Low' },
                { value: 'medium', label: 'Medium' },
                { value: 'high', label: 'High' },
                { value: 'urgent', label: 'Urgent' }
              ],
              required: true
            }
          ]
        },
        {
          id: 'update_status',
          label: 'Update Status',
          icon: Edit,
          description: 'Change status for selected requests',
          requiresConfirmation: false,
          options: [
            {
              id: 'status',
              label: 'New Status',
              type: 'select',
              options: [
                { value: 'new', label: 'New' },
                { value: 'assigned', label: 'Assigned' },
                { value: 'in-progress', label: 'In Progress' },
                { value: 'completed', label: 'Completed' }
              ],
              required: true
            }
          ]
        }
      ];
    }
  };

  const bulkActions = getBulkActions();

  const handleSelectAll = () => {
    if (selectedItems.length === items.length) {
      onSelectionChange([]);
    } else {
      onSelectionChange(items.map(item => item.id));
    }
  };

  const handleSelectItem = (itemId: string) => {
    if (selectedItems.includes(itemId)) {
      onSelectionChange(selectedItems.filter(id => id !== itemId));
    } else {
      onSelectionChange([...selectedItems, itemId]);
    }
  };

  const handleActionClick = (action: BulkAction) => {
    if (selectedItems.length === 0) {
      toast({
        title: 'No Items Selected',
        description: 'Please select at least one item to perform this action',
        variant: 'destructive'
      });
      return;
    }

    setSelectedAction(action);
    setActionOptions({});
    setShowActionDialog(true);
  };

  const handleExecuteAction = async () => {
    if (!selectedAction) return;

    // Validate required options
    if (selectedAction.options) {
      const missingOptions = selectedAction.options.filter(
        opt => opt.required && !actionOptions[opt.id]
      );
      if (missingOptions.length > 0) {
        toast({
          title: 'Missing Required Options',
          description: 'Please fill in all required fields',
          variant: 'destructive'
        });
        return;
      }
    }

    setIsProcessing(true);
    setProcessingProgress(0);

    // Simulate processing with progress
    const totalItems = selectedItems.length;
    for (let i = 0; i <= totalItems; i++) {
      await new Promise(resolve => setTimeout(resolve, 200));
      setProcessingProgress((i / totalItems) * 100);
    }

    onBulkAction(selectedAction, selectedItems, actionOptions);

    toast({
      title: 'Action Completed',
      description: `${selectedAction.label} applied to ${selectedItems.length} item(s)`
    });

    setIsProcessing(false);
    setShowActionDialog(false);
    setSelectedAction(null);
    setActionOptions({});
    onSelectionChange([]);
  };

  const getItemTypeIcon = () => {
    switch (itemType) {
      case 'properties':
        return Home;
      case 'tenants':
        return Users;
      case 'maintenance':
        return Wrench;
      default:
        return CheckSquare;
    }
  };

  const ItemIcon = getItemTypeIcon();

  return (
    <div className="space-y-4">
      {/* Selection Bar */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="outline"
                size="sm"
                onClick={handleSelectAll}
              >
                {selectedItems.length === items.length ? (
                  <CheckSquare className="h-4 w-4 mr-2" />
                ) : (
                  <Square className="h-4 w-4 mr-2" />
                )}
                {selectedItems.length === items.length ? 'Deselect All' : 'Select All'}
              </Button>

              {selectedItems.length > 0 && (
                <Badge variant="secondary" className="text-sm">
                  {selectedItems.length} selected
                </Badge>
              )}
            </div>

            {selectedItems.length > 0 && (
              <div className="flex items-center gap-2">
                {bulkActions.map((action) => (
                  <Button
                    key={action.id}
                    variant="outline"
                    size="sm"
                    onClick={() => handleActionClick(action)}
                  >
                    <action.icon className="h-4 w-4 mr-2" />
                    {action.label}
                  </Button>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Items List with Checkboxes */}
      <div className="space-y-2">
        {items.map((item) => (
          <Card key={item.id} className="hover:bg-gray-50 transition-colors">
            <CardContent className="pt-4">
              <div className="flex items-center gap-4">
                <Checkbox
                  checked={selectedItems.includes(item.id)}
                  onCheckedChange={() => handleSelectItem(item.id)}
                />
                <ItemIcon className="h-5 w-5 text-gray-500" />
                <div className="flex-1">
                  <p className="font-medium">
                    {item.address || item.name || item.title}
                  </p>
                  <p className="text-sm text-gray-500">
                    {item.city || item.email || item.propertyAddress}
                  </p>
                </div>
                {item.status && (
                  <Badge variant="outline">{item.status}</Badge>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Bulk Action Dialog */}
      <Dialog open={showActionDialog} onOpenChange={setShowActionDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {selectedAction?.label}
            </DialogTitle>
            <DialogDescription>
              {selectedAction?.description}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            {/* Selected Items Summary */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Selected Items</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="text-lg px-4 py-2">
                    {selectedItems.length}
                  </Badge>
                  <span className="text-sm text-gray-600">
                    {itemType} will be affected by this action
                  </span>
                </div>
              </CardContent>
            </Card>

            {/* Action Options */}
            {selectedAction?.options && selectedAction.options.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Action Options</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {selectedAction.options.map((option) => (
                    <div key={option.id}>
                      <Label>
                        {option.label}
                        {option.required && <span className="text-red-500 ml-1">*</span>}
                      </Label>
                      {option.type === 'select' && option.options && (
                        <Select
                          value={actionOptions[option.id] || ''}
                          onValueChange={(value) =>
                            setActionOptions({ ...actionOptions, [option.id]: value })
                          }
                        >
                          <SelectTrigger className="mt-2">
                            <SelectValue placeholder={`Select ${option.label.toLowerCase()}`} />
                          </SelectTrigger>
                          <SelectContent>
                            {option.options.map((opt) => (
                              <SelectItem key={opt.value} value={opt.value}>
                                {opt.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            {/* Confirmation Warning */}
            {selectedAction?.requiresConfirmation && (
              <Card className="border-red-200 bg-red-50">
                <CardContent className="pt-6">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="h-5 w-5 text-red-600 mt-0.5" />
                    <div>
                      <p className="font-medium text-red-900">Warning</p>
                      <p className="text-sm text-red-700 mt-1">
                        This action cannot be undone. Please confirm that you want to proceed.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Processing Progress */}
            {isProcessing && (
              <Card>
                <CardContent className="pt-6">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">Processing...</span>
                      <span className="font-medium">{Math.round(processingProgress)}%</span>
                    </div>
                    <Progress value={processingProgress} />
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Action Buttons */}
            <div className="flex gap-2">
              <Button
                onClick={handleExecuteAction}
                disabled={isProcessing}
                className="flex-1"
                variant={selectedAction?.requiresConfirmation ? 'destructive' : 'default'}
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <CheckCircle className="h-4 w-4 mr-2" />
                    {selectedAction?.requiresConfirmation ? 'Confirm & Execute' : 'Execute Action'}
                  </>
                )}
              </Button>
              <Button
                variant="outline"
                onClick={() => setShowActionDialog(false)}
                disabled={isProcessing}
              >
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}