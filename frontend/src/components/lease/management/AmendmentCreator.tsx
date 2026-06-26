/**
 * Amendment Creator Component
 * Create and manage lease amendments
 */

import { useState } from 'react';
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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { CalendarIcon, Plus, X, Save, FileText } from 'lucide-react';
import { LeaseAmendment } from '@/services/leaseManagementService';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

interface AmendmentCreatorProps {
  leaseId: string;
  open: boolean;
  onClose: () => void;
  onSave: (amendment: Omit<LeaseAmendment, 'id' | 'createdAt'>) => Promise<void>;
}

export default function AmendmentCreator({
  leaseId,
  open,
  onClose,
  onSave
}: AmendmentCreatorProps) {
  const [type, setType] = useState<LeaseAmendment['type']>('rent-increase');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [effectiveDate, setEffectiveDate] = useState<Date>(new Date());
  const [changes, setChanges] = useState<Array<{ field: string; oldValue: string; newValue: string }>>([]);
  const [isSaving, setIsSaving] = useState(false);

  const amendmentTypes = [
    { value: 'rent-increase', label: 'Rent Increase' },
    { value: 'pet-addendum', label: 'Pet Addendum' },
    { value: 'parking', label: 'Parking Agreement' },
    { value: 'occupant-change', label: 'Occupant Change' },
    { value: 'term-extension', label: 'Term Extension' },
    { value: 'other', label: 'Other' }
  ];

  const handleAddChange = () => {
    setChanges([...changes, { field: '', oldValue: '', newValue: '' }]);
  };

  const handleRemoveChange = (index: number) => {
    setChanges(changes.filter((_, i) => i !== index));
  };

  const handleChangeUpdate = (index: number, field: keyof typeof changes[0], value: string) => {
    const newChanges = [...changes];
    newChanges[index][field] = value;
    setChanges(newChanges);
  };

  const handleSave = async () => {
    if (!title || !description) {
      return;
    }

    setIsSaving(true);
    try {
      await onSave({
        leaseId,
        type,
        title,
        description,
        changes: changes.filter(c => c.field && c.newValue),
        status: 'draft',
        effectiveDate,
        createdBy: 'current-user' // In production, get from auth
      });
      
      // Reset form
      setTitle('');
      setDescription('');
      setChanges([]);
      setEffectiveDate(new Date());
      onClose();
    } catch (error) {
      console.error('Failed to create amendment:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const getAmendmentTemplate = (type: string) => {
    switch (type) {
      case 'rent-increase':
        return {
          title: 'Rent Increase Amendment',
          description: 'This amendment increases the monthly rent amount.',
          changes: [
            { field: 'Monthly Rent', oldValue: '', newValue: '' }
          ]
        };
      case 'pet-addendum':
        return {
          title: 'Pet Addendum',
          description: 'This amendment allows the tenant to keep a pet on the premises.',
          changes: [
            { field: 'Pet Deposit', oldValue: '0', newValue: '' },
            { field: 'Pet Type', oldValue: 'None', newValue: '' }
          ]
        };
      case 'parking':
        return {
          title: 'Parking Agreement',
          description: 'This amendment adds parking space(s) to the lease.',
          changes: [
            { field: 'Parking Spaces', oldValue: '0', newValue: '' },
            { field: 'Parking Fee', oldValue: '0', newValue: '' }
          ]
        };
      case 'occupant-change':
        return {
          title: 'Occupant Change',
          description: 'This amendment modifies the list of occupants.',
          changes: [
            { field: 'Occupants', oldValue: '', newValue: '' }
          ]
        };
      case 'term-extension':
        return {
          title: 'Lease Term Extension',
          description: 'This amendment extends the lease end date.',
          changes: [
            { field: 'End Date', oldValue: '', newValue: '' }
          ]
        };
      default:
        return {
          title: '',
          description: '',
          changes: []
        };
    }
  };

  const handleTypeChange = (newType: LeaseAmendment['type']) => {
    setType(newType);
    const template = getAmendmentTemplate(newType);
    setTitle(template.title);
    setDescription(template.description);
    setChanges(template.changes);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Lease Amendment</DialogTitle>
          <DialogDescription>
            Add an amendment to modify the existing lease agreement
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Amendment Type */}
          <div className="space-y-2">
            <Label htmlFor="type">Amendment Type</Label>
            <Select value={type} onValueChange={(value) => handleTypeChange(value as LeaseAmendment['type'])}>
              <SelectTrigger id="type">
                <SelectValue placeholder="Select amendment type" />
              </SelectTrigger>
              <SelectContent>
                {amendmentTypes.map(t => (
                  <SelectItem key={t.value} value={t.value}>
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter amendment title"
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe the changes being made"
              rows={4}
            />
          </div>

          {/* Effective Date */}
          <div className="space-y-2">
            <Label>Effective Date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !effectiveDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {effectiveDate ? format(effectiveDate, "PPP") : <span>Pick a date</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={effectiveDate}
                  onSelect={(date) => setEffectiveDate(date || new Date())}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          <Separator />

          {/* Changes */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label>Specific Changes</Label>
              <Button variant="outline" size="sm" onClick={handleAddChange}>
                <Plus className="h-4 w-4 mr-2" />
                Add Change
              </Button>
            </div>

            {changes.length === 0 ? (
              <Card>
                <CardContent className="pt-6 text-center text-gray-500">
                  <FileText className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>No changes added yet</p>
                  <Button variant="link" onClick={handleAddChange} className="mt-2">
                    Add your first change
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {changes.map((change, index) => (
                  <Card key={index}>
                    <CardContent className="pt-6">
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <Badge variant="outline">Change {index + 1}</Badge>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemoveChange(index)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>

                        <div className="space-y-2">
                          <Label>Field Name</Label>
                          <Input
                            value={change.field}
                            onChange={(e) => handleChangeUpdate(index, 'field', e.target.value)}
                            placeholder="e.g., Monthly Rent, Pet Deposit"
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-2">
                            <Label>Old Value</Label>
                            <Input
                              value={change.oldValue}
                              onChange={(e) => handleChangeUpdate(index, 'oldValue', e.target.value)}
                              placeholder="Current value"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>New Value</Label>
                            <Input
                              value={change.newValue}
                              onChange={(e) => handleChangeUpdate(index, 'newValue', e.target.value)}
                              placeholder="New value"
                            />
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>

          {/* Preview */}
          {title && description && (
            <>
              <Separator />
              <Card className="bg-blue-50 border-blue-200">
                <CardHeader>
                  <CardTitle className="text-base">Amendment Preview</CardTitle>
                  <CardDescription>How this will appear in the lease</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Title</p>
                    <p className="font-semibold">{title}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-600">Description</p>
                    <p className="text-sm">{description}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-600">Effective Date</p>
                    <p className="text-sm">{format(effectiveDate, 'MMMM d, yyyy')}</p>
                  </div>
                  {changes.filter(c => c.field && c.newValue).length > 0 && (
                    <div>
                      <p className="text-sm font-medium text-gray-600 mb-2">Changes</p>
                      <div className="space-y-2">
                        {changes.filter(c => c.field && c.newValue).map((change, idx) => (
                          <div key={idx} className="text-sm bg-white p-2 rounded border">
                            <span className="font-medium">{change.field}:</span>{' '}
                            {change.oldValue && (
                              <>
                                <span className="line-through text-gray-500">{change.oldValue}</span>
                                {' → '}
                              </>
                            )}
                            <span className="text-green-700 font-medium">{change.newValue}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button variant="outline" onClick={onClose} disabled={isSaving}>
            <X className="h-4 w-4 mr-2" />
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isSaving || !title || !description}>
            <Save className="h-4 w-4 mr-2" />
            {isSaving ? 'Creating...' : 'Create Amendment'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}