import { useState } from 'react';
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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { useTenantDashboard } from '@/contexts/TenantDashboardContext';
import { MaintenanceRequestForm as FormData, MaintenanceRequest } from '@/types/tenant';
import { Upload, X, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface MaintenanceRequestFormProps {
  onSuccess?: () => void;
  onCancel?: () => void;
}

export default function MaintenanceRequestForm({ onSuccess, onCancel }: MaintenanceRequestFormProps) {
  const { createMaintenanceRequest } = useTenantDashboard();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [attachments, setAttachments] = useState<File[]>([]);

  const [formData, setFormData] = useState<Omit<FormData, 'attachments'>>({
    title: '',
    description: '',
    category: 'other',
    priority: 'medium',
    allow_entry_when_absent: false
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files);
      setAttachments(prev => [...prev, ...newFiles]);
    }
  };

  const removeAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.title || !formData.description) {
      toast({
        title: 'Validation Error',
        description: 'Please fill in all required fields',
        variant: 'destructive'
      });
      return;
    }

    setIsSubmitting(true);
    try {
      await createMaintenanceRequest({
        ...formData,
        attachments
      });
      
      toast({
        title: 'Success',
        description: 'Maintenance request submitted successfully'
      });
      
      onSuccess?.();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to submit maintenance request',
        variant: 'destructive'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Submit Maintenance Request</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="title">Issue Title *</Label>
            <Input
              id="title"
              placeholder="Brief description of the issue"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="category">Category *</Label>
            <Select
              value={formData.category}
              onValueChange={(value: MaintenanceRequest['category']) => setFormData({ ...formData, category: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="plumbing">Plumbing</SelectItem>
                <SelectItem value="electrical">Electrical</SelectItem>
                <SelectItem value="hvac">HVAC</SelectItem>
                <SelectItem value="appliance">Appliance</SelectItem>
                <SelectItem value="structural">Structural</SelectItem>
                <SelectItem value="pest_control">Pest Control</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="priority">Priority *</Label>
            <Select
              value={formData.priority}
              onValueChange={(value: MaintenanceRequest['priority']) => setFormData({ ...formData, priority: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select priority" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="low">Low - Can wait a few days</SelectItem>
                <SelectItem value="medium">Medium - Should be addressed soon</SelectItem>
                <SelectItem value="high">High - Needs attention within 24 hours</SelectItem>
                <SelectItem value="urgent">Urgent - Emergency situation</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Detailed Description *</Label>
            <Textarea
              id="description"
              placeholder="Please provide detailed information about the issue, including when it started and any relevant details"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={5}
              required
            />
          </div>

          <div className="space-y-2">
            <Label>Attachments (Photos/Videos)</Label>
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
              <input
                type="file"
                id="file-upload"
                className="hidden"
                accept="image/*,video/*"
                multiple
                onChange={handleFileChange}
              />
              <label htmlFor="file-upload" className="cursor-pointer">
                <Upload className="h-8 w-8 mx-auto text-gray-400 mb-2" />
                <p className="text-sm text-gray-600">
                  Click to upload or drag and drop
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  PNG, JPG, MP4 up to 10MB
                </p>
              </label>
            </div>
            
            {attachments.length > 0 && (
              <div className="mt-4 space-y-2">
                {attachments.map((file, index) => (
                  <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                    <span className="text-sm truncate">{file.name}</span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeAttachment(index)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="allow-entry"
              checked={formData.allow_entry_when_absent}
              onCheckedChange={(checked) =>
                setFormData({ ...formData, allow_entry_when_absent: checked as boolean })
              }
            />
            <Label htmlFor="allow-entry" className="text-sm font-normal">
              Allow maintenance staff to enter when I'm not home
            </Label>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-start space-x-3">
            <AlertCircle className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-blue-800">
              <p className="font-medium mb-1">Response Time Guidelines:</p>
              <ul className="list-disc list-inside space-y-1 text-xs">
                <li>Urgent: Within 2 hours</li>
                <li>High: Within 24 hours</li>
                <li>Medium: Within 3 business days</li>
                <li>Low: Within 7 business days</li>
              </ul>
            </div>
          </div>

          <div className="flex space-x-3">
            <Button type="submit" disabled={isSubmitting} className="flex-1">
              {isSubmitting ? 'Submitting...' : 'Submit Request'}
            </Button>
            {onCancel && (
              <Button type="button" variant="outline" onClick={onCancel}>
                Cancel
              </Button>
            )}
          </div>
        </form>
      </CardContent>
    </Card>
  );
}