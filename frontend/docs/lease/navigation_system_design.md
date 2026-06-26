# Lease Pipeline Navigation & State System Design

## 1. Executive Summary
This document outlines the technical design for the "Lease Pipeline," a unified navigation and state management system that connects isolated lease components (Wizard, Dashboard, Signing, Storage) into a cohesive user journey. The design leverages **React Router v6** for navigation and a **Finite State Machine (FSM)** pattern for managing lease lifecycle transitions.

## 2. Navigation Architecture

### 2.1 Route Structure
We will implement a nested route structure to maintain context and reduce re-rendering of shared layout elements (Sidebar, Topbar).

```typescript
// Route Configuration (App.tsx or routes.tsx)
<Route path="/leases" element={<LeaseLayout />}>
  {/* Lease List / Dashboard */}
  <Route index element={<LeaseDashboardPage />} />
  
  {/* Create New Lease */}
  <Route path="new" element={<LeaseWizardPage mode="create" />} />
  
  {/* Specific Lease Context */}
  <Route path=":leaseId" element={<LeaseContextLayout />}>
    {/* Default view: Overview/Details */}
    <Route index element={<LeaseDetailsPage />} />
    
    {/* Sub-routes for specific actions */}
    <Route path="edit" element={<LeaseWizardPage mode="edit" />} />
    <Route path="signing" element={<LeaseSigningPage />} />
    <Route path="documents" element={<LeaseDocumentsPage />} />
    <Route path="renewal" element={<LeaseRenewalPage />} />
  </Route>
</Route>
```

### 2.2 Layout Components

#### `LeaseLayout`
- **Responsibility:** Provides the global "Lease" context sidebar and top navigation.
- **Components:**
  - `Sidebar`: Persistent navigation (Dashboard, All Leases, Drafts, etc.).
  - `Breadcrumbs`: Dynamic path indication (e.g., Leases > Unit 101 > Signing).
  - `Outlet`: Renders the child route.

#### `LeaseContextLayout`
- **Responsibility:** Fetches and provides the specific `Lease` object to all child routes.
- **Logic:**
  - Reads `:leaseId` from URL params.
  - Fetches lease data via `useLease(id)`.
  - Provides `LeaseContext.Provider`.
  - Handles 404s if lease not found.
  - Renders `<Outlet />` for sub-pages (Details, Signing, etc.).

### 2.3 Breadcrumb Strategy
Breadcrumbs will be generated dynamically based on the current route match.

- **Map:**
  - `/leases` -> "Leases"
  - `/leases/new` -> "Leases" > "New Lease"
  - `/leases/:id` -> "Leases" > [Lease.propertyAddress]
  - `/leases/:id/signing` -> "Leases" > [Lease.propertyAddress] > "Signing Status"

## 3. State Machine Design (Lease Lifecycle)

We will use a reducer-based state machine pattern to strictly control lease transitions. This ensures data integrity and prevents invalid states (e.g., going from "Active" back to "Draft" without a specific amendment process).

### 3.1 States
1.  **DRAFT**: Initial state. Lease is being created/edited.
2.  **PENDING_SIGNATURE**: Lease generated and sent to parties. Locked for editing.
3.  **ACTIVE**: All parties signed. Lease is in effect.
4.  **EXPIRING**: Within renewal window (e.g., 90 days before end).
5.  **RENEWED**: A new lease has superseded this one.
6.  **TERMINATED**: Lease ended early or naturally without renewal.
7.  **ARCHIVED**: Historical record.

### 3.2 Transitions & Actions

| Current State | Action | Next State | Guard / Requirement |
| :--- | :--- | :--- | :--- |
| **DRAFT** | `SAVE_DRAFT` | **DRAFT** | Validation optional |
| **DRAFT** | `SEND_FOR_SIGNATURE` | **PENDING_SIGNATURE** | All required fields valid, PDF generated |
| **PENDING_SIGNATURE** | `ALL_SIGNED` | **ACTIVE** | Webhook/Callback from E-Sign Service |
| **PENDING_SIGNATURE** | `RECALL/EDIT` | **DRAFT** | Voids current envelope |
| **ACTIVE** | `AMEND` | **DRAFT (Amendment)** | Creates new version linked to parent |
| **ACTIVE** | `AUTO_CHECK_DATE` | **EXPIRING** | Current Date > End Date - 90 days |
| **ACTIVE** | `TERMINATE` | **TERMINATED** | Termination reason provided |
| **EXPIRING** | `RENEW` | **DRAFT (New Lease)** | Creates new lease ID |
| **EXPIRING** | `EXPIRE` | **TERMINATED** | Current Date > End Date |

### 3.3 State Machine Hook (`useLeaseStateMachine`)

```typescript
type LeaseState = 'DRAFT' | 'PENDING' | 'ACTIVE' | 'EXPIRING' | 'TERMINATED';
type LeaseAction = 
  | { type: 'SUBMIT_FOR_SIGNATURE' }
  | { type: 'SIGNATURE_COMPLETED' }
  | { type: 'RECALL_TO_DRAFT' }
  | { type: 'TERMINATE'; reason: string };

function leaseReducer(state: LeaseState, action: LeaseAction): LeaseState {
  switch (state) {
    case 'DRAFT':
      if (action.type === 'SUBMIT_FOR_SIGNATURE') return 'PENDING';
      break;
    case 'PENDING':
      if (action.type === 'SIGNATURE_COMPLETED') return 'ACTIVE';
      if (action.type === 'RECALL_TO_DRAFT') return 'DRAFT';
      break;
    // ... other transitions
  }
  return state; // No change if invalid transition
}
```

## 4. Integration Strategy

### 4.1 Dashboard Integration
- **Current:** `/pages/lease/dashboard.tsx`
- **Change:** Refactor to be the `index` route of `/leases`.
- **Action:** Clicking "New Lease" navigates to `/leases/new`. Clicking a row navigates to `/leases/:id`.

### 4.2 Wizard Integration
- **Current:** `EnhancedLeaseWizard.tsx`
- **Change:** Wrap in a page component `LeaseWizardPage`.
- **Logic:**
  - If route is `/leases/new`, initialize empty state.
  - If route is `/leases/:id/edit`, load data from `LeaseContext`.
  - On "Finish", dispatch `SUBMIT_FOR_SIGNATURE` and navigate to `/leases/:id/signing`.

### 4.3 Signing Integration
- **Current:** `SignatureWorkflowManager.tsx`
- **Change:** Render at `/leases/:id/signing`.
- **Logic:**
  - Reads lease ID from URL.
  - Checks status. If `ACTIVE`, redirect to `/leases/:id` (Details).
  - If `DRAFT`, redirect to `/leases/:id/edit`.

### 4.4 Storage Integration
- **Current:** `DocumentList.tsx`
- **Change:** Render at `/leases/:id/documents` OR as a tab in the Details page.
- **Recommendation:** Keep as a tab in the `LeaseDetailsPage` for better UX, but have a direct route `/leases/:id/documents` that auto-selects that tab.

## 5. Implementation Plan

1.  **Create Layouts:** Build `LeaseLayout.tsx` and `LeaseContextLayout.tsx`.
2.  **Define Context:** Create `LeaseContext` and `LeaseProvider`.
3.  **Implement State Logic:** Create `useLeaseStateMachine` hook.
4.  **Refactor Pages:**
    - Wrap `EnhancedLeaseWizard` in `LeaseWizardPage`.
    - Wrap `SignatureWorkflowManager` in `LeaseSigningPage`.
    - Create `LeaseDetailsPage` (unifying the Modal content into a full page).
5.  **Update Router:** Modify `App.tsx` to include the new nested routes.
6.  **Add Breadcrumbs:** Implement `BreadcrumbNavigation` component.

## 6. Security & Permissions
- **Route Guards:** Ensure `LeaseContextLayout` checks user ownership/permissions for the requested lease ID.
- **Redirects:** Unauthorized access redirects to `/leases` or `/login`.