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
import { useMessaging } from '@/hooks/useMessaging';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { Home } from 'lucide-react';

interface PropertyInquiryFormProps {
  agentId: string;
  agentName: string;
  onSuccess?: () => void;
}

export default function PropertyInquiryForm({
  agentId,
  agentName,
  onSuccess,
}: PropertyInquiryFormProps) {
  const { user } = useAuth();
  const { submitPropertyInquiry } = useMessaging();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const [formData, setFormData] = useState({
    propertyType: '',
    propertyAddress: '',
    budget: '',
    timeline: '',
    financing: '',
    message: '',
    userPhone: user?.phone || '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      toast({
        title: 'Authentication required',
        description: 'Please log in to submit an inquiry',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);
    try {
      await submitPropertyInquiry({
        agentId,
        agentName,
        userId: user.id,
        userName: user.name,
        userEmail: user.email,
        userPhone: formData.userPhone,
        propertyType: formData.propertyType,
        propertyAddress: formData.propertyAddress,
        budget: formData.budget,
        timeline: formData.timeline,
        financing: formData.financing,
        message: formData.message,
      });

      toast({
        title: 'Inquiry submitted',
        description: `Your property inquiry has been sent to ${agentName}`,
      });

      onSuccess?.();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to submit inquiry. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="propertyType">
          <Home className="h-4 w-4 inline mr-2" />
          Property Type *
        </Label>
        <Select
          required
          value={formData.propertyType}
          onValueChange={(value) => setFormData({ ...formData, propertyType: value })}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select property type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="Single Family Home">Single Family Home</SelectItem>
            <SelectItem value="Condo">Condo</SelectItem>
            <SelectItem value="Townhouse">Townhouse</SelectItem>
            <SelectItem value="Multi-Family">Multi-Family</SelectItem>
            <SelectItem value="Land">Land</SelectItem>
            <SelectItem value="Commercial">Commercial</SelectItem>
            <SelectItem value="Luxury Estate">Luxury Estate</SelectItem>
            <SelectItem value="Investment Property">Investment Property</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="propertyAddress">Specific Property Address (Optional)</Label>
        <Input
          id="propertyAddress"
          placeholder="123 Main St, City, State ZIP"
          value={formData.propertyAddress}
          onChange={(e) => setFormData({ ...formData, propertyAddress: e.target.value })}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="budget">Budget Range *</Label>
        <Select
          required
          value={formData.budget}
          onValueChange={(value) => setFormData({ ...formData, budget: value })}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select budget range" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="Under $200K">Under $200K</SelectItem>
            <SelectItem value="$200K - $400K">$200K - $400K</SelectItem>
            <SelectItem value="$400K - $600K">$400K - $600K</SelectItem>
            <SelectItem value="$600K - $800K">$600K - $800K</SelectItem>
            <SelectItem value="$800K - $1M">$800K - $1M</SelectItem>
            <SelectItem value="Over $1M">Over $1M</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="timeline">Timeline *</Label>
        <Select
          required
          value={formData.timeline}
          onValueChange={(value) => setFormData({ ...formData, timeline: value })}
        >
          <SelectTrigger>
            <SelectValue placeholder="When are you looking to buy?" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="Immediately">Immediately</SelectItem>
            <SelectItem value="Within 1 month">Within 1 month</SelectItem>
            <SelectItem value="1-3 months">1-3 months</SelectItem>
            <SelectItem value="3-6 months">3-6 months</SelectItem>
            <SelectItem value="6+ months">6+ months</SelectItem>
            <SelectItem value="Just browsing">Just browsing</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="financing">Financing *</Label>
        <Select
          required
          value={formData.financing}
          onValueChange={(value) => setFormData({ ...formData, financing: value })}
        >
          <SelectTrigger>
            <SelectValue placeholder="How will you finance?" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="Pre-approved">Pre-approved</SelectItem>
            <SelectItem value="Need pre-approval">Need pre-approval</SelectItem>
            <SelectItem value="Cash buyer">Cash buyer</SelectItem>
            <SelectItem value="VA Loan">VA Loan</SelectItem>
            <SelectItem value="FHA Loan">FHA Loan</SelectItem>
            <SelectItem value="Conventional">Conventional</SelectItem>
            <SelectItem value="Other">Other</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="userPhone">Phone Number *</Label>
        <Input
          id="userPhone"
          type="tel"
          required
          placeholder="(555) 123-4567"
          value={formData.userPhone}
          onChange={(e) => setFormData({ ...formData, userPhone: e.target.value })}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="message">Additional Details *</Label>
        <Textarea
          id="message"
          required
          placeholder="Tell us more about what you're looking for, any specific requirements, questions, or concerns..."
          rows={4}
          value={formData.message}
          onChange={(e) => setFormData({ ...formData, message: e.target.value })}
        />
      </div>

      <Button type="submit" className="w-full" disabled={isLoading}>
        {isLoading ? 'Submitting...' : 'Submit Inquiry'}
      </Button>
    </form>
  );
}