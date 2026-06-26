import React from 'react';
import { Column, Row } from '@tanstack/react-table';
import { ArrowUpDown, MoreHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

/**
 * Helper function to create a sortable column header
 */
export function createSortableHeader(label: string) {
  return ({ column }: { column: Column<unknown, unknown> }) => {
    return (
      <Button
        variant="ghost"
        onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
      >
        {label}
        <ArrowUpDown className="ml-2 h-4 w-4" />
      </Button>
    );
  };
}

/**
 * Helper function to create an actions column
 */
export function createActionsColumn<TData>(
  actions: Array<{
    label: string;
    onClick: (row: TData) => void;
    show?: (row: TData) => boolean;
  }>
) {
  return {
    id: 'actions',
    cell: ({ row }: { row: Row<TData> }) => {
      const data = row.original;

      return (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-8 w-8 p-0">
              <span className="sr-only">Open menu</span>
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Actions</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {actions.map((action, index) => {
              if (action.show && !action.show(data)) return null;
              return (
                <DropdownMenuItem
                  key={index}
                  onClick={() => action.onClick(data)}
                >
                  {action.label}
                </DropdownMenuItem>
              );
            })}
          </DropdownMenuContent>
        </DropdownMenu>
      );
    },
  };
}