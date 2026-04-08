import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Search, MessageSquarePlus } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';
import type { ConversationWithParticipants } from '@/types/message';

interface ConversationSidebarProps {
  conversations: ConversationWithParticipants[];
  selectedId: string | null;
  searchQuery: string;
  filterStatus: 'active' | 'archived';
  onSelect: (id: string) => void;
  onSearchChange: (q: string) => void;
  onFilterChange: (status: 'active' | 'archived') => void;
}

function initials(name: string) {
  return name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);
}

export default function ConversationSidebar({
  conversations,
  selectedId,
  searchQuery,
  filterStatus,
  onSelect,
  onSearchChange,
  onFilterChange,
}: ConversationSidebarProps) {
  const filtered = conversations.filter(
    (c) =>
      c.status === filterStatus &&
      `${c.otherParticipant.firstName} ${c.otherParticipant.lastName}`
        .toLowerCase()
        .includes(searchQuery.toLowerCase())
  );

  return (
    <div className="w-full md:w-80 border-r flex flex-col bg-background shrink-0">
      {/* Search */}
      <div className="p-4 border-b">
        <div className="relative">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search conversations..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Tabs */}
      <Tabs
        value={filterStatus}
        onValueChange={(v) => onFilterChange(v as 'active' | 'archived')}
        className="flex-1 flex flex-col overflow-hidden p-4"
      >
        <TabsList className="w-full">
          <TabsTrigger value="active" className="flex-1">Active</TabsTrigger>
          <TabsTrigger value="archived" className="flex-1">Archived</TabsTrigger>
        </TabsList>

        <TabsContent value={filterStatus} className="flex-1 overflow-hidden">
          <ScrollArea className="h-full">
            {filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-center">
                <MessageSquarePlus className="h-8 w-8 text-muted-foreground mb-2" />
                <p className="text-sm font-medium text-foreground">No conversations</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {searchQuery ? 'No matches found' : 'No conversations yet'}
                </p>
              </div>
            ) : (
              <div className="divide-y mt-2">
                {filtered.map((conv) => {
                  const isSelected = conv.id === selectedId;

                  return (
                    <button
                      key={conv.id}
                      onClick={() => onSelect(conv.id)}
                      className={cn(
                        'w-full p-3 flex items-start gap-3 text-left transition-colors hover:bg-conversation-selected-hover cursor-pointer rounded-md',
                        isSelected ? 'bg-conversation-selected' : ''
                      )}
                    >
                      <Avatar className="h-9 w-9 shrink-0">
                        <AvatarFallback>{initials(conv.otherParticipant.firstName + ' ' + conv.otherParticipant.lastName)}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-0.5">
                          <span className="font-medium text-sm text-foreground truncate">
                            {conv.otherParticipant.firstName} {conv.otherParticipant.lastName}
                          </span>
                          {conv.lastMessageAt && (
                            <span className="text-xs text-muted-foreground whitespace-nowrap ml-2">
                              {formatDistanceToNow(conv.lastMessageAt, { addSuffix: true })}
                            </span>
                          )}
                        </div>
                        {conv.property && (
                          <p className="text-xs text-muted-foreground truncate mb-0.5">
                            {conv.property.address}
                          </p>
                        )}
                        <div className="flex items-center justify-between">
                          <p className={cn(
                            'text-sm truncate',
                            conv.unreadCount > 0 ? 'font-semibold text-foreground' : 'text-muted-foreground'
                          )}>
                            {conv.lastMessagePreview ?? 'No messages yet'}
                          </p>
                          {conv.unreadCount > 0 && (
                            <span className="ml-2 shrink-0 flex items-center justify-center h-5 min-w-5 px-1.5 rounded-full bg-primary text-primary-foreground text-xs">
                              {conv.unreadCount}
                            </span>
                          )}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </ScrollArea>
        </TabsContent>
      </Tabs>
    </div>
  );
}
