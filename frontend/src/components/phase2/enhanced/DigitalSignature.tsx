import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  FileText, 
  PenTool, 
  Check, 
  Clock, 
  User, 
  Download,
  Eye,
  AlertCircle,
  Shield
} from 'lucide-react';

interface SignatureRequest {
  id: string;
  documentName: string;
  documentType: string;
  requester: string;
  signers: Signer[];
  status: 'pending' | 'in_progress' | 'completed' | 'expired';
  createdAt: string;
  expiresAt: string;
  completedAt?: string;
}

interface Signer {
  id: string;
  name: string;
  email: string;
  role: string;
  status: 'pending' | 'signed' | 'declined';
  signedAt?: string;
  ipAddress?: string;
}

export default function DigitalSignature() {
  const [activeTab, setActiveTab] = useState('pending');
  
  const [signatureRequests] = useState<SignatureRequest[]>([
    {
      id: 'sig-001',
      documentName: 'Purchase Agreement - 123 Luxury Lane',
      documentType: 'Purchase Agreement',
      requester: 'Emily Rodriguez (Agent)',
      status: 'in_progress',
      createdAt: '2024-09-01T10:00:00Z',
      expiresAt: '2024-09-08T23:59:59Z',
      signers: [
        {
          id: 'buyer-1',
          name: 'John Smith',
          email: 'john.smith@email.com',
          role: 'Buyer',
          status: 'signed',
          signedAt: '2024-09-01T14:30:00Z',
          ipAddress: '192.168.1.100'
        },
        {
          id: 'seller-1',
          name: 'Robert Wilson',
          email: 'robert.w@email.com',
          role: 'Seller',
          status: 'pending'
        },
        {
          id: 'agent-1',
          name: 'Emily Rodriguez',
          email: 'emily.r@agency.com',
          role: 'Listing Agent',
          status: 'pending'
        }
      ]
    },
    {
      id: 'sig-002',
      documentName: 'Disclosure Statement - 456 Oak Avenue',
      documentType: 'Disclosure',
      requester: 'Sarah Johnson (Seller)',
      status: 'completed',
      createdAt: '2024-08-28T09:00:00Z',
      expiresAt: '2024-09-04T23:59:59Z',
      completedAt: '2024-08-30T16:45:00Z',
      signers: [
        {
          id: 'seller-2',
          name: 'Sarah Johnson',
          email: 'sarah.j@email.com',
          role: 'Seller',
          status: 'signed',
          signedAt: '2024-08-28T11:20:00Z',
          ipAddress: '192.168.1.101'
        },
        {
          id: 'buyer-2',
          name: 'Mike Davis',
          email: 'mike.davis@email.com',
          role: 'Buyer',
          status: 'signed',
          signedAt: '2024-08-30T16:45:00Z',
          ipAddress: '192.168.1.102'
        }
      ]
    }
  ]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'in_progress': return 'bg-blue-100 text-blue-800';
      case 'completed': return 'bg-green-100 text-green-800';
      case 'expired': return 'bg-red-100 text-red-800';
      case 'declined': return 'bg-red-100 text-red-800';
      case 'signed': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
      case 'signed': return <Check className="h-4 w-4 text-green-600" />;
      case 'pending': return <Clock className="h-4 w-4 text-yellow-600" />;
      case 'in_progress': return <PenTool className="h-4 w-4 text-blue-600" />;
      case 'expired':
      case 'declined': return <AlertCircle className="h-4 w-4 text-red-600" />;
      default: return <FileText className="h-4 w-4 text-gray-600" />;
    }
  };

  const calculateProgress = (signers: Signer[]) => {
    const signed = signers.filter(s => s.status === 'signed').length;
    return (signed / signers.length) * 100;
  };

  const handleSign = (requestId: string) => {
    // In a real app, this would open the signing interface
    alert('Opening digital signature interface...');
  };

  const handleViewDocument = (requestId: string) => {
    // In a real app, this would open the document viewer
    alert('Opening document viewer...');
  };

  const filteredRequests = signatureRequests.filter(request => {
    if (activeTab === 'pending') return request.status === 'pending' || request.status === 'in_progress';
    if (activeTab === 'completed') return request.status === 'completed';
    if (activeTab === 'all') return true;
    return true;
  });

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Digital Signature</h1>
        <p className="text-gray-600">Secure electronic document signing and tracking</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Pending Signatures</p>
                <p className="text-2xl font-bold text-gray-900">
                  {signatureRequests.filter(r => r.status === 'pending' || r.status === 'in_progress').length}
                </p>
              </div>
              <Clock className="h-8 w-8 text-yellow-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Completed</p>
                <p className="text-2xl font-bold text-gray-900">
                  {signatureRequests.filter(r => r.status === 'completed').length}
                </p>
              </div>
              <Check className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">This Month</p>
                <p className="text-2xl font-bold text-gray-900">12</p>
              </div>
              <FileText className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Avg. Completion</p>
                <p className="text-2xl font-bold text-gray-900">2.3 days</p>
              </div>
              <PenTool className="h-8 w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tab Navigation */}
      <div className="flex space-x-1 mb-6 bg-gray-100 p-1 rounded-lg w-fit">
        <Button
          variant={activeTab === 'pending' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => setActiveTab('pending')}
        >
          Pending ({signatureRequests.filter(r => r.status === 'pending' || r.status === 'in_progress').length})
        </Button>
        <Button
          variant={activeTab === 'completed' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => setActiveTab('completed')}
        >
          Completed ({signatureRequests.filter(r => r.status === 'completed').length})
        </Button>
        <Button
          variant={activeTab === 'all' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => setActiveTab('all')}
        >
          All ({signatureRequests.length})
        </Button>
      </div>

      {/* Signature Requests */}
      <div className="space-y-6">
        {filteredRequests.map((request) => (
          <Card key={request.id}>
            <CardContent className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-2">
                    <h3 className="font-semibold text-gray-900">{request.documentName}</h3>
                    <Badge className={getStatusColor(request.status)}>
                      {getStatusIcon(request.status)}
                      <span className="ml-1">{request.status.replace('_', ' ').toUpperCase()}</span>
                    </Badge>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-600">
                    <div>
                      <p className="font-medium">Document Type</p>
                      <p>{request.documentType}</p>
                    </div>
                    <div>
                      <p className="font-medium">Requested by</p>
                      <p>{request.requester}</p>
                    </div>
                    <div>
                      <p className="font-medium">Expires</p>
                      <p>{new Date(request.expiresAt).toLocaleDateString()}</p>
                    </div>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Button variant="outline" size="sm" onClick={() => handleViewDocument(request.id)}>
                    <Eye className="h-4 w-4 mr-1" />
                    View
                  </Button>
                  <Button variant="outline" size="sm">
                    <Download className="h-4 w-4 mr-1" />
                    Download
                  </Button>
                </div>
              </div>

              {/* Progress Bar */}
              {request.status === 'in_progress' && (
                <div className="mb-4">
                  <div className="flex justify-between text-sm mb-1">
                    <span>Signature Progress</span>
                    <span>{Math.round(calculateProgress(request.signers))}% Complete</span>
                  </div>
                  <Progress value={calculateProgress(request.signers)} className="h-2" />
                </div>
              )}

              {/* Signers */}
              <div className="space-y-3">
                <h4 className="font-medium text-gray-900">Signers ({request.signers.length})</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {request.signers.map((signer) => (
                    <div key={signer.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <User className="h-8 w-8 text-gray-400" />
                        <div>
                          <p className="font-medium text-gray-900">{signer.name}</p>
                          <p className="text-sm text-gray-600">{signer.role}</p>
                          {signer.signedAt && (
                            <p className="text-xs text-gray-500">
                              Signed: {new Date(signer.signedAt).toLocaleDateString()}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Badge className={getStatusColor(signer.status)} size="sm">
                          {getStatusIcon(signer.status)}
                          <span className="ml-1">{signer.status.toUpperCase()}</span>
                        </Badge>
                        {signer.status === 'pending' && (
                          <Button size="sm" onClick={() => handleSign(request.id)}>
                            Sign
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Security Info */}
              <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                <div className="flex items-center space-x-2">
                  <Shield className="h-4 w-4 text-blue-600" />
                  <span className="text-sm font-medium text-blue-900">Security Features</span>
                </div>
                <p className="text-sm text-blue-800 mt-1">
                  256-bit SSL encryption • IP address tracking • Timestamp verification • Audit trail
                </p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Create New Signature Request */}
      <Card className="mt-8">
        <CardHeader>
          <CardTitle>Create New Signature Request</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <PenTool className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Start New Signature Process</h3>
            <p className="text-gray-600 mb-4">Upload a document and add signers to begin the electronic signature process</p>
            <Button>
              <FileText className="h-4 w-4 mr-2" />
              Create Signature Request
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}