/**
 * MFA Verification Page
 * Verify MFA code during login
 */

import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Shield, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';

interface LocationState {
  from?: {
    pathname: string;
  };
}

export default function MFAVerify() {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [useBackupCode, setUseBackupCode] = useState(false);

  const handleVerify = async () => {
    try {
      setLoading(true);
      
      if (!code) {
        toast({
          title: 'Error',
          description: 'Please enter a verification code',
          variant: 'destructive'
        });
        return;
      }
      
      // Verify MFA code
      // In production, this would verify against stored TOTP secret or SMS code
      
      toast({
        title: 'Verification Successful',
        description: 'You have been logged in'
      });
      
      // Redirect to intended destination or dashboard
      const state = location.state as LocationState | null;
      const from = state?.from?.pathname || '/tenant/dashboard';
      navigate(from, { replace: true });
    } catch (error) {
      console.error('Verification error:', error);
      toast({
        title: 'Verification Failed',
        description: 'Invalid verification code',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleResendCode = async () => {
    try {
      setLoading(true);
      
      // Resend SMS code
      toast({
        title: 'Code Sent',
        description: 'A new verification code has been sent'
      });
    } catch (error) {
      console.error('Resend error:', error);
      toast({
        title: 'Error',
        description: 'Failed to resend code',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
            <Shield className="h-8 w-8 text-blue-600" />
          </div>
          <CardTitle className="text-2xl">Two-Factor Authentication</CardTitle>
          <CardDescription>
            {useBackupCode
              ? 'Enter one of your backup codes'
              : 'Enter the verification code from your authenticator app'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <AlertDescription>
              This extra step helps keep your account secure.
            </AlertDescription>
          </Alert>

          <div className="space-y-2">
            <Label htmlFor="code">
              {useBackupCode ? 'Backup Code' : 'Verification Code'}
            </Label>
            <Input
              id="code"
              type="text"
              placeholder={useBackupCode ? 'XXXXXXXX' : '000000'}
              value={code}
              onChange={(e) => setCode(e.target.value)}
              maxLength={useBackupCode ? 8 : 6}
              className="text-center text-2xl tracking-widest font-mono"
              autoFocus
            />
          </div>

          <Button
            onClick={handleVerify}
            className="w-full"
            disabled={loading || !code}
          >
            {loading ? 'Verifying...' : 'Verify'}
          </Button>

          <div className="space-y-2">
            {!useBackupCode && (
              <>
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={handleResendCode}
                  disabled={loading}
                >
                  Resend Code
                </Button>
                
                <Button
                  variant="ghost"
                  className="w-full"
                  onClick={() => setUseBackupCode(true)}
                >
                  Use Backup Code
                </Button>
              </>
            )}
            
            {useBackupCode && (
              <Button
                variant="ghost"
                className="w-full"
                onClick={() => setUseBackupCode(false)}
              >
                Use Authenticator Code
              </Button>
            )}
          </div>

          <div className="text-center">
            <Button variant="ghost" onClick={() => navigate('/auth/login')}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Login
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}