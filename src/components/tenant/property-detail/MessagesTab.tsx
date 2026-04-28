import { useState } from 'react';
import { MessageSquare } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { MockMessage } from '@/data/tenantLeases';
import { formatDateLong } from './shared';
import { MessageThreadDialog } from './MessageThreadDialog';

interface MessagesTabProps {
  messages: MockMessage[];
}

export function MessagesTab({ messages }: MessagesTabProps) {
  const [openMessage, setOpenMessage] = useState<MockMessage | null>(null);

  if (messages.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12 text-center">
          <MessageSquare className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-1">No messages yet</h3>
          <p className="text-sm text-muted-foreground">
            Conversations with your landlord will appear here.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <div className="space-y-3">
        {messages.map((msg) => (
          <Card
            key={msg.id}
            onClick={() => setOpenMessage(msg)}
            className={`cursor-pointer hover:shadow-md transition-shadow ${
              msg.unread ? 'border-primary/40' : ''
            }`}
          >
            <CardContent className="p-4 space-y-1">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="capitalize">
                    {msg.from}
                  </Badge>
                  {msg.unread && (
                    <span className="h-2 w-2 rounded-full bg-primary" aria-label="Unread" />
                  )}
                  <p className="font-medium">{msg.subject}</p>
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span>{msg.thread.length} messages</span>
                  <span>•</span>
                  <span>{formatDateLong(msg.sentAt)}</span>
                </div>
              </div>
              <p className="text-sm text-muted-foreground line-clamp-2">{msg.preview}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <MessageThreadDialog
        message={openMessage}
        open={openMessage !== null}
        onOpenChange={(open) => !open && setOpenMessage(null)}
      />
    </>
  );
}
