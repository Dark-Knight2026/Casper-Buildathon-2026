# Dashboard Templates

**Version:** 1.0.0  
**Date:** December 9, 2024  
**Author:** Alex (Frontend Engineer)

---

## Overview

Dashboard Templates provide flexible layout options for displaying dashboard content. Users can switch between 5 different templates based on their preferences and use cases. Template preferences are saved to localStorage and persist across sessions.

---

## Available Templates

### 1. Grid Template

**Best For:** Overview dashboards with metrics and charts

**Features:**
- Card-based grid layout
- Responsive columns (1 mobile, 2 tablet, 3-4 desktop)
- Configurable gap spacing
- Grid items can span multiple columns

**Usage:**
```tsx
import { GridTemplate, GridItem } from '@/components/dashboard/templates';

<GridTemplate columns={{ mobile: 1, tablet: 2, desktop: 3 }} gap={4}>
  <Card>Metric 1</Card>
  <Card>Metric 2</Card>
  <Card>Metric 3</Card>
</GridTemplate>

// Grid item spanning multiple columns
<GridTemplate columns={{ mobile: 1, tablet: 2, desktop: 4 }}>
  <GridItem span={{ mobile: 1, tablet: 2, desktop: 2 }}>
    <Card>Wide Card</Card>
  </GridItem>
  <Card>Normal Card</Card>
  <Card>Normal Card</Card>
</GridTemplate>
```

**Props:**
- `columns`: Object with mobile/tablet/desktop column counts (default: { mobile: 1, tablet: 2, desktop: 3 })
- `gap`: Gap spacing in rem units (default: 4)
- `className`: Additional CSS classes

---

### 2. List Template

**Best For:** Data-heavy dashboards with tables and detailed information

**Features:**
- Vertical list layout with full-width sections
- Optional dividers between sections
- Configurable spacing (tight, normal, loose)
- Section headers with title, description, and action buttons

**Usage:**
```tsx
import { ListTemplate, ListSection } from '@/components/dashboard/templates';

<ListTemplate spacing="normal" showDividers>
  <ListSection 
    title="Key Metrics" 
    description="Overview of performance"
    action={<Button>View All</Button>}
  >
    <MetricsGrid />
  </ListSection>
  
  <ListSection title="Recent Activity">
    <ActivityFeed />
  </ListSection>
  
  <ListSection title="Quick Actions">
    <ActionButtons />
  </ListSection>
</ListTemplate>
```

**Props:**
- `spacing`: 'tight' | 'normal' | 'loose' (default: 'normal')
- `showDividers`: Show separators between sections (default: true)
- `className`: Additional CSS classes

**ListSection Props:**
- `title`: Section title (optional)
- `description`: Section description (optional)
- `action`: Action button or element (optional)
- `className`: Additional CSS classes

---

### 3. Kanban Template

**Best For:** Workflow dashboards with pipeline management

**Features:**
- Column-based layout (3-4 columns on desktop)
- Horizontal scroll on mobile
- Vertical scrolling within columns
- Column headers with counts
- Drag-and-drop support (optional)

**Usage:**
```tsx
import { KanbanTemplate, KanbanColumn, KanbanCard } from '@/components/dashboard/templates';

<KanbanTemplate columns={4}>
  <KanbanColumn title="Leads" count={12} color="bg-blue-100">
    <KanbanCard draggable>
      <h4>Lead 1</h4>
      <p>Details...</p>
    </KanbanCard>
    <KanbanCard draggable>
      <h4>Lead 2</h4>
      <p>Details...</p>
    </KanbanCard>
  </KanbanColumn>
  
  <KanbanColumn title="Qualified" count={8} color="bg-green-100">
    <KanbanCard draggable>
      <h4>Qualified Lead</h4>
      <p>Details...</p>
    </KanbanCard>
  </KanbanColumn>
  
  <KanbanColumn title="Proposal" count={5} color="bg-yellow-100">
    {/* Cards */}
  </KanbanColumn>
  
  <KanbanColumn title="Closed" count={3} color="bg-purple-100">
    {/* Cards */}
  </KanbanColumn>
</KanbanTemplate>
```

**Props:**
- `columns`: Number of columns (default: 4)
- `className`: Additional CSS classes

**KanbanColumn Props:**
- `title`: Column title (required)
- `count`: Item count badge (optional)
- `color`: Header background color (default: 'bg-muted')
- `className`: Additional CSS classes

**KanbanCard Props:**
- `draggable`: Enable drag-and-drop (default: false)
- `className`: Additional CSS classes

---

### 4. Split Template

**Best For:** Comparison dashboards or master-detail views

**Features:**
- Two-panel layout (sidebar + main content)
- Configurable sidebar width (default: 30%)
- Collapsible sidebar with toggle button
- Vertical stack on mobile
- Smooth transitions

**Usage:**
```tsx
import { SplitTemplate } from '@/components/dashboard/templates';

<SplitTemplate
  sidebar={
    <div>
      <h3>Property List</h3>
      <PropertyList />
    </div>
  }
  sidebarWidth="30%"
  defaultCollapsed={false}
>
  <PropertyDetails />
</SplitTemplate>
```

**Props:**
- `sidebar`: Sidebar content (required)
- `sidebarWidth`: Sidebar width as percentage or px (default: '30%')
- `defaultCollapsed`: Start with sidebar collapsed (default: false)
- `className`: Additional CSS classes

**Behavior:**
- Desktop: Side-by-side panels with toggle button
- Mobile: Vertical stack (sidebar on top)

---

### 5. Compact Template

**Best For:** Power users who want more information on screen

**Features:**
- Dense layout with tighter spacing (gap-2 instead of gap-4)
- Reduced padding on all cards (p-3 instead of p-6)
- Tighter line-height
- More columns on desktop (4 instead of 3)
- Minimal section headers

**Usage:**
```tsx
import { CompactTemplate, CompactGrid, CompactSection } from '@/components/dashboard/templates';

<CompactTemplate>
  <CompactSection title="Metrics">
    <CompactGrid columns={{ mobile: 1, tablet: 3, desktop: 4 }}>
      <Card className="p-3">Metric 1</Card>
      <Card className="p-3">Metric 2</Card>
      <Card className="p-3">Metric 3</Card>
      <Card className="p-3">Metric 4</Card>
    </CompactGrid>
  </CompactSection>
  
  <CompactSection title="Activity">
    <ActivityFeed />
  </CompactSection>
</CompactTemplate>
```

**Props:**
- `className`: Additional CSS classes

**CompactGrid Props:**
- `columns`: Object with mobile/tablet/desktop column counts (default: { mobile: 1, tablet: 3, desktop: 4 })
- `className`: Additional CSS classes

**CompactSection Props:**
- `title`: Section title (optional)
- `className`: Additional CSS classes

---

## Template Selector

The `TemplateSelector` component allows users to switch between templates with a dropdown menu. Template preferences are automatically saved to localStorage.

**Usage:**
```tsx
import { TemplateSelector } from '@/components/dashboard/TemplateSelector';
import { DashboardTemplate } from '@/types/dashboard';
import { useState } from 'react';

function MyDashboard() {
  const [template, setTemplate] = useState<DashboardTemplate>('grid');

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1>My Dashboard</h1>
        <TemplateSelector
          dashboardId="my-dashboard"
          currentTemplate={template}
          onTemplateChange={setTemplate}
        />
      </div>
      
      {/* Render content based on template */}
      {template === 'grid' && <GridLayout />}
      {template === 'list' && <ListLayout />}
      {/* ... */}
    </div>
  );
}
```

**Props:**
- `dashboardId`: Unique identifier for the dashboard (used for localStorage key)
- `currentTemplate`: Currently active template
- `onTemplateChange`: Callback when template changes
- `className`: Additional CSS classes

**LocalStorage Key:** `dashboard_template_${dashboardId}`

---

## Implementation Examples

### Example 1: Agent Overview Dashboard (Grid Template)

```tsx
import { useState } from 'react';
import { GridTemplate } from '@/components/dashboard/templates';
import { TemplateSelector } from '@/components/dashboard/TemplateSelector';
import { DashboardTemplate } from '@/types/dashboard';

export default function AgentOverview() {
  const [template, setTemplate] = useState<DashboardTemplate>('grid');

  const renderContent = () => {
    switch (template) {
      case 'grid':
        return (
          <>
            <GridTemplate columns={{ mobile: 1, tablet: 2, desktop: 4 }}>
              <MetricCard title="Active Listings" value={24} />
              <MetricCard title="Total Commission" value="$45,000" />
              <MetricCard title="Appointments" value={8} />
              <MetricCard title="Conversion Rate" value="32%" />
            </GridTemplate>
            
            <GridTemplate columns={{ mobile: 1, tablet: 1, desktop: 2 }}>
              <RecentTransactions />
              <TodaysAppointments />
            </GridTemplate>
          </>
        );
      
      case 'list':
        return (
          <ListTemplate>
            <ListSection title="Key Metrics">
              <div className="grid grid-cols-4 gap-4">
                <MetricCard title="Active Listings" value={24} />
                {/* ... */}
              </div>
            </ListSection>
            <ListSection title="Recent Activity">
              <RecentTransactions />
            </ListSection>
          </ListTemplate>
        );
      
      // ... other templates
    }
  };

  return (
    <div>
      <div className="flex justify-between mb-6">
        <h1>Agent Dashboard</h1>
        <TemplateSelector
          dashboardId="agent-overview"
          currentTemplate={template}
          onTemplateChange={setTemplate}
        />
      </div>
      {renderContent()}
    </div>
  );
}
```

### Example 2: Landlord Dashboard (List Template)

```tsx
import { useState } from 'react';
import { ListTemplate, ListSection } from '@/components/dashboard/templates';
import { TemplateSelector } from '@/components/dashboard/TemplateSelector';

export default function LandlordDashboard() {
  const [template, setTemplate] = useState<DashboardTemplate>('list');

  return (
    <div>
      <div className="flex justify-between mb-6">
        <h1>Landlord Dashboard</h1>
        <TemplateSelector
          dashboardId="landlord-overview"
          currentTemplate={template}
          onTemplateChange={setTemplate}
        />
      </div>
      
      {template === 'list' && (
        <ListTemplate spacing="normal" showDividers>
          <ListSection 
            title="Key Metrics" 
            description="Overview of your property portfolio"
          >
            <MetricsGrid />
          </ListSection>
          
          <ListSection 
            title="Action Center" 
            description="Tasks requiring attention"
          >
            <ActionItems />
          </ListSection>
          
          <ListSection 
            title="Recent Activity"
            description="Latest updates"
          >
            <ActivityFeed />
          </ListSection>
        </ListTemplate>
      )}
    </div>
  );
}
```

### Example 3: Pipeline Dashboard (Kanban Template)

```tsx
import { KanbanTemplate, KanbanColumn, KanbanCard } from '@/components/dashboard/templates';

export default function PipelineDashboard() {
  return (
    <KanbanTemplate columns={4}>
      <KanbanColumn title="New Leads" count={15} color="bg-blue-100">
        {leads.map(lead => (
          <KanbanCard key={lead.id} draggable>
            <h4 className="font-semibold">{lead.name}</h4>
            <p className="text-sm text-muted-foreground">{lead.property}</p>
            <div className="flex justify-between mt-2">
              <span className="text-xs">{lead.date}</span>
              <span className="text-xs font-medium">${lead.value}</span>
            </div>
          </KanbanCard>
        ))}
      </KanbanColumn>
      
      <KanbanColumn title="Qualified" count={8} color="bg-green-100">
        {/* Cards */}
      </KanbanColumn>
      
      <KanbanColumn title="Proposal Sent" count={5} color="bg-yellow-100">
        {/* Cards */}
      </KanbanColumn>
      
      <KanbanColumn title="Closed Won" count={3} color="bg-purple-100">
        {/* Cards */}
      </KanbanColumn>
    </KanbanTemplate>
  );
}
```

---

## Mobile Responsiveness

All templates are fully responsive:

### Grid Template
- Mobile: 1 column
- Tablet: 2 columns
- Desktop: 3-4 columns

### List Template
- Mobile: Full-width sections, stacked vertically
- Tablet: Same as mobile
- Desktop: Same as mobile (list is inherently vertical)

### Kanban Template
- Mobile: Horizontal scroll with 280px wide columns
- Tablet: Horizontal scroll
- Desktop: Side-by-side columns with equal width

### Split Template
- Mobile: Vertical stack (sidebar on top, content below)
- Tablet: Vertical stack
- Desktop: Side-by-side panels with toggle button

### Compact Template
- Mobile: 1 column, reduced spacing
- Tablet: 3 columns, reduced spacing
- Desktop: 4 columns, reduced spacing

---

## Best Practices

### 1. Choose the Right Template

- **Grid**: Use for dashboards with multiple metrics/KPIs that need equal visual weight
- **List**: Use for dashboards with sequential information or varying content types
- **Kanban**: Use for workflow/pipeline dashboards with stages
- **Split**: Use for master-detail views or comparison dashboards
- **Compact**: Use for power users or dashboards with lots of data

### 2. Maintain Consistency

- Use the same template across similar dashboards
- Keep template switching optional (don't force users to switch)
- Preserve data and state when switching templates

### 3. Content Adaptation

When switching templates, adapt your content:

```tsx
const renderContent = () => {
  switch (template) {
    case 'grid':
      return <GridTemplate>{/* Grid-optimized content */}</GridTemplate>;
    case 'list':
      return <ListTemplate>{/* List-optimized content */}</ListTemplate>;
    // Adapt content for each template
  }
};
```

### 4. Performance

- Use React.memo for expensive components
- Implement virtualization for long lists in Kanban columns
- Lazy load template components if needed

### 5. Accessibility

- All templates support keyboard navigation
- Screen readers can navigate template content
- Focus management when switching templates
- ARIA labels on interactive elements

---

## Customization

### Custom Colors

```tsx
<KanbanColumn 
  title="Custom" 
  color="bg-gradient-to-r from-purple-500 to-pink-500"
>
  {/* Content */}
</KanbanColumn>
```

### Custom Spacing

```tsx
<GridTemplate gap={6}> {/* Larger gap */}
  {/* Content */}
</GridTemplate>

<ListTemplate spacing="loose"> {/* More spacing */}
  {/* Content */}
</ListTemplate>
```

### Custom Columns

```tsx
<GridTemplate columns={{ mobile: 1, tablet: 3, desktop: 5 }}>
  {/* 5 columns on desktop */}
</GridTemplate>
```

---

## Migration Guide

### Migrating Existing Dashboards

**Step 1:** Add template state
```tsx
const [template, setTemplate] = useState<DashboardTemplate>('grid');
```

**Step 2:** Add TemplateSelector
```tsx
<TemplateSelector
  dashboardId="your-dashboard-id"
  currentTemplate={template}
  onTemplateChange={setTemplate}
/>
```

**Step 3:** Wrap content in template
```tsx
// Before
<div className="grid grid-cols-4 gap-4">
  <Card>Content</Card>
</div>

// After
<GridTemplate columns={{ mobile: 1, tablet: 2, desktop: 4 }}>
  <Card>Content</Card>
</GridTemplate>
```

**Step 4:** Add template switching logic
```tsx
const renderContent = () => {
  switch (template) {
    case 'grid': return <GridLayout />;
    case 'list': return <ListLayout />;
    // ... other templates
  }
};
```

---

## Troubleshooting

### Template Not Saving

**Issue:** Template preference not persisting  
**Solution:** Ensure `dashboardId` is unique and consistent

### Content Overflow

**Issue:** Content overflowing template boundaries  
**Solution:** Add `overflow-hidden` or `overflow-auto` to parent containers

### Mobile Layout Issues

**Issue:** Template not responsive on mobile  
**Solution:** Verify responsive classes and test on actual devices

### Performance Issues

**Issue:** Slow rendering with many items  
**Solution:** Implement virtualization for long lists, use React.memo

---

## Future Enhancements

1. **Custom Templates**: Allow users to create and save custom templates
2. **Template Presets**: Pre-configured templates for specific use cases
3. **Drag-and-Drop**: Full drag-and-drop support in Kanban template
4. **Template Animations**: Smooth transitions when switching templates
5. **Template Sharing**: Share template configurations with team members
6. **Template Analytics**: Track which templates are most popular
7. **AI Recommendations**: Suggest optimal template based on content

---

## Support

For questions or issues:
- Check the examples in this README
- Review the component source code
- Contact the development team

---

**Last Updated:** December 9, 2024  
**Version:** 1.0.0  
**Maintained By:** Alex (Frontend Engineer)