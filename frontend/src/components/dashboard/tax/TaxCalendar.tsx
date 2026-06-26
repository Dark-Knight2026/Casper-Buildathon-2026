import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { TaxCalendarEvent } from '@/services/taxService';
import { Calendar, AlertCircle, DollarSign, Bell } from 'lucide-react';

interface TaxCalendarProps {
  events: TaxCalendarEvent[];
  onToggleComplete?: (eventId: string) => void;
  isLoading?: boolean;
}

export const TaxCalendar: React.FC<TaxCalendarProps> = ({ 
  events, 
  onToggleComplete,
  isLoading 
}) => {
  const getEventIcon = (type: TaxCalendarEvent['type']) => {
    switch (type) {
      case 'deadline':
        return <AlertCircle className="h-4 w-4 text-red-600" />;
      case 'payment':
        return <DollarSign className="h-4 w-4 text-green-600" />;
      case 'reminder':
        return <Bell className="h-4 w-4 text-blue-600" />;
    }
  };

  const getEventColor = (type: TaxCalendarEvent['type']) => {
    switch (type) {
      case 'deadline':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'payment':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'reminder':
        return 'bg-blue-100 text-blue-800 border-blue-200';
    }
  };

  const sortedEvents = [...events].sort((a, b) => 
    new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  const upcomingEvents = sortedEvents.filter(e => !e.completed && new Date(e.date) >= new Date());

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-5 w-5 text-indigo-600" />
          Tax Calendar
        </CardTitle>
        <CardDescription>Important tax dates and deadlines</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {upcomingEvents.length > 0 && (
          <div className="p-4 bg-orange-50 border border-orange-200 rounded-lg">
            <p className="text-sm font-semibold text-orange-900 mb-1">
              {upcomingEvents.length} Upcoming Event{upcomingEvents.length > 1 ? 's' : ''}
            </p>
            <p className="text-xs text-orange-700">
              Next: {upcomingEvents[0].title} on {new Date(upcomingEvents[0].date).toLocaleDateString()}
            </p>
          </div>
        )}

        <div className="space-y-2">
          {isLoading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-20 bg-muted animate-pulse rounded" />
            ))
          ) : (
            sortedEvents.map((event) => (
              <div 
                key={event.id} 
                className={`p-4 border rounded-lg transition-all ${
                  event.completed ? 'opacity-50 bg-muted/30' : 'hover:shadow-sm'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3 flex-1">
                    <Checkbox
                      checked={event.completed}
                      onCheckedChange={() => onToggleComplete?.(event.id)}
                      className="mt-1"
                    />
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        {getEventIcon(event.type)}
                        <p className={`font-medium ${event.completed ? 'line-through' : ''}`}>
                          {event.title}
                        </p>
                      </div>
                      <p className="text-sm text-muted-foreground mb-2">{event.description}</p>
                      <div className="flex items-center gap-2">
                        <Badge className={getEventColor(event.type)} variant="outline">
                          {event.type}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {new Date(event.date).toLocaleDateString('en-US', { 
                            month: 'short', 
                            day: 'numeric', 
                            year: 'numeric' 
                          })}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
};