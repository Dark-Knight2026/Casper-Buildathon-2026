/**
 * Real-Time Collaboration Component
 * Live collaboration features for team property management
 */

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Users,
  MessageSquare,
  Bell,
  Eye,
  Edit,
  Clock,
  Send,
  CheckCheck,
  Circle,
  Video,
  Phone,
  Share2,
  UserPlus,
  Settings
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: 'owner' | 'manager' | 'assistant' | 'viewer';
  avatar?: string;
  status: 'online' | 'away' | 'offline';
  lastSeen?: Date;
  currentActivity?: string;
}

interface Message {
  id: string;
  senderId: string;
  senderName: string;
  content: string;
  timestamp: Date;
  read: boolean;
  type: 'text' | 'system' | 'mention';
  attachments?: string[];
}

interface Activity {
  id: string;
  userId: string;
  userName: string;
  action: string;
  target: string;
  timestamp: Date;
  details?: string;
}

interface Notification {
  id: string;
  type: 'mention' | 'assignment' | 'update' | 'approval' | 'message';
  title: string;
  message: string;
  timestamp: Date;
  read: boolean;
  actionUrl?: string;
}

interface RealTimeCollaborationProps {
  currentUserId: string;
  currentUserName: string;
  propertyId?: string;
}

export default function RealTimeCollaboration({
  currentUserId,
  currentUserName,
  propertyId
}: RealTimeCollaborationProps) {
  const { toast } = useToast();
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([
    {
      id: '1',
      name: 'John Smith',
      email: 'john@example.com',
      role: 'owner',
      status: 'online',
      currentActivity: 'Viewing Property #123'
    },
    {
      id: '2',
      name: 'Sarah Johnson',
      email: 'sarah@example.com',
      role: 'manager',
      status: 'online',
      currentActivity: 'Editing Lease Agreement'
    },
    {
      id: '3',
      name: 'Mike Davis',
      email: 'mike@example.com',
      role: 'assistant',
      status: 'away',
      lastSeen: new Date(Date.now() - 300000)
    },
    {
      id: '4',
      name: 'Emily Brown',
      email: 'emily@example.com',
      role: 'viewer',
      status: 'offline',
      lastSeen: new Date(Date.now() - 3600000)
    }
  ]);

  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      senderId: '2',
      senderName: 'Sarah Johnson',
      content: 'Has anyone reviewed the maintenance request for Property #123?',
      timestamp: new Date(Date.now() - 600000),
      read: true,
      type: 'text'
    },
    {
      id: '2',
      senderId: '1',
      senderName: 'John Smith',
      content: 'Yes, I approved it this morning. Vendor is scheduled for tomorrow.',
      timestamp: new Date(Date.now() - 300000),
      read: true,
      type: 'text'
    },
    {
      id: '3',
      senderId: 'system',
      senderName: 'System',
      content: 'Mike Davis was assigned to follow up on the maintenance request.',
      timestamp: new Date(Date.now() - 180000),
      read: true,
      type: 'system'
    },
    {
      id: '4',
      senderId: '2',
      senderName: 'Sarah Johnson',
      content: '@John Smith Can you review the new lease terms for Property #456?',
      timestamp: new Date(Date.now() - 60000),
      read: false,
      type: 'mention'
    }
  ]);

  const [activities, setActivities] = useState<Activity[]>([
    {
      id: '1',
      userId: '2',
      userName: 'Sarah Johnson',
      action: 'updated',
      target: 'Property #123',
      timestamp: new Date(Date.now() - 900000),
      details: 'Changed status to "Under Maintenance"'
    },
    {
      id: '2',
      userId: '1',
      userName: 'John Smith',
      action: 'approved',
      target: 'Maintenance Request #45',
      timestamp: new Date(Date.now() - 600000),
      details: 'Approved $500 for HVAC repair'
    },
    {
      id: '3',
      userId: '3',
      userName: 'Mike Davis',
      action: 'created',
      target: 'Lease Agreement',
      timestamp: new Date(Date.now() - 300000),
      details: 'New lease for Tenant: Jane Doe'
    },
    {
      id: '4',
      userId: '2',
      userName: 'Sarah Johnson',
      action: 'commented',
      target: 'Property #456',
      timestamp: new Date(Date.now() - 120000),
      details: 'Added note about upcoming inspection'
    }
  ]);

  const [notifications, setNotifications] = useState<Notification[]>([
    {
      id: '1',
      type: 'mention',
      title: 'You were mentioned',
      message: 'Sarah Johnson mentioned you in a comment',
      timestamp: new Date(Date.now() - 60000),
      read: false
    },
    {
      id: '2',
      type: 'assignment',
      title: 'New assignment',
      message: 'You were assigned to Maintenance Request #45',
      timestamp: new Date(Date.now() - 180000),
      read: false
    },
    {
      id: '3',
      type: 'approval',
      title: 'Approval required',
      message: 'Lease agreement needs your approval',
      timestamp: new Date(Date.now() - 300000),
      read: true
    }
  ]);

  const [newMessage, setNewMessage] = useState('');
  const [isTyping, setIsTyping] = useState<string[]>([]);

  // Simulate real-time updates
  useEffect(() => {
    const interval = setInterval(() => {
      // Simulate status changes
      setTeamMembers(prev => prev.map(member => {
        if (Math.random() > 0.95) {
          const statuses: Array<'online' | 'away' | 'offline'> = ['online', 'away', 'offline'];
          return {
            ...member,
            status: statuses[Math.floor(Math.random() * statuses.length)]
          };
        }
        return member;
      }));

      // Simulate typing indicators
      if (Math.random() > 0.9) {
        const randomMember = teamMembers[Math.floor(Math.random() * teamMembers.length)];
        setIsTyping([randomMember.id]);
        setTimeout(() => setIsTyping([]), 3000);
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [teamMembers]);

  const handleSendMessage = () => {
    if (!newMessage.trim()) return;

    const message: Message = {
      id: Date.now().toString(),
      senderId: currentUserId,
      senderName: currentUserName,
      content: newMessage,
      timestamp: new Date(),
      read: false,
      type: newMessage.includes('@') ? 'mention' : 'text'
    };

    setMessages([...messages, message]);
    setNewMessage('');

    toast({
      title: 'Message Sent',
      description: 'Your message has been sent to the team'
    });
  };

  const handleMarkNotificationRead = (notificationId: string) => {
    setNotifications(prev =>
      prev.map(notif =>
        notif.id === notificationId ? { ...notif, read: true } : notif
      )
    );
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'online':
        return 'bg-green-500';
      case 'away':
        return 'bg-yellow-500';
      case 'offline':
        return 'bg-gray-400';
      default:
        return 'bg-gray-400';
    }
  };

  const getStatusText = (member: TeamMember) => {
    if (member.status === 'online') {
      return member.currentActivity || 'Online';
    } else if (member.status === 'away') {
      return 'Away';
    } else if (member.lastSeen) {
      const minutes = Math.floor((Date.now() - member.lastSeen.getTime()) / 60000);
      if (minutes < 60) {
        return `Last seen ${minutes}m ago`;
      } else {
        const hours = Math.floor(minutes / 60);
        return `Last seen ${hours}h ago`;
      }
    }
    return 'Offline';
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'owner':
        return 'bg-purple-100 text-purple-800';
      case 'manager':
        return 'bg-blue-100 text-blue-800';
      case 'assistant':
        return 'bg-green-100 text-green-800';
      case 'viewer':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'mention':
        return MessageSquare;
      case 'assignment':
        return UserPlus;
      case 'update':
        return Bell;
      case 'approval':
        return CheckCheck;
      case 'message':
        return MessageSquare;
      default:
        return Bell;
    }
  };

  const unreadNotifications = notifications.filter(n => !n.read).length;
  const onlineMembers = teamMembers.filter(m => m.status === 'online').length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Users className="h-8 w-8 text-blue-600" />
          <div>
            <h2 className="text-2xl font-bold">Team Collaboration</h2>
            <p className="text-gray-600">
              {onlineMembers} of {teamMembers.length} team members online
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            <Video className="h-4 w-4 mr-2" />
            Start Meeting
          </Button>
          <Button variant="outline" size="sm">
            <Share2 className="h-4 w-4 mr-2" />
            Share Screen
          </Button>
        </div>
      </div>

      <Tabs defaultValue="chat" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="chat">
            Chat
            {messages.filter(m => !m.read && m.senderId !== currentUserId).length > 0 && (
              <Badge variant="destructive" className="ml-2">
                {messages.filter(m => !m.read && m.senderId !== currentUserId).length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="team">Team ({teamMembers.length})</TabsTrigger>
          <TabsTrigger value="activity">Activity</TabsTrigger>
          <TabsTrigger value="notifications">
            Notifications
            {unreadNotifications > 0 && (
              <Badge variant="destructive" className="ml-2">
                {unreadNotifications}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        {/* Chat Tab */}
        <TabsContent value="chat" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Team Chat</CardTitle>
              <CardDescription>Real-time messaging with your team</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Messages */}
                <ScrollArea className="h-[400px] pr-4">
                  <div className="space-y-4">
                    {messages.map((message) => (
                      <div
                        key={message.id}
                        className={`flex gap-3 ${
                          message.senderId === currentUserId ? 'flex-row-reverse' : ''
                        }`}
                      >
                        <Avatar className="h-8 w-8">
                          <AvatarFallback>
                            {message.senderName.split(' ').map(n => n[0]).join('')}
                          </AvatarFallback>
                        </Avatar>
                        <div
                          className={`flex-1 ${
                            message.senderId === currentUserId ? 'text-right' : ''
                          }`}
                        >
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-sm font-medium">{message.senderName}</span>
                            <span className="text-xs text-gray-500">
                              {message.timestamp.toLocaleTimeString([], {
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </span>
                            {message.read && message.senderId === currentUserId && (
                              <CheckCheck className="h-3 w-3 text-blue-600" />
                            )}
                          </div>
                          <div
                            className={`inline-block p-3 rounded-lg ${
                              message.type === 'system'
                                ? 'bg-gray-100 text-gray-700'
                                : message.senderId === currentUserId
                                ? 'bg-blue-600 text-white'
                                : message.type === 'mention'
                                ? 'bg-yellow-50 text-gray-900 border border-yellow-200'
                                : 'bg-gray-100 text-gray-900'
                            }`}
                          >
                            <p className="text-sm">{message.content}</p>
                          </div>
                        </div>
                      </div>
                    ))}

                    {/* Typing Indicator */}
                    {isTyping.length > 0 && (
                      <div className="flex gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarFallback>...</AvatarFallback>
                        </Avatar>
                        <div className="flex items-center gap-2 p-3 bg-gray-100 rounded-lg">
                          <div className="flex gap-1">
                            <Circle className="h-2 w-2 fill-gray-400 animate-bounce" />
                            <Circle className="h-2 w-2 fill-gray-400 animate-bounce delay-100" />
                            <Circle className="h-2 w-2 fill-gray-400 animate-bounce delay-200" />
                          </div>
                          <span className="text-xs text-gray-500">typing...</span>
                        </div>
                      </div>
                    )}
                  </div>
                </ScrollArea>

                {/* Message Input */}
                <div className="flex gap-2">
                  <Input
                    placeholder="Type a message... (use @ to mention someone)"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSendMessage();
                      }
                    }}
                  />
                  <Button onClick={handleSendMessage}>
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Team Tab */}
        <TabsContent value="team" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base">Team Members</CardTitle>
                  <CardDescription>Manage your property management team</CardDescription>
                </div>
                <Button size="sm">
                  <UserPlus className="h-4 w-4 mr-2" />
                  Invite Member
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {teamMembers.map((member) => (
                  <Card key={member.id}>
                    <CardContent className="pt-6">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="relative">
                            <Avatar className="h-12 w-12">
                              <AvatarImage src={member.avatar} />
                              <AvatarFallback>
                                {member.name.split(' ').map(n => n[0]).join('')}
                              </AvatarFallback>
                            </Avatar>
                            <div
                              className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-white ${getStatusColor(
                                member.status
                              )}`}
                            />
                          </div>
                          <div>
                            <h3 className="font-semibold">{member.name}</h3>
                            <p className="text-sm text-gray-600">{member.email}</p>
                            <p className="text-xs text-gray-500 mt-1">
                              {getStatusText(member)}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge className={getRoleBadgeColor(member.role)}>
                            {member.role}
                          </Badge>
                          {member.status === 'online' && (
                            <>
                              <Button variant="outline" size="sm">
                                <Phone className="h-4 w-4" />
                              </Button>
                              <Button variant="outline" size="sm">
                                <Video className="h-4 w-4" />
                              </Button>
                            </>
                          )}
                          <Button variant="outline" size="sm">
                            <Settings className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Activity Tab */}
        <TabsContent value="activity" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Recent Activity</CardTitle>
              <CardDescription>Real-time updates from your team</CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[500px] pr-4">
                <div className="space-y-4">
                  {activities.map((activity) => (
                    <div key={activity.id} className="flex gap-3 pb-4 border-b last:border-0">
                      <Avatar className="h-10 w-10">
                        <AvatarFallback>
                          {activity.userName.split(' ').map(n => n[0]).join('')}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <p className="text-sm">
                          <span className="font-medium">{activity.userName}</span>{' '}
                          <span className="text-gray-600">{activity.action}</span>{' '}
                          <span className="font-medium">{activity.target}</span>
                        </p>
                        {activity.details && (
                          <p className="text-xs text-gray-500 mt-1">{activity.details}</p>
                        )}
                        <div className="flex items-center gap-1 mt-1">
                          <Clock className="h-3 w-3 text-gray-400" />
                          <span className="text-xs text-gray-500">
                            {activity.timestamp.toLocaleString()}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Notifications Tab */}
        <TabsContent value="notifications" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base">Notifications</CardTitle>
                  <CardDescription>
                    {unreadNotifications} unread notification{unreadNotifications !== 1 ? 's' : ''}
                  </CardDescription>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
                    toast({
                      title: 'All notifications marked as read'
                    });
                  }}
                >
                  Mark All Read
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {notifications.map((notification) => {
                  const NotificationIcon = getNotificationIcon(notification.type);
                  return (
                    <Card
                      key={notification.id}
                      className={`cursor-pointer transition-colors ${
                        !notification.read ? 'bg-blue-50 border-blue-200' : ''
                      }`}
                      onClick={() => handleMarkNotificationRead(notification.id)}
                    >
                      <CardContent className="pt-4">
                        <div className="flex items-start gap-3">
                          <div
                            className={`p-2 rounded-lg ${
                              !notification.read ? 'bg-blue-100' : 'bg-gray-100'
                            }`}
                          >
                            <NotificationIcon
                              className={`h-5 w-5 ${
                                !notification.read ? 'text-blue-600' : 'text-gray-600'
                              }`}
                            />
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <h4 className="font-semibold text-sm">{notification.title}</h4>
                              {!notification.read && (
                                <div className="w-2 h-2 bg-blue-600 rounded-full" />
                              )}
                            </div>
                            <p className="text-sm text-gray-600">{notification.message}</p>
                            <div className="flex items-center gap-1 mt-2">
                              <Clock className="h-3 w-3 text-gray-400" />
                              <span className="text-xs text-gray-500">
                                {notification.timestamp.toLocaleString()}
                              </span>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-4 gap-4">
            <Button variant="outline" className="h-auto flex-col gap-2 py-4">
              <Eye className="h-6 w-6" />
              <span className="text-sm">Share View</span>
            </Button>
            <Button variant="outline" className="h-auto flex-col gap-2 py-4">
              <Edit className="h-6 w-6" />
              <span className="text-sm">Co-Edit</span>
            </Button>
            <Button variant="outline" className="h-auto flex-col gap-2 py-4">
              <Video className="h-6 w-6" />
              <span className="text-sm">Video Call</span>
            </Button>
            <Button variant="outline" className="h-auto flex-col gap-2 py-4">
              <Share2 className="h-6 w-6" />
              <span className="text-sm">Share Screen</span>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}