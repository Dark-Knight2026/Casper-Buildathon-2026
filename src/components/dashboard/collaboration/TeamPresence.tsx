import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Users } from 'lucide-react';
import { collaborationService, User } from '@/services/collaborationService';

export const TeamPresence = () => {
  const [users, setUsers] = useState<User[]>([]);

  useEffect(() => {
    const fetchUsers = async () => {
      const data = await collaborationService.getOnlineUsers('global');
      setUsers(data);
    };
    fetchUsers();
  }, []);

  const getStatusColor = (status: User['status']) => {
    switch (status) {
      case 'online': return 'bg-green-500';
      case 'away': return 'bg-yellow-500';
      case 'busy': return 'bg-red-500';
      case 'offline': return 'bg-gray-400';
      default: return 'bg-gray-400';
    }
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Users className="h-4 w-4 text-indigo-500" />
          Team Presence
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex -space-x-2 overflow-hidden py-2">
          <TooltipProvider>
            {users.map((user) => (
              <Tooltip key={user.id}>
                <TooltipTrigger asChild>
                  <div className="relative inline-block cursor-pointer hover:z-10 transition-transform hover:scale-110">
                    <Avatar className="h-10 w-10 border-2 border-background">
                      <AvatarImage src={user.avatarUrl} alt={user.name} />
                      <AvatarFallback>{user.name.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <span 
                      className={`absolute bottom-0 right-0 block h-2.5 w-2.5 rounded-full ring-2 ring-background ${getStatusColor(user.status)}`} 
                    />
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p className="font-semibold">{user.name}</p>
                  <p className="text-xs text-muted-foreground capitalize">{user.role} • {user.status}</p>
                </TooltipContent>
              </Tooltip>
            ))}
          </TooltipProvider>
          <div className="flex items-center justify-center h-10 w-10 rounded-full border-2 border-dashed border-gray-300 bg-gray-50 text-xs text-gray-500 hover:bg-gray-100 cursor-pointer">
            +3
          </div>
        </div>
      </CardContent>
    </Card>
  );
};