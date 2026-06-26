import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Calendar } from '@/components/ui/calendar';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Calendar as CalendarIcon,
  Clock,
  DollarSign,
  CheckCircle,
  AlertCircle,
  TrendingUp,
  Zap
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface DynamicSchedule {
  id: string;
  payment_type: 'rent' | 'utility' | 'other';
  base_amount: number;
  schedule_type: 'fixed' | 'flexible' | 'smart';
  payment_day: number;
  auto_adjust: boolean;
  early_pay_enabled: boolean;
  split_enabled: boolean;
  created_at: Date;
}

interface PaymentReminder {
  id: string;
  days_before: number;
  channel: 'email' | 'sms' | 'push';
  enabled: boolean;
  custom_message?: string;
}

export default function PaymentScheduler() {
  const { toast } = useToast();
  
  const [schedule, setSchedule] = useState<DynamicSchedule>({
    id: 'sched-1',
    payment_type: 'rent',
    base_amount: 2200,
    schedule_type: 'smart',
    payment_day: 1,
    auto_adjust: true,
    early_pay_enabled: true,
    split_enabled: false,
    created_at: new Date()
  });

  const [reminders, setReminders] = useState<PaymentReminder[]>([
    { id: 'rem-1', days_before: 7, channel: 'email', enabled: true },
    { id: 'rem-2', days_before: 3, channel: 'push', enabled: true },
    { id: 'rem-3', days_before: 1, channel: 'sms', enabled: false }
  ]);

  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [customAmount, setCustomAmount] = useState<string>('');

  const scheduleTypes = [
    {
      type: 'fixed' as const,
      name: 'Fixed Schedule',
      description: 'Pay on the same day every month',
      icon: CalendarIcon,
      color: 'blue'
    },
    {
      type: 'flexible' as const,
      name: 'Flexible Schedule',
      description: 'Choose different payment dates',
      icon: Clock,
      color: 'purple'
    },
    {
      type: 'smart' as const,
      name: 'Smart Schedule',
      description: 'AI-optimized based on your payment patterns',
      icon: Zap,
      color: 'green'
    }
  ];

  const updateScheduleType = (type: 'fixed' | 'flexible' | 'smart') => {
    setSchedule({ ...schedule, schedule_type: type });
    toast({
      title: 'Schedule Updated',
      description: `Payment schedule changed to ${type} mode`
    });
  };

  const toggleReminder = (reminderId: string) => {
    setReminders(prev =>
      prev.map(rem =>
        rem.id === reminderId ? { ...rem, enabled: !rem.enabled } : rem
      )
    );
  };

  const addCustomReminder = () => {
    const newReminder: PaymentReminder = {
      id: `rem-${Date.now()}`,
      days_before: 5,
      channel: 'email',
      enabled: true
    };
    setReminders([...reminders, newReminder]);
  };

  const scheduleOneTimePayment = () => {
    if (!selectedDate || !customAmount) {
      toast({
        title: 'Missing Information',
        description: 'Please select a date and enter an amount',
        variant: 'destructive'
      });
      return;
    }

    toast({
      title: 'Payment Scheduled',
      description: `$${customAmount} scheduled for ${selectedDate.toLocaleDateString()}`
    });
  };

  return (
    <div className="space-y-6">
      {/* Schedule Type Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <CalendarIcon className="h-5 w-5 mr-2" />
            Payment Schedule Configuration
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {scheduleTypes.map(type => (
              <Card
                key={type.type}
                className={`cursor-pointer transition-all border-2 ${
                  schedule.schedule_type === type.type
                    ? `border-${type.color}-500 bg-${type.color}-50`
                    : 'border-gray-200 hover:border-gray-300'
                }`}
                onClick={() => updateScheduleType(type.type)}
              >
                <CardContent className="p-6 text-center">
                  <div className={`h-12 w-12 bg-${type.color}-100 rounded-full flex items-center justify-center mx-auto mb-3`}>
                    <type.icon className={`h-6 w-6 text-${type.color}-600`} />
                  </div>
                  <h4 className="font-semibold mb-2">{type.name}</h4>
                  <p className="text-sm text-gray-600">{type.description}</p>
                  {schedule.schedule_type === type.type && (
                    <Badge className={`mt-3 bg-${type.color}-600`}>
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Active
                    </Badge>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Schedule Settings */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-6 border-t">
            <div className="space-y-4">
              <div>
                <Label>Payment Day of Month</Label>
                <Select
                  value={schedule.payment_day.toString()}
                  onValueChange={(value) => setSchedule({ ...schedule, payment_day: parseInt(value) })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 28 }, (_, i) => i + 1).map(day => (
                      <SelectItem key={day} value={day.toString()}>
                        {day}{day === 1 ? 'st' : day === 2 ? 'nd' : day === 3 ? 'rd' : 'th'} of the month
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Base Payment Amount</Label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    type="number"
                    value={schedule.base_amount}
                    onChange={(e) => setSchedule({ ...schedule, base_amount: parseFloat(e.target.value) })}
                    className="pl-10"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div>
                  <p className="font-medium">Auto-Adjust for Weekends</p>
                  <p className="text-sm text-gray-600">Move payment to previous Friday if due on weekend</p>
                </div>
                <Switch
                  checked={schedule.auto_adjust}
                  onCheckedChange={(checked) => setSchedule({ ...schedule, auto_adjust: checked })}
                />
              </div>

              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div>
                  <p className="font-medium">Enable Early Pay Discounts</p>
                  <p className="text-sm text-gray-600">Get discounts for paying early</p>
                </div>
                <Switch
                  checked={schedule.early_pay_enabled}
                  onCheckedChange={(checked) => setSchedule({ ...schedule, early_pay_enabled: checked })}
                />
              </div>

              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div>
                  <p className="font-medium">Enable Roommate Split</p>
                  <p className="text-sm text-gray-600">Split payments with roommates</p>
                </div>
                <Switch
                  checked={schedule.split_enabled}
                  onCheckedChange={(checked) => setSchedule({ ...schedule, split_enabled: checked })}
                />
              </div>
            </div>
          </div>

          {/* Smart Schedule Info */}
          {schedule.schedule_type === 'smart' && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-start space-x-3">
              <TrendingUp className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-green-800">
                <p className="font-medium mb-1">Smart Schedule Active</p>
                <p>
                  Based on your payment history, we recommend paying on the {schedule.payment_day}th. 
                  This aligns with your typical cash flow and maximizes early payment discounts.
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Payment Reminders */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center">
              <AlertCircle className="h-5 w-5 mr-2" />
              Payment Reminders
            </span>
            <Button size="sm" onClick={addCustomReminder}>
              Add Reminder
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {reminders.map(reminder => (
            <Card key={reminder.id} className="border">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4 flex-1">
                    <Switch
                      checked={reminder.enabled}
                      onCheckedChange={() => toggleReminder(reminder.id)}
                    />
                    <div>
                      <p className="font-medium">
                        {reminder.days_before} days before payment
                      </p>
                      <p className="text-sm text-gray-600">
                        Via {reminder.channel.toUpperCase()}
                      </p>
                    </div>
                  </div>
                  <Badge className={reminder.enabled ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}>
                    {reminder.enabled ? 'Active' : 'Inactive'}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          ))}

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-start space-x-3">
            <AlertCircle className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-blue-800">
              <p className="font-medium mb-1">Smart Reminders</p>
              <p>
                We'll send you reminders based on your payment patterns. You typically pay 2-3 days 
                before the due date, so we'll remind you accordingly.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* One-Time Payment Scheduler */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Clock className="h-5 w-5 mr-2" />
            Schedule One-Time Payment
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <Label className="mb-2 block">Select Payment Date</Label>
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={setSelectedDate}
                className="rounded-md border"
                disabled={(date) => date < new Date()}
              />
            </div>

            <div className="space-y-4">
              <div>
                <Label>Payment Amount</Label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    type="number"
                    placeholder="Enter amount"
                    value={customAmount}
                    onChange={(e) => setCustomAmount(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>

              <div>
                <Label>Payment Type</Label>
                <Select defaultValue="rent">
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="rent">Rent Payment</SelectItem>
                    <SelectItem value="utility">Utility Payment</SelectItem>
                    <SelectItem value="maintenance">Maintenance Fee</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Payment Method</Label>
                <Select defaultValue="default">
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="default">Default Payment Method</SelectItem>
                    <SelectItem value="card">Credit Card ****4242</SelectItem>
                    <SelectItem value="bank">Bank Account ****5678</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {selectedDate && customAmount && (
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-sm text-gray-600 mb-2">Payment Summary</p>
                  <div className="space-y-1">
                    <div className="flex justify-between">
                      <span className="font-medium">Amount:</span>
                      <span className="font-bold">${customAmount}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-medium">Date:</span>
                      <span>{selectedDate.toLocaleDateString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-medium">Status:</span>
                      <Badge className="bg-yellow-100 text-yellow-800">Scheduled</Badge>
                    </div>
                  </div>
                </div>
              )}

              <Button onClick={scheduleOneTimePayment} className="w-full" size="lg">
                <CalendarIcon className="h-4 w-4 mr-2" />
                Schedule Payment
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}