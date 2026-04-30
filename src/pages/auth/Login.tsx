import { Link } from 'react-router-dom';
import { Home, Loader2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useWalletConnect } from '@/hooks/auth/useWalletConnect';
import { ProviderList } from './register/ProviderList';

export function Login() {
  const {
    isConnected, account, isAuthenticated, isSigningIn,
    connectingProvider, setConnectingProvider,
    error, isLoading,
    handleConnectProvider, login, disconnect,
  } = useWalletConnect();

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4 py-8">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <div className="flex items-center justify-center mb-4">
            <Home className="h-8 w-8 text-primary" />
          </div>
          <CardTitle className="text-2xl text-center">Welcome back</CardTitle>
          <CardDescription className="text-center">
            Connect your wallet to sign in
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
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

          {isConnected && account ? (
            <div className="space-y-2">
              <Button className="w-full" onClick={() => login()} disabled={isSigningIn || isAuthenticated}>
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
            <ProviderList
              connectingProvider={connectingProvider}
              onConnect={handleConnectProvider}
              onCancel={() => setConnectingProvider(null)}
              disabled={isAuthenticated}
            />
          )}
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
