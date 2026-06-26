# Empty States Design System

## Overview

Empty states appear when there's no data to display. They provide context, guidance, and actionable next steps to users. This document defines the standardized empty state components and usage guidelines for the property management platform.

## Design Principles

### 1. Clear Message

**Explain why the list is empty**
- Be specific about what's missing
- Use friendly, conversational tone
- Keep it concise (1-2 sentences)

### 2. Visual Icon

**Use relevant, recognizable icons**
- Size: 48-64px
- Color: Muted gray (#9ca3af)
- Centered above text
- Relevant to the content type

### 3. Actionable CTA

**Provide clear next step**
- Use primary button
- Action verb (Add, Create, Upload)
- Specific to the context
- Make it prominent

### 4. Context-Aware

**Adapt to user's situation**
- Different messages for different roles
- Consider user's permissions
- Provide relevant suggestions
- Show appropriate actions

### 5. Consistent Layout

**Maintain visual consistency**
- Centered vertically and horizontally
- Adequate spacing (padding: 64px)
- Responsive design
- Accessible to all users

## Empty State Components

### NoProperties

**Use for:** Empty property lists

```tsx
import { NoProperties } from '@/components/empty-states/NoProperties';

<NoProperties />
```

**Content:**
- Icon: Building
- Heading: "No properties yet"
- Message: "Get started by adding your first property to the platform."
- Action: "Add Property" button

**Variants:**
- Landlord: Shows "Add Property" button
- Tenant: Shows "Browse Properties" button
- Admin: Shows "Import Properties" option

### NoTenants

**Use for:** Empty tenant lists

```tsx
import { NoTenants } from '@/components/empty-states/NoTenants';

<NoTenants />
```

**Content:**
- Icon: Users
- Heading: "No tenants yet"
- Message: "Invite tenants to your properties or wait for applications."
- Action: "Invite Tenant" button

### NoLeases

**Use for:** Empty lease lists

```tsx
import { NoLeases } from '@/components/empty-states/NoLeases';

<NoLeases />
```

**Content:**
- Icon: FileText
- Heading: "No leases yet"
- Message: "Create your first lease agreement to get started."
- Action: "Create Lease" button

**Variants:**
- Landlord: Shows "Create Lease" button
- Tenant: Shows "View Available Properties" button

### NoPayments

**Use for:** Empty payment history

```tsx
import { NoPayments } from '@/components/empty-states/NoPayments';

<NoPayments />
```

**Content:**
- Icon: CreditCard
- Heading: "No payments yet"
- Message: "Your payment history will appear here once you make your first payment."
- Action: "Make Payment" button (tenant only)

### NoMaintenanceRequests

**Use for:** Empty maintenance request lists

```tsx
import { NoMaintenanceRequests } from '@/components/empty-states/NoMaintenanceRequests';

<NoMaintenanceRequests />
```

**Content:**
- Icon: Wrench
- Heading: "No maintenance requests"
- Message: "Submit a maintenance request if you need repairs or assistance."
- Action: "Create Request" button

**Variants:**
- Tenant: Shows "Create Request" button
- Landlord: Shows "All caught up!" message

### NoMessages

**Use for:** Empty message inbox

```tsx
import { NoMessages } from '@/components/empty-states/NoMessages';

<NoMessages />
```

**Content:**
- Icon: Mail
- Heading: "No messages yet"
- Message: "Start a conversation with your landlord or tenants."
- Action: "New Message" button

### NoNotifications

**Use for:** Empty notification list

```tsx
import { NoNotifications } from '@/components/empty-states/NoNotifications';

<NoNotifications />
```

**Content:**
- Icon: Bell
- Heading: "No notifications"
- Message: "You're all caught up! Notifications will appear here."
- Action: None (passive state)

### NoSearchResults

**Use for:** Empty search results

```tsx
import { NoSearchResults } from '@/components/empty-states/NoSearchResults';

<NoSearchResults query={searchQuery} />
```

**Content:**
- Icon: Search
- Heading: "No results found"
- Message: "Try adjusting your search or filters to find what you're looking for."
- Action: "Clear Filters" button

**Variants:**
- With search query: "No results for '{query}'"
- With filters: Shows "Clear Filters" button
- No filters: Shows search suggestions

### NoDocuments

**Use for:** Empty document lists

```tsx
import { NoDocuments } from '@/components/empty-states/NoDocuments';

<NoDocuments />
```

**Content:**
- Icon: File
- Heading: "No documents uploaded"
- Message: "Upload documents like leases, receipts, or inspection reports."
- Action: "Upload Document" button

### NoApplications

**Use for:** Empty application lists

```tsx
import { NoApplications } from '@/components/empty-states/NoApplications';

<NoApplications />
```

**Content:**
- Icon: ClipboardList
- Heading: "No applications yet"
- Message: "Applications from prospective tenants will appear here."
- Action: "Share Property Link" button

## Layout Structure

### Standard Layout

```tsx
<div className="flex flex-col items-center justify-center p-16 text-center">
  {/* Icon */}
  <div className="mb-4">
    <Icon className="h-16 w-16 text-muted-foreground" />
  </div>
  
  {/* Heading */}
  <h3 className="text-xl font-semibold mb-2">
    {heading}
  </h3>
  
  {/* Message */}
  <p className="text-muted-foreground mb-6 max-w-md">
    {message}
  </p>
  
  {/* Action */}
  {action && (
    <Button onClick={action.onClick}>
      {action.icon && <action.icon className="mr-2 h-4 w-4" />}
      {action.label}
    </Button>
  )}
</div>
```

### Compact Layout

For smaller containers (cards, modals):

```tsx
<div className="flex flex-col items-center justify-center p-8 text-center">
  <Icon className="h-12 w-12 text-muted-foreground mb-3" />
  <p className="text-sm text-muted-foreground mb-4">
    {message}
  </p>
  {action && (
    <Button size="sm" onClick={action.onClick}>
      {action.label}
    </Button>
  )}
</div>
```

## Usage Guidelines

### When to Show Empty States

**Show empty state when:**
- List has no items
- Search returns no results
- Filters exclude all items
- User has no data yet
- Data failed to load (with error message)

**Don't show empty state when:**
- Data is loading (show skeleton instead)
- Temporary error (show error message)
- User lacks permissions (show permission message)

### Message Tone

**Do:**
- Use friendly, helpful language
- Be specific about the situation
- Provide clear guidance
- Stay positive and encouraging

**Don't:**
- Use technical jargon
- Be vague or generic
- Sound negative or discouraging
- Blame the user

### Action Buttons

**Do:**
- Use action verbs (Add, Create, Upload)
- Be specific (Add Property, not Add)
- Make it prominent (primary button)
- Provide clear next step

**Don't:**
- Use generic labels (OK, Continue)
- Show multiple primary actions
- Make action unclear
- Hide the action

### Role-Based Variations

**Landlord:**
- Can create/add content
- Show creation actions
- Emphasize management tasks

**Tenant:**
- Limited creation permissions
- Show browsing actions
- Emphasize viewing/requesting

**Admin:**
- Full permissions
- Show import/bulk actions
- Emphasize system management

## Code Examples

### Basic Empty State

```tsx
import { Building } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function NoProperties() {
  return (
    <div className="flex flex-col items-center justify-center p-16 text-center">
      <Building className="h-16 w-16 text-muted-foreground mb-4" />
      <h3 className="text-xl font-semibold mb-2">
        No properties yet
      </h3>
      <p className="text-muted-foreground mb-6 max-w-md">
        Get started by adding your first property to the platform.
      </p>
      <Button>
        <Plus className="mr-2 h-4 w-4" />
        Add Property
      </Button>
    </div>
  );
}
```

### Empty State with Role Check

```tsx
import { useAuth } from '@/contexts/AuthContext';

export function NoLeases() {
  const { user } = useAuth();
  const isLandlord = user?.role === 'landlord';

  return (
    <div className="flex flex-col items-center justify-center p-16 text-center">
      <FileText className="h-16 w-16 text-muted-foreground mb-4" />
      <h3 className="text-xl font-semibold mb-2">
        No leases yet
      </h3>
      <p className="text-muted-foreground mb-6 max-w-md">
        {isLandlord
          ? 'Create your first lease agreement to get started.'
          : 'Your lease agreements will appear here once created.'}
      </p>
      {isLandlord && (
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Create Lease
        </Button>
      )}
    </div>
  );
}
```

### Empty State with Search

```tsx
export function NoSearchResults({ query, onClearFilters }) {
  return (
    <div className="flex flex-col items-center justify-center p-16 text-center">
      <Search className="h-16 w-16 text-muted-foreground mb-4" />
      <h3 className="text-xl font-semibold mb-2">
        No results found
      </h3>
      <p className="text-muted-foreground mb-6 max-w-md">
        {query
          ? `No results for "${query}". Try adjusting your search.`
          : 'Try adjusting your filters to find what you\'re looking for.'}
      </p>
      <Button variant="outline" onClick={onClearFilters}>
        Clear Filters
      </Button>
    </div>
  );
}
```

### Reusable Empty State Component

```tsx
interface EmptyStateProps {
  icon: React.ComponentType<{ className?: string }>;
  heading: string;
  message: string;
  action?: {
    label: string;
    onClick: () => void;
    icon?: React.ComponentType<{ className?: string }>;
  };
  compact?: boolean;
}

export function EmptyState({
  icon: Icon,
  heading,
  message,
  action,
  compact = false,
}: EmptyStateProps) {
  const padding = compact ? 'p-8' : 'p-16';
  const iconSize = compact ? 'h-12 w-12' : 'h-16 w-16';
  const headingSize = compact ? 'text-lg' : 'text-xl';

  return (
    <div className={`flex flex-col items-center justify-center ${padding} text-center`}>
      <Icon className={`${iconSize} text-muted-foreground mb-4`} />
      <h3 className={`${headingSize} font-semibold mb-2`}>
        {heading}
      </h3>
      <p className="text-muted-foreground mb-6 max-w-md">
        {message}
      </p>
      {action && (
        <Button onClick={action.onClick} size={compact ? 'sm' : 'default'}>
          {action.icon && <action.icon className="mr-2 h-4 w-4" />}
          {action.label}
        </Button>
      )}
    </div>
  );
}
```

## Common Mistakes

### ❌ Don't

```tsx
// Generic message
<EmptyState message="No data" />

// No action
<EmptyState message="No properties" />

// Too much text
<EmptyState message="You don't have any properties yet. Properties are..." />

// Wrong icon
<EmptyState icon={AlertCircle} message="No properties" />
```

### ✅ Do

```tsx
// Specific message
<EmptyState message="No properties yet" />

// With action
<EmptyState 
  message="No properties yet"
  action={{ label: "Add Property", onClick: handleAdd }}
/>

// Concise text
<EmptyState message="Get started by adding your first property." />

// Relevant icon
<EmptyState icon={Building} message="No properties yet" />
```

## Accessibility

### Requirements

- Use semantic HTML (`<div>`, `<h3>`, `<p>`, `<button>`)
- Provide descriptive heading
- Ensure sufficient color contrast
- Make action button keyboard accessible
- Announce empty state to screen readers

### Implementation

```tsx
<div 
  role="status" 
  aria-live="polite"
  className="flex flex-col items-center justify-center p-16 text-center"
>
  <Icon className="h-16 w-16 text-muted-foreground mb-4" aria-hidden="true" />
  <h3 className="text-xl font-semibold mb-2">
    {heading}
  </h3>
  <p className="text-muted-foreground mb-6 max-w-md">
    {message}
  </p>
  {action && (
    <Button onClick={action.onClick}>
      {action.label}
    </Button>
  )}
</div>
```

## Related Components

- [Loading States](./loading.md) - Show before empty state
- [Buttons](./buttons.md) - Action buttons in empty states
- [Error States](./components.md#error-states) - Alternative to empty states

---

**Last Updated:** 2026-01-05  
**Version:** 1.0