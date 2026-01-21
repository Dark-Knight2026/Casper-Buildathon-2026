# Chart Components Library

A collection of reusable, responsive chart components built with Recharts for the Real Estate Management Platform.

## Components

### ChartContainer

A wrapper component that provides consistent styling, loading states, and empty states for all charts.

**Features:**
- Responsive container with configurable height
- Built-in loading skeleton
- Empty state handling
- Optional title, description, and action buttons
- Consistent card styling

**Props:**
```typescript
interface ChartContainerProps {
  title?: string;
  description?: string;
  children: React.ReactNode;
  isLoading?: boolean;
  isEmpty?: boolean;
  emptyMessage?: string;
  className?: string;
  height?: number;
  action?: React.ReactNode;
}
```

### LineChartComponent

Multi-line chart for displaying trends over time.

**Use Cases:**
- Revenue trends
- Performance metrics over time
- Comparative analysis

**Example:**
```tsx
import { LineChartComponent } from '@/components/charts';

const data = [
  { month: 'Jan', revenue: 4000, expenses: 2400 },
  { month: 'Feb', revenue: 3000, expenses: 1398 },
  { month: 'Mar', revenue: 2000, expenses: 9800 },
];

<LineChartComponent
  data={data}
  lines={[
    { dataKey: 'revenue', stroke: '#8884d8', name: 'Revenue' },
    { dataKey: 'expenses', stroke: '#82ca9d', name: 'Expenses' }
  ]}
  xAxisKey="month"
  title="Monthly Performance"
  description="Revenue vs Expenses"
  height={300}
/>
```

### BarChartComponent

Vertical bar chart for comparing categories.

**Use Cases:**
- Sales by agent
- Properties by type
- Monthly comparisons

**Example:**
```tsx
import { BarChartComponent } from '@/components/charts';

const data = [
  { agent: 'John', sales: 45, deals: 12 },
  { agent: 'Sarah', sales: 52, deals: 15 },
  { agent: 'Mike', sales: 38, deals: 10 },
];

<BarChartComponent
  data={data}
  bars={[
    { dataKey: 'sales', fill: '#8884d8', name: 'Sales' },
    { dataKey: 'deals', fill: '#82ca9d', name: 'Deals' }
  ]}
  xAxisKey="agent"
  title="Agent Performance"
  stacked={false}
  height={300}
/>
```

### PieChartComponent

Circular chart for showing proportions.

**Use Cases:**
- Property type distribution
- Market share
- Category breakdown

**Example:**
```tsx
import { PieChartComponent } from '@/components/charts';

const data = [
  { name: 'Residential', value: 400 },
  { name: 'Commercial', value: 300 },
  { name: 'Industrial', value: 200 },
  { name: 'Land', value: 100 },
];

<PieChartComponent
  data={data}
  title="Property Distribution"
  description="By property type"
  innerRadius={60} // Set to 0 for regular pie, >0 for donut
  height={300}
/>
```

### AreaChartComponent

Filled area chart for showing cumulative trends.

**Use Cases:**
- Cumulative revenue
- Portfolio growth
- Stacked metrics

**Example:**
```tsx
import { AreaChartComponent } from '@/components/charts';

const data = [
  { month: 'Jan', revenue: 4000, profit: 2400 },
  { month: 'Feb', revenue: 3000, profit: 1398 },
  { month: 'Mar', revenue: 2000, profit: 9800 },
];

<AreaChartComponent
  data={data}
  areas={[
    { dataKey: 'revenue', fill: '#8884d8', stroke: '#8884d8', name: 'Revenue' },
    { dataKey: 'profit', fill: '#82ca9d', stroke: '#82ca9d', name: 'Profit' }
  ]}
  xAxisKey="month"
  title="Revenue Trends"
  stacked={true}
  height={300}
/>
```

## Common Props

All chart components share these common props:

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `title` | `string` | - | Chart title |
| `description` | `string` | - | Chart description |
| `isLoading` | `boolean` | `false` | Show loading skeleton |
| `height` | `number` | `300` | Chart height in pixels |
| `showGrid` | `boolean` | `true` | Show grid lines |
| `showLegend` | `boolean` | `true` | Show legend |
| `action` | `ReactNode` | - | Action button/element in header |
| `className` | `string` | - | Additional CSS classes |

## Styling

All charts automatically adapt to the application's theme:

- **Colors:** Use CSS variables from the theme
- **Dark Mode:** Automatically supported
- **Responsive:** All charts are fully responsive
- **Accessibility:** Tooltips and labels for screen readers

## Color Palette

Default colors used across charts:

```typescript
const CHART_COLORS = {
  primary: '#8884d8',
  secondary: '#82ca9d',
  tertiary: '#ffc658',
  quaternary: '#ff8042',
  quinary: '#0088fe',
  senary: '#00c49f',
};
```

## Best Practices

### 1. Data Format

Ensure your data is in the correct format:

```typescript
// Line/Bar/Area charts
const data = [
  { category: 'A', value1: 100, value2: 200 },
  { category: 'B', value1: 150, value2: 250 },
];

// Pie chart
const data = [
  { name: 'Category A', value: 400 },
  { name: 'Category B', value: 300 },
];
```

### 2. Loading States

Always handle loading states:

```tsx
const { data, isLoading } = useQuery(['chart-data'], fetchData);

<LineChartComponent
  data={data || []}
  isLoading={isLoading}
  // ... other props
/>
```

### 3. Empty States

Provide meaningful empty messages:

```tsx
<ChartContainer
  isEmpty={data.length === 0}
  emptyMessage="No data available for the selected period"
>
  {/* Chart */}
</ChartContainer>
```

### 4. Responsive Heights

Use responsive heights for different screen sizes:

```tsx
const chartHeight = useMediaQuery('(min-width: 768px)') ? 400 : 250;

<LineChartComponent
  height={chartHeight}
  // ... other props
/>
```

### 5. Action Buttons

Add export or filter actions to chart headers:

```tsx
<LineChartComponent
  action={
    <Button variant="outline" size="sm">
      Export
    </Button>
  }
  // ... other props
/>
```

## Integration with React Query

Charts work seamlessly with React Query:

```tsx
import { useQuery } from '@tanstack/react-query';
import { LineChartComponent } from '@/components/charts';

function RevenueChart() {
  const { data, isLoading } = useQuery({
    queryKey: ['revenue-data'],
    queryFn: fetchRevenueData,
  });

  return (
    <LineChartComponent
      data={data || []}
      lines={[{ dataKey: 'revenue', stroke: '#8884d8', name: 'Revenue' }]}
      xAxisKey="month"
      title="Monthly Revenue"
      isLoading={isLoading}
    />
  );
}
```

## Performance Considerations

1. **Memoization:** Use `React.memo()` for chart components when data doesn't change frequently
2. **Data Sampling:** For large datasets (>1000 points), consider sampling or aggregation
3. **Lazy Loading:** Load charts only when visible using intersection observer
4. **Debouncing:** Debounce real-time data updates to avoid excessive re-renders

## Troubleshooting

### Chart not rendering

- Ensure data is in the correct format
- Check that `dataKey` values match your data object keys
- Verify the chart has a valid height

### Tooltip not showing

- Ensure `Tooltip` component is included
- Check z-index conflicts with other elements

### Legend overlapping

- Adjust chart height
- Use `showLegend={false}` and create custom legend

### Colors not matching theme

- Verify CSS variables are defined in your theme
- Use theme colors in chart configuration

## Examples

See `src/pages/dashboard/*/` for real-world usage examples in:
- Agent Dashboard
- Broker Dashboard
- Buyer Dashboard
- Landlord Dashboard

## Dependencies

- `recharts` - Chart library
- `@/components/ui/card` - Card components
- `@/components/ui/skeleton` - Loading skeletons

## Future Enhancements

- [ ] Combo charts (line + bar)
- [ ] Radar charts
- [ ] Scatter plots
- [ ] Heatmaps
- [ ] Real-time data streaming
- [ ] Export to image functionality
- [ ] Interactive drill-down
- [ ] Custom tooltips with more data