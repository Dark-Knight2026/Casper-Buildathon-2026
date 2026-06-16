import { useState } from 'react';
import type { FieldValues, Path, UseFormReturn } from 'react-hook-form';
import { FormLabel } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Plus, X } from 'lucide-react';
import { ALL_AMENITIES } from '@/types/property';

interface CustomAmenitiesFieldProps<T extends FieldValues> {
  form: UseFormReturn<T>;
  name: Path<T>;
}

/**
 * Free-text amenity entry, shared by the create and edit listing forms. Custom
 * values live in the same `amenities` string[]; anything not in ALL_AMENITIES is
 * treated as a landlord-added entry and shown as a removable chip.
 */
export function CustomAmenitiesField<T extends FieldValues>({
  form,
  name,
}: CustomAmenitiesFieldProps<T>) {
  const [customAmenity, setCustomAmenity] = useState('');
  const watched = (form.watch(name) ?? []) as string[];
  const customAmenities = watched.filter(
    (a) => !ALL_AMENITIES.some((known) => known === a)
  );

  const add = () => {
    const value = customAmenity.trim();
    if (!value) return;
    const current = (form.getValues(name) ?? []) as string[];
    if (!current.some((a) => a === value)) {
      form.setValue(name, [...current, value] as never, {
        shouldValidate: true,
        shouldDirty: true,
      });
    }
    setCustomAmenity('');
  };

  const removeAmenity = (value: string) => {
    const current = (form.getValues(name) ?? []) as string[];
    form.setValue(name, current.filter((a) => a !== value) as never, {
      shouldValidate: true,
      shouldDirty: true,
    });
  };

  return (
    <div className="flex flex-col gap-1">
      <FormLabel>Add a custom amenity</FormLabel>
      <div className="flex gap-2">
        <Input
          value={customAmenity}
          onChange={(e) => setCustomAmenity(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              add();
            }
          }}
          placeholder="Something not in the list (e.g., Rooftop terrace)"
        />
        <Button
          type="button"
          variant="outline"
          onClick={add}
          className="min-h-10!"
        >
          <Plus className="h-4 w-4 mr-1.5" />
          Add
        </Button>
      </div>
      {customAmenities.length > 0 && (
        <div className="flex flex-wrap gap-2 pt-2">
          {customAmenities.map((amenity) => (
            <span
              key={amenity}
              className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-1 text-xs"
            >
              {amenity}
              <button
                type="button"
                onClick={() => removeAmenity(amenity)}
                aria-label={`Remove ${amenity}`}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
