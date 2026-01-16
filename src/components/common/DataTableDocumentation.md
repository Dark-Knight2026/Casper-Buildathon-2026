# DataTable Component Documentation

A powerful, feature-rich data table component built with TanStack Table (React Table v8) for the Real Estate Management Platform.

## Features

- ✅ **Sorting** - Multi-column sorting with visual indicators
- ✅ **Filtering** - Global search and column-specific filters
- ✅ **Pagination** - Configurable page sizes with navigation controls
- ✅ **Row Selection** - Single and multi-row selection with checkboxes
- ✅ **Column Visibility** - Show/hide columns dynamically
- ✅ **Responsive** - Automatic mobile card view transformation
- ✅ **Loading States** - Skeleton loaders during data fetch
- ✅ **Empty States** - Graceful handling of no data
- ✅ **TypeScript** - Full type safety

## Installation

The DataTable component requires `@tanstack/react-table`:

```bash
pnpm add @tanstack/react-table
```

## Basic Usage

```tsx
import { DataTable } from '@/components/common/DataTable';
import { ColumnDef } from '@tanstack/react-table';

interface Property {
  id: string;
  address: string;
  price: number;
  status: string;
}

const columns: ColumnDef<Property>[] = [
  {
    accessorKey: 'address',
    header: 'Address',
  },
  {
    accessorKey: 'price',
    header: 'Price',
    cell: ({ row }) => {
      const price = parseFloat(row.getValue('price'));
      const formatted = new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
      }).format(price);
      return formatted;
    },
  },
  {
    accessorKey: 'status',
    header: 'Status',
  },
];

function PropertiesTable() {
  const { data, isLoading } = useQuery(['properties'], fetchProperties);

  return (
    <DataTable
      columns={columns}
      data={data || []}
      searchKey="address"
      searchPlaceholder="Search properties..."
      isLoading={isLoading}
    />
  );
}
```

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `columns` | `ColumnDef<TData, TValue>[]` | Required | Column definitions |
| `data` | `TData[]` | Required | Table data |
| `searchKey` | `string` | - | Column key for global search |
| `searchPlaceholder` | `string` | `'Search...'` | Search input placeholder |
| `isLoading` | `boolean` | `false` | Show loading skeleton |
| `onRowClick` | `(row: TData) => void` | - | Row click handler |
| `enableRowSelection` | `boolean` | `false` | Enable row selection |
| `enableColumnVisibility` | `boolean` | `true` | Enable column visibility toggle |
| `enableSorting` | `boolean` | `true` | Enable sorting |
| `enableFiltering` | `boolean` | `true` | Enable filtering |
| `pageSize` | `number` | `10` | Initial page size |
| `className` | `string` | - | Additional CSS classes |
| `mobileCardRender` | `(row: TData) => ReactNode` | - | Custom mobile card renderer |

## Advanced Features

### 1. Sortable Columns

Use the `createSortableHeader` helper to add sorting to columns:

```tsx
import { createSortableHeader } from '@/components/common/DataTableHelpers';

const columns: ColumnDef<Property>[] = [
  {
    accessorKey: 'price',
    header: createSortableHeader('Price'),
  },
];
```

### 2. Actions Column

Use the `createActionsColumn` helper to add action menus:

```tsx
import { createActionsColumn } from '@/components/common/DataTableHelpers';

const columns: ColumnDef<Property>[] = [
  // ... other columns
  createActionsColumn<Property>([
    {
      label: 'Edit',
      onClick: (row) => handleEdit(row),
    },
    {
      label: 'Delete',
      onClick: (row) => handleDelete(row),
      show: (row) => row.status !== 'sold', // Conditional visibility
    },
  ]),
];
```

### 3. Custom Cell Rendering

Customize how cells are displayed:

```tsx
const columns: ColumnDef<Property>[] = [
  {
    accessorKey: 'status',
    header: 'Status',
    cell: ({ row }) => {
      const status = row.getValue('status') as string;
      return (
        <Badge variant={status === 'active' ? 'success' : 'secondary'}>
          {status}
        </Badge>
      );
    },
  },
];
```

### 4. Row Selection

Enable row selection and access selected rows:

```tsx
function PropertiesTable() {
  const [selectedRows, setSelectedRows] = useState<Property[]>([]);

  return (
    <>
      <DataTable
        columns={columns}
        data={properties}
        enableRowSelection
      />
      {selectedRows.length > 0 && (
        <BulkActionBar
          count={selectedRows.length}
          onDelete={() => handleBulkDelete(selectedRows)}
        />
      )}
    </>
  );
}
```

### 5. Mobile Responsive

Provide a custom mobile card renderer:

```tsx
<DataTable
  columns={columns}
  data={properties}
  mobileCardRender={(property) => (
    <div className="space-y-2">
      <div className="font-semibold">{property.address}</div>
      <div className="flex justify-between">
        <span className="text-muted-foreground">Price:</span>
        <span className="font-medium">${property.price.toLocaleString()}</span>
      </div>
      <Badge>{property.status}</Badge>
    </div>
  )}
/>
```

### 6. Loading States

The table automatically shows skeleton loaders:

```tsx
const { data, isLoading } = useQuery(['properties'], fetchProperties);

<DataTable
  columns={columns}
  data={data || []}
  isLoading={isLoading}
/>
```

### 7. Column Visibility

Users can show/hide columns via the dropdown:

```tsx
<DataTable
  columns={columns}
  data={properties}
  enableColumnVisibility // Default: true
/>
```

### 8. Pagination

Customize page size and navigation:

```tsx
<DataTable
  columns={columns}
  data={properties}
  pageSize={20} // Default: 10
/>
```

## Column Definition Examples

### Basic Text Column

```tsx
{
  accessorKey: 'address',
  header: 'Address',
}
```

### Formatted Number Column

```tsx
{
  accessorKey: 'price',
  header: 'Price',
  cell: ({ row }) => {
    const price = parseFloat(row.getValue('price'));
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(price);
  },
}
```

### Date Column

```tsx
{
  accessorKey: 'createdAt',
  header: 'Created',
  cell: ({ row }) => {
    const date = new Date(row.getValue('createdAt'));
    return date.toLocaleDateString();
  },
}
```

### Badge/Status Column

```tsx
{
  accessorKey: 'status',
  header: 'Status',
  cell: ({ row }) => {
    const status = row.getValue('status') as string;
    const variant = status === 'active' ? 'success' : 'secondary';
    return <Badge variant={variant}>{status}</Badge>;
  },
}
```

### Avatar Column

```tsx
{
  accessorKey: 'agent',
  header: 'Agent',
  cell: ({ row }) => {
    const agent = row.getValue('agent') as Agent;
    return (
      <div className="flex items-center space-x-2">
        <Avatar>
          <AvatarImage src={agent.avatar} />
          <AvatarFallback>{agent.initials}</AvatarFallback>
        </Avatar>
        <span>{agent.name}</span>
      </div>
    );
  },
}
```

### Custom Accessor Column

```tsx
{
  id: 'fullName',
  accessorFn: (row) => `${row.firstName} ${row.lastName}`,
  header: 'Full Name',
}
```

## Integration with React Query

Perfect integration with React Query for data fetching:

```tsx
import { useQuery } from '@tanstack/react-query';
import { DataTable } from '@/components/common/DataTable';

function PropertiesTable() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['properties'],
    queryFn: fetchProperties,
  });

  if (error) {
    return <ErrorMessage error={error} />;
  }

  return (
    <DataTable
      columns={columns}
      data={data || []}
      isLoading={isLoading}
      searchKey="address"
      searchPlaceholder="Search properties..."
      enableRowSelection
    />
  );
}
```

## Styling

The DataTable uses shadcn/ui components and automatically adapts to your theme:

- **Dark Mode** - Fully supported
- **Responsive** - Mobile-first design
- **Accessible** - ARIA labels and keyboard navigation
- **Customizable** - Override styles with `className` prop

## Performance Considerations

1. **Memoization** - Use `React.memo()` for column definitions
2. **Virtual Scrolling** - For tables with 1000+ rows, consider `@tanstack/react-virtual`
3. **Server-Side Operations** - For large datasets, implement server-side sorting/filtering
4. **Debouncing** - Debounce search input for better performance

```tsx
// Memoize columns
const columns = React.useMemo<ColumnDef<Property>[]>(
  () => [
    {
      accessorKey: 'address',
      header: 'Address',
    },
    // ... other columns
  ],
  []
);

// Debounce search
const [searchTerm, setSearchTerm] = useState('');
const debouncedSearch = useDebounce(searchTerm, 300);
```

## Accessibility

The DataTable is fully accessible:

- ✅ Keyboard navigation (Tab, Arrow keys, Enter, Space)
- ✅ Screen reader support (ARIA labels)
- ✅ Focus management
- ✅ Semantic HTML

## Troubleshooting

### Table not rendering

- Ensure `data` is an array (not undefined)
- Check that column `accessorKey` matches data object keys
- Verify TypeScript types are correct

### Sorting not working

- Ensure `enableSorting` is `true`
- Check that columns have valid `accessorKey` or `accessorFn`
- For custom sorting, provide `sortingFn` in column definition

### Search not working

- Ensure `searchKey` matches a valid column `accessorKey`
- Check that `enableFiltering` is `true`
- Verify the column is not hidden

### Mobile view not showing

- Provide `mobileCardRender` prop
- Check viewport width detection
- Ensure responsive breakpoints are correct

## Examples

See real-world usage in:
- `src/pages/dashboard/portfolio/PropertyList.tsx`
- `src/pages/dashboard/tenants/TenantDirectory.tsx`
- `src/pages/dashboard/broker/BrokerAgents.tsx`

## Future Enhancements

- [ ] Server-side pagination
- [ ] Virtual scrolling for large datasets
- [ ] Export to CSV/Excel
- [ ] Advanced filtering UI
- [ ] Column resizing
- [ ] Column reordering (drag & drop)
- [ ] Grouped rows
- [ ] Expandable rows

## Dependencies

- `@tanstack/react-table` - Table logic
- `@/components/ui/*` - UI components (shadcn/ui)
- `lucide-react` - Icons

## Support

For questions or issues with the DataTable component:
1. Check this documentation
2. Review example implementations
3. Consult TanStack Table docs: https://tanstack.com/table/latest
4. Contact the frontend team