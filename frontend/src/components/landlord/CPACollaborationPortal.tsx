import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  MessageSquare,
  UserPlus,
  FileText,
  Clock,
  CheckCircle,
  Send,
  Paperclip,
  MoreVertical,
  Phone,
  Video
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface CPACollaborationPortalProps {
  landlordId: string;
}

interface Message {
  id: string;
  sender: 'landlord' | 'cpa';
  content: string;
  timestamp: Date;
  attachments?: string[];
}

interface CPAProfile {
  name: string;
  email: string;
  firm: string;
  phone: string;
  status: 'active' | 'pending' | 'invited';
  avatar?: string;
}

export default function CPACollaborationPortal({ landlordId }: CPACollaborationPortalProps) {
  const { toast } = useToast();
  const [inviteEmail, setInviteEmail] = useState('');
  const [showInviteDialog, setShowInviteDialog] = useState(false);
  const [newMessage, setNewMessage] = useState('');
  
  // Mock data
  const [cpa, setCpa] = useState<CPAProfile | null>({
    name: 'Sarah Jenkins',
    email: 'sarah.j@taxpros.com',
    firm: 'Jenkins & Associates',
    phone: '(555) 123-4567',
    status: 'active',
    avatar: 'https://i.pravatar.cc/150?u=sarah'
  });

  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      sender: 'cpa',
      content: 'Hi, I\'ve started reviewing your documents for the 2024 tax year. Could you please upload the receipt for the roof repair on 123 Main St?',
      timestamp: new Date(Date.now() - 86400000 * 2), // 2 days ago
    },
    {
      id: '2',
      sender: 'landlord',
      content: 'Sure, I just uploaded it to the documents section. Let me know if you need anything else.',
      timestamp: new Date(Date.now() - 86400000), // 1 day ago
    },
    {
      id: '3',
      sender: 'cpa',
      content: 'Got it, thanks! Everything looks good. I should have the draft ready by Friday.',
      timestamp: new Date(Date.now() - 3600000), // 1 hour ago
    }
  ]);

  const handleInvite = () => {
    if (!inviteEmail) return;
    
    toast({
      title: 'Invitation Sent',
      description: `An invitation has been sent to ${inviteEmail}.`,
    });
    
    setShowInviteDialog(false);
    setInviteEmail('');
    
    if (!cpa) {
      setCpa({
        name: 'Pending Invitation',
        email: inviteEmail,
        firm: '',
        phone: '',
        status: 'invited'
      });
    }
  };

  const handleSendMessage = () => {
    if (!newMessage.trim()) return;
    
    const message: Message = {
      id: Date.now().toString(),
      sender: 'landlord',
      content: newMessage,
      timestamp: new Date()
    };
    
    setMessages([...messages, message]);
    setNewMessage('');
    
    // Simulate reply
    setTimeout(() => {
      const reply: Message = {
        id: (Date.now() + 1).toString(),
        sender: 'cpa',
        content: 'Thanks for the update. I\'ll review this shortly.',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, reply]);
    }, 3000);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">CPA Collaboration</h2>
          <p className="text-gray-600 mt-1">
            Communicate securely with your tax professional
          </p>
        </div>
        {!cpa && (
          <Button onClick={() => setShowInviteDialog(true)}>
            <UserPlus className="h-4 w-4 mr-2" />
            Invite CPA
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Chat Area */}
        <Card className="lg:col-span-2 flex flex-col h-[600px]">
          <CardHeader className="border-b px-6 py-4 flex flex-row items-center justify-between">
            <div className="flex items-center gap-3">
              {cpa ? (
                <>
                  <Avatar>
                    <AvatarImage src={cpa.avatar} />
                    <AvatarFallback>{cpa.name.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <div>
                    <CardTitle className="text-base">{cpa.name}</CardTitle>
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 bg-green-500 rounded-full" />
                      <p className="text-xs text-gray-500">Online</p>
                    </div>
                  </div>
                </>
              ) : (
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                    <UserPlus className="h-5 w-5 text-gray-400" />
                  </div>
                  <div>
                    <CardTitle className="text-base">No CPA Connected</CardTitle>
                    <p className="text-xs text-gray-500">Invite your CPA to start chatting</p>
                  </div>
                </div>
              )}
            </div>
            {cpa && (
              <div className="flex gap-2">
                <Button variant="ghost" size="icon">
                  <Phone className="h-4 w-4 text-gray-500" />
                </Button>
                <Button variant="ghost" size="icon">
                  <Video className="h-4 w-4 text-gray-500" />
                </Button>
                <Button variant="ghost" size="icon">
                  <MoreVertical className="h-4 w-4 text-gray-500" />
                </Button>
              </div>
            )}
          </CardHeader>
          
          <CardContent className="flex-1 overflow-y-auto p-6 space-y-4 bg-gray-50">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex ${msg.sender === 'landlord' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[70%] rounded-2xl px-4 py-3 ${
                    msg.sender === 'landlord'
                      ? 'bg-blue-600 text-white rounded-br-none'
                      : 'bg-white border text-gray-800 rounded-bl-none shadow-sm'
                  }`}
                >
                  <p className="text-sm">{msg.content}</p>
                  <p className={`text-[10px] mt-1 ${
                    msg.sender === 'landlord' ? 'text-blue-100' : 'text-gray-400'
                  }`}>
                    {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>
            ))}
          </CardContent>
          
          <div className="p-4 border-t bg-white">
            <div className="flex gap-2">
              <Button variant="ghost" size="icon" className="text-gray-400">
                <Paperclip className="h-5 w-5" />
              </Button>
              <Input 
                placeholder="Type a message..." 
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                className="flex-1"
              />
              <Button onClick={handleSendMessage} disabled={!cpa || !newMessage.trim()}>
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </Card>

        {/* Sidebar Info */}
        <div className="space-y-6">
          {/* CPA Profile Card */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">CPA Profile</CardTitle>
            </CardHeader>
            <CardContent>
              {cpa ? (
                <div className="space-y-4">
                  <div className="flex flex-col items-center text-center p-4 bg-gray-50 rounded-lg">
                    <Avatar className="h-20 w-20 mb-3">
                      <AvatarImage src={cpa.avatar} />
                      <AvatarFallback className="text-lg">{cpa.name.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <h3 className="font-bold text-lg">{cpa.name}</h3>
                    <p className="text-sm text-gray-600">{cpa.firm}</p>
                    <Badge className="mt-2 bg-green-100 text-green-800 hover:bg-green-100 border-green-200">
                      Verified Pro
                    </Badge>
                  </div>
                  
                  <div className="space-y-3 text-sm">
                    <div className="flex justify-between py-2 border-b">
                      <span className="text-gray-500">Email</span>
                      <span className="font-medium">{cpa.email}</span>
                    </div>
                    <div className="flex justify-between py-2 border-b">
                      <span className="text-gray-500">Phone</span>
                      <span className="font-medium">{cpa.phone}</span>
                    </div>
                    <div className="flex justify-between py-2">
                      <span className="text-gray-500">Access Level</span>
                      <span className="font-medium">Full Access</span>
                    </div>
                  </div>
                  
                  <Button variant="outline" className="w-full text-red-600 hover:text-red-700 hover:bg-red-50">
                    Revoke Access
                  </Button>
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-gray-500 mb-4">No CPA connected yet</p>
                  <Button onClick={() => setShowInviteDialog(true)}>Invite CPA</Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Shared Documents */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Shared Files</CardTitle>
                <Button variant="ghost" size="sm" className="text-blue-600">View All</Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {[
                  { name: '2024_Tax_Summary.pdf', date: '2 hours ago', size: '2.4 MB' },
                  { name: '1099-MISC_Forms.zip', date: 'Yesterday', size: '1.1 MB' },
                  { name: 'Expense_Receipts_Q4.pdf', date: '3 days ago', size: '15.8 MB' },
                ].map((file, i) => (
                  <div key={i} className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded-lg cursor-pointer">
                    <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center">
                      <FileText className="h-5 w-5 text-blue-600" />
                    </div>
                    <div className="flex-1 overflow-hidden">
                      <p className="font-medium text-sm truncate">{file.name}</p>
                      <p className="text-xs text-gray-500">{file.date} • {file.size}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Activity Timeline */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Recent Activity</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {[
                  { text: 'Sarah viewed Tax Summary', time: '10 mins ago', icon: CheckCircle },
                  { text: 'You uploaded 3 receipts', time: '2 hours ago', icon: FileText },
                  { text: 'Sarah requested access', time: '2 days ago', icon: UserPlus },
                ].map((activity, i) => (
                  <div key={i} className="flex gap-3">
                    <div className="mt-0.5">
                      <activity.icon className="h-4 w-4 text-gray-400" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-800">{activity.text}</p>
                      <p className="text-xs text-gray-500">{activity.time}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Invite Dialog */}
      <Dialog open={showInviteDialog} onOpenChange={setShowInviteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Invite Your CPA</DialogTitle>
            <DialogDescription>
              Send an invitation to your tax professional to collaborate securely.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>CPA's Email Address</Label>
              <Input 
                placeholder="name@firm.com" 
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
              />
            </div>
            <div className="bg-blue-50 p-4 rounded-lg text-sm text-blue-800">
              <p>Your CPA will receive an email with instructions to create a secure account. They will be able to:</p>
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>View your tax summaries and reports</li>
                <li>Download expense receipts</li>
                <li>Message you securely</li>
              </ul>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setShowInviteDialog(false)}>Cancel</Button>
            <Button onClick={handleInvite} disabled={!inviteEmail}>Send Invitation</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}