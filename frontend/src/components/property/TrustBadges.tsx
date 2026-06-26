import { Badge } from '@/components/ui/badge';
import { ShieldCheck, Link2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { RegisteredOnChainBadge } from '@/components/property/RegisteredOnChainBadge';

interface TrustBadgesProps {
  verifiedLister?: boolean;
  onChain?: boolean;
  // PropertyRegistry registration of the underlying property (PL-36b) — distinct
  // from `onChain` (the listing-level anchor).
  registeredOnChain?: boolean;
  className?: string;
}

/**
 * Listing trust indicators derived from the provenance gate. Renders nothing
 * when none apply, so callers can drop it in unconditionally.
 */
export function TrustBadges({
  verifiedLister,
  onChain,
  registeredOnChain,
  className,
}: TrustBadgesProps) {
  if (!verifiedLister && !onChain && !registeredOnChain) return null;
  return (
    <div className={cn('flex flex-wrap items-center gap-1.5', className)}>
      {verifiedLister && (
        <Badge
          variant="secondary"
          className="text-xs font-normal flex items-center gap-1"
        >
          <ShieldCheck className="h-3 w-3 text-emerald-600" />
          Verified lister
        </Badge>
      )}
      {onChain && (
        <Badge
          variant="secondary"
          className="text-xs font-normal flex items-center gap-1"
        >
          <Link2 className="h-3 w-3 text-sky-600" />
          On-chain
        </Badge>
      )}
      {registeredOnChain && <RegisteredOnChainBadge />}
    </div>
  );
}
