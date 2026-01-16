import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { ChevronRight, MoreVertical } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

interface MobileDataTableColumn<T> {
  key: keyof T | string;
  label: string;
  render?: (value: unknown, row: T) => React.ReactNode;
  primary?: boolean; // Display prominently
  secondary?: boolean; // Display as secondary info
  badge?: boolean; // Render as badge
}

interface MobileDataTableProps<T extends { id: string | number }> {
  data: T[];
  columns: MobileDataTableColumn<T>[];
  onRowClick?: (row: T) => void;
  selectable?: boolean;
  selectedIds?: Set<string | number>;
  onSelectionChange?: (ids: Set<string | number>) => void;
  actions?: Array<{
    label: string;
    onClick: (row: T) => void;
    icon?: React.ReactNode;
  }>;
  emptyMessage?: string;
  className?: string;
}

/**
 * Mobile-optimized data table component
 * Transforms table data into card-based layout for better mobile UX
 * 
 * @example
 * <MobileDataTable
 *   data={properties}
 *   columns={[
 *     { key: 'address', label: 'Address', primary: true },
 *     { key: 'price', label: 'Price', secondary: true },
 *     { key: 'status', label: 'Status', badge: true },
 *   ]}
 *   onRowClick={(row) => navigate(`/property/${row.id}`)}
 *   selectable
 * />
 */
export function MobileDataTable<T extends { id: string | number }>({
  data,
  columns,
  onRowClick,
  selectable = false,
  selectedIds = new Set(),
  onSelectionChange,
  actions,
  emptyMessage = 'No data available',
  className,
}: MobileDataTableProps<T>) {
  const primaryColumn = columns.find((col) => col.primary);
  const secondaryColumns = columns.filter((col) => col.secondary);
  const badgeColumns = columns.filter((col) => col.badge);
  const otherColumns = columns.filter(
    (col) => !col.primary && !col.secondary && !col.badge
  );

  const handleSelectionToggle = (id: string | number) => {
    if (!onSelectionChange) return;
    const newSelection = new Set(selectedIds);
    if (newSelection.has(id)) {
      newSelection.delete(id);
    } else {
      newSelection.add(id);
    }
    onSelectionChange(newSelection);
  };

  const handleSelectAll = () => {
    if (!onSelectionChange) return;
    if (selectedIds.size === data.length) {
      onSelectionChange(new Set());
    } else {
      onSelectionChange(new Set(data.map((row) => row.id)));
    }
  };

  const getValue = (row: T, key: string): unknown => {
    return (row as Record<string, unknown>)[key];
  };

  if (data.length === 0) {
    return (
      <Card className={className}>
        <CardContent className="py-12 text-center text-muted-foreground">
          {emptyMessage}
        </CardContent>
      </Card>
    );
  }

  return (
    <div className={cn('space-y-3', className)}>
      {/* Select All Header */}
      {selectable && (
        <div className="flex items-center gap-2 px-4 py-2 bg-muted/50 rounded-lg">
          <Checkbox
            checked={selectedIds.size === data.length && data.length > 0}
            onCheckedChange={handleSelectAll}
            aria-label="Select all"
          />
          <span className="text-sm font-medium">
            {selectedIds.size > 0
              ? `${selectedIds.size} selected`
              : 'Select all'}
          </span>
        </div>
      )}

      {/* Data Cards */}
      {data.map((row) => (
        <Card
          key={row.id}
          className={cn(
            'transition-all',
            onRowClick && 'cursor-pointer hover:shadow-md active:scale-[0.98]',
            selectedIds.has(row.id) && 'ring-2 ring-primary'
          )}
          onClick={() => !selectable && onRowClick?.(row)}
        >
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              {/* Selection Checkbox */}
              {selectable && (
                <Checkbox
                  checked={selectedIds.has(row.id)}
                  onCheckedChange={() => handleSelectionToggle(row.id)}
                  onClick={(e) => e.stopPropagation()}
                  aria-label={`Select row ${row.id}`}
                  className="mt-1"
                />
              )}

              {/* Main Content */}
              <div className="flex-1 min-w-0">
                {/* Primary Info */}
                {primaryColumn && (
                  <div className="font-semibold text-base mb-1 truncate">
                    {primaryColumn.render
                      ? primaryColumn.render(getValue(row, primaryColumn.key as string), row)
                      : String(getValue(row, primaryColumn.key as string) ?? '')}
                  </div>
                )}

                {/* Secondary Info */}
                {secondaryColumns.length > 0 && (
                  <div className="text-sm text-muted-foreground space-y-0.5">
                    {secondaryColumns.map((col) => (
                      <div key={String(col.key)} className="truncate">
                        {col.render
                          ? col.render(getValue(row, col.key as string), row)
                          : String(getValue(row, col.key as string) ?? '')}
                      </div>
                    ))}
                  </div>
                )}

                {/* Badges */}
                {badgeColumns.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {badgeColumns.map((col) => (
                      <Badge key={String(col.key)} variant="secondary">
                        {col.render
                          ? col.render(getValue(row, col.key as string), row)
                          : String(getValue(row, col.key as string) ?? '')}
                      </Badge>
                    ))}
                  </div>
                )}

                {/* Other Info */}
                {otherColumns.length > 0 && (
                  <div className="mt-2 pt-2 border-t space-y-1">
                    {otherColumns.map((col) => (
                      <div
                        key={String(col.key)}
                        className="flex justify-between text-sm"
                      >
                        <span className="text-muted-foreground">{col.label}:</span>
                        <span className="font-medium">
                          {col.render
                            ? col.render(getValue(row, col.key as string), row)
                            : String(getValue(row, col.key as string) ?? '')}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex items-center gap-1">
                {actions && actions.length > 0 && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={(e) => e.stopPropagation()}
                        aria-label="More actions"
                      >
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      {actions.map((action, index) => (
                        <DropdownMenuItem
                          key={index}
                          onClick={(e) => {
                            e.stopPropagation();
                            action.onClick(row);
                          }}
                        >
                          {action.icon && (
                            <span className="mr-2">{action.icon}</span>
                          )}
                          {action.label}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
                {onRowClick && !actions && (
                  <ChevronRight className="h-5 w-5 text-muted-foreground" />
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}