import { Info, ExternalLink } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { cn } from '@/lib/utils';

/**
 * Task 10 — Property Page: Verification Disclaimer.
 * See docs/CLIENT_FEEDBACK_BACKLOG.md §"Task 10".
 *
 * Always-visible, non-dismissible informational notice. Reminds the tenant
 * that amenities and proximity data come from the landlord and should be
 * verified independently.
 *
 * The optional "View on Google Maps" link uses Google Maps' public URL
 * scheme (no API key, no billing) — it opens an external tab centered on
 * the property coords or address. A full embedded map with our POI markers
 * is a separate, post-MVP task (see Task 9 Q4).
 */

interface VerificationDisclaimerProps {
  /** Property latitude — when present (with longitude) the "View on Google Maps" link is rendered. */
  latitude?: number | null;
  /** Property longitude. */
  longitude?: number | null;
  /** Fallback address used when coords are missing. */
  address?: string;
  /** Tighter spacing for surfaces like ApplicationForm. */
  compact?: boolean;
  className?: string;
}

const COPY =
  'Amenities and proximity information are provided by the landlord. Please verify independently before signing a lease.';

function buildMapsUrl({
  latitude,
  longitude,
  address,
}: Pick<VerificationDisclaimerProps, 'latitude' | 'longitude' | 'address'>): string | null {
  if (typeof latitude === 'number' && typeof longitude === 'number') {
    // Public Google Maps URL scheme — no API key required.
    return `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`;
  }
  if (address && address.trim().length > 0) {
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
  }
  return null;
}

export function VerificationDisclaimer({
  latitude,
  longitude,
  address,
  compact = false,
  className,
}: VerificationDisclaimerProps) {
  const mapsUrl = buildMapsUrl({ latitude, longitude, address });

  return (
    <Alert
      className={cn(
        'border-blue-200 bg-blue-50 text-blue-900 [&>svg]:text-blue-700',
        compact && 'p-3 text-xs',
        className
      )}
    >
      <Info className="h-4 w-4" />
      <AlertDescription className={cn('flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between')}>
        <span>{COPY}</span>
        {mapsUrl && (
          <a
            href={mapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex shrink-0 items-center gap-1 font-medium text-blue-700 underline-offset-2 hover:underline"
          >
            View on Google Maps
            <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
          </a>
        )}
      </AlertDescription>
    </Alert>
  );
}
