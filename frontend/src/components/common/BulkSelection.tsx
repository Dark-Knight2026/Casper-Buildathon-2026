import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';

interface BulkSelectionProps {
  selectedCount: number;
  totalCount: number;
  onSelectAll: (checked: boolean) => void;
  onClearSelection: () => void;
  selectAllChecked: boolean;
}

export default function BulkSelection({
  selectedCount,
  totalCount,
  onSelectAll,
  onClearSelection,
  selectAllChecked,
}: BulkSelectionProps) {
  return (
    <div className="flex items-center gap-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
      <div className="flex items-center gap-2">
        <Checkbox
          checked={selectAllChecked}
          onCheckedChange={onSelectAll}
          id="select-all"
        />
        <label
          htmlFor="select-all"
          className="text-sm font-medium cursor-pointer"
        >
          Select All ({totalCount})
        </label>
      </div>

      {selectedCount > 0 && (
        <>
          <div className="h-4 w-px bg-blue-300" />
          <span className="text-sm font-medium text-blue-900">
            {selectedCount} selected
          </span>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClearSelection}
            className="ml-auto"
          >
            <X className="h-4 w-4 mr-2" />
            Clear Selection
          </Button>
        </>
      )}
    </div>
  );
}