/**
 * Sign action for a lease that's awaiting signatures. Both landlord and tenant
 * sign the canonical consent message (`buildLeaseConsentMessage`) with their
 * Casper wallet via CSPR.click `signMessage` (a gasless message signature, NOT a
 * transaction and NOT a state flip), then `POST /leases/{id}/sign`.
 *
 * Self-gating: renders nothing unless the lease is `pending-signatures` and the
 * current user is a party. Mounts the hidden SDK host only after the user starts
 * (CSPR.click isn't app-wide). Per-party progress is shown by the sibling
 * `SignatureProgressCard`; this card just drives the signing.
 */

import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { CheckCircle2, Loader2, PenLine, Wallet } from 'lucide-react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { useICOWallet } from '@/hooks/ico/useICOWallet';
import { OnChainSdkHost } from '@/components/blockchain/OnChainSdkHost';
import { buildLeaseConsentMessage } from '@/lib/leaseConsent';
import { signLease } from '@/services/leaseService';
import { ApiError } from '@/lib/api-client';
import type { Lease, SignerRole } from '@/types/leaseContract';

/** Which signing party the current user is, or null when they aren't one. */
function partyRole(
  lease: Lease,
  userId: string | undefined
): SignerRole | null {
  if (!userId) return null;
  if (lease.landlordId === userId) return 'landlord';
  if (lease.tenantIds.includes(userId)) return 'tenant';
  return null;
}

function mapSignError(err: unknown): string {
  if (err instanceof ApiError) {
    if (err.statusCode === 401)
      return 'Signature couldn’t be verified. Please try signing again.';
    if (err.statusCode === 403)
      return err.code === 'signer_wallet_mismatch'
        ? 'Connect the wallet linked to your account, then sign.'
        : 'You’re not a party to this lease.';
    if (err.statusCode === 409)
      return 'This lease isn’t awaiting signatures right now.';
    if (err.statusCode === 400)
      return /wallet/i.test(err.message)
        ? 'No wallet is linked to your account yet.'
        : 'Couldn’t read the signature. Please try again.';
  }
  return 'Couldn’t record your signature. Please try again.';
}

// Interactive step — MUST render inside OnChainSdkHost (needs clickRef).
function SigningFlow({
  lease,
  role,
  onSigned,
}: {
  lease: Lease;
  role: SignerRole;
  onSigned: () => void;
}) {
  const { account, clickRef, connect } = useICOWallet();
  const { toast } = useToast();
  const [busy, setBusy] = useState(false);

  const hasWalletSession = Boolean(account?.publicKey && clickRef);

  if (!hasWalletSession) {
    return (
      <Button variant="outline" onClick={connect}>
        <Wallet className="mr-2 h-4 w-4" />
        Connect wallet to sign
      </Button>
    );
  }

  const run = async () => {
    if (!clickRef || !account?.publicKey) return;
    setBusy(true);
    try {
      // Sign the exact consent string; the backend prepends `Casper Message:\n`.
      const message = buildLeaseConsentMessage(lease);
      const result = await clickRef.signMessage(message, account.publicKey);
      if (!result || result.cancelled || !result.signatureHex) {
        toast({ title: 'Signing was cancelled.', variant: 'destructive' });
        return;
      }
      // Prefix the algorithm byte (01 = Ed25519, 02 = Secp256k1) as the backend
      // verifier expects, matching the wallet-link path.
      const prefix = account.publicKey.startsWith('02') ? '02' : '01';
      const signature = result.signatureHex.startsWith(prefix)
        ? result.signatureHex
        : `${prefix}${result.signatureHex}`;
      await signLease(lease.id, {
        role,
        signature,
        signerWallet: account.publicKey,
      });
      toast({
        title: 'Lease signed',
        description: 'Your consent has been recorded.',
      });
      onSigned();
    } catch (err) {
      toast({
        title: 'Couldn’t sign',
        description: mapSignError(err),
        variant: 'destructive',
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Button disabled={busy} onClick={run}>
      {busy ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Confirm in your wallet…
        </>
      ) : (
        <>
          <PenLine className="mr-2 h-4 w-4" />
          Sign lease
        </>
      )}
    </Button>
  );
}

export function LeaseSigningCard({ lease }: { lease: Lease }) {
  const { profile } = useAuth();
  const queryClient = useQueryClient();
  const [started, setStarted] = useState(false);

  const role = partyRole(lease, profile?.id);
  if (!role || lease.status !== 'pending-signatures') return null;

  const otherRole: SignerRole = role === 'landlord' ? 'tenant' : 'landlord';
  const selfSigned = Boolean(lease.signatureProgress?.[role]?.signed);
  const otherSigned = Boolean(lease.signatureProgress?.[otherRole]?.signed);
  const bothSigned = selfSigned && otherSigned;
  const hasLinkedWallet = Boolean(profile?.walletAddress);
  const profilePath =
    role === 'landlord' ? '/landlord/profile' : '/tenant/profile';

  return (
    <Card className="mt-4">
      <CardHeader>
        <CardTitle>Sign the lease</CardTitle>
        <CardDescription>
          You sign the lease terms as {role} with your wallet. This is a gasless
          message signature, not a transaction.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {bothSigned ? (
          <p className="flex items-center gap-2 text-sm text-green-600">
            <CheckCircle2 className="h-4 w-4" />
            Both parties have signed. The landlord commits the lease on-chain to
            activate it.
          </p>
        ) : selfSigned ? (
          <p className="flex items-center gap-2 text-sm text-green-600">
            <CheckCircle2 className="h-4 w-4" />
            You’ve signed. Waiting for the other party.
          </p>
        ) : !hasLinkedWallet ? (
          <div className="space-y-2 text-sm">
            <p className="text-muted-foreground">
              You need a linked wallet to sign the lease.
            </p>
            <Button variant="outline" asChild>
              <Link to={profilePath}>Link a wallet</Link>
            </Button>
          </div>
        ) : !started ? (
          <Button onClick={() => setStarted(true)}>
            <PenLine className="mr-2 h-4 w-4" />
            Sign lease
          </Button>
        ) : (
          <OnChainSdkHost>
            <SigningFlow
              lease={lease}
              role={role}
              onSigned={() =>
                queryClient.invalidateQueries({ queryKey: ['lease', lease.id] })
              }
            />
          </OnChainSdkHost>
        )}
      </CardContent>
    </Card>
  );
}
