import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { Eye, EyeOff, Lock, Mail, User } from 'lucide-react';

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    role: 'agent'
  });

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const success = await login(formData.email, formData.password);
      
      if (success) {
        toast({
          title: "Login Successful",
          description: `Welcome back! Redirecting to your ${formData.role} dashboard.`,
        });

        // Redirect based on role
        setTimeout(() => {
          switch (formData.role) {
            case 'agent':
              navigate('/agent-dashboard');
              break;
            case 'broker':
              navigate('/broker-dashboard');
              break;
            case 'buyer':
              navigate('/buyer-dashboard');
              break;
            case 'seller':
            case 'client':
              navigate('/client-dashboard');
              break;
            case 'landlord':
              navigate('/landlord-dashboard');
              break;
            case 'tenant':
              navigate('/tenant-dashboard');
              break;
            default:
              navigate('/');
          }
        }, 500);
      } else {
        throw new Error('Login failed');
      }
    } catch (error) {
      toast({
        title: "Login Failed",
        description: "Invalid credentials. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  }, [formData.email, formData.password, formData.role, login, navigate, toast]);

  const handleQuickLogin = async (role: string, email: string) => {
    setIsLoading(true);
    
    try {
      const success = await login(email, 'password123');
      
      if (success) {
        toast({
          title: "Login Successful",
          description: `Welcome back! Redirecting to your ${role} dashboard.`,
        });

        // Redirect based on role
        setTimeout(() => {
          switch (role) {
            case 'agent':
              navigate('/agent-dashboard');
              break;
            case 'broker':
              navigate('/broker-dashboard');
              break;
            case 'buyer':
              navigate('/buyer-dashboard');
              break;
            case 'seller':
            case 'client':
              navigate('/client-dashboard');
              break;
            case 'landlord':
              navigate('/landlord-dashboard');
              break;
            case 'tenant':
              navigate('/tenant-dashboard');
              break;
            default:
              navigate('/');
          }
        }, 500);
      } else {
        throw new Error('Login failed');
      }
    } catch (error) {
      toast({
        title: "Login Failed",
        description: "Invalid credentials. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
            Sign in to KeyChain
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            Access your real estate dashboard
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-center">Login to Your Account</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="email">Email Address</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="Enter your email"
                    className="pl-10"
                    required
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    placeholder="Enter your password"
                    className="pl-10 pr-10"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2"
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4 text-gray-400" />
                    ) : (
                      <Eye className="h-4 w-4 text-gray-400" />
                    )}
                  </button>
                </div>
              </div>

              <div>
                <Label htmlFor="role">Role</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <select
                    id="role"
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                    className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="agent">Real Estate Agent</option>
                    <option value="broker">Broker</option>
                    <option value="buyer">Home Buyer</option>
                    <option value="seller">Home Seller</option>
                    <option value="landlord">Landlord</option>
                    <option value="tenant">Tenant</option>
                  </select>
                </div>
              </div>

              <Button
                type="submit"
                className="w-full"
                disabled={isLoading}
              >
                {isLoading ? 'Signing in...' : 'Sign In'}
              </Button>
            </form>

            <div className="mt-6">
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-300" />
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-white text-gray-500">Quick Login (Demo)</span>
                </div>
              </div>

              <div className="mt-4 space-y-2">
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={() => handleQuickLogin('buyer', 'buyer@example.com')}
                  disabled={isLoading}
                >
                  Login as Buyer
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={() => handleQuickLogin('agent', 'agent@example.com')}
                  disabled={isLoading}
                >
                  Login as Agent
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={() => handleQuickLogin('broker', 'broker@example.com')}
                  disabled={isLoading}
                >
                  Login as Broker
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={() => handleQuickLogin('landlord', 'landlord@example.com')}
                  disabled={isLoading}
                >
                  Login as Landlord
                </Button>
              </div>
            </div>

            <div className="mt-6 text-center">
              <p className="text-sm text-gray-600">
                Don't have an account?{' '}
                <a href="#" className="font-medium text-blue-600 hover:text-blue-500">
                  Contact your broker
                </a>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}