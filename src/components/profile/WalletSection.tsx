import { useCallback, useState } from 'react';
import { Wallet, CheckCircle2, Loader2, AlertCircle } from 'lucide-react';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { WALLET_KEYS } from '@make-software/csprclick-core-types';

import { AuthWalletLayout } from '@/components/auth/AuthWalletLayout';
import { ProviderList } from '@/pages/auth/register/ProviderList';
import { WALLET_PROVIDERS } from '@/pages/auth/register/constants';
import { useAuth } from '@/hooks/useAuth';
import { useICOWallet } from '@/hooks/ico/useICOWallet';
import { useLinkWallet } from '@/hooks/auth/useLinkWallet';
import logger from '@/lib/logger';

/**
 * Profile card for linking a Casper wallet to an email/password account.
 *
 * Wallet linking is an OPTIONAL, post-sign-up feature: the user already has an
 * account; here they attach a wallet so it can sign on-chain later. Provider-
 * agnostic — we never surface "create a wallet"; CSPR.click provisions one
 * transparently behind the social providers.
 *
 * The CSPR.click provider/SDK is only mounted when there is no wallet yet
 * (see the early return), so an account that already linked one pays no SDK
 * cost and just renders its address.
 */
// Split the providers so each group can carry its own explanation: the
// self-custody Casper Wallet for users who already have it, and the social
// providers that transparently provision a wallet for those who don't.
const CASPER_PROVIDERS = WALLET_PROVIDERS.filter((p) => p.key === WALLET_KEYS.CASPER_WALLET);
const SOCIAL_PROVIDERS = WALLET_PROVIDERS.filter((p) => p.key !== WALLET_KEYS.CASPER_WALLET);

export function WalletSection() {
  const { profile } = useAuth();

  // Already linked → show the address; the on-chain identifier is public, so a
  // profile page shows it in full (per the wallet-display convention).
  if (profile?.walletAddress) {
    return (
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-500" aria-hidden="true" />
              <CardTitle className="text-base">Wallet connected</CardTitle>
            </div>
          </div>
          <CardDescription className="pt-1 font-mono text-xs break-all">
            {profile.walletAddress}
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  // Not linked yet → mount the CSPR.click provider so the connect + sign flow
  // has an SDK to talk to.
  return (
    <AuthWalletLayout>
      <WalletLinkCard />
    </AuthWalletLayout>
  );
}

function WalletLinkCard() {
  const { isConnected, account, clickRef, syncActiveAccount } = useICOWallet();
  const { link, linking, error: linkError, clearError } = useLinkWallet();
  const [connectingProvider, setConnectingProvider] = useState<string | null>(null);
  const [connectError, setConnectError] = useState<string | null>(null);

  // Per-provider connect via the documented `clickRef.connect(providerKey)`
  // (no SDK modal). Social providers go through an OAuth round-trip; extension
  // wallets (Casper Wallet) talk to the browser extension. We pre-check
  // `isProviderPresent` for extension wallets so a missing extension produces a
  // clear "install it" hint instead of the SDK's opaque "Could not establish a
  // connection with the provider" throw.
  const handleConnect = useCallback(
    async (providerKey: string) => {
      if (!clickRef || connectingProvider) return;
      clearError();
      setConnectError(null);
      const isSocial =
        providerKey.startsWith('w3a-') ||
        providerKey.startsWith('csprclick-') ||
        providerKey === 'torus' ||
        providerKey === 'customjwt';

      // Extension wallets must be installed + enabled; social providers have no
      // extension so the check does not apply to them.
      if (!isSocial && !clickRef.isProviderPresent(providerKey)) {
        setConnectError(
          'Casper Wallet extension not found. Install it from the Chrome Web Store, or continue with Google or Apple below.',
        );
        return;
      }

      setConnectingProvider(providerKey);
      try {
        const options = isSocial
          ? {
              chainName: import.meta.env.VITE_CASPER_NETWORK ?? 'casper-test',
              selectAccount: true,
            }
          : undefined;
        // Resolves the connected account (extension wallets) or undefined
        // (social providers signal via `csprclick:signed_in`, handled in
        // useICOWallet); re-read the active account to cover both.
        const connected = await clickRef.connect(providerKey, options);
        if (connected) await syncActiveAccount();
      } catch (err) {
        logger.error('[WalletSection] connect failed:', err);
        setConnectError(
          isSocial
            ? 'Could not connect. Please try again.'
            : 'Could not open Casper Wallet. Make sure the extension is installed and unlocked, then try again.',
        );
      } finally {
        setConnectingProvider(null);
      }
    },
    [clickRef, connectingProvider, syncActiveAccount, clearError],
  );

  const handleLink = useCallback(() => {
    void link(clickRef, account?.publicKey);
  }, [link, clickRef, account?.publicKey]);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Wallet className="h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
          <CardTitle className="text-base">Connect a wallet</CardTitle>
        </div>
        <CardDescription>
          Link a wallet to sign lease agreements and approve on-chain payments.
          It's optional for now — you can add one anytime.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {(connectError || linkError) && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{connectError ?? linkError}</AlertDescription>
          </Alert>
        )}

        {isConnected && account ? (
          <div className="space-y-3">
            <div className="flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-800">
              <div className="h-2 w-2 rounded-full bg-green-500" />
              <span className="font-mono truncate">{account.publicKey.slice(0, 24)}…</span>
            </div>
            <Button className="w-full" onClick={handleLink} disabled={linking}>
              {linking ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Linking…
                </>
              ) : (
                'Link this wallet'
              )}
            </Button>
          </div>
        ) : (
          <div className="space-y-5">
            <p className="text-sm text-muted-foreground">
              Your wallet is how you securely sign rental agreements and approve
              payments on the Casper network. It acts as your signature — only you
              can authorize actions with it.
            </p>

            {/* Self-custody: user already has the Casper Wallet extension. */}
            <div className="space-y-2">
              <div>
                <p className="text-sm font-medium text-foreground">Already have a Casper wallet?</p>
                <p className="text-xs text-muted-foreground">
                  Connect the Casper Wallet browser extension directly.
                </p>
              </div>
              <ProviderList
                providers={CASPER_PROVIDERS}
                title={null}
                connectingProvider={connectingProvider}
                onConnect={handleConnect}
                onCancel={() => setConnectingProvider(null)}
                disabled={linking}
              />
            </div>

            <div className="flex items-center gap-3">
              <span className="h-px flex-1 bg-border" />
              <span className="text-xs uppercase tracking-wide text-muted-foreground">or</span>
              <span className="h-px flex-1 bg-border" />
            </div>

            {/* No wallet yet: social login provisions a custodial Casper wallet. */}
            <div className="space-y-2">
              <div>
                <p className="text-sm font-medium text-foreground">Don't have a wallet yet?</p>
                <p className="text-xs text-muted-foreground">
                  Sign in with Google or Apple and we'll create a Casper wallet for
                  you automatically — nothing to install.
                </p>
              </div>
              <ProviderList
                providers={SOCIAL_PROVIDERS}
                title={null}
                connectingProvider={connectingProvider}
                onConnect={handleConnect}
                onCancel={() => setConnectingProvider(null)}
                disabled={linking}
              />
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
