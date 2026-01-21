import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/hooks/useAuth';
import { Eye, EyeOff, User, Users, Home } from 'lucide-react';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function AuthModal({ isOpen, onClose }: AuthModalProps) {
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();

  const handleDemoLogin = async (role: 'agent' | 'broker' | 'seller') => {
    setIsLoading(true);
    try {
      const demoCredentials = {
        agent: { email: 'agent@demo.com', password: 'demo123', name: 'Demo Agent', role: 'agent' as const },
        broker: { email: 'broker@demo.com', password: 'demo123', name: 'Demo Broker', role: 'broker' as const },
        seller: { email: 'seller@demo.com', password: 'demo123', name: 'Demo Seller', role: 'seller' as const }
      };
      
      await login(demoCredentials[role]);
      onClose();
    } catch (error) {
      console.error('Demo login failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    
    const formData = new FormData(e.currentTarget);
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;
    const role = formData.get('role') as 'agent' | 'broker' | 'seller';
    const name = formData.get('name') as string;

    try {
      await login({ email, password, name: name || email.split('@')[0], role });
      onClose();
    } catch (error) {
      console.error('Login failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Welcome to PropertyPro</DialogTitle>
        </DialogHeader>
        
        <Tabs defaultValue="demo" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="demo">Quick Demo</TabsTrigger>
            <TabsTrigger value="login">Sign In</TabsTrigger>
          </TabsList>
          
          <TabsContent value="demo" className="space-y-4">
            <div className="text-center mb-4">
              <p className="text-sm text-gray-600">
                Try our platform with pre-configured demo accounts
              </p>
            </div>
            
            <div className="space-y-3">
              <Button
                onClick={() => handleDemoLogin('agent')}
                disabled={isLoading}
                className="w-full justify-start bg-blue-600 hover:bg-blue-700"
              >
                <User className="mr-2 h-4 w-4" />
                Demo as Agent
              </Button>
              
              <Button
                onClick={() => handleDemoLogin('broker')}
                disabled={isLoading}
                className="w-full justify-start bg-purple-600 hover:bg-purple-700"
              >
                <Users className="mr-2 h-4 w-4" />
                Demo as Broker
              </Button>
              
              <Button
                onClick={() => handleDemoLogin('seller')}
                disabled={isLoading}
                className="w-full justify-start bg-green-600 hover:bg-green-700"
              >
                <Home className="mr-2 h-4 w-4" />
                Demo as Seller
              </Button>
            </div>
          </TabsContent>
          
          <TabsContent value="login" className="space-y-4">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="role">Role</Label>
                <Select name="role" required>
                  <SelectTrigger>
                    <SelectValue placeholder="Select your role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="agent">Real Estate Agent</SelectItem>
                    <SelectItem value="broker">Broker</SelectItem>
                    <SelectItem value="seller">Property Seller</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="name">Full Name</Label>
                <Input
                  id="name"
                  name="name"
                  type="text"
                  placeholder="Enter your full name"
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="Enter your email"
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Enter your password"
                    required
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>
              
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? 'Signing in...' : 'Sign In'}
              </Button>
            </form>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}