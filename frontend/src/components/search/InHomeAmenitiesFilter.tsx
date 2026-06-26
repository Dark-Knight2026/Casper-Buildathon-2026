import { Check } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { IN_HOME_AMENITIES } from '@/data/amenityCategories';

interface InHomeAmenitiesFilterProps {
  value: string[] | undefined;
  onChange: (next: string[] | undefined) => void;
}

// Task 9 — In-home amenities filter (boolean toggles).
// Renders the controlled IN_HOME_AMENITIES list as multi-select chips. AND
// semantics across the selected set (matches the demo MATCH_STRICTNESS).
//
// TODO(backend): selected values are serialised to repeating
// `amenity_in_home[]` query params on GET /api/v1/properties/search.
export function InHomeAmenitiesFilter({
  value,
  onChange,
}: InHomeAmenitiesFilterProps) {
  const selected = value ?? [];

  const toggle = (amenity: string) => {
    const next = selected.includes(amenity)
      ? selected.filter((a) => a !== amenity)
      : [...selected, amenity];
    onChange(next.length === 0 ? undefined : next);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label className="text-sm font-medium">In-home amenities</Label>
        {selected.length > 0 && (
          <button
            type="button"
            className="text-xs text-muted-foreground hover:text-foreground"
            onClick={() => onChange(undefined)}
          >
            Clear
          </button>
        )}
      </div>
      <div className="flex flex-wrap gap-2">
        {IN_HOME_AMENITIES.map((amenity) => {
          const isOn = selected.includes(amenity);
          return (
            <Button
              key={amenity}
              type="button"
              variant={isOn ? 'default' : 'outline'}
              size="sm"
              className="h-8 rounded-full"
              onClick={() => toggle(amenity)}
              aria-pressed={isOn}
            >
              {isOn && <Check className="mr-1 h-3 w-3" />}
              {amenity}
            </Button>
          );
        })}
      </div>
    </div>
  );
}
