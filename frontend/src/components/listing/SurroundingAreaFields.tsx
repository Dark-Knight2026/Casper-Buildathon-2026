import {
  useFieldArray,
  type ArrayPath,
  type Control,
  type FieldPath,
  type FieldValues,
} from 'react-hook-form';
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Plus, Trash2 } from 'lucide-react';
import { SURROUNDING_CATEGORIES } from '@/lib/listingForm';

interface SurroundingAreaFieldsProps<T extends FieldValues> {
  control: Control<T>;
  name: ArrayPath<T>;
}

/**
 * Nearby-places editor for the surrounding-area POI field array, shared by the
 * create and edit listing forms. Generic over the host form's values.
 */
export function SurroundingAreaFields<T extends FieldValues>({
  control,
  name,
}: SurroundingAreaFieldsProps<T>) {
  const { fields, append, remove } = useFieldArray({ control, name });

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <FormLabel>Nearby places</FormLabel>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() =>
            append({ category: 'park', name: '', distanceMiles: 0 } as never)
          }
        >
          <Plus className="h-4 w-4 mr-1.5" />
          Add place
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">
        What's nearby and how far it is — shown to tenants in surrounding-area
        search.
      </p>
      {fields.length === 0 && (
        <p className="text-sm text-muted-foreground">
          No nearby places added yet.
        </p>
      )}
      {fields.map((poi, index) => (
        <div
          key={poi.id}
          className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_8rem_auto] gap-2 items-start border rounded-md p-3"
        >
          <FormField
            control={control}
            name={`${name}.${index}.category` as FieldPath<T>}
            render={({ field }) => (
              <FormItem className="flex flex-col gap-1 space-y-0">
                <FormLabel className="sr-only">Category</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger className="data-[size=default]:h-10 min-h-10! w-full rounded-md capitalize">
                      <SelectValue placeholder="Category" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {SURROUNDING_CATEGORIES.map((category) => (
                      <SelectItem
                        key={category}
                        value={category}
                        className="capitalize"
                      >
                        {category}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={control}
            name={`${name}.${index}.name` as FieldPath<T>}
            render={({ field }) => (
              <FormItem className="flex flex-col gap-1 space-y-0">
                <FormLabel className="sr-only">Place name</FormLabel>
                <FormControl>
                  <Input placeholder="e.g., Lincoln High School" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={control}
            name={`${name}.${index}.distanceMiles` as FieldPath<T>}
            render={({ field }) => (
              <FormItem className="flex flex-col gap-1 space-y-0">
                <FormLabel className="sr-only">Distance (miles)</FormLabel>
                <FormControl>
                  <div className="flex items-center gap-1.5">
                    <Input
                      type="number"
                      min={0}
                      step={0.1}
                      placeholder="0"
                      {...field}
                    />
                    <span className="text-sm text-muted-foreground">mi</span>
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => remove(index)}
            aria-label="Remove place"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ))}
    </div>
  );
}
