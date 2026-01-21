# Button Design System

## Overview

Buttons are the primary way users take actions in the application. This document defines the standardized button styles, variants, sizes, and usage guidelines for the property management platform.

## Button Variants

### Primary Button

**Use for:** Main actions, primary CTAs, form submissions

```tsx
<Button variant="default">Save Changes</Button>
<Button variant="default">Create Property</Button>
<Button variant="default">Submit Application</Button>
```

**Styling:**
- Background: `bg-primary` (#2563eb)
- Text: `text-primary-foreground` (white)
- Hover: `hover:bg-primary/90`
- Focus: 2px ring with primary color

**When to use:**
- Form submit buttons
- Primary actions in modals
- Main CTA on pages
- Confirmation actions

### Secondary Button

**Use for:** Secondary actions, alternative options

```tsx
<Button variant="secondary">Cancel</Button>
<Button variant="secondary">Back</Button>
<Button variant="secondary">View Details</Button>
```

**Styling:**
- Background: `bg-secondary` (#f3f4f6)
- Text: `text-secondary-foreground` (#374151)
- Hover: `hover:bg-secondary/80`

**When to use:**
- Cancel buttons in forms
- Alternative actions
- Non-primary CTAs

### Destructive Button

**Use for:** Dangerous or irreversible actions

```tsx
<Button variant="destructive">Delete Property</Button>
<Button variant="destructive">Remove Tenant</Button>
<Button variant="destructive">Terminate Lease</Button>
```

**Styling:**
- Background: `bg-destructive` (#dc2626)
- Text: `text-destructive-foreground` (white)
- Hover: `hover:bg-destructive/90`

**When to use:**
- Delete actions
- Remove actions
- Terminate actions
- Any irreversible action

**Best practices:**
- Always confirm before executing
- Use clear, explicit labels
- Consider adding a confirmation modal

### Ghost Button

**Use for:** Tertiary actions, subtle interactions

```tsx
<Button variant="ghost">Edit</Button>
<Button variant="ghost">More Options</Button>
<Button variant="ghost">Close</Button>
```

**Styling:**
- Background: Transparent
- Text: Current text color
- Hover: `hover:bg-accent hover:text-accent-foreground`

**When to use:**
- Edit buttons in tables
- Close buttons in modals
- Menu items
- Subtle actions

### Outline Button

**Use for:** Alternative actions with more emphasis than ghost

```tsx
<Button variant="outline">Export</Button>
<Button variant="outline">Filter</Button>
<Button variant="outline">Settings</Button>
```

**Styling:**
- Background: `bg-background`
- Border: `border border-input`
- Text: Current text color
- Hover: `hover:bg-accent hover:text-accent-foreground`

**When to use:**
- Export actions
- Filter buttons
- Settings buttons
- Alternative primary actions

### Link Button

**Use for:** Navigation actions

```tsx
<Button variant="link">Learn More</Button>
<Button variant="link">View Documentation</Button>
```

**Styling:**
- Background: Transparent
- Text: `text-primary underline-offset-4 hover:underline`
- No border

**When to use:**
- Navigation links
- Learn more links
- Documentation links
- Inline actions

## Button Sizes

### Default (h-10)

**Use for:** Most buttons

```tsx
<Button size="default">Default Button</Button>
```

**Dimensions:**
- Height: 40px (h-10)
- Padding: 16px horizontal (px-4)
- Font size: 14px (text-sm)

### Small (h-9)

**Use for:** Compact spaces, tables, cards

```tsx
<Button size="sm">Small Button</Button>
```

**Dimensions:**
- Height: 36px (h-9)
- Padding: 12px horizontal (px-3)
- Font size: 14px (text-sm)

### Large (h-11)

**Use for:** Prominent CTAs, hero sections

```tsx
<Button size="lg">Large Button</Button>
```

**Dimensions:**
- Height: 44px (h-11)
- Padding: 32px horizontal (px-8)
- Font size: 14px (text-sm)

### Icon (h-10 w-10)

**Use for:** Icon-only buttons

```tsx
<Button size="icon" aria-label="Close">
  <X className="h-4 w-4" />
</Button>
```

**Dimensions:**
- Height: 40px (h-10)
- Width: 40px (w-10)
- Padding: 0

**Accessibility:**
- Always include `aria-label`
- Consider adding a tooltip

## Button States

### Default State

Normal appearance, ready for interaction.

### Hover State

Triggered when user hovers over button.

**Behavior:**
- Background slightly darker/lighter
- Smooth transition (200ms)
- Cursor changes to pointer

### Active/Pressed State

Triggered when button is clicked.

**Behavior:**
- Background even darker
- Slightly scaled down (scale: 0.98)
- Immediate feedback

### Disabled State

Button cannot be interacted with.

```tsx
<Button disabled>Disabled Button</Button>
```

**Styling:**
- Opacity: 0.5
- Cursor: not-allowed
- No hover effects
- `aria-disabled="true"`

**When to use:**
- Form validation fails
- Required fields empty
- Action not available
- Processing in progress

### Loading State

Button is processing an action.

```tsx
<Button loading>Loading...</Button>
```

**Styling:**
- Show spinner icon
- Disable interaction
- Keep button width stable
- Optional: Change text to "Loading..."

**Implementation:**
```tsx
<Button disabled={isLoading}>
  {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
  {isLoading ? 'Saving...' : 'Save Changes'}
</Button>
```

## Button Patterns

### Button with Icon (Left)

```tsx
<Button>
  <Plus className="mr-2 h-4 w-4" />
  Add Property
</Button>
```

### Button with Icon (Right)

```tsx
<Button>
  Export
  <Download className="ml-2 h-4 w-4" />
</Button>
```

### Icon-Only Button

```tsx
<Button size="icon" variant="ghost" aria-label="Edit">
  <Edit className="h-4 w-4" />
</Button>
```

### Full-Width Button

```tsx
<Button className="w-full">Sign In</Button>
```

### Button Group

```tsx
<div className="flex gap-2">
  <Button variant="outline">Previous</Button>
  <Button variant="outline">Next</Button>
</div>
```

### Split Button

```tsx
<div className="flex">
  <Button className="rounded-r-none">Save</Button>
  <Button variant="outline" size="icon" className="rounded-l-none border-l-0">
    <ChevronDown className="h-4 w-4" />
  </Button>
</div>
```

## Usage Guidelines

### Button Hierarchy

**Primary actions (1 per screen):**
- Use `variant="default"`
- Most prominent button
- Main user goal

**Secondary actions (2-3 per screen):**
- Use `variant="secondary"` or `variant="outline"`
- Supporting actions
- Alternative paths

**Tertiary actions (unlimited):**
- Use `variant="ghost"` or `variant="link"`
- Subtle actions
- Less important options

### Button Placement

**Forms:**
- Primary button on the right
- Cancel button on the left
- Consistent order across forms

**Modals:**
- Primary button on the right
- Cancel button on the left
- Close icon in top-right corner

**Tables:**
- Action buttons in last column
- Use icon buttons for space
- Group related actions

**Cards:**
- Primary action at bottom
- Secondary actions in header
- Icon buttons for quick actions

### Button Labels

**Do:**
- Use action verbs (Save, Delete, Create)
- Be specific (Delete Property, not Delete)
- Keep it short (1-3 words)
- Use sentence case (Save changes)

**Don't:**
- Use generic labels (OK, Submit)
- Be vague (Continue, Next)
- Use all caps (SAVE CHANGES)
- Use punctuation (Save!)

### Accessibility

**Required:**
- Sufficient color contrast (4.5:1)
- Visible focus indicator
- Keyboard accessible (Tab, Enter, Space)
- Screen reader friendly

**Best practices:**
- Use semantic `<button>` element
- Add `aria-label` for icon buttons
- Use `aria-disabled` for disabled state
- Announce loading state to screen readers

## Code Examples

### Basic Button

```tsx
import { Button } from '@/components/ui/button';

export function Example() {
  return <Button>Click Me</Button>;
}
```

### Button with Loading State

```tsx
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';

export function Example() {
  const [isLoading, setIsLoading] = useState(false);

  const handleClick = async () => {
    setIsLoading(true);
    await someAsyncOperation();
    setIsLoading(false);
  };

  return (
    <Button onClick={handleClick} disabled={isLoading}>
      {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
      {isLoading ? 'Saving...' : 'Save Changes'}
    </Button>
  );
}
```

### Button Group

```tsx
import { Button } from '@/components/ui/button';

export function Example() {
  return (
    <div className="flex gap-2">
      <Button variant="outline">Cancel</Button>
      <Button>Save</Button>
    </div>
  );
}
```

### Destructive Button with Confirmation

```tsx
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

export function Example() {
  const handleDelete = () => {
    // Delete logic
  };

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="destructive">Delete Property</Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Are you sure?</AlertDialogTitle>
          <AlertDialogDescription>
            This action cannot be undone. This will permanently delete the property.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
```

## Common Mistakes

### ❌ Don't

```tsx
// Too many primary buttons
<Button>Save</Button>
<Button>Cancel</Button>
<Button>Delete</Button>

// Unclear labels
<Button>OK</Button>
<Button>Submit</Button>

// No loading state
<Button onClick={async () => await save()}>Save</Button>

// Icon button without label
<Button size="icon">
  <X />
</Button>
```

### ✅ Do

```tsx
// Clear hierarchy
<Button variant="outline">Cancel</Button>
<Button>Save Changes</Button>

// Specific labels
<Button>Save Property</Button>
<Button variant="secondary">Cancel</Button>

// With loading state
<Button disabled={isLoading}>
  {isLoading ? 'Saving...' : 'Save Changes'}
</Button>

// Icon button with label
<Button size="icon" aria-label="Close">
  <X />
</Button>
```

## Related Components

- [Forms](./forms.md) - Form input components
- [Loading States](./loading.md) - Loading indicators
- [Dialogs](./components.md#dialogs) - Modal dialogs

---

**Last Updated:** 2026-01-05  
**Version:** 1.0