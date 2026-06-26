/**
 * Share Dialog Component
 * Create secure document sharing links
 */

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Share2,
  Copy,
  Mail,
  Lock,
  Clock,
  Download as DownloadIcon,
  Eye,
  Edit,
  CheckCircle,
  X,
  Link as LinkIcon
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { leaseStorageService, DocumentShare, ShareOptions } from '@/services/leaseStorageService';

interface ShareDialogProps {
  documentId: string;
  documentTitle: string;
  open: boolean;
  onClose: () => void;
  onShareCreated?: (share: DocumentShare) => void;
}

export default function ShareDialog({
  documentId,
  documentTitle,
  open,
  onClose,
  onShareCreated
}: ShareDialogProps) {
  const { toast } = useToast();
  const [permission, setPermission] = useState<'view' | 'download' | 'edit'>('view');
  const [recipientEmail, setRecipientEmail] = useState('');
  const [expiresIn, setExpiresIn] = useState<string>('24');
  const [maxDownloads, setMaxDownloads] = useState<string>('');
  const [requiresAuth, setRequiresAuth] = useState(false);
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [createdShare, setCreatedShare] = useState<DocumentShare | null>(null);

  const handleCreateShare = async () => {
    setIsCreating(true);
    try {
      const options: ShareOptions = {
        documentId,
        permission,
        expiresIn: expiresIn ? parseInt(expiresIn) : undefined,
        maxDownloads: maxDownloads ? parseInt(maxDownloads) : undefined,
        requiresAuth,
        password: password || undefined,
        recipientEmail: recipientEmail || undefined
      };

      const share = await leaseStorageService.shareDocument(options);
      setCreatedShare(share);

      toast({
        title: 'Share Link Created',
        description: 'Document share link has been created successfully'
      });

      if (onShareCreated) {
        onShareCreated(share);
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to create share link',
        variant: 'destructive'
      });
    } finally {
      setIsCreating(false);
    }
  };

  const handleCopyLink = async () => {
    if (!createdShare) return;

    try {
      await navigator.clipboard.writeText(createdShare.share_url);
      toast({
        title: 'Copied',
        description: 'Share link copied to clipboard'
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to copy link',
        variant: 'destructive'
      });
    }
  };

  const handleSendEmail = () => {
    if (!createdShare || !recipientEmail) return;

    const subject = `Shared Document: ${documentTitle}`;
    const body = `${message || 'A document has been shared with you.'}\n\nAccess the document here: ${createdShare.share_url}${password ? `\n\nPassword: ${password}` : ''}`;
    
    window.location.href = `mailto:${recipientEmail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  };

  const handleReset = () => {
    setCreatedShare(null);
    setRecipientEmail('');
    setPassword('');
    setMessage('');
    setMaxDownloads('');
  };

  const getPermissionIcon = (perm: string) => {
    switch (perm) {
      case 'view':
        return <Eye className="h-4 w-4" />;
      case 'download':
        return <DownloadIcon className="h-4 w-4" />;
      case 'edit':
        return <Edit className="h-4 w-4" />;
      default:
        return <Eye className="h-4 w-4" />;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Share2 className="h-5 w-5" />
            Share Document
          </DialogTitle>
          <DialogDescription>
            Create a secure link to share: {documentTitle}
          </DialogDescription>
        </DialogHeader>

        {!createdShare ? (
          <div className="space-y-6">
            {/* Permission Level */}
            <div className="space-y-2">
              <Label>Permission Level</Label>
              <Select value={permission} onValueChange={(value) => setPermission(value as typeof permission)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="view">
                    <div className="flex items-center gap-2">
                      <Eye className="h-4 w-4" />
                      <span>View Only - Can view the document</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="download">
                    <div className="flex items-center gap-2">
                      <DownloadIcon className="h-4 w-4" />
                      <span>Download - Can view and download</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="edit">
                    <div className="flex items-center gap-2">
                      <Edit className="h-4 w-4" />
                      <span>Edit - Can view, download, and edit</span>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Recipient Email */}
            <div className="space-y-2">
              <Label htmlFor="email">Recipient Email (Optional)</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  id="email"
                  type="email"
                  value={recipientEmail}
                  onChange={(e) => setRecipientEmail(e.target.value)}
                  placeholder="recipient@example.com"
                  className="pl-10"
                />
              </div>
            </div>

            {/* Expiration */}
            <div className="space-y-2">
              <Label htmlFor="expires">Link Expires In</Label>
              <Select value={expiresIn} onValueChange={setExpiresIn}>
                <SelectTrigger id="expires">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1 hour</SelectItem>
                  <SelectItem value="24">24 hours</SelectItem>
                  <SelectItem value="72">3 days</SelectItem>
                  <SelectItem value="168">1 week</SelectItem>
                  <SelectItem value="720">30 days</SelectItem>
                  <SelectItem value="">Never expires</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Max Downloads */}
            <div className="space-y-2">
              <Label htmlFor="maxDownloads">Maximum Downloads (Optional)</Label>
              <Input
                id="maxDownloads"
                type="number"
                value={maxDownloads}
                onChange={(e) => setMaxDownloads(e.target.value)}
                placeholder="Unlimited"
                min="1"
              />
            </div>

            {/* Security Options */}
            <Card className="bg-gray-50">
              <CardContent className="pt-6 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Lock className="h-4 w-4 text-gray-600" />
                    <div>
                      <p className="text-sm font-medium">Require Authentication</p>
                      <p className="text-xs text-gray-600">User must be logged in to access</p>
                    </div>
                  </div>
                  <Switch
                    checked={requiresAuth}
                    onCheckedChange={setRequiresAuth}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password">Password Protection (Optional)</Label>
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter password"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Message */}
            <div className="space-y-2">
              <Label htmlFor="message">Message (Optional)</Label>
              <Textarea
                id="message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Add a message for the recipient..."
                rows={3}
              />
            </div>

            {/* Summary */}
            <Card className="bg-blue-50 border-blue-200">
              <CardContent className="pt-6">
                <div className="flex items-start gap-3">
                  <Share2 className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                  <div className="space-y-2 text-sm">
                    <p className="font-medium text-blue-900">Share Summary</p>
                    <ul className="space-y-1 text-blue-800">
                      <li className="flex items-center gap-2">
                        {getPermissionIcon(permission)}
                        <span className="capitalize">{permission} permission</span>
                      </li>
                      {expiresIn && (
                        <li className="flex items-center gap-2">
                          <Clock className="h-4 w-4" />
                          <span>Expires in {expiresIn === '1' ? '1 hour' : expiresIn === '24' ? '24 hours' : `${parseInt(expiresIn) / 24} days`}</span>
                        </li>
                      )}
                      {maxDownloads && (
                        <li className="flex items-center gap-2">
                          <DownloadIcon className="h-4 w-4" />
                          <span>Max {maxDownloads} downloads</span>
                        </li>
                      )}
                      {requiresAuth && (
                        <li className="flex items-center gap-2">
                          <Lock className="h-4 w-4" />
                          <span>Authentication required</span>
                        </li>
                      )}
                      {password && (
                        <li className="flex items-center gap-2">
                          <Lock className="h-4 w-4" />
                          <span>Password protected</span>
                        </li>
                      )}
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Actions */}
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button onClick={handleCreateShare} disabled={isCreating}>
                <Share2 className="h-4 w-4 mr-2" />
                {isCreating ? 'Creating...' : 'Create Share Link'}
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Success Message */}
            <Card className="bg-green-50 border-green-200">
              <CardContent className="pt-6">
                <div className="flex items-start gap-3">
                  <CheckCircle className="h-6 w-6 text-green-600 flex-shrink-0" />
                  <div>
                    <p className="font-medium text-green-900 mb-1">
                      Share Link Created Successfully
                    </p>
                    <p className="text-sm text-green-800">
                      The document can now be accessed using the link below
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Share Link */}
            <div className="space-y-2">
              <Label>Share Link</Label>
              <div className="flex gap-2">
                <div className="flex-1 relative">
                  <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    value={createdShare.share_url}
                    readOnly
                    className="pl-10 font-mono text-sm"
                  />
                </div>
                <Button variant="outline" onClick={handleCopyLink}>
                  <Copy className="h-4 w-4 mr-2" />
                  Copy
                </Button>
              </div>
            </div>

            {/* Share Details */}
            <Card>
              <CardContent className="pt-6 space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Permission</span>
                  <Badge variant="outline" className="capitalize">
                    {getPermissionIcon(createdShare.permission)}
                    <span className="ml-1">{createdShare.permission}</span>
                  </Badge>
                </div>
                {createdShare.expires_at && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Expires</span>
                    <span className="font-medium">
                      {new Date(createdShare.expires_at).toLocaleString()}
                    </span>
                  </div>
                )}
                {createdShare.max_downloads && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Downloads</span>
                    <span className="font-medium">
                      {createdShare.download_count} / {createdShare.max_downloads}
                    </span>
                  </div>
                )}
                {password && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Password</span>
                    <code className="bg-gray-100 px-2 py-1 rounded text-xs">
                      {password}
                    </code>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Actions */}
            <div className="flex justify-between">
              <Button variant="outline" onClick={handleReset}>
                Create Another
              </Button>
              <div className="flex gap-2">
                {recipientEmail && (
                  <Button variant="outline" onClick={handleSendEmail}>
                    <Mail className="h-4 w-4 mr-2" />
                    Send Email
                  </Button>
                )}
                <Button onClick={onClose}>
                  Done
                </Button>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}