/**
 * Lease Edit Form
 * Form for editing existing lease details
 */

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { CalendarIcon, Save, X } from 'lucide-react';
import { LeaseAgreement, LeaseType, LeaseStatus } from '@/types/lease';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

interface LeaseEditFormProps {
  lease: LeaseAgreement | null;
  open: boolean;
  onClose: () => void;
  onSave: (updates: Partial<LeaseAgreement>) => Promise<void>;
}

export default function LeaseEditForm({
  lease,
  open,
  onClose,
  onSave
}: LeaseEditFormProps) {
  const [formData, setFormData] = useState<Partial<LeaseAgreement>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('basic');

  useEffect(() => {
    if (lease) {
      setFormData({
        type: lease.type,
        status: lease.status,
        startDate: lease.startDate,
        endDate: lease.endDate,
        monthlyRent: lease.monthlyRent,
        securityDeposit: lease.securityDeposit,
        lateFee: lease.lateFee,
        petDeposit: lease.petDeposit
      });
    }
  }, [lease]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSave(formData);
      onClose();
    } catch (error) {
      console.error('Failed to save lease:', error);
    } finally {
      setIsSaving(false);
    }
  };

  if (!lease) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>Edit Lease Agreement</DialogTitle>
          <DialogDescription>
            Make changes to the lease agreement. Click save when you're done.
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="basic">Basic Info</TabsTrigger>
            <TabsTrigger value="dates">Dates & Term</TabsTrigger>
            <TabsTrigger value="financial">Financial</TabsTrigger>
          </TabsList>

          {/* Basic Info Tab */}
          <TabsContent value="basic" className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="type">Lease Type</Label>
                <Select
                  value={formData.type}
                  onValueChange={(value) => setFormData({ ...formData, type: value as LeaseType })}
                >
                  <SelectTrigger id="type">
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="residential-long-term">Residential Long-term</SelectItem>
                    <SelectItem value="residential-short-term">Residential Short-term</SelectItem>
                    <SelectItem value="commercial">Commercial</SelectItem>
                    <SelectItem value="student-housing">Student Housing</SelectItem>
                    <SelectItem value="vacation-rental">Vacation Rental</SelectItem>
                    <SelectItem value="month-to-month">Month-to-Month</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Select
                  value={formData.status}
                  onValueChange={(value) => setFormData({ ...formData, status: value as LeaseStatus })}
                >
                  <SelectTrigger id="status">
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="under-review">Under Review</SelectItem>
                    <SelectItem value="pending-signatures">Pending Signatures</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="expiring-soon">Expiring Soon</SelectItem>
                    <SelectItem value="expired">Expired</SelectItem>
                    <SelectItem value="terminated">Terminated</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Property ID</Label>
              <Input value={lease.propertyId} disabled className="bg-gray-50" />
              <p className="text-xs text-gray-500">Property cannot be changed</p>
            </div>
          </TabsContent>

          {/* Dates Tab */}
          <TabsContent value="dates" className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Start Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !formData.startDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {formData.startDate ? (
                        format(new Date(formData.startDate), "PPP")
                      ) : (
                        <span>Pick a date</span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={formData.startDate ? new Date(formData.startDate) : undefined}
                      onSelect={(date) => setFormData({ ...formData, startDate: date || new Date() })}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="space-y-2">
                <Label>End Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !formData.endDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {formData.endDate ? (
                        format(new Date(formData.endDate), "PPP")
                      ) : (
                        <span>Pick a date</span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={formData.endDate ? new Date(formData.endDate) : undefined}
                      onSelect={(date) => setFormData({ ...formData, endDate: date || new Date() })}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            {formData.startDate && formData.endDate && (
              <Card>
                <CardContent className="pt-6">
                  <div className="text-center">
                    <p className="text-sm text-gray-600 mb-1">Lease Duration</p>
                    <p className="text-2xl font-bold">
                      {Math.ceil(
                        (new Date(formData.endDate).getTime() - new Date(formData.startDate).getTime()) /
                        (1000 * 60 * 60 * 24 * 30)
                      )} months
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Financial Tab */}
          <TabsContent value="financial" className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="monthlyRent">Monthly Rent</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                  <Input
                    id="monthlyRent"
                    type="number"
                    value={formData.monthlyRent || ''}
                    onChange={(e) => setFormData({ ...formData, monthlyRent: parseFloat(e.target.value) })}
                    className="pl-7"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="securityDeposit">Security Deposit</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                  <Input
                    id="securityDeposit"
                    type="number"
                    value={formData.securityDeposit || ''}
                    onChange={(e) => setFormData({ ...formData, securityDeposit: parseFloat(e.target.value) })}
                    className="pl-7"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="lateFee">Late Fee (Optional)</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                  <Input
                    id="lateFee"
                    type="number"
                    value={formData.lateFee || ''}
                    onChange={(e) => setFormData({ ...formData, lateFee: parseFloat(e.target.value) || undefined })}
                    className="pl-7"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="petDeposit">Pet Deposit (Optional)</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                  <Input
                    id="petDeposit"
                    type="number"
                    value={formData.petDeposit || ''}
                    onChange={(e) => setFormData({ ...formData, petDeposit: parseFloat(e.target.value) || undefined })}
                    className="pl-7"
                  />
                </div>
              </div>
            </div>

            <Card className="bg-blue-50 border-blue-200">
              <CardHeader>
                <CardTitle className="text-base">Move-in Cost Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span>Monthly Rent</span>
                    <span className="font-medium">${(formData.monthlyRent || 0).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Security Deposit</span>
                    <span className="font-medium">${(formData.securityDeposit || 0).toLocaleString()}</span>
                  </div>
                  {formData.petDeposit && (
                    <div className="flex justify-between">
                      <span>Pet Deposit</span>
                      <span className="font-medium">${formData.petDeposit.toLocaleString()}</span>
                    </div>
                  )}
                  <div className="border-t pt-2 flex justify-between text-lg font-bold">
                    <span>Total</span>
                    <span>
                      ${((formData.monthlyRent || 0) + (formData.securityDeposit || 0) + (formData.petDeposit || 0)).toLocaleString()}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Action Buttons */}
        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button variant="outline" onClick={onClose} disabled={isSaving}>
            <X className="h-4 w-4 mr-2" />
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isSaving}>
            <Save className="h-4 w-4 mr-2" />
            {isSaving ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}