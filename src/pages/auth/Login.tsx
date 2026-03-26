import { useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Home, Loader2, Wallet, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useICOWallet } from '@/hooks/ico/useICOWallet';
import { useBackendAuth } from '@/hooks/ico/useBackendAuth';
import { useAuth } from '@/hooks/useAuth';

export function Login() {
  const navigate = useNavigate();
  const { setWalletSession } = useAuth();

  const { isConnected, account, isConnecting, error: walletError, connect, clickRef } = useICOWallet();
  const { isAuthenticated, isLoading: isSigningIn, error: authError, login } = useBackendAuth(
    clickRef,
    account?.publicKey ?? null,
  );

  // After successful backend auth — sync to AuthContext and redirect
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
      // malformed token
    }
  }, [isAuthenticated, navigate, setWalletSession]);

  // Once wallet connects, auto-trigger backend sign-in
  useEffect(() => {
    if (isConnected && account && !isAuthenticated && !isSigningIn) {
      login();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isConnected, account?.publicKey]);

  const handleConnect = () => {
    if (!isConnected) {
      connect();
    } else {
      login();
    }
  };

  const error = walletError ?? authError;
  const isLoading = isConnecting || isSigningIn;

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <div className="flex items-center justify-center mb-4">
            <Home className="h-8 w-8 text-primary" />
          </div>
          <CardTitle className="text-2xl text-center">Welcome back</CardTitle>
          <CardDescription className="text-center">
            Connect your Casper wallet to sign in
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {isConnected && account && (
            <div className="flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-800">
              <div className="h-2 w-2 rounded-full bg-green-500" />
              <span className="font-mono truncate">{account.publicKey.slice(0, 20)}…</span>
            </div>
          )}

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
            Don't have an account?{' '}
            <Link to="/auth/register" className="text-primary hover:underline font-medium">
              Sign up
            </Link>
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}
