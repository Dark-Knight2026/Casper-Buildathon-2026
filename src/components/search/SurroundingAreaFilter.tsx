import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import {
  SURROUNDING_CATEGORIES,
  MILE_RANGE_PRESETS,
  SURROUNDING_MIN_MILES,
  SURROUNDING_MAX_MILES,
} from '@/data/amenityCategories';

interface SurroundingAreaFilterProps {
  value: Record<string, number> | undefined;
  onChange: (next: Record<string, number> | undefined) => void;
}

// Task 9 — Surrounding-area filter.
// Each category has its own toggle + mile slider. Default radius comes from
// SURROUNDING_CATEGORIES[].defaultRadiusMiles when the category is enabled.
//
// TODO(backend): serialised as repeating
// `amenity_nearby[<category>]=<miles>` query params on
// GET /api/v1/properties/search. Server-side filtering should use haversine
// (or PostGIS ST_DWithin) against property.surroundingArea entries.
export function SurroundingAreaFilter({
  value,
  onChange,
}: SurroundingAreaFilterProps) {
  const current = value ?? {};
  const activeCount = Object.keys(current).length;

  const setRadius = (category: string, miles: number) => {
    onChange({ ...current, [category]: miles });
  };

  const enable = (category: string, defaultMiles: number) => {
    if (category in current) {
      const rest = Object.fromEntries(
        Object.entries(current).filter(([k]) => k !== category)
      );
      onChange(Object.keys(rest).length === 0 ? undefined : rest);
    } else {
      onChange({ ...current, [category]: defaultMiles });
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Label className="text-sm font-medium">Surrounding area</Label>
        {activeCount > 0 && (
          <button
            type="button"
            className="text-xs text-muted-foreground hover:text-foreground"
            onClick={() => onChange(undefined)}
          >
            Clear
          </button>
        )}
      </div>

      <p className="text-xs text-muted-foreground">
        Pick categories you want nearby and set the maximum distance for each.
      </p>

      <div className="space-y-3">
        {SURROUNDING_CATEGORIES.map(({ category, label, defaultRadiusMiles }) => {
          const isOn = category in current;
          const miles = current[category] ?? defaultRadiusMiles;

          return (
            <div
              key={category}
              className="rounded-md border p-3 space-y-3 bg-white"
            >
              <div className="flex items-center justify-between">
                <Label
                  htmlFor={`surrounding-${category}`}
                  className="text-sm font-medium cursor-pointer"
                >
                  {label}
                </Label>
                <Switch
                  id={`surrounding-${category}`}
                  checked={isOn}
                  onCheckedChange={() => enable(category, defaultRadiusMiles)}
                />
              </div>

              {isOn && (
                <>
                  <div className="flex items-center gap-3">
                    <Slider
                      value={[miles]}
                      onValueChange={([m]) => setRadius(category, m)}
                      min={SURROUNDING_MIN_MILES}
                      max={SURROUNDING_MAX_MILES}
                      step={1}
                      className="flex-1"
                      aria-label={`${label} radius in miles`}
                    />
                    <span className="text-sm font-medium w-16 text-right tabular-nums">
                      {miles} mi
                    </span>
                  </div>

                  <div className="flex flex-wrap gap-1.5">
                    {MILE_RANGE_PRESETS.map((preset) => (
                      <Button
                        key={preset}
                        type="button"
                        variant={miles === preset ? 'default' : 'outline'}
                        size="sm"
                        className="h-7 px-2 text-xs"
                        onClick={() => setRadius(category, preset)}
                      >
                        {preset} mi
                      </Button>
                    ))}
                  </div>
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
