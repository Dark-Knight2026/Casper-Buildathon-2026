import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Home, Loader2, Wallet, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { useICOWallet } from '@/hooks/ico/useICOWallet';
import { useBackendAuth } from '@/hooks/ico/useBackendAuth';
import { useAuth } from '@/hooks/useAuth';

export function Register() {
  const navigate = useNavigate();
  const { setWalletSession } = useAuth();
  const [role, setRole] = useState<'tenant' | 'landlord'>('tenant');

  const { isConnected, account, isConnecting, error: walletError, connect, clickRef } = useICOWallet();
  const { isAuthenticated, isLoading: isSigningIn, error: authError, login } = useBackendAuth(
    clickRef,
    account?.publicKey ?? null,
  );

  // After successful backend auth — read JWT from localStorage and update AuthContext
  useEffect(() => {
    if (!isAuthenticated) return;

    const token = localStorage.getItem('leasefi_jwt');
    if (!token) return;

    try {
      const payload = JSON.parse(atob(token.split('.')[1])) as { sub: string; role: string };
      setWalletSession(token, payload.sub, payload.role);

      const destination = payload.role === 'landlord' ? '/landlord/dashboard' : '/tenant/dashboard';
      navigate(destination, { replace: true });
    } catch {
      // malformed token — ignore, user stays on page
    }
  }, [isAuthenticated, navigate, setWalletSession]);

  const handleConnect = () => {
    if (!isConnected) {
      connect();
    } else {
      // Wallet already connected — trigger backend sign-in
      login();
    }
  };

  // Once wallet connects, automatically trigger backend auth
  useEffect(() => {
    if (isConnected && account && !isAuthenticated && !isSigningIn) {
      login();
    }
  // login is stable (useCallback), safe to include
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isConnected, account?.publicKey]);

  const error = walletError ?? authError;
  const isLoading = isConnecting || isSigningIn;

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4 py-8">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <div className="flex items-center justify-center mb-4">
            <Home className="h-8 w-8 text-primary" />
          </div>
          <CardTitle className="text-2xl text-center">Create an account</CardTitle>
          <CardDescription className="text-center">
            Connect your Casper wallet to get started
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Role selection */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">I am a</Label>
            <RadioGroup
              value={role}
              onValueChange={(v: 'tenant' | 'landlord') => setRole(v)}
              className="flex gap-4"
              disabled={isLoading || isConnected}
            >
              <div className="flex items-center space-x-2 flex-1 border rounded-lg p-3 cursor-pointer hover:bg-gray-50">
                <RadioGroupItem value="tenant" id="tenant" />
                <Label htmlFor="tenant" className="cursor-pointer font-normal w-full">
                  Tenant
                </Label>
              </div>
              <div className="flex items-center space-x-2 flex-1 border rounded-lg p-3 cursor-pointer hover:bg-gray-50">
                <RadioGroupItem value="landlord" id="landlord" />
                <Label htmlFor="landlord" className="cursor-pointer font-normal w-full">
                  Landlord
                </Label>
              </div>
            </RadioGroup>
            {isConnected && (
              <p className="text-xs text-muted-foreground">
                Role is set during first connection. To change, disconnect and reconnect.
              </p>
            )}
          </div>

          {/* Wallet status */}
          {isConnected && account && (
            <div className="flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-800">
              <div className="h-2 w-2 rounded-full bg-green-500" />
              <span className="font-mono truncate">{account.publicKey.slice(0, 20)}…</span>
            </div>
          )}

          {/* NOTE FOR BACKEND TEAM:
              The `role` selected above needs to be sent to POST /api/v1/auth/login
              as an optional field. Backend should use it only on first registration
              (INSERT) and ignore it on subsequent logins (ON CONFLICT DO UPDATE).
              Until the backend supports this, new users will always get 'tenant' role.
          */}
          <Button
            className="w-full"
            onClick={handleConnect}
            disabled={isLoading || isAuthenticated}
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {isConnecting ? 'Opening wallet…' : 'Signing in…'}
              </>
            ) : (
              <>
                <Wallet className="mr-2 h-4 w-4" />
                {isConnected ? 'Sign in with Casper' : 'Connect Casper Wallet'}
              </>
            )}
          </Button>

          <p className="text-xs text-center text-muted-foreground">
            Supported: Casper Wallet, Ledger, MetaMask Snap
          </p>
        </CardContent>

        <CardFooter className="justify-center">
          <p className="text-sm text-gray-600">
            Already have an account?{' '}
            <Link to="/auth/login" className="text-primary hover:underline font-medium">
              Sign in
            </Link>
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}
