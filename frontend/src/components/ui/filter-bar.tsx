import { SlidersHorizontal } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export interface FilterOption {
  value: string;
  label: string;
}

export interface FilterConfig {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  options: FilterOption[];
}

interface FilterBarProps {
  filters: FilterConfig[];
  count: number;
  countLabel: string;
}

export function FilterBar({ filters, count, countLabel }: FilterBarProps) {
  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 px-4 py-3 rounded-lg border border-border bg-muted/40 mb-6">
      <div className="flex items-center gap-2 text-muted-foreground shrink-0">
        <SlidersHorizontal className="h-4 w-4" />
        <span className="text-sm font-medium">Filter</span>
      </div>

      <div className="flex flex-wrap gap-3 flex-1">
        {filters.map((filter, i) => (
          <Select key={i} value={filter.value} onValueChange={filter.onChange}>
            <SelectTrigger className="w-44 h-8 text-sm bg-background">
              <SelectValue placeholder={filter.placeholder} />
            </SelectTrigger>
            <SelectContent>
              {filter.options.map(opt => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ))}
      </div>

      <span className="text-sm text-muted-foreground shrink-0">
        {count} {count === 1 ? countLabel : `${countLabel}s`}
      </span>
    </div>
  );
}
