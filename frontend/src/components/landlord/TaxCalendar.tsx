import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar, Bell, Plus, AlertCircle, CheckCircle2, Clock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface TaxDeadline {
  id: string;
  title: string;
  date: Date;
  category: 'federal' | 'state' | 'property' | 'estimated' | 'other';
  priority: 'high' | 'medium' | 'low';
  description: string;
  completed: boolean;
}

interface Reminder {
  id: string;
  deadlineId: string;
  reminderDate: Date;
  notificationMethod: 'email' | 'sms' | 'both';
}

const TAX_DEADLINES: TaxDeadline[] = [
  {
    id: '1',
    title: 'Q1 Estimated Tax Payment',
    date: new Date(2024, 3, 15), // April 15
    category: 'estimated',
    priority: 'high',
    description: 'First quarter estimated tax payment for 2024',
    completed: false,
  },
  {
    id: '2',
    title: 'Property Tax Payment - Spring',
    date: new Date(2024, 3, 10), // April 10
    category: 'property',
    priority: 'high',
    description: 'Spring property tax installment due',
    completed: false,
  },
  {
    id: '3',
    title: 'Annual Tax Return Filing',
    date: new Date(2024, 3, 15), // April 15
    category: 'federal',
    priority: 'high',
    description: 'File Form 1040 with Schedule E for rental income',
    completed: false,
  },
  {
    id: '4',
    title: 'Q2 Estimated Tax Payment',
    date: new Date(2024, 5, 15), // June 15
    category: 'estimated',
    priority: 'high',
    description: 'Second quarter estimated tax payment for 2024',
    completed: false,
  },
  {
    id: '5',
    title: 'Property Insurance Renewal',
    date: new Date(2024, 6, 1), // July 1
    category: 'other',
    priority: 'medium',
    description: 'Review and renew property insurance policies',
    completed: false,
  },
  {
    id: '6',
    title: 'Q3 Estimated Tax Payment',
    date: new Date(2024, 8, 15), // September 15
    category: 'estimated',
    priority: 'high',
    description: 'Third quarter estimated tax payment for 2024',
    completed: false,
  },
  {
    id: '7',
    title: 'Property Tax Payment - Fall',
    date: new Date(2024, 9, 10), // October 10
    category: 'property',
    priority: 'high',
    description: 'Fall property tax installment due',
    completed: false,
  },
  {
    id: '8',
    title: 'Year-End Tax Planning Review',
    date: new Date(2024, 10, 30), // November 30
    category: 'other',
    priority: 'medium',
    description: 'Review tax situation and plan year-end strategies',
    completed: false,
  },
  {
    id: '9',
    title: 'Q4 Estimated Tax Payment',
    date: new Date(2025, 0, 15), // January 15, 2025
    category: 'estimated',
    priority: 'high',
    description: 'Fourth quarter estimated tax payment for 2024',
    completed: false,
  },
];

export default function TaxCalendar() {
  const [deadlines, setDeadlines] = useState<TaxDeadline[]>(TAX_DEADLINES);
  const [showAddReminder, setShowAddReminder] = useState(false);
  const [selectedDeadline, setSelectedDeadline] = useState<TaxDeadline | null>(null);
  const [reminderDate, setReminderDate] = useState('');
  const [reminderNotes, setReminderNotes] = useState('');
  const [notificationMethod, setNotificationMethod] = useState<'email' | 'sms' | 'both'>('email');
  const { toast } = useToast();

  const upcomingDeadlines = deadlines
    .filter(d => !d.completed && d.date >= new Date())
    .sort((a, b) => a.date.getTime() - b.date.getTime())
    .slice(0, 5);

  const handleToggleComplete = (deadlineId: string) => {
    setDeadlines(prev =>
      prev.map(d =>
        d.id === deadlineId ? { ...d, completed: !d.completed } : d
      )
    );
    const deadline = deadlines.find(d => d.id === deadlineId);
    toast({
      title: deadline?.completed ? "Marked as Incomplete" : "Marked as Complete",
      description: deadline?.title,
    });
  };

  const handleAddReminder = (deadline: TaxDeadline) => {
    setSelectedDeadline(deadline);
    setShowAddReminder(true);
  };

  const handleSaveReminder = () => {
    if (!selectedDeadline || !reminderDate) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Reminder Set",
      description: `You'll be notified about "${selectedDeadline.title}" on ${new Date(reminderDate).toLocaleDateString()}`,
    });

    setShowAddReminder(false);
    setSelectedDeadline(null);
    setReminderDate('');
    setReminderNotes('');
    setNotificationMethod('email');
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'federal':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100';
      case 'state':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-100';
      case 'property':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100';
      case 'estimated':
        return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-100';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-100';
    }
  };

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'high':
        return <AlertCircle className="h-4 w-4 text-red-600" />;
      case 'medium':
        return <Clock className="h-4 w-4 text-yellow-600" />;
      default:
        return <CheckCircle2 className="h-4 w-4 text-green-600" />;
    }
  };

  const getDaysUntil = (date: Date) => {
    const today = new Date();
    const diffTime = date.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Calendar className="h-6 w-6 text-purple-600" />
              <CardTitle>Tax Calendar</CardTitle>
            </div>
            <Badge variant="outline">
              {upcomingDeadlines.length} upcoming
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-2">
            Track important tax deadlines and set reminders to stay compliant.
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Upcoming Deadlines */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Upcoming Deadlines</h3>
            <div className="space-y-3">
              {upcomingDeadlines.map(deadline => {
                const daysUntil = getDaysUntil(deadline.date);
                return (
                  <Card key={deadline.id} className={deadline.completed ? 'opacity-60' : ''}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-start gap-3 flex-1">
                          <div className="mt-1">
                            {getPriorityIcon(deadline.priority)}
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <h4 className="font-semibold">{deadline.title}</h4>
                              <Badge className={getCategoryColor(deadline.category)}>
                                {deadline.category}
                              </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground mb-2">
                              {deadline.description}
                            </p>
                            <div className="flex items-center gap-4 text-xs text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <Calendar className="h-3 w-3" />
                                {deadline.date.toLocaleDateString('en-US', { 
                                  month: 'long', 
                                  day: 'numeric', 
                                  year: 'numeric' 
                                })}
                              </span>
                              <span className={`font-medium ${
                                daysUntil <= 7 ? 'text-red-600' : 
                                daysUntil <= 30 ? 'text-orange-600' : 
                                'text-green-600'
                              }`}>
                                {daysUntil === 0 ? 'Today' : 
                                 daysUntil === 1 ? 'Tomorrow' : 
                                 `${daysUntil} days away`}
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="flex flex-col gap-2">
                          <Button
                            size="sm"
                            variant={deadline.completed ? "outline" : "default"}
                            onClick={() => handleToggleComplete(deadline.id)}
                          >
                            {deadline.completed ? 'Undo' : 'Complete'}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleAddReminder(deadline)}
                          >
                            <Bell className="h-3 w-3 mr-1" />
                            Remind
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>

          {/* All Deadlines by Category */}
          <div>
            <h3 className="text-lg font-semibold mb-4">All Tax Deadlines</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {['federal', 'property', 'estimated', 'other'].map(category => {
                const categoryDeadlines = deadlines.filter(d => d.category === category);
                return (
                  <Card key={category}>
                    <CardHeader>
                      <CardTitle className="text-base capitalize flex items-center gap-2">
                        <Badge className={getCategoryColor(category)}>
                          {category === 'estimated' ? 'Estimated Taxes' : category}
                        </Badge>
                        <span className="text-sm text-muted-foreground">
                          ({categoryDeadlines.length})
                        </span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {categoryDeadlines.map(deadline => (
                          <div
                            key={deadline.id}
                            className={`flex items-center justify-between p-2 rounded border ${
                              deadline.completed ? 'bg-gray-50 dark:bg-gray-800 opacity-60' : ''
                            }`}
                          >
                            <div className="flex-1">
                              <p className={`text-sm font-medium ${deadline.completed ? 'line-through' : ''}`}>
                                {deadline.title}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {deadline.date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                              </p>
                            </div>
                            {deadline.completed && (
                              <CheckCircle2 className="h-4 w-4 text-green-600" />
                            )}
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Add Reminder Dialog */}
      <Dialog open={showAddReminder} onOpenChange={setShowAddReminder}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Set Reminder</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label className="text-sm font-medium">Deadline</Label>
              <p className="text-sm text-muted-foreground mt-1">
                {selectedDeadline?.title}
              </p>
              <p className="text-xs text-muted-foreground">
                Due: {selectedDeadline?.date.toLocaleDateString('en-US', { 
                  month: 'long', 
                  day: 'numeric', 
                  year: 'numeric' 
                })}
              </p>
            </div>
            <div>
              <Label htmlFor="reminder-date">Reminder Date *</Label>
              <Input
                id="reminder-date"
                type="date"
                value={reminderDate}
                onChange={(e) => setReminderDate(e.target.value)}
                max={selectedDeadline?.date.toISOString().split('T')[0]}
              />
            </div>
            <div>
              <Label htmlFor="notification-method">Notification Method</Label>
              <Select value={notificationMethod} onValueChange={(value: 'email' | 'sms' | 'both') => setNotificationMethod(value)}>
                <SelectTrigger id="notification-method">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="email">Email</SelectItem>
                  <SelectItem value="sms">SMS</SelectItem>
                  <SelectItem value="both">Email & SMS</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="reminder-notes">Notes (Optional)</Label>
              <Textarea
                id="reminder-notes"
                placeholder="Add any additional notes..."
                value={reminderNotes}
                onChange={(e) => setReminderNotes(e.target.value)}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddReminder(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveReminder}>
              <Bell className="h-4 w-4 mr-2" />
              Set Reminder
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}