import React, { useEffect, useState, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { MessageSquare, Send } from 'lucide-react';
import { collaborationService, Comment } from '@/services/collaborationService';

export const LiveChatWidget = () => {
  const [comments, setComments] = useState<Comment[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const loadComments = async () => {
      const data = await collaborationService.getComments('general');
      setComments(data);
    };
    loadComments();
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [comments]);

  const handleSend = async () => {
    if (!newMessage.trim()) return;
    
    // Optimistic update
    const tempComment: Comment = {
      id: `temp-${Date.now()}`,
      contextId: 'general',
      userId: 'currentUser',
      userName: 'You',
      text: newMessage,
      timestamp: new Date()
    };
    setComments([...comments, tempComment]);
    setNewMessage('');

    await collaborationService.addComment('general', 'currentUser', newMessage);
  };

  return (
    <Card className="h-[400px] flex flex-col">
      <CardHeader className="pb-2 border-b">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <MessageSquare className="h-4 w-4 text-indigo-500" />
          Team Chat
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1 overflow-y-auto p-4 space-y-4" ref={scrollRef}>
        {comments.map((comment) => (
          <div key={comment.id} className={`flex gap-2 ${comment.userId === 'currentUser' ? 'flex-row-reverse' : ''}`}>
            <Avatar className="h-8 w-8">
              <AvatarImage src={comment.userAvatar} />
              <AvatarFallback>{comment.userName.charAt(0)}</AvatarFallback>
            </Avatar>
            <div className={`rounded-lg p-2 max-w-[80%] text-sm ${
              comment.userId === 'currentUser' 
                ? 'bg-primary text-primary-foreground' 
                : 'bg-muted'
            }`}>
              <p className="font-semibold text-xs opacity-70 mb-0.5">{comment.userName}</p>
              <p>{comment.text}</p>
            </div>
          </div>
        ))}
      </CardContent>
      <CardFooter className="p-3 border-t bg-muted/20">
        <div className="flex w-full items-center gap-2">
          <Input 
            placeholder="Type a message..." 
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            className="flex-1 h-9"
          />
          <Button size="icon" className="h-9 w-9" onClick={handleSend}>
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
};