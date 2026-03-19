# Dashboard Widgets Library

A collection of reusable, composable dashboard components built with React, TypeScript, and Tailwind CSS.

## Components

### DashboardCard

A flexible card wrapper component for dashboard content.

**Features:**
- Optional header with title, description, and icon
- Action slot for buttons or controls
- Loading state with skeleton
- Empty state support
- Fully customizable styling

**Usage:**
```tsx
import { DashboardCard } from '@/components/widgets';
import { Users } from 'lucide-react';

<DashboardCard
  title="Active Users"
  description="Users online in the last 24 hours"
  icon={Users}
  action={<Button>View All</Button>}
  isLoading={false}
>
  <YourContent />
</DashboardCard>
```

### StatCard

Display key metrics with trend indicators.

**Features:**
- Large value display
- Icon with customizable color scheme
- Trend indicator (up/down arrows with percentage)
- Optional description or trend label
- Loading skeleton
- Click handler support

**Usage:**
```tsx
import { StatCard } from '@/components/widgets';
import { DollarSign } from 'lucide-react';

<StatCard
  label="Total Revenue"
  value="$45,231"
  icon={DollarSign}
  trend={12.5}
  trendLabel="vs last month"
  colorScheme="green"
/>
```

**Color Schemes:** `blue`, `green`, `purple`, `orange`, `red`

### ActivityFeed

Display a chronological list of activities with icons and timestamps.

**Features:**
- Activity type icons (transaction, appointment, message, update)
- Relative timestamps
- Infinite scroll support
- Empty state
- Loading skeleton

**Usage:**
```tsx
import { ActivityFeed, Activity } from '@/components/widgets';

const activities: Activity[] = [
  {
    id: '1',
    type: 'transaction',
    title: 'New sale completed',
    description: 'Property at 123 Main St',
    timestamp: '2024-01-15T10:30:00Z',
  },
];

<ActivityFeed
  activities={activities}
  onLoadMore={() => console.log('Load more')}
  hasMore={true}
/>
```

### QuickActions

Grid of action buttons with icons.

**Features:**
- Responsive grid layout (2, 3, or 4 columns)
- Icon + label buttons
- Loading states per action
- Disabled state support
- Hover animations

**Usage:**
```tsx
import { QuickActions, QuickAction } from '@/components/widgets';
import { Plus, Upload, Download } from 'lucide-react';

const actions: QuickAction[] = [
  {
    id: '1',
    label: 'Add New',
    icon: Plus,
    onClick: () => console.log('Add'),
  },
  {
    id: '2',
    label: 'Upload',
    icon: Upload,
    onClick: () => console.log('Upload'),
  },
];

<QuickActions actions={actions} columns={4} />
```

### RecentActivity

Display recent items with status badges.

**Features:**
- Item list with icons
- Status badges
- Click handlers
- Empty state
- Scrollable area
- Loading skeleton

**Usage:**
```tsx
import { RecentActivity, RecentItem } from '@/components/widgets';
import { FileText } from 'lucide-react';

const items: RecentItem[] = [
  {
    id: '1',
    title: 'New document',
    subtitle: 'Created 2 hours ago',
    status: 'Draft',
    statusVariant: 'secondary',
    icon: FileText,
    onClick: () => console.log('Clicked'),
  },
];

<RecentActivity
  items={items}
  onItemClick={(item) => console.log(item)}
/>
```

## Design Principles

1. **Composability**: Components can be combined and nested
2. **Consistency**: Unified design language across all widgets
3. **Accessibility**: Keyboard navigation and screen reader support
4. **Responsiveness**: Mobile-first, adaptive layouts
5. **Performance**: Optimized rendering and loading states
6. **Customization**: Extensive styling options via className props

## Common Props

All widgets support:
- `isLoading`: Show loading skeleton
- `className`: Custom Tailwind classes
- Standard React props (key, ref, etc.)

## Styling

Components use:
- Tailwind CSS for styling
- shadcn/ui base components
- Dark mode support
- Consistent spacing scale

## Best Practices

1. **Always provide loading states** for async data
2. **Use empty states** when no data is available
3. **Keep actions simple** - one primary action per widget
4. **Provide meaningful labels** for accessibility
5. **Test responsive behavior** on mobile devices

## Examples

See individual component files for more detailed examples and TypeScript types.