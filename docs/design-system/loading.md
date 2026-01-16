# Loading States Design System

## Overview

Loading states provide visual feedback to users during asynchronous operations. This document defines the standardized loading indicators, skeleton loaders, and best practices for the property management platform.

## Loading Indicator Types

### 1. Spinner

**Use for:** Button loading, inline loading, small components

```tsx
import { Loader2 } from 'lucide-react';

<Loader2 className="h-4 w-4 animate-spin" />
```

**Sizes:**
- Small: `h-4 w-4` (16px) - Buttons, inline text
- Medium: `h-6 w-6` (24px) - Cards, modals
- Large: `h-8 w-8` (32px) - Full sections

**Colors:**
- Primary: `text-primary`
- Muted: `text-muted-foreground`
- White: `text-white` (on dark backgrounds)

**When to use:**
- Button loading states
- Inline loading indicators
- Small component loading
- Quick operations (< 2 seconds)

### 2. Skeleton Loader

**Use for:** Content placeholders, data loading

```tsx
import { Skeleton } from '@/components/ui/skeleton';

<Skeleton className="h-4 w-full" />
```

**Characteristics:**
- Mimics actual content layout
- Animated shimmer effect
- Gray background (#e5e7eb)
- Rounded corners

**When to use:**
- Loading lists of data
- Loading cards
- Loading tables
- Loading forms
- Operations > 2 seconds

### 3. Progress Bar

**Use for:** File uploads, multi-step processes

```tsx
import { Progress } from '@/components/ui/progress';

<Progress value={progress} />
```

**Characteristics:**
- Shows percentage completion
- Animated fill
- Height: 8px
- Primary color fill

**When to use:**
- File uploads
- Document processing
- Multi-step wizards
- Long-running operations

### 4. Loading Overlay

**Use for:** Full-page loading, blocking operations

```tsx
import { LoadingOverlay } from '@/components/loading/LoadingOverlay';

<LoadingOverlay message="Loading properties..." />
```

**Characteristics:**
- Semi-transparent backdrop
- Centered spinner
- Optional message
- Blocks interaction

**When to use:**
- Initial page load
- Critical data fetching
- Blocking operations
- Full-page transitions

## Skeleton Loader Components

### SkeletonCard

**Use for:** Card placeholders

```tsx
import { SkeletonCard } from '@/components/loading/SkeletonCard';

<SkeletonCard />
```

**Layout:**
- Image placeholder (16:9 aspect ratio)
- Title line (60% width)
- Description lines (2-3 lines)
- Footer with button placeholders

### SkeletonTable

**Use for:** Table placeholders

```tsx
import { SkeletonTable } from '@/components/loading/SkeletonTable';

<SkeletonTable rows={5} columns={4} />
```

**Layout:**
- Header row with column titles
- Data rows with varying widths
- Action column with button placeholders

### SkeletonList

**Use for:** List placeholders

```tsx
import { SkeletonList } from '@/components/loading/SkeletonList';

<SkeletonList items={5} />
```

**Layout:**
- Avatar placeholder (circle)
- Title line
- Subtitle line
- Metadata line

### SkeletonForm

**Use for:** Form placeholders

```tsx
import { SkeletonForm } from '@/components/loading/SkeletonForm';

<SkeletonForm fields={5} />
```

**Layout:**
- Label placeholder
- Input placeholder
- Multiple field groups
- Button placeholder at bottom

## Loading State Patterns

### Button Loading

**Pattern:** Show spinner inside button, disable interaction

```tsx
const [isLoading, setIsLoading] = useState(false);

<Button disabled={isLoading}>
  {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
  {isLoading ? 'Saving...' : 'Save Changes'}
</Button>
```

**Best practices:**
- Keep button width stable
- Show spinner on the left
- Change text to indicate action
- Disable button during loading

### Data Fetching Loading

**Pattern:** Show skeleton loader while fetching

```tsx
const { data, isLoading } = useQuery('properties', fetchProperties);

if (isLoading) {
  return <SkeletonCard />;
}

return <PropertyCard data={data} />;
```

**Best practices:**
- Match skeleton to actual content
- Show multiple skeletons for lists
- Maintain layout stability
- Avoid layout shift

### Form Submission Loading

**Pattern:** Disable form, show loading on submit button

```tsx
const [isSubmitting, setIsSubmitting] = useState(false);

const handleSubmit = async (data) => {
  setIsSubmitting(true);
  await submitForm(data);
  setIsSubmitting(false);
};

<form onSubmit={handleSubmit}>
  <Input disabled={isSubmitting} />
  <Button type="submit" disabled={isSubmitting}>
    {isSubmitting ? 'Submitting...' : 'Submit'}
  </Button>
</form>
```

**Best practices:**
- Disable all form inputs
- Show loading on submit button
- Prevent double submission
- Show success/error after completion

### File Upload Loading

**Pattern:** Show progress bar with percentage

```tsx
const [uploadProgress, setUploadProgress] = useState(0);

<div>
  <Progress value={uploadProgress} />
  <p className="text-sm text-muted-foreground mt-2">
    Uploading... {uploadProgress}%
  </p>
</div>
```

**Best practices:**
- Show accurate progress
- Display file name
- Allow cancellation
- Show success message

### Page Transition Loading

**Pattern:** Show loading overlay during navigation

```tsx
const [isNavigating, setIsNavigating] = useState(false);

useEffect(() => {
  const handleStart = () => setIsNavigating(true);
  const handleComplete = () => setIsNavigating(false);
  
  router.events.on('routeChangeStart', handleStart);
  router.events.on('routeChangeComplete', handleComplete);
  
  return () => {
    router.events.off('routeChangeStart', handleStart);
    router.events.off('routeChangeComplete', handleComplete);
  };
}, []);

{isNavigating && <LoadingOverlay />}
```

### Infinite Scroll Loading

**Pattern:** Show spinner at bottom of list

```tsx
<div>
  {items.map(item => <ItemCard key={item.id} data={item} />)}
  {hasMore && (
    <div className="flex justify-center py-4">
      <Loader2 className="h-6 w-6 animate-spin" />
    </div>
  )}
</div>
```

## Loading State Locations

### Data Fetching
- ✅ Property lists
- ✅ Tenant lists
- ✅ Lease lists
- ✅ Payment history
- ✅ Maintenance requests
- ✅ Messages
- ✅ Notifications
- ✅ Reports
- ✅ Dashboard widgets

### Form Submissions
- ✅ Login/Register
- ✅ Create property
- ✅ Submit application
- ✅ Make payment
- ✅ Create maintenance request
- ✅ Send message
- ✅ Update profile
- ✅ Upload documents

### File Operations
- ✅ Document upload
- ✅ Photo upload
- ✅ Export data
- ✅ Generate reports
- ✅ Download files

### Page Transitions
- ✅ Route changes
- ✅ Modal opening
- ✅ Tab switching
- ✅ Accordion expansion

## Best Practices

### Performance

**Do:**
- Use skeleton loaders for perceived performance
- Show loading immediately (< 100ms)
- Keep animations smooth (60fps)
- Optimize skeleton complexity

**Don't:**
- Show loading for instant operations (< 200ms)
- Use heavy animations
- Block UI unnecessarily
- Show multiple loading indicators

### User Experience

**Do:**
- Provide visual feedback
- Indicate progress when possible
- Allow cancellation for long operations
- Show meaningful loading messages

**Don't:**
- Leave users guessing
- Show generic "Loading..." forever
- Block entire UI for partial updates
- Hide loading state too quickly (< 300ms)

### Accessibility

**Do:**
- Use `aria-busy="true"` on loading elements
- Announce loading state to screen readers
- Maintain keyboard focus
- Provide skip option for long loads

**Don't:**
- Trap focus in loading state
- Remove important content
- Make loading state inaccessible
- Forget loading announcements

### Visual Design

**Do:**
- Match skeleton to content layout
- Use consistent loading indicators
- Maintain spacing and alignment
- Show realistic content shapes

**Don't:**
- Use jarring animations
- Create layout shift
- Show mismatched skeletons
- Use too many different loaders

## Code Examples

### Basic Spinner

```tsx
import { Loader2 } from 'lucide-react';

export function LoadingSpinner() {
  return (
    <div className="flex items-center justify-center p-4">
      <Loader2 className="h-6 w-6 animate-spin text-primary" />
    </div>
  );
}
```

### Skeleton Card

```tsx
import { Skeleton } from '@/components/ui/skeleton';

export function SkeletonCard() {
  return (
    <div className="space-y-3">
      <Skeleton className="h-48 w-full" />
      <Skeleton className="h-4 w-3/4" />
      <Skeleton className="h-4 w-1/2" />
    </div>
  );
}
```

### Loading Button

```tsx
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';

export function LoadingButton() {
  const [isLoading, setIsLoading] = useState(false);

  const handleClick = async () => {
    setIsLoading(true);
    await performAction();
    setIsLoading(false);
  };

  return (
    <Button onClick={handleClick} disabled={isLoading}>
      {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
      {isLoading ? 'Processing...' : 'Submit'}
    </Button>
  );
}
```

### Progress Upload

```tsx
import { useState } from 'react';
import { Progress } from '@/components/ui/progress';

export function FileUpload() {
  const [progress, setProgress] = useState(0);

  const handleUpload = async (file: File) => {
    // Upload with progress tracking
    const formData = new FormData();
    formData.append('file', file);

    await axios.post('/upload', formData, {
      onUploadProgress: (progressEvent) => {
        const percent = Math.round(
          (progressEvent.loaded * 100) / progressEvent.total
        );
        setProgress(percent);
      },
    });
  };

  return (
    <div className="space-y-2">
      <Progress value={progress} />
      <p className="text-sm text-muted-foreground">
        Uploading... {progress}%
      </p>
    </div>
  );
}
```

### Loading Overlay

```tsx
import { Loader2 } from 'lucide-react';

export function LoadingOverlay({ message = 'Loading...' }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
      <div className="flex flex-col items-center gap-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">{message}</p>
      </div>
    </div>
  );
}
```

### Skeleton Table

```tsx
import { Skeleton } from '@/components/ui/skeleton';

export function SkeletonTable({ rows = 5, columns = 4 }) {
  return (
    <div className="space-y-2">
      {/* Header */}
      <div className="flex gap-4">
        {Array.from({ length: columns }).map((_, i) => (
          <Skeleton key={i} className="h-8 flex-1" />
        ))}
      </div>
      {/* Rows */}
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex gap-4">
          {Array.from({ length: columns }).map((_, j) => (
            <Skeleton key={j} className="h-12 flex-1" />
          ))}
        </div>
      ))}
    </div>
  );
}
```

## Common Mistakes

### ❌ Don't

```tsx
// No loading state
<Button onClick={async () => await save()}>Save</Button>

// Layout shift
{isLoading ? <Spinner /> : <Content />}

// Generic message
<LoadingOverlay message="Loading..." />

// Too fast
{isLoading && <Spinner />} // Flashes if < 200ms
```

### ✅ Do

```tsx
// With loading state
<Button disabled={isLoading}>
  {isLoading ? 'Saving...' : 'Save'}
</Button>

// Maintain layout
{isLoading ? <SkeletonCard /> : <PropertyCard />}

// Specific message
<LoadingOverlay message="Loading properties..." />

// Minimum display time
{showLoading && <Spinner />} // Show for at least 300ms
```

## Related Components

- [Buttons](./buttons.md) - Button loading states
- [Forms](./forms.md) - Form loading states
- [Empty States](./empty-states.md) - After loading completes

---

**Last Updated:** 2026-01-05  
**Version:** 1.0