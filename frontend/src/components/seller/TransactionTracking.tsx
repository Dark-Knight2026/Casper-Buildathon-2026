import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Transaction, TransactionMilestone, ChatMessage } from '@/types/seller';
import { 
  MessageSquare, 
  Users, 
  FileText, 
  Clock,
  CheckCircle,
  AlertCircle,
  Send,
  Paperclip,
  Calendar,
  Home,
  User,
  Building
} from 'lucide-react';

export default function TransactionTracking() {
  const [activeChat, setActiveChat] = useState('main');
  const [newMessage, setNewMessage] = useState('');

  // Mock transaction data
  const transaction: Transaction = {
    id: 'txn-1',
    propertyId: 'prop-1',
    offerId: 'offer-1',
    sellerId: 'seller-1',
    buyerId: 'buyer-1',
    listingAgentId: 'agent-1',
    buyingAgentId: 'agent-2',
    status: 'in_escrow',
    milestones: [
      {
        id: 'milestone-1',
        name: 'Offer Accepted',
        description: 'Purchase agreement signed by all parties',
        dueDate: new Date('2024-09-01'),
        completedAt: new Date('2024-09-01'),
        isRequired: true,
        assignedTo: 'all',
        status: 'completed',
        dependencies: []
      },
      {
        id: 'milestone-2',
        name: 'Earnest Money Deposit',
        description: 'Buyer deposits earnest money into escrow',
        dueDate: new Date('2024-09-03'),
        completedAt: new Date('2024-09-02'),
        isRequired: true,
        assignedTo: 'buyer-1',
        status: 'completed',
        dependencies: ['milestone-1']
      },
      {
        id: 'milestone-3',
        name: 'Home Inspection',
        description: 'Professional home inspection completed',
        dueDate: new Date('2024-09-15'),
        isRequired: true,
        assignedTo: 'buyer-1',
        status: 'in_progress',
        dependencies: ['milestone-2']
      },
      {
        id: 'milestone-4',
        name: 'Loan Application',
        description: 'Buyer submits formal loan application',
        dueDate: new Date('2024-09-10'),
        isRequired: true,
        assignedTo: 'buyer-1',
        status: 'pending',
        dependencies: ['milestone-2']
      },
      {
        id: 'milestone-5',
        name: 'Appraisal',
        description: 'Property appraisal ordered and completed',
        dueDate: new Date('2024-09-20'),
        isRequired: true,
        assignedTo: 'loan-officer',
        status: 'pending',
        dependencies: ['milestone-4']
      },
      {
        id: 'milestone-6',
        name: 'Final Walkthrough',
        description: 'Buyer conducts final property walkthrough',
        dueDate: new Date('2024-12-13'),
        isRequired: true,
        assignedTo: 'buyer-1',
        status: 'pending',
        dependencies: ['milestone-5']
      },
      {
        id: 'milestone-7',
        name: 'Closing',
        description: 'Final closing and transfer of ownership',
        dueDate: new Date('2024-12-15'),
        isRequired: true,
        assignedTo: 'all',
        status: 'pending',
        dependencies: ['milestone-6']
      }
    ],
    participants: [
      {
        id: 'seller-1',
        role: 'seller',
        name: 'Sarah Thompson',
        email: 'sarah@email.com',
        phone: '(555) 123-4567'
      },
      {
        id: 'buyer-1',
        role: 'buyer',
        name: 'John Smith',
        email: 'john@email.com',
        phone: '(555) 234-5678'
      },
      {
        id: 'agent-1',
        role: 'listing_agent',
        name: 'Emily Rodriguez',
        email: 'emily@realty.com',
        phone: '(555) 345-6789',
        company: 'Premium Realty'
      },
      {
        id: 'agent-2',
        role: 'buying_agent',
        name: 'Michael Chen',
        email: 'michael@realty.com',
        phone: '(555) 456-7890',
        company: 'Metro Real Estate'
      },
      {
        id: 'loan-officer',
        role: 'loan_officer',
        name: 'David Park',
        email: 'david@bank.com',
        phone: '(555) 567-8901',
        company: 'First National Bank'
      },
      {
        id: 'escrow-officer',
        role: 'escrow_officer',
        name: 'Lisa Johnson',
        email: 'lisa@escrow.com',
        phone: '(555) 678-9012',
        company: 'Secure Escrow Services'
      }
    ],
    documents: [],
    createdAt: new Date('2024-09-01'),
    expectedClosingDate: new Date('2024-12-15')
  };

  // Mock chat messages
  const chatMessages: ChatMessage[] = [
    {
      id: 'msg-1',
      transactionId: 'txn-1',
      senderId: 'agent-1',
      senderName: 'Emily Rodriguez',
      senderRole: 'Listing Agent',
      message: 'Great news! The inspection has been scheduled for September 15th at 10 AM.',
      timestamp: new Date('2024-09-02T10:30:00'),
      isRead: true
    },
    {
      id: 'msg-2',
      transactionId: 'txn-1',
      senderId: 'buyer-1',
      senderName: 'John Smith',
      senderRole: 'Buyer',
      message: 'Perfect timing. I\'ll be there with my agent. Should we expect this to take about 2-3 hours?',
      timestamp: new Date('2024-09-02T11:15:00'),
      isRead: true
    },
    {
      id: 'msg-3',
      transactionId: 'txn-1',
      senderId: 'loan-officer',
      senderName: 'David Park',
      senderRole: 'Loan Officer',
      message: 'Loan application received and initial review looks good. Appraisal will be ordered once inspection is complete.',
      timestamp: new Date('2024-09-02T14:20:00'),
      isRead: false
    }
  ];

  const getMilestoneStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800 border-green-200';
      case 'in_progress': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'overdue': return 'bg-red-100 text-red-800 border-red-200';
      case 'pending': return 'bg-gray-100 text-gray-800 border-gray-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'seller':
      case 'buyer':
        return <User className="h-4 w-4" />;
      case 'listing_agent':
      case 'buying_agent':
        return <Home className="h-4 w-4" />;
      case 'loan_officer':
      case 'escrow_officer':
      case 'title_company':
        return <Building className="h-4 w-4" />;
      default:
        return <User className="h-4 w-4" />;
    }
  };

  const completedMilestones = transaction.milestones.filter(m => m.status === 'completed').length;
  const totalMilestones = transaction.milestones.length;
  const progressPercentage = (completedMilestones / totalMilestones) * 100;

  const handleSendMessage = () => {
    if (newMessage.trim()) {
      console.log('Sending message:', newMessage);
      setNewMessage('');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Transaction Tracking</h2>
          <p className="text-gray-600">Monitor progress and communicate with all parties</p>
        </div>
        <Badge className="bg-blue-100 text-blue-800 border-blue-200">
          {transaction.status.replace('_', ' ')}
        </Badge>
      </div>

      {/* Transaction Overview */}
      <Card>
        <CardHeader>
          <CardTitle>123 Main St, Downtown - Transaction Overview</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600 mb-2">$850,000</div>
              <p className="text-sm text-gray-600">Sale Price</p>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600 mb-2">
                {transaction.expectedClosingDate.toLocaleDateString()}
              </div>
              <p className="text-sm text-gray-600">Expected Closing</p>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600 mb-2">
                {Math.ceil((transaction.expectedClosingDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))} days
              </div>
              <p className="text-sm text-gray-600">Days Remaining</p>
            </div>
          </div>
          
          <div className="mt-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700">Overall Progress</span>
              <span className="text-sm text-gray-600">{completedMilestones}/{totalMilestones} completed</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div 
                className="bg-gradient-to-r from-blue-600 to-purple-600 h-3 rounded-full transition-all duration-300"
                style={{ width: `${progressPercentage}%` }}
              ></div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Timeline and Chat Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Transaction Timeline */}
        <Card>
          <CardHeader>
            <CardTitle>Transaction Timeline</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {transaction.milestones.map((milestone, index) => (
                <div key={milestone.id} className="flex items-start space-x-4">
                  <div className="flex flex-col items-center">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                      milestone.status === 'completed' ? 'bg-green-100' :
                      milestone.status === 'in_progress' ? 'bg-blue-100' :
                      milestone.status === 'overdue' ? 'bg-red-100' : 'bg-gray-100'
                    }`}>
                      {milestone.status === 'completed' ? (
                        <CheckCircle className="h-4 w-4 text-green-600" />
                      ) : milestone.status === 'in_progress' ? (
                        <Clock className="h-4 w-4 text-blue-600" />
                      ) : milestone.status === 'overdue' ? (
                        <AlertCircle className="h-4 w-4 text-red-600" />
                      ) : (
                        <Clock className="h-4 w-4 text-gray-500" />
                      )}
                    </div>
                    {index < transaction.milestones.length - 1 && (
                      <div className="w-0.5 h-8 bg-gray-200 mt-2"></div>
                    )}
                  </div>
                  
                  <div className="flex-1 pb-8">
                    <div className="flex items-center justify-between">
                      <h4 className="font-semibold text-gray-900">{milestone.name}</h4>
                      <Badge className={`${getMilestoneStatusColor(milestone.status)} border text-xs`}>
                        {milestone.status.replace('_', ' ')}
                      </Badge>
                    </div>
                    <p className="text-sm text-gray-600 mt-1">{milestone.description}</p>
                    <div className="flex items-center space-x-4 mt-2 text-xs text-gray-500">
                      <span>Due: {milestone.dueDate.toLocaleDateString()}</span>
                      {milestone.completedAt && (
                        <span>Completed: {milestone.completedAt.toLocaleDateString()}</span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Communication Panel */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Transaction Chat</span>
              <Badge variant="outline" className="text-xs">
                {chatMessages.filter(m => !m.isRead).length} unread
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4 max-h-96 overflow-y-auto">
              {chatMessages.map((message) => (
                <div key={message.id} className="flex items-start space-x-3">
                  <Avatar className="w-8 h-8">
                    <AvatarFallback className="text-xs">
                      {message.senderName.split(' ').map(n => n[0]).join('')}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <div className="flex items-center space-x-2">
                      <span className="font-medium text-sm text-gray-900">{message.senderName}</span>
                      <Badge variant="outline" className="text-xs">
                        {message.senderRole}
                      </Badge>
                      <span className="text-xs text-gray-500">
                        {message.timestamp.toLocaleTimeString()}
                      </span>
                    </div>
                    <p className="text-sm text-gray-700 mt-1">{message.message}</p>
                  </div>
                </div>
              ))}
            </div>
            
            <div className="mt-4 pt-4 border-t">
              <div className="flex items-center space-x-2">
                <Input
                  placeholder="Type a message..."
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                  className="flex-1"
                />
                <Button size="sm" onClick={handleSendMessage}>
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Transaction Participants */}
      <Card>
        <CardHeader>
          <CardTitle>Transaction Participants</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {transaction.participants.map((participant) => (
              <div key={participant.id} className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                  {getRoleIcon(participant.role)}
                </div>
                <div className="flex-1">
                  <p className="font-medium text-gray-900">{participant.name}</p>
                  <p className="text-xs text-gray-600 capitalize">{participant.role.replace('_', ' ')}</p>
                  {participant.company && (
                    <p className="text-xs text-gray-500">{participant.company}</p>
                  )}
                </div>
                <div className="flex items-center space-x-1">
                  <Button variant="outline" size="sm">
                    <MessageSquare className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Document Status */}
      <Card>
        <CardHeader>
          <CardTitle>Required Documents</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              { name: 'Purchase Agreement', status: 'completed', assignedTo: 'All Parties' },
              { name: 'Earnest Money Receipt', status: 'completed', assignedTo: 'Escrow Officer' },
              { name: 'Inspection Report', status: 'pending', assignedTo: 'Buyer' },
              { name: 'Loan Application', status: 'in_progress', assignedTo: 'Loan Officer' },
              { name: 'Appraisal Report', status: 'pending', assignedTo: 'Appraiser' },
              { name: 'Title Report', status: 'pending', assignedTo: 'Title Company' },
              { name: 'Closing Disclosure', status: 'pending', assignedTo: 'Lender' },
              { name: 'Final Walkthrough Form', status: 'pending', assignedTo: 'Buyer' }
            ].map((doc, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <p className="font-medium text-gray-900">{doc.name}</p>
                  <p className="text-xs text-gray-600">Assigned to: {doc.assignedTo}</p>
                </div>
                <Badge className={`${getMilestoneStatusColor(doc.status)} border text-xs`}>
                  {doc.status.replace('_', ' ')}
                </Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}