import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { TaxCalendarEvent } from '@/services/taxService';
import { Calendar, CheckCircle, Clock, AlertCircle } from 'lucide-react';

interface TaxCalendarProps {
  events: TaxCalendarEvent[];
  isLoading?: boolean;
}

export const TaxCalendar: React.FC<TaxCalendarProps> = ({ events, isLoading }) => {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Tax Calendar</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 bg-muted animate-pulse rounded" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  const getEventIcon = (type: TaxCalendarEvent['type']) => {
    switch (type) {
      case 'deadline':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      case 'payment':
        return <Clock className="h-4 w-4 text-orange-500" />;
      case 'reminder':
        return <Calendar className="h-4 w-4 text-blue-500" />;
      default:
        return <Calendar className="h-4 w-4" />;
    }
  };

  const getEventColor = (type: TaxCalendarEvent['type']) => {
    switch (type) {
      case 'deadline':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'payment':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'reminder':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-blue-600" />
              Tax Calendar
            </CardTitle>
            <CardDescription>Upcoming deadlines and events</CardDescription>
          </div>
          <Button variant="outline" size="sm">
            Sync to Calendar
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {events.length === 0 ? (
            <p className="text-center text-muted-foreground py-4">No upcoming events</p>
          ) : (
            events.map((event) => (
              <div key={event.id} className="flex items-start gap-4 p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                <div className="flex-shrink-0 mt-1">
                  {getEventIcon(event.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <h4 className="font-medium text-sm truncate">{event.title}</h4>
                    <Badge variant="outline" className={`text-[10px] ${getEventColor(event.type)}`}>
                      {event.type}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mb-2">{event.description}</p>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-gray-600">
                      {new Date(event.date).toLocaleDateString(undefined, { 
                        weekday: 'short', 
                        year: 'numeric', 
                        month: 'short', 
                        day: 'numeric' 
                      })}
                    </span>
                    {event.completed ? (
                      <Badge variant="secondary" className="text-[10px] bg-green-100 text-green-800">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Completed
                      </Badge>
                    ) : (
                      <Button variant="ghost" size="sm" className="h-6 text-xs">
                        Mark Complete
                      </Button>
                    )}
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