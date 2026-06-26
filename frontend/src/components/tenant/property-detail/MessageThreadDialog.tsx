import { useState } from 'react';
import { Send } from 'lucide-react';
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import type { MockMessage } from '@/data/tenantLeases';
import { formatDateLong } from './shared';

const formatTime = (d: Date) =>
  new Intl.DateTimeFormat('en-US', { hour: '2-digit', minute: '2-digit' }).format(d);

interface MessageThreadDialogProps {
  message: MockMessage | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function MessageThreadDialog({ message, open, onOpenChange }: MessageThreadDialogProps) {
  const { toast } = useToast();
  const [reply, setReply] = useState('');

  const handleSend = () => {
    if (!reply.trim()) return;
    toast({
      title: 'Reply sent (mock)',
      description: 'Replies will be persisted after backend integration.',
    });
    setReply('');
  };

  if (!message) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>{message.subject}</DialogTitle>
          <DialogDescription>
            Started {formatDateLong(message.thread[0]?.sentAt ?? message.sentAt)} •{' '}
            {message.thread.length} {message.thread.length === 1 ? 'message' : 'messages'}
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1 -mx-6 px-6">
          <div className="space-y-4 py-2">
            {message.thread.map((m) => {
              const isTenant = m.from === 'tenant';
              return (
                <div
                  key={m.id}
                  className={`flex ${isTenant ? 'justify-end' : 'justify-start'}`}
                >
                  <div className={`max-w-[80%] space-y-1 ${isTenant ? 'items-end' : 'items-start'} flex flex-col`}>
                    <Badge variant="outline" className="capitalize">
                      {m.from}
                    </Badge>
                    <div
                      className={`rounded-lg px-4 py-2.5 text-sm ${
                        isTenant
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted text-foreground'
                      }`}
                    >
                      {m.content}
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {formatDateLong(m.sentAt)} • {formatTime(m.sentAt)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </ScrollArea>

        <div className="border-t pt-4 space-y-2">
          <Textarea
            placeholder="Write a reply..."
            value={reply}
            onChange={(e) => setReply(e.target.value)}
            className="min-h-20 resize-none"
          />
          <div className="flex justify-end">
            <Button onClick={handleSend} disabled={!reply.trim()}>
              <Send className="mr-2 h-4 w-4" />
              Send Reply
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
