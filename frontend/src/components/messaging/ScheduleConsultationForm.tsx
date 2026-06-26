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
import { Calendar, Clock } from 'lucide-react';

interface ScheduleConsultationFormProps {
  agentId: string;
  agentName: string;
  onSuccess?: () => void;
}

export default function ScheduleConsultationForm({
  agentId,
  agentName,
  onSuccess,
}: ScheduleConsultationFormProps) {
  const { user } = useAuth();
  const { scheduleConsultation } = useMessaging();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const [formData, setFormData] = useState({
    preferredDate: '',
    preferredTime: '',
    propertyType: '',
    budget: '',
    location: '',
    message: '',
    userPhone: user?.phone || '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      toast({
        title: 'Authentication required',
        description: 'Please log in to schedule a consultation',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);
    try {
      await scheduleConsultation({
        agentId,
        agentName,
        userId: user.id,
        userName: user.name,
        userEmail: user.email,
        userPhone: formData.userPhone,
        preferredDate: new Date(formData.preferredDate),
        preferredTime: formData.preferredTime,
        propertyType: formData.propertyType,
        budget: formData.budget,
        location: formData.location,
        message: formData.message,
      });

      toast({
        title: 'Consultation scheduled',
        description: `Your consultation request has been sent to ${agentName}`,
      });

      onSuccess?.();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to schedule consultation. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="preferredDate">
            <Calendar className="h-4 w-4 inline mr-2" />
            Preferred Date *
          </Label>
          <Input
            id="preferredDate"
            type="date"
            required
            min={new Date().toISOString().split('T')[0]}
            value={formData.preferredDate}
            onChange={(e) => setFormData({ ...formData, preferredDate: e.target.value })}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="preferredTime">
            <Clock className="h-4 w-4 inline mr-2" />
            Preferred Time *
          </Label>
          <Select
            required
            value={formData.preferredTime}
            onValueChange={(value) => setFormData({ ...formData, preferredTime: value })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select time" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="9:00 AM">9:00 AM</SelectItem>
              <SelectItem value="10:00 AM">10:00 AM</SelectItem>
              <SelectItem value="11:00 AM">11:00 AM</SelectItem>
              <SelectItem value="12:00 PM">12:00 PM</SelectItem>
              <SelectItem value="1:00 PM">1:00 PM</SelectItem>
              <SelectItem value="2:00 PM">2:00 PM</SelectItem>
              <SelectItem value="3:00 PM">3:00 PM</SelectItem>
              <SelectItem value="4:00 PM">4:00 PM</SelectItem>
              <SelectItem value="5:00 PM">5:00 PM</SelectItem>
            </SelectContent>
          </Select>
        </div>
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
        <Label htmlFor="propertyType">Property Type</Label>
        <Select
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
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="budget">Budget Range</Label>
        <Select
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
        <Label htmlFor="location">Preferred Location</Label>
        <Input
          id="location"
          placeholder="City, neighborhood, or zip code"
          value={formData.location}
          onChange={(e) => setFormData({ ...formData, location: e.target.value })}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="message">Additional Message</Label>
        <Textarea
          id="message"
          placeholder="Tell the agent about your needs, questions, or specific requirements..."
          rows={4}
          value={formData.message}
          onChange={(e) => setFormData({ ...formData, message: e.target.value })}
        />
      </div>

      <Button type="submit" className="w-full" disabled={isLoading}>
        {isLoading ? 'Scheduling...' : 'Schedule Consultation'}
      </Button>
    </form>
  );
}