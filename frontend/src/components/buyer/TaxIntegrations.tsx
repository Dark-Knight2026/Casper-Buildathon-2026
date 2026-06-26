import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import {
  FileText,
  Download,
  Upload,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Link as LinkIcon,
  Unlink,
  RefreshCw,
  Shield,
  Zap,
} from 'lucide-react';

interface Integration {
  id: string;
  name: string;
  description: string;
  logo: string;
  category: 'tax-software' | 'accounting' | 'banking';
  connected: boolean;
  lastSync?: string;
  features: string[];
  status: 'active' | 'error' | 'disconnected';
}

const mockIntegrations: Integration[] = [
  {
    id: 'turbotax',
    name: 'TurboTax',
    description: 'Import your property tax data directly into TurboTax',
    logo: '💼',
    category: 'tax-software',
    connected: true,
    lastSync: '2024-01-15T10:30:00',
    features: ['Auto-import deductions', 'Form 1098 sync', 'Expense categorization'],
    status: 'active',
  },
  {
    id: 'hrblock',
    name: 'H&R Block',
    description: 'Seamlessly transfer tax documents to H&R Block Online',
    logo: '🟩',
    category: 'tax-software',
    connected: false,
    features: ['Document transfer', 'Deduction import', 'Real-time sync'],
    status: 'disconnected',
  },
  {
    id: 'quickbooks',
    name: 'QuickBooks',
    description: 'Sync expenses and receipts with QuickBooks for comprehensive tracking',
    logo: '💚',
    category: 'accounting',
    connected: true,
    lastSync: '2024-01-14T15:45:00',
    features: ['Expense sync', 'Receipt upload', 'Category mapping'],
    status: 'active',
  },
  {
    id: 'xero',
    name: 'Xero',
    description: 'Connect your property expenses to Xero accounting software',
    logo: '🔵',
    category: 'accounting',
    connected: false,
    features: ['Automated bookkeeping', 'Bank reconciliation', 'Tax reports'],
    status: 'disconnected',
  },
  {
    id: 'plaid',
    name: 'Plaid Banking',
    description: 'Automatically track property-related transactions from your bank',
    logo: '🏦',
    category: 'banking',
    connected: true,
    lastSync: '2024-01-15T08:00:00',
    features: ['Transaction categorization', 'Auto-import', 'Multi-bank support'],
    status: 'active',
  },
  {
    id: 'taxact',
    name: 'TaxAct',
    description: 'Export your homeowner tax data to TaxAct',
    logo: '📊',
    category: 'tax-software',
    connected: false,
    features: ['Data export', 'Schedule A import', 'Deduction optimizer'],
    status: 'disconnected',
  },
];

export function TaxIntegrations() {
  const [integrations, setIntegrations] = useState<Integration[]>(mockIntegrations);
  const [selectedIntegration, setSelectedIntegration] = useState<Integration | null>(null);
  const [showConnectModal, setShowConnectModal] = useState(false);
  const [filterCategory, setFilterCategory] = useState<string>('all');

  const handleConnect = (integrationId: string) => {
    const integration = integrations.find((i) => i.id === integrationId);
    if (integration) {
      setSelectedIntegration(integration);
      setShowConnectModal(true);
    }
  };

  const handleDisconnect = (integrationId: string) => {
    if (confirm('Are you sure you want to disconnect this integration?')) {
      setIntegrations((prev) =>
        prev.map((int) =>
          int.id === integrationId
            ? { ...int, connected: false, status: 'disconnected' as const, lastSync: undefined }
            : int
        )
      );
    }
  };

  const handleSync = (integrationId: string) => {
    setIntegrations((prev) =>
      prev.map((int) =>
        int.id === integrationId
          ? { ...int, lastSync: new Date().toISOString() }
          : int
      )
    );
    alert('Sync completed successfully!');
  };

  const handleConfirmConnection = () => {
    if (selectedIntegration) {
      setIntegrations((prev) =>
        prev.map((int) =>
          int.id === selectedIntegration.id
            ? { ...int, connected: true, status: 'active' as const, lastSync: new Date().toISOString() }
            : int
        )
      );
      setShowConnectModal(false);
      setSelectedIntegration(null);
    }
  };

  const filteredIntegrations = integrations.filter((int) => {
    if (filterCategory === 'all') return true;
    return int.category === filterCategory;
  });

  const connectedCount = integrations.filter((i) => i.connected).length;
  const activeCount = integrations.filter((i) => i.status === 'active').length;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Zap className="w-5 h-5" />
                Tax Software Integrations
              </CardTitle>
              <CardDescription>
                Connect your favorite tax and accounting software for seamless data transfer
              </CardDescription>
            </div>
            <Button className="bg-blue-600 hover:bg-blue-700">
              <Upload className="w-4 h-4 mr-2" />
              Bulk Export
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {/* Stats */}
          <div className="grid md:grid-cols-3 gap-4 mb-6">
            <Card className="bg-blue-50 border-blue-200">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-blue-600 mb-1">Total Integrations</p>
                    <p className="text-2xl font-bold text-blue-900">{integrations.length}</p>
                  </div>
                  <LinkIcon className="w-8 h-8 text-blue-600" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-green-50 border-green-200">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-green-600 mb-1">Connected</p>
                    <p className="text-2xl font-bold text-green-900">{connectedCount}</p>
                  </div>
                  <CheckCircle2 className="w-8 h-8 text-green-600" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-purple-50 border-purple-200">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-purple-600 mb-1">Active Syncs</p>
                    <p className="text-2xl font-bold text-purple-900">{activeCount}</p>
                  </div>
                  <RefreshCw className="w-8 h-8 text-purple-600" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Category Filters */}
          <div className="flex gap-2 mb-6">
            <Button
              variant={filterCategory === 'all' ? 'default' : 'outline'}
              onClick={() => setFilterCategory('all')}
              className={filterCategory === 'all' ? 'bg-blue-600' : ''}
            >
              All ({integrations.length})
            </Button>
            <Button
              variant={filterCategory === 'tax-software' ? 'default' : 'outline'}
              onClick={() => setFilterCategory('tax-software')}
              className={filterCategory === 'tax-software' ? 'bg-blue-600' : ''}
            >
              Tax Software ({integrations.filter((i) => i.category === 'tax-software').length})
            </Button>
            <Button
              variant={filterCategory === 'accounting' ? 'default' : 'outline'}
              onClick={() => setFilterCategory('accounting')}
              className={filterCategory === 'accounting' ? 'bg-blue-600' : ''}
            >
              Accounting ({integrations.filter((i) => i.category === 'accounting').length})
            </Button>
            <Button
              variant={filterCategory === 'banking' ? 'default' : 'outline'}
              onClick={() => setFilterCategory('banking')}
              className={filterCategory === 'banking' ? 'bg-blue-600' : ''}
            >
              Banking ({integrations.filter((i) => i.category === 'banking').length})
            </Button>
          </div>

          {/* Integrations Grid */}
          <div className="grid md:grid-cols-2 gap-4">
            {filteredIntegrations.map((integration) => (
              <Card
                key={integration.id}
                className={`hover:shadow-md transition-shadow ${
                  integration.connected ? 'border-green-200 bg-green-50' : ''
                }`}
              >
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    <div className="text-4xl">{integration.logo}</div>
                    <div className="flex-1">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <h3 className="font-semibold text-lg">{integration.name}</h3>
                          <p className="text-sm text-gray-600">{integration.description}</p>
                        </div>
                        {integration.connected && (
                          <Badge className="bg-green-600 text-white">Connected</Badge>
                        )}
                      </div>

                      <div className="space-y-2 mb-4">
                        <p className="text-xs font-semibold text-gray-700">Features:</p>
                        <div className="flex flex-wrap gap-1">
                          {integration.features.map((feature, index) => (
                            <Badge key={index} variant="outline" className="text-xs">
                              {feature}
                            </Badge>
                          ))}
                        </div>
                      </div>

                      {integration.connected && integration.lastSync && (
                        <p className="text-xs text-gray-500 mb-3">
                          Last synced: {new Date(integration.lastSync).toLocaleString()}
                        </p>
                      )}

                      <div className="flex gap-2">
                        {integration.connected ? (
                          <>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleSync(integration.id)}
                            >
                              <RefreshCw className="w-4 h-4 mr-1" />
                              Sync Now
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleDisconnect(integration.id)}
                            >
                              <Unlink className="w-4 h-4 mr-1" />
                              Disconnect
                            </Button>
                          </>
                        ) : (
                          <Button
                            size="sm"
                            className="bg-blue-600 hover:bg-blue-700"
                            onClick={() => handleConnect(integration.id)}
                          >
                            <LinkIcon className="w-4 h-4 mr-1" />
                            Connect
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Security Notice */}
          <Card className="mt-6 bg-gray-50">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <Shield className="w-5 h-5 text-blue-600 mt-0.5" />
                <div>
                  <p className="font-semibold text-sm mb-1">Secure Integrations</p>
                  <p className="text-xs text-gray-600">
                    All integrations use OAuth 2.0 authentication and bank-level encryption. Your
                    credentials are never stored on our servers. We only access the data you
                    explicitly authorize, and you can revoke access at any time.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Benefits */}
          <Card className="mt-6 bg-gradient-to-r from-blue-50 to-purple-50 border-2 border-blue-200">
            <CardHeader>
              <CardTitle className="text-lg">Integration Benefits</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-start gap-3 p-3 bg-white rounded-lg">
                <CheckCircle2 className="w-5 h-5 text-green-600 mt-0.5" />
                <div>
                  <p className="font-semibold text-sm">Automated Data Transfer</p>
                  <p className="text-xs text-gray-600">
                    Eliminate manual data entry by automatically syncing your property expenses and
                    deductions
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 bg-white rounded-lg">
                <CheckCircle2 className="w-5 h-5 text-green-600 mt-0.5" />
                <div>
                  <p className="font-semibold text-sm">Real-time Synchronization</p>
                  <p className="text-xs text-gray-600">
                    Keep your tax software up-to-date with real-time expense tracking and document
                    uploads
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 bg-white rounded-lg">
                <CheckCircle2 className="w-5 h-5 text-green-600 mt-0.5" />
                <div>
                  <p className="font-semibold text-sm">Reduced Errors</p>
                  <p className="text-xs text-gray-600">
                    Minimize mistakes with automatic categorization and validation of tax-related
                    transactions
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 bg-white rounded-lg">
                <CheckCircle2 className="w-5 h-5 text-green-600 mt-0.5" />
                <div>
                  <p className="font-semibold text-sm">Time Savings</p>
                  <p className="text-xs text-gray-600">
                    Save hours during tax season by having all your documents and deductions
                    organized and ready
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </CardContent>
      </Card>

      {/* Connection Modal */}
      {showConnectModal && selectedIntegration && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="max-w-md w-full">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <span className="text-2xl">{selectedIntegration.logo}</span>
                Connect to {selectedIntegration.name}
              </CardTitle>
              <CardDescription>
                Authorize access to sync your property tax data
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                <p className="text-sm font-semibold mb-2">This integration will:</p>
                <ul className="text-sm text-gray-700 space-y-1">
                  {selectedIntegration.features.map((feature, index) => (
                    <li key={index} className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-green-600" />
                      {feature}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5" />
                  <div>
                    <p className="text-sm font-semibold text-yellow-900">Important</p>
                    <p className="text-xs text-yellow-800">
                      You'll be redirected to {selectedIntegration.name} to authorize this
                      connection. We'll only access the data you explicitly permit.
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex gap-2">
                <Button
                  className="flex-1 bg-blue-600 hover:bg-blue-700"
                  onClick={handleConfirmConnection}
                >
                  <LinkIcon className="w-4 h-4 mr-2" />
                  Authorize Connection
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowConnectModal(false);
                    setSelectedIntegration(null);
                  }}
                >
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