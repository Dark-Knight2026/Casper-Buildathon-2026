import { BadgeCheck } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

/**
 * Shown when the property's underlying `PropertyRegistry` record is tokenized —
 * i.e. it has a contract-assigned `onchainPropertyId` (written by the indexer on
 * `PropertyCreated`). This is the PropertyRegistry signal, distinct from the
 * listing-level provenance anchor (the `onChain` TrustBadge), and never faked
 * from `metadataUri` alone (pinned ≠ registered). Hidden when not registered.
 */
export function RegisteredOnChainBadge({ className }: { className?: string }) {
  return (
    <Badge
      variant="secondary"
      title="Registered on Casper"
      className={cn('flex items-center gap-1 text-xs font-normal', className)}
    >
      <BadgeCheck className="h-3 w-3 text-sky-600" />
      On-chain
    </Badge>
  );
}
