# Interactive Analytics System

## Overview
The Interactive Analytics System provides comprehensive data visualization with drill-down capabilities for revenue trends and expense analysis. Built with Recharts library, it offers multiple chart types and interactive exploration of financial data.

## Components

### 1. InteractiveRevenueChart
**Location**: `src/components/analytics/InteractiveRevenueChart.tsx`

#### Features
- **Multiple Chart Types**: Area, Line, and Bar charts
- **Drill-Down Navigation**: Click any month to view property-level breakdown
- **Property Analysis**: Detailed metrics for individual properties
- **Trend Indicators**: Visual representation of revenue trends
- **Summary Statistics**: Total revenue, expenses, profit, and trend percentage

#### View Modes

##### Overview Mode
- Displays 12-month revenue, expenses, and profit trends
- Summary cards showing:
  - Total Revenue (green)
  - Total Expenses (red)
  - Net Profit (blue)
  - Trend Percentage (purple with up/down indicator)
- Chart type selector (Area/Line/Bar)
- Interactive tooltips with click instructions

##### Property Detail Mode
- Triggered by clicking any month in the overview chart
- Shows property-level breakdown for selected month
- Bar chart comparing revenue, expenses, and profit across properties
- Property cards with:
  - Property name and occupancy badge
  - Revenue, expenses, and net profit
  - Click to view detailed analysis
- Back button to return to overview

##### Detailed Analysis
- Appears when clicking a property card
- Displays comprehensive metrics:
  - Revenue amount
  - Expense amount
  - Profit amount
  - Profit margin percentage
- Color-coded information panel

#### Data Structure
```typescript
interface RevenueData {
  month: string;
  revenue: number;
  expenses: number;
  profit: number;
  properties: PropertyRevenue[];
}

interface PropertyRevenue {
  id: string;
  name: string;
  revenue: number;
  expenses: number;
  profit: number;
  occupancy: number;
}
```

### 2. InteractiveExpenseChart
**Location**: `src/components/analytics/InteractiveExpenseChart.tsx`

#### Features
- **Pie Chart Distribution**: Visual expense category breakdown
- **Category Cards**: Clickable cards with trend indicators
- **Subcategory Analysis**: Detailed breakdown of each expense category
- **Monthly Trends**: Historical expense tracking
- **Alert System**: Warnings for high expense increases

#### View Modes

##### Overview Mode
- Pie chart showing expense distribution by category
- Category cards displaying:
  - Category name with color indicator
  - Amount and percentage of total
  - Trend vs. last month (up/down arrows)
- Click any category or pie slice to drill down
- "View Monthly Trends" button

##### Category Detail Mode
- Triggered by clicking a category
- Summary cards showing:
  - Total amount for category
  - Percentage of total expenses
  - Trend vs. last month
- Bar chart of subcategories
- Detailed subcategory cards with descriptions
- High expense alert (if trend > 5%)
- Back button to return to overview

##### Trends Mode
- 12-month line chart showing all expense categories
- Stacked bar chart for monthly comparison
- Legend for all categories
- Total expense line (dashed)
- Back button to return to overview

#### Expense Categories
1. **Maintenance & Repairs** (Red - #ef4444)
   - HVAC Repairs
   - Plumbing
   - Painting
   - Landscaping

2. **Utilities** (Orange - #f59e0b)
   - Electricity
   - Water & Sewer
   - Gas
   - Trash

3. **Property Insurance** (Blue - #3b82f6)
   - Building Insurance
   - Liability Insurance
   - Flood Insurance

4. **Property Taxes** (Purple - #8b5cf6)
   - County Taxes
   - City Taxes
   - Special Assessments

5. **Management Fees** (Green - #10b981)
   - Property Management
   - Leasing Fees

#### Data Structure
```typescript
interface ExpenseCategory {
  name: string;
  amount: number;
  percentage: number;
  trend: number;
  color: string;
  subcategories?: SubExpense[];
}

interface SubExpense {
  name: string;
  amount: number;
  description: string;
}
```

### 3. AnalyticsDashboard
**Location**: `src/pages/AnalyticsDashboard.tsx`

#### Features
- Tab-based navigation between Revenue and Expense analysis
- Export data button (placeholder for CSV/Excel export)
- Feature highlight cards explaining capabilities
- Responsive layout with container spacing

#### Tabs
1. **Revenue Analysis**: InteractiveRevenueChart component
2. **Expense Analysis**: InteractiveExpenseChart component

#### Feature Cards
- **Interactive Charts**: Explains drill-down functionality
- **Trend Analysis**: Describes historical pattern identification
- **Category Breakdown**: Highlights cost-saving opportunities

## User Workflows

### Revenue Analysis Workflow

1. **View Overview**
   - See 12-month revenue trends
   - Review summary statistics
   - Identify trends with visual indicators

2. **Select Chart Type**
   - Click Area/Line/Bar buttons
   - Choose visualization that best fits analysis needs

3. **Drill Down to Month**
   - Click any month in the chart
   - View property-level breakdown
   - Compare property performance

4. **Analyze Property**
   - Click property card
   - See detailed metrics
   - Review profit margins and occupancy

5. **Return to Overview**
   - Click "Back to Overview" button
   - Continue analysis with different month

### Expense Analysis Workflow

1. **View Distribution**
   - See pie chart of expense categories
   - Review category cards with trends
   - Identify largest expense areas

2. **Drill Down to Category**
   - Click category card or pie slice
   - View subcategory breakdown
   - Read detailed descriptions

3. **Review Alerts**
   - Check for high expense warnings
   - Identify cost-saving opportunities
   - Compare to previous periods

4. **View Historical Trends**
   - Click "View Monthly Trends"
   - Analyze 12-month patterns
   - Compare categories over time

5. **Return to Overview**
   - Click "Back to Overview"
   - Explore different categories

## Technical Implementation

### Dependencies
- **recharts**: ^2.x - Chart library for React
- **react-router-dom**: Navigation
- **shadcn/ui**: UI components

### Chart Components Used
- `LineChart`: Trend visualization
- `BarChart`: Comparison visualization
- `AreaChart`: Stacked trend visualization
- `PieChart`: Distribution visualization
- `Tooltip`: Interactive data display
- `Legend`: Chart key
- `CartesianGrid`: Grid lines
- `XAxis/YAxis`: Axis labels

### Responsive Design
- `ResponsiveContainer`: Automatic chart resizing
- Grid layouts for cards
- Mobile-optimized breakpoints

### State Management
- `useState`: Local component state
- View mode tracking (overview/detail/trends)
- Selected data tracking (month/category/property)

## Color Scheme

### Revenue Chart
- Revenue: Green (#10b981)
- Expenses: Red (#ef4444)
- Profit: Blue (#3b82f6)

### Expense Categories
- Maintenance: Red (#ef4444)
- Utilities: Orange (#f59e0b)
- Insurance: Blue (#3b82f6)
- Taxes: Purple (#8b5cf6)
- Management: Green (#10b981)
- Other: Gray (#6b7280)

### Status Indicators
- Positive Trend: Green with TrendingUp icon
- Negative Trend: Red with TrendingDown icon
- High Alert: Orange background

## Accessibility

### Keyboard Navigation
- Tab through interactive elements
- Enter to activate buttons
- Arrow keys for chart navigation (native Recharts support)

### Screen Readers
- Proper ARIA labels on all interactive elements
- Descriptive button text
- Chart data accessible via tooltips

### Visual Indicators
- Color + icon combinations (not color alone)
- High contrast text
- Clear visual hierarchy

## Performance Considerations

### Data Generation
- Mock data generated once on component mount
- Efficient calculation of totals and trends
- Memoization opportunities for large datasets

### Chart Rendering
- ResponsiveContainer prevents unnecessary re-renders
- Efficient Recharts library
- Lazy loading for drill-down views

### State Updates
- Minimal state changes
- Efficient click handlers
- No unnecessary re-renders

## Future Enhancements

### Data Integration
1. **Real-time Data**: Connect to actual backend APIs
2. **Date Range Selector**: Custom date range selection
3. **Comparison Mode**: Compare multiple properties or time periods
4. **Forecasting**: Predictive analytics for future trends

### Export Features
1. **CSV Export**: Download data as spreadsheet
2. **PDF Reports**: Generate formatted reports
3. **Image Export**: Save charts as images
4. **Email Reports**: Schedule automated reports

### Advanced Analytics
1. **Anomaly Detection**: Identify unusual patterns
2. **Benchmarking**: Compare to industry standards
3. **Goal Tracking**: Set and monitor financial goals
4. **What-If Analysis**: Scenario modeling

### Visualization Enhancements
1. **Heatmaps**: Identify patterns across properties
2. **Scatter Plots**: Correlation analysis
3. **Gauge Charts**: KPI visualization
4. **Treemaps**: Hierarchical data display

### User Customization
1. **Saved Views**: Bookmark favorite analyses
2. **Custom Metrics**: User-defined calculations
3. **Dashboard Widgets**: Add charts to main dashboard
4. **Alert Configuration**: Custom threshold alerts

## Best Practices

### For Users
1. **Start with Overview**: Get big picture before drilling down
2. **Use Chart Types**: Switch between visualizations for different insights
3. **Follow Trends**: Look for patterns over time
4. **Investigate Anomalies**: Drill down on unusual data points
5. **Export Data**: Save important findings for reports

### For Developers
1. **Mock Data Realism**: Ensure test data reflects real scenarios
2. **Error Handling**: Handle missing or invalid data gracefully
3. **Loading States**: Show loading indicators for async operations
4. **Responsive Testing**: Test on multiple screen sizes
5. **Performance Monitoring**: Track render times for large datasets

## Integration with Dashboard

### Navigation
- Accessible via `/analytics` route
- Protected route requiring landlord/broker/agent role
- Link from main dashboard navigation

### Context Sharing
- Can integrate with DashboardPreferences for theme
- Can share data with other dashboard components
- Can trigger actions in other parts of the application

### Data Flow
- Currently uses mock data
- Ready for API integration
- Can subscribe to real-time updates