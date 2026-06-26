import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ExternalLink, Loader2, ShieldCheck } from 'lucide-react';
import {
  ClickProvider,
  ClickUI,
  DefaultThemes,
  buildTheme,
  ThemeModeType,
} from '@make-software/csprclick-ui';
import { CONTENT_MODE } from '@make-software/csprclick-core-types';
import type { CsprClickInitOptions } from '@make-software/csprclick-core-types';
import { ThemeProvider } from 'styled-components';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { useICOWallet } from '@/hooks/ico/useICOWallet';
import { usePropertyRegistration } from '@/hooks/property/usePropertyRegistration';
import {
  DEFAULT_OWNERSHIP_TOKEN_SUPPLY,
  isPropertyRegistryEnabled,
} from '@/lib/casper/propertyRegistry';
import { WALLET_PROVIDERS } from '@/pages/auth/register/constants';
import { ICO_CONFIG } from '@/constants/ico';
import { getProperty } from '@/services/propertyAssetService';
import type { Listing } from '@/types/listingContract';

/**
 * Landlord "Register on-chain" action for a listing's underlying property asset
 * (`PropertyRegistry`). The landlord signs `create_property` from their own
 * wallet via CSPR.click — there is **no "connect wallet" CTA** at sign-up; the
 * sign prompt is the whole interaction.
 *
 * The CSPR.click SDK (`ClickProvider`) is NOT mounted app-wide — only on the ICO
 * pages and the profile wallet-linking surface. So this card mounts its own
 * hidden SDK host on demand (after the landlord starts registering), exactly
 * like `ICOLayout`/`AuthWalletLayout` do, otherwise `useClickRef()` is null and
 * connect/sign are no-ops.
 *
 * Scope is step 1 (create the `Draft` record). The contract-assigned
 * `property_id` surfaces as `property.onchainPropertyId` once the backend
 * indexer reconciles the `PropertyCreated` event by `metadataUri` — shown here
 * as the "Registered" state. Steps 2/3 (attach token, activate) come later.
 *
 * `metadataUri` comes from the backend — it pins the canonical property payload
 * to IPFS on create/update and stamps `property.metadataUri`. It is also the
 * **match key** the indexer uses to reconcile the `PropertyCreated` event back
 * to the backend row, so registration is **gated on it**: with no pinned
 * `metadataUri` the deploy could never be indexed, so we don't offer it.
 * `totalSupply` is still defaulted (the backend has no per-property supply).
 */

const explorerDeployUrl = (txHash: string) =>
  `${ICO_CONFIG.CASPER.explorerUrl}/deploy/${txHash}`;

// ── Local CSPR.click SDK host (chrome hidden; the connect modal portals out) ──

const csprClickTheme = buildTheme(DefaultThemes.csprclick);

const clickOptions: CsprClickInitOptions = {
  appName: 'LeaseFi',
  contentMode: CONTENT_MODE.IFRAME,
  providers: WALLET_PROVIDERS.map((provider) => provider.key),
  appId: import.meta.env.VITE_CSPRCLICK_APP_ID ?? 'csprclick-template',
  chainName: import.meta.env.VITE_CASPER_NETWORK ?? 'casper-test',
};

function OnChainSdkHost({ children }: { children: React.ReactNode }) {
  return (
    <ClickProvider options={clickOptions}>
      <ThemeProvider theme={csprClickTheme[ThemeModeType.light]}>
        {/* Hidden like ICOLayout — the signIn() modal portals to body, so no
            CSPR.click top-bar chrome leaks into the property page. */}
        <div className="hidden">
          <ClickUI
            topBarSettings={{}}
            themeMode={ThemeModeType.light}
            show1ClickModal={false}
          />
        </div>
        {children}
      </ThemeProvider>
    </ClickProvider>
  );
}

// ── Status row (shared between the idle and active states) ───────────────────

function StatusRow({
  propertyId,
  txHash,
}: {
  propertyId: string | null;
  txHash: string | null;
}) {
  return (
    <div className="flex gap-8 text-sm">
      <div>
        <p className="text-muted-foreground">Property ID</p>
        {propertyId ? (
          // Contract-assigned id, surfaced by the backend once the indexer
          // reconciled PropertyCreated by metadataUri.
          <p className="font-semibold">{propertyId}</p>
        ) : txHash ? (
          // Signed this session; the indexer hasn't written the id back yet.
          <p className="font-semibold text-muted-foreground">pending…</p>
        ) : (
          <p className="font-semibold">—</p>
        )}
      </div>
      {/* Deploy link only while we hold this session's tx hash — no row, no
          dash once it's gone (e.g. after a reload). */}
      {txHash && (
        <div>
          <p className="text-muted-foreground">Deploy</p>
          <a
            href={explorerDeployUrl(txHash)}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 font-semibold text-primary hover:underline"
          >
            View on cspr.live
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
        </div>
      )}
    </div>
  );
}

// ── Interactive flow — MUST render inside OnChainSdkHost (needs clickRef) ─────

function RegistrationFlow({
  issuerUserId,
  metadataUri,
  onConfirmed,
}: {
  issuerUserId: string;
  metadataUri: string;
  onConfirmed: (txHash: string | null) => void;
}) {
  const { account, clickRef, connect } = useICOWallet();
  const { create } = usePropertyRegistration(
    account?.publicKey,
    clickRef,
    issuerUserId
  );

  const totalSupply = DEFAULT_OWNERSHIP_TOKEN_SUPPLY;
  const { step, txHash, error } = create.state;
  const hasWalletSession = Boolean(account?.publicKey && clickRef);
  const busy = step === 'signing' || step === 'pending';

  // Fire once when the deploy confirms: surface the cspr.live link in a toast
  // and refresh the property so the indexer-written Property ID can appear.
  useEffect(() => {
    if (step === 'confirmed') onConfirmed(txHash);
  }, [step, txHash, onConfirmed]);

  return (
    <div className="space-y-4">
      <StatusRow propertyId={null} txHash={txHash} />

      {step === 'confirmed' ? (
        <p className="text-sm text-muted-foreground">
          Registered as a draft. The contract-assigned property ID will appear
          here once the record is indexed. Attaching a token and activating come
          next.
        </p>
      ) : (
        <>
          <p className="text-sm text-muted-foreground">
            Issues {Number(totalSupply).toLocaleString()} ownership tokens; the
            property metadata is generated automatically. You'll be asked to
            sign once.
          </p>

          {error && <p className="text-sm text-destructive">{error}</p>}

          {!hasWalletSession ? (
            // Wallet is a sign-time attachment — connect to obtain a signer.
            <Button variant="outline" onClick={connect}>
              Connect wallet to sign
            </Button>
          ) : (
            <Button
              disabled={busy}
              onClick={() => create.run({ totalSupply, metadataUri })}
            >
              {step === 'signing' && (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Confirm in your wallet…
                </>
              )}
              {step === 'pending' && (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Submitting…
                </>
              )}
              {!busy && 'Register on-chain'}
            </Button>
          )}
        </>
      )}
    </div>
  );
}

// ── Card shell — gating + lazy SDK mount ─────────────────────────────────────

export function PropertyOnChainRegistration({ listing }: { listing: Listing }) {
  const { profile } = useAuth();
  const issuerUserId = profile?.onchainUserId ?? null;
  const hasLinkedWallet = Boolean(profile?.walletAddress);
  const [started, setStarted] = useState(false);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // On a confirmed deploy: refresh the listing + property (so the indexer's
  // onchainPropertyId surfaces here) and show the cspr.live link once.
  const handleConfirmed = useCallback(
    (txHash: string | null) => {
      void queryClient.invalidateQueries({ queryKey: ['listing', listing.id] });
      void queryClient.invalidateQueries({
        queryKey: ['property', listing.propertyId],
      });
      if (txHash) {
        toast({
          title: 'Submitted on-chain',
          description: (
            <a
              href={explorerDeployUrl(txHash)}
              target="_blank"
              rel="noopener noreferrer"
              className="underline"
            >
              View the deploy on cspr.live
            </a>
          ),
        });
      }
    },
    [queryClient, toast, listing.id, listing.propertyId]
  );

  // The indexer reconciles the on-chain record by `metadataUri`, so we register
  // only when the backend has pinned one. Prefer the nested property; fetch only
  // if the listing didn't carry it (also gets us `onchainPropertyId`).
  const nestedMetadataUri = listing.property?.metadataUri ?? null;
  const { data: fetchedProperty } = useQuery({
    queryKey: ['property', listing.propertyId],
    queryFn: () => getProperty(listing.propertyId),
    enabled: nestedMetadataUri === null,
  });
  const metadataUri = nestedMetadataUri ?? fetchedProperty?.metadataUri ?? null;
  // Contract-assigned id; non-null = registered + indexed (the real signal).
  const onchainPropertyId =
    listing.property?.onchainPropertyId ??
    fetchedProperty?.onchainPropertyId ??
    null;
  const isRegistered = onchainPropertyId !== null;

  // Stay dark (render nothing) when the contract isn't configured.
  if (!isPropertyRegistryEnabled) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ShieldCheck className="h-5 w-5" />
          On-chain registration
          {isRegistered ? (
            <Badge className="bg-green-600 text-white">Registered</Badge>
          ) : (
            <Badge className="bg-muted text-muted-foreground">
              Not registered
            </Badge>
          )}
        </CardTitle>
        <CardDescription>
          {isRegistered
            ? `“${listing.title}” is registered on Casper and can anchor fractional ownership.`
            : `Register “${listing.title}” on Casper so it can anchor fractional ownership. You sign the deploy from your own wallet.`}
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {isRegistered ? (
          <div className="space-y-3">
            <StatusRow propertyId={onchainPropertyId} txHash={null} />
            <p className="text-sm text-muted-foreground">
              Registered on Casper. Attaching a fractional token and activating
              come next.
            </p>
          </div>
        ) : !issuerUserId ? (
          <div className="space-y-3">
            <StatusRow propertyId={null} txHash={null} />
            <p className="text-sm text-muted-foreground">
              {hasLinkedWallet
                ? "Your identity is being registered on-chain. This unlocks once it's confirmed — finish or check the status in your profile."
                : 'Register your identity on-chain before you can register a property. Link your wallet and complete on-chain registration in your profile first.'}
            </p>
            <Button asChild variant="outline">
              <Link to="/landlord/profile">
                {hasLinkedWallet
                  ? 'Check on-chain status'
                  : 'Set up on-chain identity'}
              </Link>
            </Button>
          </div>
        ) : !started ? (
          <div className="space-y-4">
            <StatusRow propertyId={null} txHash={null} />
            {metadataUri ? (
              <>
                <p className="text-sm text-muted-foreground">
                  Issues{' '}
                  {Number(DEFAULT_OWNERSHIP_TOKEN_SUPPLY).toLocaleString()}{' '}
                  ownership tokens; the property metadata is generated
                  automatically. You'll be asked to sign once.
                </p>
                <Button onClick={() => setStarted(true)}>
                  Register on-chain
                </Button>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">
                On-chain registration unlocks once this property's metadata is
                prepared. Save the property first, then come back.
              </p>
            )}
          </div>
        ) : metadataUri ? (
          // Mount the SDK only now — keeps CSPR.click off every property view.
          <OnChainSdkHost>
            <RegistrationFlow
              issuerUserId={issuerUserId}
              metadataUri={metadataUri}
              onConfirmed={handleConfirmed}
            />
          </OnChainSdkHost>
        ) : null}
      </CardContent>
    </Card>
  );
}
