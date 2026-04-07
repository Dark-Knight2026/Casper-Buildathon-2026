import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/useAuth';
import { User, Home, BarChart3, X } from 'lucide-react';
import { useState } from 'react';

export default function QuickLoginBar() {
  const { profile } = useAuth();
  const [isVisible, setIsVisible] = useState(true);

  // Don't show if user is already logged in or if dismissed
  if (profile || !isVisible) return null;

  // TODO: wire up to backend email/password login when ready
  const quickLogin = async (_email: string, _password: string) => {
    // signIn(_email, _password)
  };

  const demoAccounts = [
    { email: 'buyer@demo.com', password: 'demo123', role: 'buyer', name: 'Buyer', icon: User, color: 'bg-blue-600 hover:bg-blue-700' },
    { email: 'seller@demo.com', password: 'demo123', role: 'seller', name: 'Seller', icon: Home, color: 'bg-green-600 hover:bg-green-700' },
    { email: 'renter@demo.com', password: 'demo123', role: 'renter', name: 'Renter', icon: Home, color: 'bg-purple-600 hover:bg-purple-700' },
    { email: 'agent@demo.com', password: 'demo123', role: 'agent', name: 'Agent', icon: BarChart3, color: 'bg-orange-600 hover:bg-orange-700' },
    { email: 'broker@demo.com', password: 'demo123', role: 'broker', name: 'Broker', icon: BarChart3, color: 'bg-red-600 hover:bg-red-700' }
  ];

  return (
    <div className="bg-gradient-to-r from-purple-600 to-pink-600 text-white py-3 px-4 relative">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <Badge variant="secondary" className="bg-white/20 text-white border-white/30">
              Demo Mode
            </Badge>
            <span className="text-sm font-medium">Try different user roles instantly:</span>
          </div>
          
          <div className="hidden md:flex items-center space-x-2">
            {demoAccounts.map((account) => {
              const IconComponent = account.icon;
              return (
                <Button
                  key={account.role}
                  variant="secondary"
                  size="sm"
                  onClick={() => quickLogin(account.email, account.password)}
                  className="bg-white/20 hover:bg-white/30 text-white border-white/30 hover:border-white/50"
                >
                  <IconComponent className="h-4 w-4 mr-1" />
                  {account.name}
                </Button>
              );
            })}
          </div>

          {/* Mobile dropdown for demo accounts */}
          <div className="md:hidden">
            <select 
              onChange={(e) => {
                const account = demoAccounts.find(acc => acc.role === e.target.value);
                if (account) {
                  quickLogin(account.email, account.password);
                }
              }}
              className="bg-white/20 text-white border border-white/30 rounded px-2 py-1 text-sm"
              defaultValue=""
            >
              <option value="" disabled>Select Role</option>
              {demoAccounts.map((account) => (
                <option key={account.role} value={account.role} className="text-gray-900">
                  {account.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsVisible(false)}
          className="text-white hover:bg-white/20 p-1"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}