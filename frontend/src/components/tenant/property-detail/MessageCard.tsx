import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { MockMessage } from '@/data/tenantLeases';
import { formatDateLong } from './shared';

export function MessageCard({ message }: { message: MockMessage }) {
  return (
    <Card className={message.unread ? 'border-primary/40' : ''}>
      <CardContent className="p-4 space-y-1">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="capitalize">
              {message.from}
            </Badge>
            {message.unread && (
              <span className="h-2 w-2 rounded-full bg-primary" aria-label="Unread" />
            )}
            <p className="font-medium">{message.subject}</p>
          </div>
          <span className="text-xs text-muted-foreground">{formatDateLong(message.sentAt)}</span>
        </div>
        <p className="text-sm text-muted-foreground line-clamp-2">{message.preview}</p>
      </CardContent>
    </Card>
  );
}
