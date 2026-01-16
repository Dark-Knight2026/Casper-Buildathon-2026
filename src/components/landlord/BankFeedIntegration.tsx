import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Building2,
  Plus,
  RefreshCw,
  CheckCircle,
  AlertCircle,
  Link2,
  ShieldCheck,
  Trash2,
  ExternalLink
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface BankFeedIntegrationProps {
  landlordId: string;
}

interface BankAccount {
  id: string;
  institutionName: string;
  accountName: string;
  accountType: 'checking' | 'savings' | 'credit';
  lastFour: string;
  balance: number;
  lastSynced: Date;
  status: 'active' | 'error' | 'disconnected';
  linkedProperties: number;
}

export default function BankFeedIntegration({ landlordId }: BankFeedIntegrationProps) {
  const { toast } = useToast();
  const [isConnecting, setIsConnecting] = useState(false);
  const [showConnectDialog, setShowConnectDialog] = useState(false);
  
  // Mock data for connected accounts
  const [accounts, setAccounts] = useState<BankAccount[]>([
    {
      id: 'acc-1',
      institutionName: 'Chase Bank',
      accountName: 'Rental Operating',
      accountType: 'checking',
      lastFour: '4582',
      balance: 12450.50,
      lastSynced: new Date(),
      status: 'active',
      linkedProperties: 2
    },
    {
      id: 'acc-2',
      institutionName: 'Wells Fargo',
      accountName: 'Security Deposits',
      accountType: 'savings',
      lastFour: '9921',
      balance: 8500.00,
      lastSynced: new Date(Date.now() - 3600000), // 1 hour ago
      status: 'active',
      linkedProperties: 3
    },
    {
      id: 'acc-3',
      institutionName: 'American Express',
      accountName: 'Business Gold',
      accountType: 'credit',
      lastFour: '1005',
      balance: -1250.30,
      lastSynced: new Date(Date.now() - 86400000 * 2), // 2 days ago
      status: 'error',
      linkedProperties: 0
    }
  ]);

  const handleConnectBank = () => {
    setIsConnecting(true);
    // Simulate Plaid Link flow
    setTimeout(() => {
      setIsConnecting(false);
      setShowConnectDialog(false);
      
      // Add a new mock account
      const newAccount: BankAccount = {
        id: `acc-${Date.now()}`,
        institutionName: 'Bank of America',
        accountName: 'New Checking',
        accountType: 'checking',
        lastFour: Math.floor(1000 + Math.random() * 9000).toString(),
        balance: 5000.00,
        lastSynced: new Date(),
        status: 'active',
        linkedProperties: 0
      };
      
      setAccounts([...accounts, newAccount]);
      
      toast({
        title: 'Account Connected',
        description: 'Your bank account has been successfully linked.',
      });
    }, 2000);
  };

  const handleSync = (accountId: string) => {
    toast({
      title: 'Syncing Transactions',
      description: 'Fetching latest transactions from the bank...',
    });
    
    // Simulate sync
    setTimeout(() => {
      setAccounts(accounts.map(acc => 
        acc.id === accountId 
          ? { ...acc, lastSynced: new Date(), status: 'active' } 
          : acc
      ));
      
      toast({
        title: 'Sync Complete',
        description: 'Transactions have been updated.',
      });
    }, 1500);
  };

  const handleDisconnect = (accountId: string) => {
    setAccounts(accounts.filter(acc => acc.id !== accountId));
    toast({
      title: 'Account Disconnected',
      description: 'Bank feed has been removed.',
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Bank Feeds</h2>
          <p className="text-gray-600 mt-1">
            Connect your bank accounts to automatically import transactions
          </p>
        </div>
        <Button onClick={() => setShowConnectDialog(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Connect Account
        </Button>
      </div>

      {/* Security Badge */}
      <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-center gap-3">
        <ShieldCheck className="h-6 w-6 text-green-600" />
        <div>
          <h3 className="font-semibold text-green-900">Bank-Level Security</h3>
          <p className="text-sm text-green-800">
            We use Plaid to securely connect to your financial institutions. Your login credentials are never stored on our servers.
          </p>
        </div>
      </div>

      {/* Connected Accounts */}
      <div className="grid grid-cols-1 gap-4">
        {accounts.map(account => (
          <Card key={account.id} className="overflow-hidden">
            <CardContent className="p-0">
              <div className="flex flex-col md:flex-row md:items-center justify-between p-6 gap-4">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <Building2 className="h-6 w-6 text-gray-600" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-lg">{account.institutionName}</h3>
                      {account.status === 'active' ? (
                        <Badge variant="outline" className="text-green-600 border-green-200 bg-green-50">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Active
                        </Badge>
                      ) : (
                        <Badge variant="destructive">
                          <AlertCircle className="h-3 w-3 mr-1" />
                          Connection Error
                        </Badge>
                      )}
                    </div>
                    <p className="text-gray-600">
                      {account.accountName} •••• {account.lastFour}
                    </p>
                    <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                      <span>Type: <span className="capitalize">{account.accountType}</span></span>
                      <span>Last synced: {account.lastSynced.toLocaleString()}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-6">
                  <div className="text-right">
                    <p className="text-sm text-gray-500">Current Balance</p>
                    <p className={`text-xl font-bold ${account.balance < 0 ? 'text-red-600' : 'text-gray-900'}`}>
                      ${Math.abs(account.balance).toLocaleString()}
                      {account.balance < 0 && ' CR'}
                    </p>
                    <p className="text-xs text-blue-600 mt-1">
                      {account.linkedProperties} properties linked
                    </p>
                  </div>
                  
                  <div className="flex gap-2">
                    <Button 
                      variant="outline" 
                      size="icon"
                      onClick={() => handleSync(account.id)}
                      title="Sync now"
                    >
                      <RefreshCw className="h-4 w-4" />
                    </Button>
                    <Button 
                      variant="outline" 
                      size="icon"
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      onClick={() => handleDisconnect(account.id)}
                      title="Disconnect"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
              
              {/* Auto-import settings footer */}
              <div className="bg-gray-50 px-6 py-3 flex items-center justify-between border-t">
                <div className="flex items-center gap-2">
                  <Switch id={`auto-import-${account.id}`} defaultChecked />
                  <Label htmlFor={`auto-import-${account.id}`} className="text-sm font-medium text-gray-700">
                    Auto-import new transactions
                  </Label>
                </div>
                <Button variant="link" size="sm" className="text-blue-600">
                  Manage Property Links <ExternalLink className="h-3 w-3 ml-1" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}

        {accounts.length === 0 && (
          <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
            <Building2 className="h-12 w-12 mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900">No Accounts Connected</h3>
            <p className="text-gray-500 mt-1 mb-4">Connect a bank account to start importing transactions automatically.</p>
            <Button onClick={() => setShowConnectDialog(true)}>
              Connect Your First Account
            </Button>
          </div>
        )}
      </div>

      {/* Connect Dialog */}
      <Dialog open={showConnectDialog} onOpenChange={setShowConnectDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Connect Bank Account</DialogTitle>
            <DialogDescription>
              Select your bank to securely connect your account via Plaid.
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid grid-cols-2 gap-4 py-4">
            {['Chase', 'Bank of America', 'Wells Fargo', 'Citi', 'US Bank', 'Capital One'].map(bank => (
              <Button 
                key={bank} 
                variant="outline" 
                className="h-20 flex flex-col items-center justify-center gap-2"
                onClick={handleConnectBank}
                disabled={isConnecting}
              >
                <Building2 className="h-6 w-6" />
                {bank}
              </Button>
            ))}
          </div>
          
          <div className="text-center">
            <p className="text-xs text-gray-500 mb-4">
              By connecting your account, you agree to our Terms of Service and Privacy Policy.
            </p>
            {isConnecting && (
              <div className="flex items-center justify-center gap-2 text-blue-600">
                <RefreshCw className="h-4 w-4 animate-spin" />
                Connecting to bank...
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}