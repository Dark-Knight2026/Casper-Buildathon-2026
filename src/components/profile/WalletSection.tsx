import { useCallback, useEffect, useState } from 'react';
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
import { useOnchainRegistration } from '@/hooks/auth/useOnchainRegistration';
import { isOnchainRegistrationEnabled } from '@/services/onchainRegistrationService';
import { clearCsprClickStorage } from '@/lib/csprclick';
import logger from '@/lib/logger';

/**
 * Profile card for linking a Casper wallet to an email/password account.
 *
 * Wallet linking is an OPTIONAL, post-sign-up feature: the user already has an
 * account; here they attach a wallet so it can sign on-chain later. Provider-
 * agnostic — we never surface "create a wallet"; CSPR.click provisions one
 * transparently behind the social providers.
 *
 * When a wallet is already linked we show its address (no SDK mounted, so it
 * stays cheap). "Connect a different wallet" switches into the connect+link
 * flow: linking a new wallet makes it the account's primary (the backend
 * demotes the previous one — `POST /users/me/wallet` is add-and-make-primary).
 */
// Split the providers so each group can carry its own explanation: the
// self-custody Casper Wallet for users who already have it, and the social
// providers that transparently provision a wallet for those who don't.
const CASPER_PROVIDERS = WALLET_PROVIDERS.filter((p) => p.key === WALLET_KEYS.CASPER_WALLET);
const SOCIAL_PROVIDERS = WALLET_PROVIDERS.filter((p) => p.key !== WALLET_KEYS.CASPER_WALLET);

export function WalletSection() {
  const { profile } = useAuth();
  // Toggled by "Connect a different wallet": mounts the SDK + connect flow over
  // the already-linked address so the user can swap to another wallet.
  const [changing, setChanging] = useState(false);
  const linkedAddress = profile?.walletAddress;

  if (linkedAddress && !changing) {
    return (
      <LinkedWalletCard
        address={linkedAddress}
        onchainUserId={profile?.onchainUserId ?? null}
        onChange={() => setChanging(true)}
      />
    );
  }

  // No wallet yet, or replacing one → mount the CSPR.click provider so the
  // connect + sign flow has an SDK to talk to.
  return (
    <AuthWalletLayout>
      <WalletLinkCard
        isReplacing={Boolean(linkedAddress)}
        onCancel={linkedAddress ? () => setChanging(false) : undefined}
        onLinked={() => setChanging(false)}
      />
    </AuthWalletLayout>
  );
}

/** Linked state: shows the primary wallet address + on-chain id + a swap affordance. */
function LinkedWalletCard({
  address,
  onchainUserId,
  onChange,
}: {
  address: string;
  onchainUserId: string | null;
  onChange: () => void;
}) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-500" aria-hidden="true" />
          <CardTitle className="text-base">Wallet connected</CardTitle>
        </div>
        <CardDescription className="pt-1 font-mono text-xs break-all">{address}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {onchainUserId ? (
          <p className="text-sm text-muted-foreground">
            On-chain ID: <span className="font-medium text-foreground">{onchainUserId}</span>
          </p>
        ) : isOnchainRegistrationEnabled ? (
          <p className="text-sm text-muted-foreground">On-chain registration pending…</p>
        ) : null}
        <Button variant="outline" size="sm" onClick={onChange}>
          Connect a different wallet
        </Button>
      </CardContent>
    </Card>
  );
}

interface WalletLinkCardProps {
  /** True when an address is already linked and we're swapping it out. */
  isReplacing?: boolean;
  /** Abort back to the linked view (only provided when replacing). */
  onCancel?: () => void;
  /** Called after a successful link so the parent can leave "changing" mode. */
  onLinked?: () => void;
}

function WalletLinkCard({ isReplacing = false, onCancel, onLinked }: WalletLinkCardProps) {
  const { refreshProfile } = useAuth();
  const { isConnected, account, clickRef, syncActiveAccount, disconnect } = useICOWallet();
  const { link, linking, error: linkError, clearError } = useLinkWallet();
  const onchain = useOnchainRegistration(account?.publicKey, clickRef);
  const [connectingProvider, setConnectingProvider] = useState<string | null>(null);
  const [connectError, setConnectError] = useState<string | null>(null);

  const onchainBusy = onchain.phase === 'preparing' || onchain.phase === 'submitting';
  const onchainDone = onchain.phase === 'done';
  const onchainError = onchain.phase === 'error';

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

  const handleLink = useCallback(async () => {
    // When on-chain registration follows, defer the profile refresh: refreshing
    // now would set `walletAddress` and flip WalletSection to the linked view,
    // unmounting this card (and the SDK) mid-deploy. We refresh after on-chain
    // completes (see the effect below).
    const ok = await link(clickRef, account?.publicKey, {
      refresh: !isOnchainRegistrationEnabled,
    });
    if (!ok) return;
    if (!isOnchainRegistrationEnabled) {
      onLinked?.();
      return;
    }
    void onchain.register();
  }, [link, clickRef, account?.publicKey, onLinked, onchain]);

  // On-chain deploy confirmed → reflect the linked wallet (and, once the indexer
  // catches up, `onchain_user_id`) and leave to the linked view.
  useEffect(() => {
    if (!onchainDone) return;
    let cancelled = false;
    void refreshProfile().finally(() => {
      if (!cancelled) onLinked?.();
    });
    return () => {
      cancelled = true;
    };
  }, [onchainDone, refreshProfile, onLinked]);

  // The wallet IS linked even if the on-chain step fails — let the user proceed.
  const handleSkipOnchain = useCallback(async () => {
    await refreshProfile();
    onLinked?.();
  }, [refreshProfile, onLinked]);

  // Drop the CSPR.click session the SDK restored so the card falls back to the
  // provider picker — lets the user pick a different wallet. Clearing
  // `csprclick:*` storage prevents the SDK from silently re-restoring the same
  // account on the next connect.
  const handleUseDifferent = useCallback(async () => {
    clearError();
    setConnectError(null);
    await disconnect();
    clearCsprClickStorage();
  }, [disconnect, clearError]);

  const busy = linking || connectingProvider !== null || onchainBusy || onchainDone;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Wallet className="h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
          <CardTitle className="text-base">
            {isReplacing ? 'Connect a different wallet' : 'Connect a wallet'}
          </CardTitle>
        </div>
        <CardDescription>
          {isReplacing
            ? 'Linking a new wallet makes it your primary signing wallet, replacing the current one.'
            : "Link a wallet to sign lease agreements and approve on-chain payments. It's optional for now — you can add one anytime."}
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
          onchainBusy || onchainDone ? (
            <div className="space-y-2 py-2 text-center">
              <Loader2 className="mx-auto h-6 w-6 animate-spin text-muted-foreground" aria-hidden="true" />
              <p className="text-sm text-muted-foreground">
                {onchainDone
                  ? 'Registered on-chain ✓'
                  : onchain.txStep === 'signing'
                    ? 'Approve the transaction in your wallet…'
                    : onchain.txStep === 'pending'
                      ? 'Confirming on-chain…'
                      : 'Registering you on-chain…'}
              </p>
            </div>
          ) : onchainError ? (
            <div className="space-y-3">
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  {onchain.message ?? 'On-chain registration failed.'}
                </AlertDescription>
              </Alert>
              <Button className="w-full" onClick={() => void onchain.register()}>
                Try again
              </Button>
              <button
                type="button"
                onClick={handleSkipOnchain}
                className="block w-full text-center text-sm text-muted-foreground hover:text-foreground hover:underline"
              >
                Skip for now
              </button>
            </div>
          ) : (
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
              <button
                type="button"
                onClick={handleUseDifferent}
                disabled={linking}
                className="block w-full text-center text-sm text-muted-foreground hover:text-foreground hover:underline disabled:cursor-not-allowed disabled:opacity-50"
              >
                Use a different wallet
              </button>
            </div>
          )
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

        {/* Abort the swap and return to the currently linked wallet. */}
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            disabled={busy}
            className="block w-full text-center text-sm text-muted-foreground hover:text-foreground hover:underline disabled:cursor-not-allowed disabled:opacity-50"
          >
            Cancel
          </button>
        )}
      </CardContent>
    </Card>
  );
}
