# FilterPanel Component Documentation

A comprehensive advanced filtering system with multiple conditions, AND/OR logic, and saved presets for the Real Estate Management Platform.

## Features

- ✅ **Multiple Conditions** - Add unlimited filter conditions
- ✅ **AND/OR Logic** - Combine conditions with AND or OR operators
- ✅ **Rich Filter Types** - Text, number, date, select, multi-select, boolean
- ✅ **Multiple Operators** - Equals, contains, greater than, between, and more
- ✅ **Saved Presets** - Save and load frequently used filter combinations
- ✅ **Filter Chips** - Visual representation of active filters
- ✅ **Validation** - Ensures all conditions are complete before applying
- ✅ **LocalStorage** - Presets persist across sessions
- ✅ **TypeScript** - Full type safety

## Installation

The FilterPanel component uses existing shadcn/ui components. No additional dependencies required.

## Basic Usage

```tsx
import { FilterPanel } from '@/components/common/FilterPanel';
import { FilterField, FilterGroup, createDefaultFilterGroup } from '@/lib/filterUtils';
import { useState } from 'react';

function PropertiesPage() {
  const [filterGroup, setFilterGroup] = useState<FilterGroup>(
    createDefaultFilterGroup()
  );

  const filterFields: FilterField[] = [
    { key: 'address', label: 'Address', type: 'text' },
    { key: 'price', label: 'Price', type: 'number' },
    { key: 'status', label: 'Status', type: 'select', options: [
      { label: 'Active', value: 'active' },
      { label: 'Pending', value: 'pending' },
      { label: 'Sold', value: 'sold' },
    ]},
    { key: 'bedrooms', label: 'Bedrooms', type: 'number' },
    { key: 'listingDate', label: 'Listing Date', type: 'date' },
  ];

  const handleFilterChange = (newFilterGroup: FilterGroup) => {
    setFilterGroup(newFilterGroup);
    // Apply filters to your data
  };

  const handleClear = () => {
    setFilterGroup(createDefaultFilterGroup());
  };

  return (
    <div>
      <FilterPanel
        fields={filterFields}
        filterGroup={filterGroup}
        onFilterChange={handleFilterChange}
        onClear={handleClear}
      />
      {/* Your data table or list */}
    </div>
  );
}
```

## Integration with DataTable

Perfect integration with the DataTable component:

```tsx
import { DataTable } from '@/components/common/DataTable';
import { FilterPanel } from '@/components/common/FilterPanel';
import { applyFilterGroup } from '@/lib/filterUtils';

function PropertiesTable() {
  const { data, isLoading } = useQuery(['properties'], fetchProperties);
  const [filterGroup, setFilterGroup] = useState(createDefaultFilterGroup());

  // Apply filters to data
  const filteredData = useMemo(() => {
    if (!data) return [];
    return applyFilterGroup(data, filterGroup);
  }, [data, filterGroup]);

  return (
    <div className="space-y-4">
      <FilterPanel
        fields={filterFields}
        filterGroup={filterGroup}
        onFilterChange={setFilterGroup}
        onClear={() => setFilterGroup(createDefaultFilterGroup())}
      />
      <DataTable
        columns={columns}
        data={filteredData}
        isLoading={isLoading}
      />
    </div>
  );
}
```

## Props

| Prop | Type | Description |
|------|------|-------------|
| `fields` | `FilterField[]` | Array of filterable fields |
| `filterGroup` | `FilterGroup` | Current filter state |
| `onFilterChange` | `(filterGroup: FilterGroup) => void` | Callback when filters change |
| `onClear` | `() => void` | Callback to clear all filters |
| `className` | `string` | Additional CSS classes |

## Filter Field Definition

```tsx
interface FilterField {
  key: string;                    // Field key (must match data property)
  label: string;                  // Display label
  type: FilterType;               // Filter type
  options?: Array<{               // Options for select/multiSelect types
    label: string;
    value: string | number;
  }>;
}

type FilterType = 
  | 'text'        // Text input
  | 'number'      // Number input
  | 'date'        // Date picker
  | 'select'      // Single select dropdown
  | 'multiSelect' // Multi-select dropdown
  | 'boolean';    // Boolean checkbox
```

## Available Operators

### Text Operators
- `equals` - Exact match
- `notEquals` - Not equal to
- `contains` - Contains substring
- `notContains` - Does not contain substring
- `startsWith` - Starts with
- `endsWith` - Ends with
- `isEmpty` - Is empty/null
- `isNotEmpty` - Is not empty/null

### Number Operators
- `equals` - Exact match
- `notEquals` - Not equal to
- `greaterThan` - Greater than
- `lessThan` - Less than
- `greaterThanOrEqual` - Greater than or equal
- `lessThanOrEqual` - Less than or equal
- `between` - Between two values
- `isEmpty` - Is empty/null
- `isNotEmpty` - Is not empty/null

### Date Operators
- `equals` - Exact date match
- `notEquals` - Not equal to date
- `greaterThan` - After date
- `lessThan` - Before date
- `greaterThanOrEqual` - On or after date
- `lessThanOrEqual` - On or before date
- `between` - Between two dates
- `isEmpty` - Is empty/null
- `isNotEmpty` - Is not empty/null

### Select Operators
- `equals` - Exact match
- `notEquals` - Not equal to
- `in` - In list
- `notIn` - Not in list
- `isEmpty` - Is empty/null
- `isNotEmpty` - Is not empty/null

## Filter Utility Functions

### Core Functions

```tsx
import {
  applyFilterGroup,
  createDefaultFilterGroup,
  createDefaultCondition,
  validateFilterGroup,
  filterGroupToString,
} from '@/lib/filterUtils';

// Apply filters to data
const filteredData = applyFilterGroup(data, filterGroup);

// Create empty filter group
const emptyFilters = createDefaultFilterGroup();

// Create default condition for a field
const condition = createDefaultCondition('price', 'number');

// Validate filter group
const isValid = validateFilterGroup(filterGroup);

// Convert to human-readable string
const description = filterGroupToString(filterGroup);
// Output: "price Greater Than 500000 AND bedrooms Equals 3"
```

### Preset Management

```tsx
import {
  saveFilterPreset,
  getFilterPresets,
  deleteFilterPreset,
  getFilterPresetById,
} from '@/lib/filterUtils';

// Save preset
const preset: FilterPreset = {
  id: generateFilterId(),
  name: 'Luxury Properties',
  description: 'Properties over $1M with 4+ bedrooms',
  filters: filterGroup,
  createdAt: new Date(),
  updatedAt: new Date(),
};
saveFilterPreset(preset);

// Get all presets
const presets = getFilterPresets();

// Delete preset
deleteFilterPreset(presetId);

// Get specific preset
const preset = getFilterPresetById(presetId);
```

## Advanced Examples

### Example 1: Property Search with Multiple Conditions

```tsx
const filterFields: FilterField[] = [
  { key: 'address', label: 'Address', type: 'text' },
  { key: 'price', label: 'Price', type: 'number' },
  { key: 'bedrooms', label: 'Bedrooms', type: 'number' },
  { key: 'bathrooms', label: 'Bathrooms', type: 'number' },
  { key: 'sqft', label: 'Square Feet', type: 'number' },
  { key: 'status', label: 'Status', type: 'select', options: [
    { label: 'Active', value: 'active' },
    { label: 'Pending', value: 'pending' },
    { label: 'Sold', value: 'sold' },
  ]},
  { key: 'propertyType', label: 'Property Type', type: 'select', options: [
    { label: 'Single Family', value: 'single_family' },
    { label: 'Condo', value: 'condo' },
    { label: 'Townhouse', value: 'townhouse' },
  ]},
  { key: 'listingDate', label: 'Listing Date', type: 'date' },
];

// User creates filter: "Price between $500K-$1M AND Bedrooms >= 3"
const filterGroup: FilterGroup = {
  id: 'filter_123',
  logic: 'AND',
  conditions: [
    {
      id: 'cond_1',
      field: 'price',
      operator: 'between',
      value: [500000, 1000000],
      type: 'number',
    },
    {
      id: 'cond_2',
      field: 'bedrooms',
      operator: 'greaterThanOrEqual',
      value: 3,
      type: 'number',
    },
  ],
};
```

### Example 2: Tenant Search with OR Logic

```tsx
const filterFields: FilterField[] = [
  { key: 'name', label: 'Tenant Name', type: 'text' },
  { key: 'unit', label: 'Unit Number', type: 'text' },
  { key: 'leaseStatus', label: 'Lease Status', type: 'select', options: [
    { label: 'Active', value: 'active' },
    { label: 'Expiring Soon', value: 'expiring' },
    { label: 'Expired', value: 'expired' },
  ]},
  { key: 'rentAmount', label: 'Rent Amount', type: 'number' },
  { key: 'moveInDate', label: 'Move-In Date', type: 'date' },
];

// User creates filter: "Status is Active OR Expiring Soon"
const filterGroup: FilterGroup = {
  id: 'filter_456',
  logic: 'OR',
  conditions: [
    {
      id: 'cond_1',
      field: 'leaseStatus',
      operator: 'equals',
      value: 'active',
      type: 'select',
    },
    {
      id: 'cond_2',
      field: 'leaseStatus',
      operator: 'equals',
      value: 'expiring',
      type: 'select',
    },
  ],
};
```

### Example 3: Agent Performance Filters

```tsx
const filterFields: FilterField[] = [
  { key: 'agentName', label: 'Agent Name', type: 'text' },
  { key: 'totalSales', label: 'Total Sales', type: 'number' },
  { key: 'commission', label: 'Commission', type: 'number' },
  { key: 'activeListings', label: 'Active Listings', type: 'number' },
  { key: 'joinDate', label: 'Join Date', type: 'date' },
  { key: 'status', label: 'Status', type: 'select', options: [
    { label: 'Active', value: 'active' },
    { label: 'Inactive', value: 'inactive' },
  ]},
];

// User creates filter: "Total Sales > $1M AND Active Listings > 5"
const filterGroup: FilterGroup = {
  id: 'filter_789',
  logic: 'AND',
  conditions: [
    {
      id: 'cond_1',
      field: 'totalSales',
      operator: 'greaterThan',
      value: 1000000,
      type: 'number',
    },
    {
      id: 'cond_2',
      field: 'activeListings',
      operator: 'greaterThan',
      value: 5,
      type: 'number',
    },
  ],
};
```

## UI Components

### Filter Button
- Shows "Filters" with active count badge
- Opens filter dialog on click

### Filter Dialog
- Full-screen modal on mobile
- Max-width 4xl on desktop
- Scrollable content area

### Logic Selector
- Appears when 2+ conditions exist
- Toggle between "All (AND)" and "Any (OR)"

### Condition Cards
- Field selector dropdown
- Operator selector dropdown
- Value input (text, number, date, or select)
- Remove button

### Filter Chips
- Show active filters below button
- Click X to remove individual filter
- "Clear All" button to remove all

### Preset Cards
- Grid layout (1 column mobile, 2 columns desktop)
- Click to load preset
- Delete button per preset

## Styling

The FilterPanel uses shadcn/ui components and adapts to your theme:

- **Dark Mode** - Fully supported
- **Responsive** - Mobile-first design
- **Accessible** - ARIA labels and keyboard navigation
- **Customizable** - Override styles with `className` prop

## Performance Considerations

1. **Memoization** - Use `useMemo` for filtered data
2. **Debouncing** - Consider debouncing filter changes for large datasets
3. **Server-Side** - For very large datasets, implement server-side filtering
4. **Validation** - Validate filters before applying to prevent errors

```tsx
// Memoize filtered data
const filteredData = useMemo(() => {
  return applyFilterGroup(data, filterGroup);
}, [data, filterGroup]);

// Debounce filter changes
const debouncedFilterGroup = useDebounce(filterGroup, 300);
const filteredData = useMemo(() => {
  return applyFilterGroup(data, debouncedFilterGroup);
}, [data, debouncedFilterGroup]);
```

## Accessibility

The FilterPanel is fully accessible:

- ✅ Keyboard navigation (Tab, Enter, Escape)
- ✅ Screen reader support (ARIA labels)
- ✅ Focus management
- ✅ Semantic HTML

## LocalStorage Schema

Presets are stored in localStorage with the key `filterPresets`:

```json
[
  {
    "id": "filter_1234567890_abc123",
    "name": "Luxury Properties",
    "description": "Properties over $1M",
    "filters": {
      "id": "group_1",
      "logic": "AND",
      "conditions": [
        {
          "id": "cond_1",
          "field": "price",
          "operator": "greaterThan",
          "value": 1000000,
          "type": "number"
        }
      ]
    },
    "createdAt": "2024-12-09T10:00:00.000Z",
    "updatedAt": "2024-12-09T10:00:00.000Z"
  }
]
```

## Troubleshooting

### Filters not applying

- Ensure field keys match data property names
- Check that `applyFilterGroup` is called with correct data
- Verify filter conditions are valid

### Presets not saving

- Check browser localStorage is enabled
- Verify preset has valid name
- Ensure filter group is valid before saving

### Operators not showing

- Verify field type is correct
- Check `getOperatorsForType` returns operators for the type

### Values not updating

- Ensure `onFilterChange` callback is called
- Check state is updated correctly
- Verify controlled component pattern

## Examples in Codebase

See real-world usage in:
- `src/pages/dashboard/portfolio/PropertyList.tsx` (coming soon)
- `src/pages/dashboard/tenants/TenantDirectory.tsx` (coming soon)
- `src/pages/dashboard/broker/BrokerAgents.tsx` (coming soon)

## Future Enhancements

- [ ] Nested filter groups (groups within groups)
- [ ] Custom operators
- [ ] Filter templates by role
- [ ] Export/import filter presets
- [ ] Filter analytics (most used filters)
- [ ] Quick filters (one-click common filters)
- [ ] Filter history (undo/redo)

## Dependencies

- `@/components/ui/*` - shadcn/ui components
- `lucide-react` - Icons
- `@/lib/filterUtils` - Filter logic utilities

## Support

For questions or issues with the FilterPanel component:
1. Check this documentation
2. Review filter utility functions in `src/lib/filterUtils.ts`
3. Consult example implementations
4. Contact the frontend team