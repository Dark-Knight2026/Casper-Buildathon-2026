import { useEffect, useState } from 'react';
import { Plus, X } from 'lucide-react';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { ALL_AMENITIES } from '@/types/property';
import type { PropertyType } from '@/types/property';
import type { PreferredLocation, RentalPreferences } from '@/types/tenantPreferences';
import { EMPTY_PREFERENCES } from '@/data/tenantPreferences';

// Subset of the wider PropertyType union exposed in the form. The lowercase
// variants in the union are legacy aliases — not surfaced to users.
const SELECTABLE_PROPERTY_TYPES: PropertyType[] = [
  'Apartment',
  'House',
  'Condo',
  'Townhouse',
  'Studio',
  'Loft',
];

interface TenantPreferencesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialPreferences: RentalPreferences;
  onSave: (next: RentalPreferences) => void;
}

function nullableNumber(raw: string): number | null {
  if (raw.trim() === '') return null;
  const n = Number(raw);
  return Number.isFinite(n) && n >= 0 ? n : null;
}

export function TenantPreferencesDialog({
  open,
  onOpenChange,
  initialPreferences,
  onSave,
}: TenantPreferencesDialogProps) {
  const { toast } = useToast();
  const [draft, setDraft] = useState<RentalPreferences>(initialPreferences);
  const [locationCity, setLocationCity] = useState('');
  const [locationState, setLocationState] = useState('');

  // Re-seed the form whenever the modal opens so the implicit-fallback
  // payload (or the previously saved prefs) becomes the editing baseline.
  useEffect(() => {
    if (open) {
      setDraft(initialPreferences);
      setLocationCity('');
      setLocationState('');
    }
  }, [open, initialPreferences]);

  const togglePropertyType = (type: PropertyType) => {
    setDraft((d) => ({
      ...d,
      propertyTypes: d.propertyTypes.includes(type)
        ? d.propertyTypes.filter((t) => t !== type)
        : [...d.propertyTypes, type],
    }));
  };

  const toggleAmenity = (amenity: string) => {
    setDraft((d) => ({
      ...d,
      amenities: d.amenities.includes(amenity)
        ? d.amenities.filter((a) => a !== amenity)
        : [...d.amenities, amenity],
    }));
  };

  const addLocation = () => {
    const city = locationCity.trim();
    const state = locationState.trim();
    if (!city || !state) return;
    const exists = draft.locations.some(
      (l) => l.city.toLowerCase() === city.toLowerCase() && l.state.toLowerCase() === state.toLowerCase()
    );
    if (exists) {
      setLocationCity('');
      setLocationState('');
      return;
    }
    setDraft((d) => ({ ...d, locations: [...d.locations, { city, state }] }));
    setLocationCity('');
    setLocationState('');
  };

  const removeLocation = (loc: PreferredLocation) => {
    setDraft((d) => ({
      ...d,
      locations: d.locations.filter((l) => !(l.city === loc.city && l.state === loc.state)),
    }));
  };

  const reset = () => setDraft(EMPTY_PREFERENCES);

  const handleSave = () => {
    // Soft validation: budget min must not exceed max when both are set.
    if (
      draft.budgetMin !== null &&
      draft.budgetMax !== null &&
      draft.budgetMin > draft.budgetMax
    ) {
      toast({
        title: 'Budget range is invalid',
        description: 'Minimum cannot exceed maximum.',
        variant: 'destructive',
      });
      return;
    }
    onSave(draft);
    toast({ title: 'Preferences saved' });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Rental Preferences</DialogTitle>
          <DialogDescription>
            We use these to recommend properties as your lease nears its end. All fields are
            optional — fill in only what matters to you.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-2">
          <fieldset className="space-y-3">
            <legend className="text-sm font-medium">Budget (monthly rent)</legend>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="prefs-budget-min" className="text-xs text-muted-foreground">
                  Min
                </Label>
                <Input
                  id="prefs-budget-min"
                  type="number"
                  inputMode="numeric"
                  min={0}
                  placeholder="$"
                  value={draft.budgetMin ?? ''}
                  onChange={(e) =>
                    setDraft((d) => ({ ...d, budgetMin: nullableNumber(e.target.value) }))
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="prefs-budget-max" className="text-xs text-muted-foreground">
                  Max
                </Label>
                <Input
                  id="prefs-budget-max"
                  type="number"
                  inputMode="numeric"
                  min={0}
                  placeholder="$"
                  value={draft.budgetMax ?? ''}
                  onChange={(e) =>
                    setDraft((d) => ({ ...d, budgetMax: nullableNumber(e.target.value) }))
                  }
                />
              </div>
            </div>
          </fieldset>

          <fieldset className="grid grid-cols-3 gap-3">
            <legend className="col-span-3 text-sm font-medium">Minimum size</legend>
            <div className="space-y-1.5">
              <Label htmlFor="prefs-bedrooms" className="text-xs text-muted-foreground">
                Bedrooms
              </Label>
              <Input
                id="prefs-bedrooms"
                type="number"
                inputMode="numeric"
                min={0}
                placeholder="—"
                value={draft.bedroomsMin ?? ''}
                onChange={(e) =>
                  setDraft((d) => ({ ...d, bedroomsMin: nullableNumber(e.target.value) }))
                }
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="prefs-bathrooms" className="text-xs text-muted-foreground">
                Bathrooms
              </Label>
              <Input
                id="prefs-bathrooms"
                type="number"
                inputMode="numeric"
                min={0}
                step={0.5}
                placeholder="—"
                value={draft.bathroomsMin ?? ''}
                onChange={(e) =>
                  setDraft((d) => ({ ...d, bathroomsMin: nullableNumber(e.target.value) }))
                }
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="prefs-sqft" className="text-xs text-muted-foreground">
                Sq ft
              </Label>
              <Input
                id="prefs-sqft"
                type="number"
                inputMode="numeric"
                min={0}
                placeholder="—"
                value={draft.squareFeetMin ?? ''}
                onChange={(e) =>
                  setDraft((d) => ({ ...d, squareFeetMin: nullableNumber(e.target.value) }))
                }
              />
            </div>
          </fieldset>

          <fieldset className="space-y-3">
            <legend className="text-sm font-medium">Locations</legend>
            <div className="grid grid-cols-[1fr_120px_auto] gap-2">
              <Input
                aria-label="City"
                placeholder="City"
                value={locationCity}
                onChange={(e) => setLocationCity(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    addLocation();
                  }
                }}
              />
              <Input
                aria-label="State"
                placeholder="State"
                value={locationState}
                onChange={(e) => setLocationState(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    addLocation();
                  }
                }}
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addLocation}
                disabled={!locationCity.trim() || !locationState.trim()}
                aria-label="Add location"
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            {draft.locations.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {draft.locations.map((loc) => (
                  <Badge key={`${loc.city}-${loc.state}`} variant="secondary" className="gap-1.5 pl-2 pr-1 py-0.5">
                    {loc.city}, {loc.state}
                    <button
                      type="button"
                      onClick={() => removeLocation(loc)}
                      aria-label={`Remove ${loc.city}, ${loc.state}`}
                      className="rounded-full p-0.5 hover:bg-foreground/10"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
          </fieldset>

          <fieldset className="space-y-3">
            <legend className="text-sm font-medium">Property types</legend>
            <div className="grid grid-cols-3 gap-2">
              {SELECTABLE_PROPERTY_TYPES.map((type) => {
                const checked = draft.propertyTypes.includes(type);
                return (
                  <label
                    key={type}
                    className="flex cursor-pointer items-center gap-2 rounded-md border bg-background px-3 py-2 text-sm hover:bg-accent"
                  >
                    <Checkbox
                      checked={checked}
                      onCheckedChange={() => togglePropertyType(type)}
                      aria-label={type}
                    />
                    <span>{type}</span>
                  </label>
                );
              })}
            </div>
          </fieldset>

          <fieldset className="space-y-3">
            <legend className="text-sm font-medium">Must-have amenities</legend>
            <div className="grid max-h-48 grid-cols-2 gap-1.5 overflow-y-auto rounded-md border p-3 sm:grid-cols-3">
              {ALL_AMENITIES.map((amenity) => {
                const checked = draft.amenities.includes(amenity);
                return (
                  <label
                    key={amenity}
                    className="flex cursor-pointer items-center gap-2 rounded px-1.5 py-1 text-sm hover:bg-accent"
                  >
                    <Checkbox
                      checked={checked}
                      onCheckedChange={() => toggleAmenity(amenity)}
                      aria-label={amenity}
                    />
                    <span className="truncate">{amenity}</span>
                  </label>
                );
              })}
            </div>
          </fieldset>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button type="button" variant="ghost" onClick={reset}>
            Clear all
          </Button>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="button" onClick={handleSave}>
            Save preferences
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
