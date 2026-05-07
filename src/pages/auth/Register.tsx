import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';

import { Home, Loader2, AlertCircle } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useWalletConnect } from '@/hooks/auth/useWalletConnect';

import { RoleSelector } from './register/RoleSelector';
import { ProviderList } from './register/ProviderList';

type SupportedRole = 'tenant' | 'landlord';
const SUPPORTED_ROLES: readonly SupportedRole[] = ['tenant', 'landlord'];

function isSupportedRole(value: string | null): value is SupportedRole {
  return value !== null && (SUPPORTED_ROLES as readonly string[]).includes(value);
}

export default function Register() {
  const [searchParams] = useSearchParams();
  // Honor ?role=… deep-links from the help hub. Unsupported values
  // (e.g. property_manager) silently fall back to tenant — the role isn't
  // wired into the backend role contract yet.
  const rawRole = searchParams.get('role');
  const [role, setRole] = useState<SupportedRole>(
    isSupportedRole(rawRole) ? rawRole : 'tenant'
  );

  const {
    isConnected, account, isAuthenticated, isSigningIn,
    connectingProvider, setConnectingProvider,
    error, isLoading,
    handleConnectProvider, login, disconnect,
  } = useWalletConnect();

  // See Login.tsx for rationale — the inline "Use a different account"
  // button is gated on `isConnected`, but a stuck CSPR.click session
  // expires that flag to `false`, removing the user's only out. This
  // footer link is the always-visible recovery path. Stripping
  // `csprclick:`-prefixed keys is essential: leaving `csprclick:account`
  // on disk loops the user back into the same "Session expired" modal.
  const handleResetConnection = () => {
    disconnect();
    try {
      localStorage.removeItem('leasefi_session');
      Object.keys(localStorage).forEach(key => {
        if (key.startsWith('csprclick:')) localStorage.removeItem(key);
      });
    } catch {
      // localStorage may be disabled (private mode, embedded webview).
    }
    window.location.reload();
  };

  // The selected role is forwarded to POST /api/v1/auth/login. Backend
  // honors it only on the first INSERT (`upsert_user_by_wallet`) and ignores
  // it on subsequent logins, so re-running registration with a different
  // role for the same wallet has no effect — the user must connect a
  // different wallet to claim a different role.

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
            <div className="space-y-2">
              <Button
                className="w-full"
                onClick={() => login(role)}
                disabled={isSigningIn || isAuthenticated}
              >
                {isSigningIn
                  ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Signing in…</>
                  : 'Sign in'
                }
              </Button>
              <button
                type="button"
                onClick={() => {
                  // signOut() clears SDK state but the CSPR.click iframe
                  // (accounts.cspr.click) holds its own cookies that survive
                  // — without a hard reload the next connect silently re-uses
                  // the cached account regardless of selectAccount:true.
                  disconnect();
                  window.location.reload();
                }}
                disabled={isSigningIn || isAuthenticated}
                className="block w-full text-center text-sm text-muted-foreground hover:text-foreground hover:underline disabled:cursor-not-allowed disabled:opacity-50"
              >
                Use a different account
              </button>
            </div>
          ) : (
            <>
              <ProviderList
                connectingProvider={connectingProvider}
                onConnect={handleConnectProvider}
                onCancel={() => setConnectingProvider(null)}
                disabled={isAuthenticated}
              />
            </>
          )}
        </CardContent>

        <CardFooter className="flex flex-col items-center gap-2">
          <p className="text-sm text-gray-600">
            Already have an account?{' '}
            <Link to="/auth/login" className="text-primary hover:underline font-medium">
              Sign in
            </Link>
          </p>
          <button
            type="button"
            onClick={handleResetConnection}
            className="text-xs text-muted-foreground hover:text-foreground hover:underline"
          >
            Trouble signing in? Reset connection
          </button>
        </CardFooter>
      </Card>
    </div>
  );
}
