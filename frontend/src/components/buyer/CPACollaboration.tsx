import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { useToast } from '@/hooks/use-toast';
import {
  Users,
  UserPlus,
  Send,
  MessageSquare,
  FileText,
  Share2,
  Lock,
  CheckCircle2,
  Clock,
  AlertCircle,
  Shield,
  Mail,
  Phone,
  Building,
  Calendar,
  Eye,
  Download,
  Loader2,
} from 'lucide-react';

interface CPA {
  id: string;
  name: string;
  firm: string;
  email: string;
  phone: string;
  avatar: string;
  status: 'active' | 'pending' | 'inactive';
  specialties: string[];
  connectedDate: string;
  permissions: {
    viewDocuments: boolean;
    viewExpenses: boolean;
    viewForms: boolean;
    editForms: boolean;
    downloadReports: boolean;
  };
}

interface SharedItem {
  id: string;
  type: 'document' | 'expense' | 'form' | 'report';
  name: string;
  sharedDate: string;
  sharedWith: string;
  status: 'viewed' | 'pending' | 'downloaded';
  expiresDate?: string;
}

interface Message {
  id: string;
  from: string;
  to: string;
  subject: string;
  message: string;
  timestamp: string;
  read: boolean;
  attachments?: string[];
}

const mockCPAs: CPA[] = [
  {
    id: 'cpa-001',
    name: 'Sarah Johnson, CPA',
    firm: 'Johnson & Associates Tax Services',
    email: 'sarah@johnsontax.com',
    phone: '(555) 123-4567',
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100',
    status: 'active',
    specialties: ['Real Estate Tax', 'Investment Property', 'Tax Planning'],
    connectedDate: '2023-06-15',
    permissions: {
      viewDocuments: true,
      viewExpenses: true,
      viewForms: true,
      editForms: true,
      downloadReports: true,
    },
  },
  {
    id: 'cpa-002',
    name: 'Michael Chen, EA',
    firm: 'Chen Tax Consulting',
    email: 'michael@chentax.com',
    phone: '(555) 987-6543',
    avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100',
    status: 'pending',
    specialties: ['Individual Tax', 'Small Business', 'IRS Representation'],
    connectedDate: '2024-01-10',
    permissions: {
      viewDocuments: true,
      viewExpenses: true,
      viewForms: false,
      editForms: false,
      downloadReports: false,
    },
  },
];

const mockSharedItems: SharedItem[] = [
  {
    id: 'share-001',
    type: 'document',
    name: 'Form 1098 - Mortgage Interest Statement',
    sharedDate: '2024-01-15T10:30:00',
    sharedWith: 'Sarah Johnson, CPA',
    status: 'viewed',
  },
  {
    id: 'share-002',
    type: 'form',
    name: 'Schedule A - Itemized Deductions',
    sharedDate: '2024-01-14T14:20:00',
    sharedWith: 'Sarah Johnson, CPA',
    status: 'downloaded',
  },
  {
    id: 'share-003',
    type: 'report',
    name: 'Year-End Tax Summary 2024',
    sharedDate: '2024-01-13T09:15:00',
    sharedWith: 'Sarah Johnson, CPA',
    status: 'pending',
    expiresDate: '2024-02-13',
  },
];

const mockMessages: Message[] = [
  {
    id: 'msg-001',
    from: 'Sarah Johnson, CPA',
    to: 'You',
    subject: 'Review of Your 2024 Tax Documents',
    message:
      "I've reviewed your mortgage interest statement and property tax documents. Everything looks good. I recommend we schedule a call to discuss your energy efficiency credits.",
    timestamp: '2024-01-15T11:30:00',
    read: false,
    attachments: ['tax_review_notes.pdf'],
  },
  {
    id: 'msg-002',
    from: 'You',
    to: 'Sarah Johnson, CPA',
    subject: 'Question about Home Office Deduction',
    message:
      'Hi Sarah, I started working from home this year. Can you help me understand if I qualify for the home office deduction?',
    timestamp: '2024-01-14T16:45:00',
    read: true,
  },
];

export function CPACollaboration() {
  const [cpas, setCPAs] = useState<CPA[]>(mockCPAs);
  const [sharedItems, setSharedItems] = useState<SharedItem[]>(mockSharedItems);
  const [messages, setMessages] = useState<Message[]>(mockMessages);
  const [selectedCPA, setSelectedCPA] = useState<CPA | null>(null);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showMessageModal, setShowMessageModal] = useState(false);
  const [isInviting, setIsInviting] = useState(false);
  const { toast } = useToast();

  const handleInviteCPA = async (email: string) => {
    setIsInviting(true);
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const newCPA: CPA = {
      id: `cpa-${Date.now()}`,
      name: email,
      firm: 'Pending',
      email,
      phone: '',
      avatar: 'https://images.unsplash.com/photo-1633332755192-727a05c4013d?w=100',
      status: 'pending',
      specialties: [],
      connectedDate: new Date().toISOString(),
      permissions: {
        viewDocuments: true,
        viewExpenses: true,
        viewForms: false,
        editForms: false,
        downloadReports: false,
      },
    };
    setCPAs((prev) => [newCPA, ...prev]);
    setShowInviteModal(false);
    setIsInviting(false);
    
    toast({
      title: "Invitation sent!",
      description: `An invitation has been sent to ${email}.`,
    });
  };

  const handleUpdatePermissions = (cpaId: string, permissions: Partial<CPA['permissions']>) => {
    setCPAs((prev) =>
      prev.map((cpa) =>
        cpa.id === cpaId
          ? { ...cpa, permissions: { ...cpa.permissions, ...permissions } }
          : cpa
      )
    );
  };

  const handleShareItem = (cpaId: string, itemType: string, itemName: string) => {
    const cpa = cpas.find((c) => c.id === cpaId);
    if (!cpa) return;

    const newItem: SharedItem = {
      id: `share-${Date.now()}`,
      type: itemType as SharedItem['type'],
      name: itemName,
      sharedDate: new Date().toISOString(),
      sharedWith: cpa.name,
      status: 'pending',
    };

    setSharedItems((prev) => [newItem, ...prev]);
    toast({
      title: "Document shared!",
      description: `${itemName} has been shared with ${cpa.name}.`,
    });
  };

  const activeCPAs = cpas.filter((c) => c.status === 'active').length;
  const pendingInvites = cpas.filter((c) => c.status === 'pending').length;
  const unreadMessages = messages.filter((m) => !m.read && m.to === 'You').length;
  const sharedThisMonth = sharedItems.filter((item) => {
    const itemDate = new Date(item.sharedDate);
    const now = new Date();
    return itemDate.getMonth() === now.getMonth() && itemDate.getFullYear() === now.getFullYear();
  }).length;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            CPA Collaboration Hub
          </CardTitle>
          <CardDescription>
            Securely collaborate with your tax professional and share documents
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Stats */}
          <div className="grid md:grid-cols-4 gap-4 mb-6">
            <Card className="bg-blue-50 border-blue-200">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-blue-600 mb-1">Active CPAs</p>
                    <p className="text-2xl font-bold text-blue-900">{activeCPAs}</p>
                  </div>
                  <Users className="w-8 h-8 text-blue-600" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-green-50 border-green-200">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-green-600 mb-1">Shared Items</p>
                    <p className="text-2xl font-bold text-green-900">{sharedItems.length}</p>
                  </div>
                  <Share2 className="w-8 h-8 text-green-600" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-orange-50 border-orange-200">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-orange-600 mb-1">Unread Messages</p>
                    <p className="text-2xl font-bold text-orange-900">{unreadMessages}</p>
                  </div>
                  <MessageSquare className="w-8 h-8 text-orange-600" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-purple-50 border-purple-200">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-purple-600 mb-1">Pending Invites</p>
                    <p className="text-2xl font-bold text-purple-900">{pendingInvites}</p>
                  </div>
                  <Clock className="w-8 h-8 text-purple-600" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Invite CPA */}
          <Card className="mb-6 bg-gradient-to-r from-blue-50 to-purple-50 border-2 border-blue-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-lg mb-1">Invite Your CPA</h3>
                  <p className="text-sm text-gray-600">
                    Grant secure access to your tax professional
                  </p>
                </div>
                <Button
                  className="bg-blue-600 hover:bg-blue-700"
                  onClick={() => setShowInviteModal(true)}
                >
                  <UserPlus className="w-4 h-4 mr-2" />
                  Invite CPA
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Connected CPAs */}
          <div className="grid lg:grid-cols-2 gap-6 mb-6">
            <div>
              <h3 className="font-semibold mb-4">Connected Tax Professionals</h3>
              <div className="space-y-3">
                {cpas.map((cpa) => (
                  <Card
                    key={cpa.id}
                    className={`cursor-pointer hover:shadow-md transition-all ${
                      selectedCPA?.id === cpa.id ? 'border-blue-500 bg-blue-50' : ''
                    }`}
                    onClick={() => setSelectedCPA(cpa)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <img
                          src={cpa.avatar}
                          alt={cpa.name}
                          className="w-12 h-12 rounded-full object-cover"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between mb-1">
                            <div className="flex-1 min-w-0">
                              <p className="font-semibold truncate">{cpa.name}</p>
                              <p className="text-sm text-gray-600 truncate">{cpa.firm}</p>
                            </div>
                            {cpa.status === 'active' && (
                              <Badge className="bg-green-600 text-white">Active</Badge>
                            )}
                            {cpa.status === 'pending' && (
                              <Badge className="bg-orange-600 text-white">Pending</Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-3 text-xs text-gray-600 mb-2">
                            <div className="flex items-center gap-1">
                              <Mail className="w-3 h-3" />
                              <span className="truncate">{cpa.email}</span>
                            </div>
                          </div>
                          {cpa.specialties.length > 0 && (
                            <div className="flex flex-wrap gap-1">
                              {cpa.specialties.map((specialty, index) => (
                                <Badge key={index} variant="outline" className="text-xs">
                                  {specialty}
                                </Badge>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>

            {/* CPA Details */}
            <div>
              {selectedCPA ? (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Access Permissions</CardTitle>
                    <CardDescription>{selectedCPA.name}</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center gap-2">
                          <FileText className="w-4 h-4 text-gray-600" />
                          <span className="text-sm">View Documents</span>
                        </div>
                        <input
                          type="checkbox"
                          checked={selectedCPA.permissions.viewDocuments}
                          onChange={(e) =>
                            handleUpdatePermissions(selectedCPA.id, {
                              viewDocuments: e.target.checked,
                            })
                          }
                          className="w-4 h-4"
                        />
                      </div>

                      <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center gap-2">
                          <FileText className="w-4 h-4 text-gray-600" />
                          <span className="text-sm">View Expenses</span>
                        </div>
                        <input
                          type="checkbox"
                          checked={selectedCPA.permissions.viewExpenses}
                          onChange={(e) =>
                            handleUpdatePermissions(selectedCPA.id, {
                              viewExpenses: e.target.checked,
                            })
                          }
                          className="w-4 h-4"
                        />
                      </div>

                      <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center gap-2">
                          <Eye className="w-4 h-4 text-gray-600" />
                          <span className="text-sm">View Tax Forms</span>
                        </div>
                        <input
                          type="checkbox"
                          checked={selectedCPA.permissions.viewForms}
                          onChange={(e) =>
                            handleUpdatePermissions(selectedCPA.id, {
                              viewForms: e.target.checked,
                            })
                          }
                          className="w-4 h-4"
                        />
                      </div>

                      <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center gap-2">
                          <FileText className="w-4 h-4 text-gray-600" />
                          <span className="text-sm">Edit Tax Forms</span>
                        </div>
                        <input
                          type="checkbox"
                          checked={selectedCPA.permissions.editForms}
                          onChange={(e) =>
                            handleUpdatePermissions(selectedCPA.id, {
                              editForms: e.target.checked,
                            })
                          }
                          className="w-4 h-4"
                        />
                      </div>

                      <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center gap-2">
                          <Download className="w-4 h-4 text-gray-600" />
                          <span className="text-sm">Download Reports</span>
                        </div>
                        <input
                          type="checkbox"
                          checked={selectedCPA.permissions.downloadReports}
                          onChange={(e) =>
                            handleUpdatePermissions(selectedCPA.id, {
                              downloadReports: e.target.checked,
                            })
                          }
                          className="w-4 h-4"
                        />
                      </div>
                    </div>

                    <div className="pt-4 space-y-2">
                      <Button
                        className="w-full bg-blue-600 hover:bg-blue-700"
                        onClick={() =>
                          handleShareItem(
                            selectedCPA.id,
                            'document',
                            'Form 1098 - Mortgage Interest'
                          )
                        }
                      >
                        <Share2 className="w-4 h-4 mr-2" />
                        Share Documents
                      </Button>
                      <Button
                        variant="outline"
                        className="w-full"
                        onClick={() => setShowMessageModal(true)}
                      >
                        <MessageSquare className="w-4 h-4 mr-2" />
                        Send Message
                      </Button>
                    </div>

                    <div className="pt-4 border-t">
                      <p className="text-xs text-gray-600">
                        Connected since:{' '}
                        {new Date(selectedCPA.connectedDate).toLocaleDateString()}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <Card className="h-full flex items-center justify-center">
                  <CardContent className="text-center p-12">
                    <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-600 mb-2">Select a CPA to manage permissions</p>
                    <p className="text-sm text-gray-500">
                      Click on any tax professional to view details
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>

          {/* Recent Messages */}
          <Card className="mb-6">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg flex items-center gap-2">
                  <MessageSquare className="w-5 h-5" />
                  Recent Messages
                </CardTitle>
                <Button size="sm" variant="outline" onClick={() => setShowMessageModal(true)}>
                  <Send className="w-4 h-4 mr-2" />
                  New Message
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {messages.map((message) => (
                  <Card
                    key={message.id}
                    className={`hover:shadow-md transition-shadow ${
                      !message.read && message.to === 'You' ? 'border-blue-500 bg-blue-50' : ''
                    }`}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <p className="font-semibold text-sm">{message.from}</p>
                            {!message.read && message.to === 'You' && (
                              <Badge className="bg-blue-600 text-white text-xs">New</Badge>
                            )}
                          </div>
                          <p className="text-sm text-gray-600">{message.subject}</p>
                        </div>
                        <p className="text-xs text-gray-500">
                          {new Date(message.timestamp).toLocaleString()}
                        </p>
                      </div>
                      <p className="text-sm text-gray-700 mb-2">{message.message}</p>
                      {message.attachments && message.attachments.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                          {message.attachments.map((attachment, index) => (
                            <Badge key={index} variant="outline" className="text-xs">
                              <FileText className="w-3 h-3 mr-1" />
                              {attachment}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Shared Items */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Share2 className="w-5 h-5" />
                Shared Items
              </CardTitle>
              <CardDescription>Documents and forms shared with your CPA</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {sharedItems.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border"
                  >
                    <div className="flex items-center gap-3 flex-1">
                      <FileText className="w-5 h-5 text-gray-600" />
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm truncate">{item.name}</p>
                        <p className="text-xs text-gray-600">
                          Shared with {item.sharedWith} on{' '}
                          {new Date(item.sharedDate).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {item.status === 'viewed' && (
                        <Badge className="bg-green-600 text-white">Viewed</Badge>
                      )}
                      {item.status === 'pending' && (
                        <Badge className="bg-orange-600 text-white">Pending</Badge>
                      )}
                      {item.status === 'downloaded' && (
                        <Badge className="bg-blue-600 text-white">Downloaded</Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Security Notice */}
          <Card className="mt-6 bg-gray-50">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <Shield className="w-5 h-5 text-blue-600 mt-0.5" />
                <div>
                  <p className="font-semibold text-sm mb-1">Secure Collaboration</p>
                  <p className="text-xs text-gray-600">
                    All data shared with your CPA is encrypted end-to-end. You maintain full
                    control over access permissions and can revoke access at any time. Your CPA
                    receives notifications when you share new documents, and you're notified when
                    they view or download items.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </CardContent>
      </Card>

      {/* Invite Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 animate-in fade-in-0 duration-200">
          <Card className="max-w-md w-full animate-in zoom-in-95 duration-200">
            <CardHeader>
              <CardTitle>Invite Tax Professional</CardTitle>
              <CardDescription>Send a secure invitation to your CPA</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>CPA Email Address</Label>
                <Input
                  type="email"
                  placeholder="cpa@example.com"
                  id="cpa-email"
                />
              </div>
              <div>
                <Label>Personal Message (Optional)</Label>
                <Textarea
                  placeholder="Hi, I'd like to invite you to access my tax documents..."
                  rows={3}
                />
              </div>
              <div className="flex gap-2">
                <Button
                  className="flex-1 bg-blue-600 hover:bg-blue-700"
                  onClick={() => {
                    const email = (document.getElementById('cpa-email') as HTMLInputElement)?.value;
                    if (email) handleInviteCPA(email);
                  }}
                  disabled={isInviting}
                >
                  {isInviting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4 mr-2" />
                      Send Invitation
                    </>
                  )}
                </Button>
                <Button variant="outline" onClick={() => setShowInviteModal(false)} disabled={isInviting}>
                  Cancel
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Message Modal */}
      {showMessageModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 animate-in fade-in-0 duration-200">
          <Card className="max-w-md w-full animate-in zoom-in-95 duration-200">
            <CardHeader>
              <CardTitle>Send Message</CardTitle>
              <CardDescription>Communicate securely with your CPA</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>To</Label>
                <Input value={selectedCPA?.name || ''} disabled />
              </div>
              <div>
                <Label>Subject</Label>
                <Input placeholder="Message subject" />
              </div>
              <div>
                <Label>Message</Label>
                <Textarea placeholder="Type your message here..." rows={5} />
              </div>
              <div className="flex gap-2">
                <Button className="flex-1 bg-blue-600 hover:bg-blue-700">
                  <Send className="w-4 h-4 mr-2" />
                  Send Message
                </Button>
                <Button variant="outline" onClick={() => setShowMessageModal(false)}>
                  Cancel
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}