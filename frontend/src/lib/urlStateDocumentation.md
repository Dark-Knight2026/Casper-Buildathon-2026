# URL State Management Documentation

## Overview

URL state management enables deep linking, shareable views, and browser back/forward navigation by syncing application state with URL query parameters.

## Features

- ✅ **Deep Linking**: Share exact views with filters, sorting, and pagination
- ✅ **Browser Navigation**: Back/forward buttons work as expected
- ✅ **State Persistence**: State survives page refreshes
- ✅ **Type-Safe**: Full TypeScript support with nuqs
- ✅ **Shareable URLs**: Copy and share current view with others

## Installation

```bash
pnpm add nuqs
```

## Core Utilities

### URL State Parsers (`src/lib/urlState.ts`)

Pre-configured parsers for common state types:

```typescript
import { dataTableParsers, filterParsers } from '@/lib/urlState';

// DataTable parsers
dataTableParsers = {
  page: parseAsInteger.withDefault(1),
  pageSize: parseAsInteger.withDefault(10),
  sortBy: parseAsString.withDefault(''),
  sortOrder: parseAsString.withDefault('asc'),
  search: parseAsString.withDefault(''),
  hiddenColumns: parseAsArrayOf(parseAsString).withDefault([]),
  selectedIds: parseAsArrayOf(parseAsString).withDefault([]),
};

// Filter parsers
filterParsers = {
  filters: parseAsJson<any[]>().withDefault([]),
  activePreset: parseAsString.withDefault(''),
  filterLogic: parseAsString.withDefault('AND'),
};
```

## Hooks

### useDataTableUrlState

Syncs DataTable state with URL parameters.

```typescript
import { useDataTableUrlState } from '@/hooks/useDataTableUrlState';

function MyTable() {
  const {
    pagination,
    sorting,
    columnFilters,
    columnVisibility,
    rowSelection,
    setPagination,
    setSorting,
    setColumnFilters,
    setColumnVisibility,
    setRowSelection,
    shareUrl,
    clearState,
  } = useDataTableUrlState();

  return (
    <DataTable
      data={data}
      columns={columns}
      pagination={pagination}
      sorting={sorting}
      columnFilters={columnFilters}
      columnVisibility={columnVisibility}
      rowSelection={rowSelection}
      onPaginationChange={setPagination}
      onSortingChange={setSorting}
      onColumnFiltersChange={setColumnFilters}
      onColumnVisibilityChange={setColumnVisibility}
      onRowSelectionChange={setRowSelection}
    />
  );
}
```

### useFilterUrlState

Syncs FilterPanel state with URL parameters.

```typescript
import { useFilterUrlState } from '@/hooks/useFilterUrlState';

function MyFilters() {
  const {
    filters,
    activePreset,
    filterLogic,
    setFilters,
    setActivePreset,
    setFilterLogic,
    shareUrl,
    clearFilters,
  } = useFilterUrlState();

  return (
    <FilterPanel
      filters={filters}
      onFiltersChange={setFilters}
      activePreset={activePreset}
      onPresetChange={setActivePreset}
      logic={filterLogic}
      onLogicChange={setFilterLogic}
    />
  );
}
```

## Components

### ShareUrlButton

Pre-built button for sharing current URL.

```typescript
import { ShareUrlButton } from '@/components/common/ShareUrlButton';

<ShareUrlButton 
  title="Share this property list"
  description="Anyone with this link can see the same filters and sorting"
/>
```

## URL Parameter Format

### DataTable State

```
?page=2&pageSize=25&sortBy=price&sortOrder=desc&search=luxury&hiddenColumns=["id","createdAt"]
```

### Filter State

```
?filters=[{"field":"price","operator":"between","value":[100000,500000]}]&filterLogic=AND
```

## Complete Example

### Property List with URL State

```typescript
import React from 'react';
import { useDataTableUrlState } from '@/hooks/useDataTableUrlState';
import { useFilterUrlState } from '@/hooks/useFilterUrlState';
import { DataTable } from '@/components/common/DataTable';
import { FilterPanel } from '@/components/common/FilterPanel';
import { ShareUrlButton } from '@/components/common/ShareUrlButton';
import { Button } from '@/components/ui/button';

export function PropertyList() {
  // URL state for table
  const {
    pagination,
    sorting,
    columnFilters,
    columnVisibility,
    setPagination,
    setSorting,
    setColumnFilters,
    setColumnVisibility,
    clearState: clearTableState,
  } = useDataTableUrlState();

  // URL state for filters
  const {
    filters,
    filterLogic,
    setFilters,
    setFilterLogic,
    clearFilters,
  } = useFilterUrlState();

  // Fetch data based on URL state
  const { data, isLoading } = useProperties({
    page: pagination.pageIndex + 1,
    pageSize: pagination.pageSize,
    sortBy: sorting[0]?.id,
    sortOrder: sorting[0]?.desc ? 'desc' : 'asc',
    search: columnFilters[0]?.value,
    filters,
  });

  const handleClearAll = () => {
    clearTableState();
    clearFilters();
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Properties</h1>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleClearAll}>
            Clear All
          </Button>
          <ShareUrlButton />
        </div>
      </div>

      {/* Filters */}
      <FilterPanel
        filters={filters}
        onFiltersChange={setFilters}
        logic={filterLogic}
        onLogicChange={setFilterLogic}
        fields={[
          { name: 'price', label: 'Price', type: 'number' },
          { name: 'bedrooms', label: 'Bedrooms', type: 'number' },
          { name: 'status', label: 'Status', type: 'select', options: [...] },
        ]}
      />

      {/* Table */}
      <DataTable
        data={data?.items || []}
        columns={columns}
        pagination={pagination}
        sorting={sorting}
        columnFilters={columnFilters}
        columnVisibility={columnVisibility}
        onPaginationChange={setPagination}
        onSortingChange={setSorting}
        onColumnFiltersChange={setColumnFilters}
        onColumnVisibilityChange={setColumnVisibility}
        isLoading={isLoading}
      />
    </div>
  );
}
```

## Advanced Usage

### Custom Parsers

Create custom parsers for specific needs:

```typescript
import { parseAsString, parseAsInteger } from 'nuqs';

const customParsers = {
  status: parseAsString.withDefault('all'),
  minPrice: parseAsInteger.withDefault(0),
  maxPrice: parseAsInteger.withDefault(1000000),
};

const [state, setState] = useQueryStates(customParsers);
```

### Combining Multiple States

```typescript
import { combineParsers } from '@/lib/urlState';

const allParsers = combineParsers(
  dataTableParsers,
  filterParsers,
  customParsers
);

const [state, setState] = useQueryStates(allParsers);
```

### History Mode

Choose between `push` (creates history entries) and `replace` (doesn't):

```typescript
const [state, setState] = useQueryStates(parsers, {
  history: 'replace', // Won't clutter browser history
});
```

## Best Practices

1. **Use Defaults**: Always provide sensible defaults for parsers
2. **Validate State**: Validate URL parameters before using them
3. **Handle Errors**: Gracefully handle invalid URL parameters
4. **Clear State**: Provide a way to clear/reset URL state
5. **Share URLs**: Make it easy for users to share their views
6. **Test Navigation**: Test browser back/forward buttons
7. **Performance**: Debounce rapid state changes to avoid excessive URL updates

## URL State vs LocalStorage

| Feature | URL State | LocalStorage |
|---------|-----------|--------------|
| Shareable | ✅ Yes | ❌ No |
| Persists across devices | ✅ Yes | ❌ No |
| Browser back/forward | ✅ Yes | ❌ No |
| Private data | ❌ Visible in URL | ✅ Hidden |
| Size limit | ~2KB | ~5MB |

**Use URL State for:**
- Filters, sorting, pagination
- Search queries
- View configurations
- Shareable states

**Use LocalStorage for:**
- User preferences
- Auth tokens
- Private data
- Large datasets

## Troubleshooting

### State not updating
- Check if parsers are configured correctly
- Verify `setState` is being called
- Check browser console for errors

### URL too long
- Reduce data in URL (use IDs instead of full objects)
- Store complex data in localStorage, use URL for reference
- Consider using shorter parameter names

### Browser back/forward not working
- Ensure `history: 'push'` is set
- Check if state changes are being tracked
- Verify no other code is interfering with history

## Migration Guide

### From useState to URL State

**Before:**
```typescript
const [page, setPage] = useState(1);
const [sortBy, setSortBy] = useState('name');
```

**After:**
```typescript
const { pagination, sorting, setPagination, setSorting } = useDataTableUrlState();
```

### From LocalStorage to URL State

**Before:**
```typescript
const [filters, setFilters] = useState(() => {
  const saved = localStorage.getItem('filters');
  return saved ? JSON.parse(saved) : [];
});

useEffect(() => {
  localStorage.setItem('filters', JSON.stringify(filters));
}, [filters]);
```

**After:**
```typescript
const { filters, setFilters } = useFilterUrlState();
```

## Related Documentation

- [DataTable Documentation](./DataTableDocumentation.md)
- [FilterPanel Documentation](./FilterPanelDocumentation.md)
- [nuqs Documentation](https://nuqs.47ng.com/)