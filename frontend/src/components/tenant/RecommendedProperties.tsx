import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, Sparkles, Sliders } from 'lucide-react';

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { PropertyCard } from '@/components/property/PropertyCard';
import { TenantPreferencesDialog } from '@/components/tenant/TenantPreferencesDialog';
import { useTenantPreferences } from '@/hooks/useTenantPreferences';
import { useRecommendations } from '@/hooks/useRecommendations';
import {
  derivePreferencesFromLease,
  EMPTY_PREFERENCES,
} from '@/data/tenantPreferences';
import { ALL_MATCH_CATEGORIES } from '@/types/tenantPreferences';
import type { Property } from '@/types/property';

interface RecommendedPropertiesProps {
  tenantId: string;
  leaseEndDate: Date;
  monthlyRent: number;
  currentProperty: Property;
  variant?: 'compact' | 'full';
  maxCards?: number;
}

const VARIANT_DEFAULTS = {
  compact: { maxCards: 3, showSeeAll: true },
  full: { maxCards: 6, showSeeAll: false },
} as const;

export function RecommendedProperties({
  tenantId,
  leaseEndDate,
  monthlyRent,
  currentProperty,
  variant = 'compact',
  maxCards,
}: RecommendedPropertiesProps) {
  const defaults = VARIANT_DEFAULTS[variant];
  const limit = maxCards ?? defaults.maxCards;

  const navigate = useNavigate();
  const { preferences, hasExplicitPreferences, updatePreferences } = useTenantPreferences(tenantId);
  const { recommendations, isInWindow } = useRecommendations({
    tenantId,
    leaseEndDate,
    currentProperty,
    limit,
  });

  // Prefill payload for the modal: explicit prefs if the tenant has any,
  // otherwise the implicit derivation so the form opens populated and the
  // tenant can refine instead of starting blank.
  const prefillPayload = useMemo(() => {
    if (hasExplicitPreferences) return preferences;
    return derivePreferencesFromLease(monthlyRent, currentProperty);
  }, [hasExplicitPreferences, preferences, monthlyRent, currentProperty]);

  // Stable reference for the implicit-prefs case. Without this, the spread
  // creates a new object on every parent render, and the dialog's
  // `useEffect([open, initialPreferences])` resets the user's in-progress
  // edits whenever a parent re-render happens while the dialog is open.
  const implicitPreferences = useMemo(
    () => ({ ...EMPTY_PREFERENCES, ...prefillPayload }),
    [prefillPayload],
  );

  const [dialogOpen, setDialogOpen] = useState(false);

  // Don't render anything while the lease isn't within the 180-day window —
  // Task 6 only surfaces near lease end.
  if (!isInWindow) return null;

  // Total denominator for "Matches X/Y" badge: the full set of categories
  // the matcher considers. Hard-coded against ALL_MATCH_CATEGORIES so the
  // FE renders the same denominator the BE will once it's live.
  const totalCategories = ALL_MATCH_CATEGORIES.length;

  return (
    <section
      aria-labelledby="recommended-heading"
      className="space-y-4"
      data-testid="recommended-properties"
    >
      <header className="flex items-end justify-between gap-2">
        <div>
          <h2 id="recommended-heading" className="text-xl font-semibold flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" aria-hidden="true" />
            Recommended for you
          </h2>
          <p className="text-sm text-muted-foreground">
            Available around the time your current lease ends.
          </p>
        </div>

        {hasExplicitPreferences && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setDialogOpen(true)}
            aria-label="Edit preferences"
          >
            <Sliders className="h-4 w-4 sm:mr-1.5" aria-hidden="true" />
            <span className="hidden sm:inline">Edit preferences</span>
          </Button>
        )}
      </header>

      {!hasExplicitPreferences && (
        <Alert className="border-blue-300 bg-blue-50">
          <Sparkles className="h-4 w-4 text-blue-700" />
          <AlertTitle className="text-blue-900">Based on your current home</AlertTitle>
          <AlertDescription className="text-blue-800 flex flex-wrap items-center gap-3">
            <span>
              We've used your current rent and location to find similar properties.
              Set your preferences for better matches.
            </span>
            <Button
              variant="outline"
              size="sm"
              className="border-blue-400 bg-white"
              onClick={() => setDialogOpen(true)}
            >
              Set your preferences
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {recommendations.length === 0 ? (
        <div className="rounded-lg border border-dashed bg-muted/40 p-8 text-center">
          <p className="text-sm text-muted-foreground mb-3">
            No matches yet — try widening your preferences.
          </p>
          <Button variant="outline" size="sm" onClick={() => setDialogOpen(true)}>
            Adjust preferences
          </Button>
        </div>
      ) : (
        <div className="grid auto-rows-fr grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {recommendations.map(({ property, matchedCategories }) => (
            <div key={property.id} className="relative h-full w-full">
              <Badge
                variant="secondary"
                className="absolute right-3 top-3 z-10 shadow-sm"
                aria-label={`Matches ${matchedCategories.length} of ${totalCategories} preference categories`}
              >
                Matches {matchedCategories.length}/{totalCategories}
              </Badge>
              <PropertyCard
                property={{
                  id: property.id,
                  title: property.title,
                  address: property.address,
                  city: property.city,
                  state: property.state,
                  price: property.rent,
                  bedrooms: property.bedrooms,
                  bathrooms: property.bathrooms,
                  squareFeet: property.squareFeet ?? undefined,
                  images: property.images,
                  status: property.status,
                }}
                onClick={() => navigate(`/properties/${property.id}`)}
                showSave={false}
                className="h-full w-full"
              />
            </div>
          ))}
        </div>
      )}

      {defaults.showSeeAll && recommendations.length > 0 && (
        <div className="text-right">
          <Link
            to="/tenant/recommended"
            className="inline-flex items-center text-sm font-medium text-primary hover:underline"
          >
            See all matches
            <ArrowRight className="ml-1 h-4 w-4" />
          </Link>
        </div>
      )}

      <TenantPreferencesDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        initialPreferences={hasExplicitPreferences ? preferences : implicitPreferences}
        onSave={updatePreferences}
      />
    </section>
  );
}
