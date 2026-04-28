import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { TabsList, TabsTrigger } from '@/components/ui/tabs';

export interface TabOption {
  value: string;
  label: string;
}

interface ResponsiveTabsHeaderProps {
  options: TabOption[];
  activeTab: string;
  onChange: (value: string) => void;
}

/**
 * Mobile/small-tablet (<md) → full-width Select dropdown opening downward.
 * ≥md → standard equal-column TabsList with one column per option.
 *
 * Must be rendered INSIDE a controlled `<Tabs value={activeTab} onValueChange={onChange}>`
 * so both the dropdown and the TabsList stay in sync with the same state.
 */
export function ResponsiveTabsHeader({ options, activeTab, onChange }: ResponsiveTabsHeaderProps) {
  return (
    <>
      <div className="md:hidden mb-4">
        <Select value={activeTab} onValueChange={onChange}>
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent
            position="popper"
            side="bottom"
            sideOffset={4}
            className="w-(--radix-select-trigger-width) min-w-(--radix-select-trigger-width)"
          >
            {options.map((t) => (
              <SelectItem key={t.value} value={t.value}>
                {t.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <TabsList
        className="hidden md:grid w-full"
        style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}
      >
        {options.map((t) => (
          <TabsTrigger key={t.value} value={t.value}>
            {t.label}
          </TabsTrigger>
        ))}
      </TabsList>
    </>
  );
}
