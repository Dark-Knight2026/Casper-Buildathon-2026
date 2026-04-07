import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Home, Loader2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useWalletConnect } from '@/hooks/auth/useWalletConnect';
import { RoleSelector } from './register/RoleSelector';
import { ProviderList } from './register/ProviderList';
import { WALLET_PROVIDERS, isMobile } from './register/constants';

const availableProviders = isMobile
  ? WALLET_PROVIDERS.filter(p => p.key === 'casper-wallet')
  : WALLET_PROVIDERS;

export function Register() {
  const [role, setRole] = useState<'tenant' | 'landlord'>('tenant');

  const {
    isConnected, account, isAuthenticated, isSigningIn,
    connectingProvider, setConnectingProvider,
    error, isLoading,
    handleConnectProvider, login,
  } = useWalletConnect();

  // NOTE FOR BACKEND TEAM:
  // `role` needs to be sent to POST /api/v1/auth/login as an optional field.
  // Backend should use it only on first registration (INSERT) and ignore on subsequent
  // logins (ON CONFLICT DO UPDATE). Until supported, new users always get 'tenant' role.

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4 py-8">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <div className="flex items-center justify-center mb-4">
            <Home className="h-8 w-8 text-primary" />
          </div>
          <CardTitle className="text-2xl text-center">Create an account</CardTitle>
          <CardDescription className="text-center">
            Connect your wallet to get started
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <RoleSelector
            value={role}
            onChange={setRole}
            disabled={isLoading || isConnected}
            isConnected={isConnected}
          />

          {isConnected && account && (
            <div className="flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-800">
              <div className="h-2 w-2 rounded-full bg-green-500" />
              <span className="font-mono truncate">{account.publicKey.slice(0, 20)}…</span>
            </div>
          )}

          {isConnected && account ? (
            <Button className="w-full" onClick={login} disabled={isSigningIn || isAuthenticated}>
              {isSigningIn
                ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Signing in…</>
                : 'Sign in with connected wallet'
              }
            </Button>
          ) : (
            <ProviderList
              providers={availableProviders}
              connectingProvider={connectingProvider}
              onConnect={handleConnectProvider}
              onCancel={() => setConnectingProvider(null)}
              disabled={isAuthenticated}
            />
          )}
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
