# Design System Documentation

## Overview

This design system provides a comprehensive set of guidelines, components, and patterns for building consistent user interfaces in the property management platform.

## Purpose

- **Consistency:** Ensure a unified look and feel across the application
- **Efficiency:** Speed up development with reusable components
- **Accessibility:** Meet WCAG AA standards for all users
- **Maintainability:** Make updates easier with centralized documentation

## Contents

### Core Guidelines

1. **[Buttons](./buttons.md)** - Button variants, sizes, states, and usage guidelines
2. **[Loading States](./loading.md)** - Loading indicators, skeleton loaders, and best practices
3. **[Empty States](./empty-states.md)** - Empty state components and content guidelines

### Foundation

- **Colors** - Color palette and usage
- **Typography** - Font styles and hierarchy
- **Spacing** - Spacing system and layout
- **Icons** - Icon library and guidelines

### Components

- **Forms** - Input fields, labels, validation
- **Cards** - Card layouts and patterns
- **Tables** - Data tables and lists
- **Modals** - Dialogs and overlays
- **Navigation** - Menus and navigation patterns

## Quick Start

### Using Buttons

```tsx
import { Button } from '@/components/ui/button';

// Primary action
<Button>Save Changes</Button>

// Secondary action
<Button variant="secondary">Cancel</Button>

// Destructive action
<Button variant="destructive">Delete</Button>

// With loading state
<Button loading={isLoading}>
  {isLoading ? 'Saving...' : 'Save'}
</Button>
```

### Using Loading States

```tsx
import { Skeleton } from '@/components/ui/skeleton';
import { SkeletonCard } from '@/components/loading/SkeletonCard';

// Show skeleton while loading
{isLoading ? <SkeletonCard /> : <PropertyCard data={data} />}

// Button loading
<Button loading={isSubmitting}>Submit</Button>

// Progress bar
<Progress value={uploadProgress} />
```

### Using Empty States

```tsx
import { NoProperties } from '@/components/empty-states';

// Show when no data
{properties.length === 0 && <NoProperties />}

// Custom empty state
<EmptyState
  icon={Building}
  heading="No properties"
  message="Add your first property to get started."
  action={{
    label: "Add Property",
    onClick: handleAdd
  }}
/>
```

## Design Principles

### 1. Consistency

- Use standardized components
- Follow established patterns
- Maintain visual hierarchy
- Keep spacing uniform

### 2. Clarity

- Use clear, descriptive labels
- Provide helpful feedback
- Show system status
- Guide user actions

### 3. Efficiency

- Minimize user effort
- Provide shortcuts
- Reduce cognitive load
- Optimize workflows

### 4. Accessibility

- Meet WCAG AA standards
- Support keyboard navigation
- Provide screen reader support
- Ensure color contrast

### 5. Responsiveness

- Mobile-first approach
- Flexible layouts
- Touch-friendly targets
- Adaptive content

## Component Library

### Buttons

**Variants:**
- Primary (`default`) - Main actions
- Secondary - Alternative actions
- Destructive - Dangerous actions
- Ghost - Subtle actions
- Outline - Alternative emphasis
- Link - Navigation actions

**Sizes:**
- Default (40px) - Standard buttons
- Small (36px) - Compact spaces
- Large (44px) - Prominent CTAs
- Icon (40x40px) - Icon-only buttons

**States:**
- Default - Ready for interaction
- Hover - Mouse over
- Active - Being clicked
- Disabled - Not available
- Loading - Processing

### Loading Indicators

**Types:**
- Spinner - Quick operations
- Skeleton - Content placeholders
- Progress - File uploads
- Overlay - Full-page loading

**Components:**
- `LoadingSpinner` - Basic spinner
- `SkeletonCard` - Card placeholder
- `SkeletonTable` - Table placeholder
- `SkeletonList` - List placeholder
- `Progress` - Progress bar
- `LoadingOverlay` - Full-page overlay

### Empty States

**Components:**
- `NoProperties` - Empty property list
- `NoTenants` - Empty tenant list
- `NoLeases` - Empty lease list
- `NoPayments` - Empty payment history
- `NoMaintenanceRequests` - Empty maintenance list
- `NoMessages` - Empty message inbox
- `NoNotifications` - Empty notifications
- `NoSearchResults` - No search results
- `NoDocuments` - Empty document list
- `NoApplications` - Empty application list

## Usage Examples

### Form with Loading State

```tsx
function PropertyForm() {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (data) => {
    setIsSubmitting(true);
    await saveProperty(data);
    setIsSubmitting(false);
  };

  return (
    <form onSubmit={handleSubmit}>
      <Input label="Property Name" disabled={isSubmitting} />
      <Input label="Address" disabled={isSubmitting} />
      
      <div className="flex gap-2">
        <Button 
          type="button" 
          variant="secondary"
          disabled={isSubmitting}
        >
          Cancel
        </Button>
        <Button 
          type="submit" 
          loading={isSubmitting}
        >
          {isSubmitting ? 'Saving...' : 'Save Property'}
        </Button>
      </div>
    </form>
  );
}
```

### List with Loading and Empty States

```tsx
function PropertyList() {
  const { data: properties, isLoading } = useQuery('properties');

  if (isLoading) {
    return (
      <div className="grid grid-cols-3 gap-4">
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard />
      </div>
    );
  }

  if (properties.length === 0) {
    return <NoProperties />;
  }

  return (
    <div className="grid grid-cols-3 gap-4">
      {properties.map(property => (
        <PropertyCard key={property.id} data={property} />
      ))}
    </div>
  );
}
```

### File Upload with Progress

```tsx
function FileUpload() {
  const [progress, setProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);

  const handleUpload = async (file) => {
    setIsUploading(true);
    
    await uploadFile(file, {
      onProgress: (percent) => setProgress(percent)
    });
    
    setIsUploading(false);
  };

  return (
    <div>
      <input type="file" onChange={(e) => handleUpload(e.target.files[0])} />
      
      {isUploading && (
        <div className="space-y-2">
          <Progress value={progress} />
          <p className="text-sm text-muted-foreground">
            Uploading... {progress}%
          </p>
        </div>
      )}
    </div>
  );
}
```

## Best Practices

### Do's ✅

- Use semantic HTML elements
- Provide clear, descriptive labels
- Show loading states for async operations
- Display helpful empty states
- Maintain consistent spacing
- Follow accessibility guidelines
- Use appropriate button variants
- Provide visual feedback
- Keep user informed of system status

### Don'ts ❌

- Don't use generic labels (OK, Submit)
- Don't hide loading states
- Don't leave empty lists without explanation
- Don't use too many primary buttons
- Don't skip accessibility features
- Don't create layout shifts
- Don't block UI unnecessarily
- Don't forget error states

## Accessibility

All components meet WCAG AA standards:

- ✅ Sufficient color contrast (4.5:1)
- ✅ Keyboard navigation support
- ✅ Screen reader compatibility
- ✅ Focus indicators visible
- ✅ ARIA labels provided
- ✅ Loading states announced
- ✅ Error messages accessible

## Browser Support

- Chrome (latest 2 versions)
- Firefox (latest 2 versions)
- Safari (latest 2 versions)
- Edge (latest 2 versions)

## Contributing

When adding new components:

1. Follow existing patterns
2. Document usage and examples
3. Ensure accessibility
4. Test across browsers
5. Update this documentation

## Resources

- [Buttons Documentation](./buttons.md)
- [Loading States Documentation](./loading.md)
- [Empty States Documentation](./empty-states.md)
- [WCAG Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
- [Radix UI Documentation](https://www.radix-ui.com/)
- [Tailwind CSS Documentation](https://tailwindcss.com/)

## Version History

- **v1.0** (2026-01-05) - Initial design system documentation
  - Button standardization
  - Loading states implementation
  - Empty states creation

---

**Last Updated:** 2026-01-05  
**Maintained by:** Engineering Team