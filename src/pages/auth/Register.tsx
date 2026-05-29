import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';

import { Home, Loader2, AlertCircle } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useWalletConnect } from '@/hooks/auth/useWalletConnect';
import { clearCsprClickStorage } from '@/lib/csprclick';

import { SignInRecoveryNotice } from '@/components/auth/SignInRecoveryNotice';

import { RoleSelector } from './register/RoleSelector';
import { ProviderList } from './register/ProviderList';

type SupportedRole = 'tenant' | 'landlord';
const SUPPORTED_ROLES: readonly SupportedRole[] = ['tenant', 'landlord'];

function isSupportedRole(value: string | null): value is SupportedRole {
  return value !== null && (SUPPORTED_ROLES as readonly string[]).includes(value);
}

export default function Register() {
  const [searchParams] = useSearchParams();
  // Honor ?role=… deep-links from HelpHub. Unsupported values
  // (e.g. 'property_manager', shown as "Coming Soon" in HelpHub) silently
  // fall back to 'tenant' — the role isn't wired into the backend role
  // contract yet, so this is a product decision rather than a TODO.
  // See: src/pages/HelpHub.tsx (QuickActionCard links emit these deep-links).
  const rawRole = searchParams.get('role');
  const [role, setRole] = useState<SupportedRole>(
    isSupportedRole(rawRole) ? rawRole : 'tenant'
  );

  const {
    isConnected, account, isAuthenticated, isSigningIn,
    connectingProvider, setConnectingProvider,
    error, isLoading,
    handleConnectProvider, login, disconnect, clickRef,
  } = useWalletConnect();

  // Force a fresh SDK state on every visit to /auth/register — see Login.tsx
  // for the full rationale. Calling signOut() clears the SDK's cached
  // active-account, and wiping `csprclick:*` localStorage prevents the SDK
  // from re-reading stale entries on the next init. This puts the SDK into
  // an incognito-equivalent state so the first provider click triggers a
  // genuine fresh OAuth instead of a poisoned signInWithAccount restore.
  useEffect(() => {
    if (!clickRef) return;
    clickRef.signOut();
    try {
      // Mirror handleResetConnection: drop the leasefi_session marker so
      // AuthContext's optimistic restore doesn't briefly report the user as
      // signed in on a Register revisit (until the first 401 clears it).
      localStorage.removeItem('leasefi_session');
    } catch {
      // localStorage unavailable.
    }
    clearCsprClickStorage();
  }, [clickRef]);

  // See Login.tsx for rationale — the inline "Use a different account"
  // button is gated on `isConnected`, but a stuck CSPR.click session
  // expires that flag to `false`, removing the user's only out. This
  // footer link is the always-visible recovery path. Stripping
  // `csprclick:`-prefixed keys is essential: leaving `csprclick:account`
  // on disk loops the user back into the same "Session expired" modal.
  const handleResetConnection = async () => {
    await disconnect();
    try {
      localStorage.removeItem('leasefi_session');
    } catch {
      // localStorage may be disabled (private mode, embedded webview).
    }
    clearCsprClickStorage();
    // AuthContext state is intentionally NOT reset here — `location.reload()`
    // unmounts the whole React tree, so the provider is rebuilt clean on the
    // next mount. If this is ever swapped for `navigate(...)` (soft routing),
    // `walletSignOut()` must be called first; otherwise the stale `profile`
    // marker survives and consumers think the user is still signed in.
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

          <SignInRecoveryNotice />

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
                onClick={async () => {
                  // `await` so the SDK's hard disconnect(provider) finishes
                  // releasing the iframe link before we reload — otherwise
                  // the accounts.cspr.click cookies survive and the next
                  // connect silently re-uses the cached account regardless
                  // of selectAccount:true.
                  await disconnect();
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
