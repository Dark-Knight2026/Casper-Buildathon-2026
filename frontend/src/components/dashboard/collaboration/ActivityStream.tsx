import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Activity as ActivityIcon } from 'lucide-react';
import { collaborationService, Activity } from '@/services/collaborationService';
import { formatDistanceToNow } from 'date-fns';

export const ActivityStream = () => {
  const [activities, setActivities] = useState<Activity[]>([]);

  useEffect(() => {
    const loadInitial = async () => {
      const data = await collaborationService.getActivities();
      setActivities(data);
    };
    loadInitial();

    const unsubscribe = collaborationService.subscribeToActivity((newActivity) => {
      setActivities((prev) => [newActivity, ...prev].slice(0, 5));
    });

    return () => unsubscribe();
  }, []);

  return (
    <Card className="h-full">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <ActivityIcon className="h-4 w-4 text-blue-500" />
          Recent Activity
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {activities.map((activity) => (
            <div key={activity.id} className="flex items-start gap-3 text-sm animate-in fade-in slide-in-from-top-2 duration-300">
              <Avatar className="h-8 w-8 mt-0.5">
                <AvatarImage src={activity.userAvatar} />
                <AvatarFallback>{activity.userName.charAt(0)}</AvatarFallback>
              </Avatar>
              <div className="grid gap-0.5">
                <p className="leading-none text-foreground">
                  <span className="font-semibold">{activity.userName}</span>{' '}
                  <span className="text-muted-foreground">{activity.action}</span>{' '}
                  <span className="font-medium text-primary">{activity.target}</span>
                </p>
                <p className="text-xs text-muted-foreground">
                  {formatDistanceToNow(activity.timestamp, { addSuffix: true })}
                </p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};