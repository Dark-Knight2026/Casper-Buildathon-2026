/**
 * Real-Time Collaborative Lease Editor
 * Multi-user editing with live sync, comments, and version control
 */

import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Users,
  MessageSquare,
  History,
  Save,
  Undo,
  Redo,
  Eye,
  Edit,
  Check,
  X,
  Clock,
  User
} from 'lucide-react';
import { 
  LeaseAgreement, 
  CollaborationSession, 
  Participant, 
  LeaseComment,
  LeaseVersion 
} from '@/types/lease';
import { useToast } from '@/hooks/use-toast';

interface CollaborativeLeaseEditorProps {
  lease: LeaseAgreement;
  session: CollaborationSession;
  currentUserId: string;
  onSave: (content: string) => void;
  onAddComment: (clauseId: string, comment: string) => void;
  onResolveComment: (commentId: string) => void;
}

export default function CollaborativeLeaseEditor({
  lease,
  session,
  currentUserId,
  onSave,
  onAddComment,
  onResolveComment
}: CollaborativeLeaseEditorProps) {
  const { toast } = useToast();
  const [content, setContent] = useState('');
  const [selectedClauseId, setSelectedClauseId] = useState<string | null>(null);
  const [commentText, setCommentText] = useState('');
  const [showComments, setShowComments] = useState(true);
  const [showVersions, setShowVersions] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const editorRef = useRef<HTMLTextAreaElement>(null);

  // Initialize content from lease clauses
  useEffect(() => {
    const leaseContent = lease.clauses
      .sort((a, b) => a.order - b.order)
      .map(clause => `## ${clause.title}\n\n${clause.content}\n\n`)
      .join('');
    setContent(leaseContent);
  }, [lease.clauses]);

  // Track unsaved changes
  useEffect(() => {
    const timer = setTimeout(() => {
      if (content !== lease.clauses.map(c => c.content).join('')) {
        setHasUnsavedChanges(true);
      }
    }, 1000);

    return () => clearTimeout(timer);
  }, [content, lease.clauses]);

  // Simulate real-time cursor positions
  const [cursorPositions, setCursorPositions] = useState<Map<string, number>>(new Map());

  const handleSave = () => {
    onSave(content);
    setHasUnsavedChanges(false);
    
    toast({
      title: 'Changes Saved',
      description: 'Your edits have been saved and synced with collaborators'
    });
  };

  const handleAddComment = () => {
    if (!selectedClauseId || !commentText.trim()) return;

    onAddComment(selectedClauseId, commentText);
    setCommentText('');
    
    toast({
      title: 'Comment Added',
      description: 'Your comment has been posted'
    });
  };

  const currentParticipant = session.participants.find(p => p.userId === currentUserId);
  const canEdit = currentParticipant?.permissions.canEdit ?? false;

  const onlineParticipants = session.participants.filter(p => p.isOnline);
  const offlineParticipants = session.participants.filter(p => !p.isOnline);

  return (
    <div className="grid grid-cols-12 gap-6">
      {/* Main Editor */}
      <div className="col-span-8">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Lease Document</CardTitle>
                <CardDescription>
                  {canEdit ? 'Editing mode - Changes sync in real-time' : 'View-only mode'}
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                {hasUnsavedChanges && (
                  <Badge variant="outline" className="text-orange-600">
                    <Clock className="h-3 w-3 mr-1" />
                    Unsaved Changes
                  </Badge>
                )}
                <Button
                  onClick={handleSave}
                  disabled={!canEdit || !hasUnsavedChanges}
                  size="sm"
                >
                  <Save className="h-4 w-4 mr-2" />
                  Save
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Editor Toolbar */}
              <div className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg">
                <Button variant="ghost" size="sm" disabled={!canEdit}>
                  <Undo className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="sm" disabled={!canEdit}>
                  <Redo className="h-4 w-4" />
                </Button>
                <Separator orientation="vertical" className="h-6" />
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowVersions(!showVersions)}
                >
                  <History className="h-4 w-4 mr-2" />
                  Version History
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowComments(!showComments)}
                >
                  <MessageSquare className="h-4 w-4 mr-2" />
                  Comments ({lease.comments.length})
                </Button>
              </div>

              {/* Editor Area */}
              <div className="relative">
                <Textarea
                  ref={editorRef}
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  disabled={!canEdit}
                  className="min-h-[600px] font-mono text-sm"
                  placeholder="Lease content will appear here..."
                />
                
                {/* Cursor indicators for other users */}
                {onlineParticipants
                  .filter(p => p.userId !== currentUserId)
                  .map(participant => (
                    <div
                      key={participant.userId}
                      className="absolute pointer-events-none"
                      style={{
                        top: `${(cursorPositions.get(participant.userId) || 0) * 20}px`,
                        left: '10px'
                      }}
                    >
                      <Badge className="bg-blue-500 text-white text-xs">
                        {participant.name}
                      </Badge>
                    </div>
                  ))}
              </div>

              {/* Version History */}
              {showVersions && (
                <Card className="border-blue-200 bg-blue-50">
                  <CardHeader>
                    <CardTitle className="text-base">Version History</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ScrollArea className="h-[200px]">
                      <div className="space-y-2">
                        {lease.versionHistory.map((version) => (
                          <div
                            key={version.id}
                            className="flex items-center justify-between p-3 bg-white rounded-lg border"
                          >
                            <div>
                              <div className="flex items-center gap-2">
                                <Badge variant={version.isCurrent ? 'default' : 'outline'}>
                                  v{version.versionNumber}
                                </Badge>
                                <span className="text-sm font-medium">
                                  {version.createdByName}
                                </span>
                              </div>
                              <p className="text-xs text-gray-500 mt-1">
                                {version.createdAt.toLocaleString()}
                              </p>
                              {version.changes.length > 0 && (
                                <p className="text-xs text-gray-600 mt-1">
                                  {version.changes.join(', ')}
                                </p>
                              )}
                            </div>
                            {!version.isCurrent && (
                              <Button variant="outline" size="sm">
                                <Eye className="h-3 w-3 mr-1" />
                                View
                              </Button>
                            )}
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  </CardContent>
                </Card>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Sidebar */}
      <div className="col-span-4 space-y-6">
        {/* Active Collaborators */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Users className="h-4 w-4" />
              Active Collaborators ({onlineParticipants.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {onlineParticipants.map((participant) => (
                <div key={participant.userId} className="flex items-center gap-3">
                  <div className="relative">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback>
                        {participant.name.split(' ').map(n => n[0]).join('')}
                      </AvatarFallback>
                    </Avatar>
                    <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-white" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium">{participant.name}</p>
                    <p className="text-xs text-gray-500">{participant.role}</p>
                  </div>
                  <div className="flex items-center gap-1">
                    {participant.permissions.canEdit && (
                      <Badge variant="outline" className="text-xs">
                        <Edit className="h-3 w-3" />
                      </Badge>
                    )}
                    {participant.permissions.canComment && (
                      <Badge variant="outline" className="text-xs">
                        <MessageSquare className="h-3 w-3" />
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
              
              {offlineParticipants.length > 0 && (
                <>
                  <Separator />
                  <p className="text-xs text-gray-500 font-medium">
                    Offline ({offlineParticipants.length})
                  </p>
                  {offlineParticipants.map((participant) => (
                    <div key={participant.userId} className="flex items-center gap-3 opacity-50">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback>
                          {participant.name.split(' ').map(n => n[0]).join('')}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <p className="text-sm font-medium">{participant.name}</p>
                        <p className="text-xs text-gray-500">
                          Last seen: {participant.lastSeen.toLocaleString()}
                        </p>
                      </div>
                    </div>
                  ))}
                </>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Comments */}
        {showComments && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <MessageSquare className="h-4 w-4" />
                Comments
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Add Comment */}
                {currentParticipant?.permissions.canComment && (
                  <div className="space-y-2">
                    <Textarea
                      placeholder="Add a comment..."
                      value={commentText}
                      onChange={(e) => setCommentText(e.target.value)}
                      rows={3}
                    />
                    <Button
                      onClick={handleAddComment}
                      disabled={!commentText.trim()}
                      size="sm"
                      className="w-full"
                    >
                      Post Comment
                    </Button>
                  </div>
                )}

                <Separator />

                {/* Comments List */}
                <ScrollArea className="h-[400px]">
                  <div className="space-y-3">
                    {lease.comments.length === 0 ? (
                      <p className="text-sm text-gray-500 text-center py-4">
                        No comments yet
                      </p>
                    ) : (
                      lease.comments.map((comment) => (
                        <div
                          key={comment.id}
                          className={`p-3 rounded-lg border ${
                            comment.isResolved ? 'bg-gray-50 opacity-60' : 'bg-white'
                          }`}
                        >
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <Avatar className="h-6 w-6">
                                <AvatarFallback className="text-xs">
                                  {comment.userName.split(' ').map(n => n[0]).join('')}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <p className="text-sm font-medium">{comment.userName}</p>
                                <p className="text-xs text-gray-500">
                                  {comment.createdAt.toLocaleString()}
                                </p>
                              </div>
                            </div>
                            {!comment.isResolved && currentParticipant?.permissions.canApprove && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => onResolveComment(comment.id)}
                              >
                                <Check className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                          <p className="text-sm text-gray-700">{comment.content}</p>
                          {comment.isResolved && (
                            <Badge variant="outline" className="mt-2 text-xs">
                              <Check className="h-3 w-3 mr-1" />
                              Resolved
                            </Badge>
                          )}
                          
                          {/* Replies */}
                          {comment.replies.length > 0 && (
                            <div className="mt-3 ml-4 space-y-2 border-l-2 border-gray-200 pl-3">
                              {comment.replies.map((reply) => (
                                <div key={reply.id} className="text-sm">
                                  <div className="flex items-center gap-2 mb-1">
                                    <User className="h-3 w-3 text-gray-400" />
                                    <span className="font-medium text-xs">{reply.userName}</span>
                                    <span className="text-xs text-gray-500">
                                      {reply.createdAt.toLocaleString()}
                                    </span>
                                  </div>
                                  <p className="text-gray-600">{reply.content}</p>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </ScrollArea>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Recent Changes */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <History className="h-4 w-4" />
              Recent Changes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[200px]">
              <div className="space-y-2">
                {session.changes.slice(0, 10).map((change) => (
                  <div key={change.id} className="text-sm p-2 bg-gray-50 rounded">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant="outline" className="text-xs">
                        {change.changeType}
                      </Badge>
                      <span className="font-medium">{change.userName}</span>
                    </div>
                    <p className="text-xs text-gray-500">
                      {change.timestamp.toLocaleString()}
                    </p>
                    {change.comment && (
                      <p className="text-xs text-gray-600 mt-1">{change.comment}</p>
                    )}
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}