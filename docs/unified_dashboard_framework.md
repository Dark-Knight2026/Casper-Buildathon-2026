# Unified Dashboard Framework Design

## 1. Overview
This framework establishes a standardized architecture for all user role dashboards (Tenant, Agent, Broker, Buyer, Seller) based on the Landlord Dashboard's proven patterns.

**CRITICAL UPDATE**: All in-page tabs must be removed. Navigation between functional areas (e.g., "Overview", "Listings", "Financials") must be handled exclusively via the Sidebar.

## 2. Core Architecture

### 2.1 Layout Structure
All dashboards must use the `DashboardLayout` wrapper which provides:
- **Sidebar Navigation**: The PRIMARY navigation mechanism. All functional modules must be accessible here.
- **Header**: Standardized "Action Bar" containing:
  - Breadcrumbs (Essential for deep navigation)
  - Global Search
  - Role Switcher
  - Notification Bell
  - User Profile Dropdown
- **Main Content Area**: Wrapped in `ResponsiveContainer` for consistent padding and max-width.

### 2.2 Navigation Strategy (No Tabs)
Instead of monolithic pages with internal tabs, each "Tab" becomes a distinct Route and Sidebar Item.

**Example Transformation:**
*   *Old*: `/agent-dashboard` (Page with Tabs: Overview | Leads | Listings)
*   *New*:
    *   `/agent-dashboard` -> **Overview** (Sidebar Item)
    *   `/agent-dashboard/leads` -> **Leads** (Sidebar Item)
    *   `/agent-dashboard/listings` -> **Listings** (Sidebar Item)

### 2.3 Component Hierarchy
```
DashboardPage (Specific Route, e.g., /agent-dashboard/leads)
├── Header (Standardized)
├── MainContent (ResponsiveContainer)
│   ├── PageHeader (Title + Primary Actions)
│   └── ContentGrid (Specific to the route)
│       ├── Widget A
│       └── Widget B
└── Modals/Dialogs (Lazy Loaded)
```

### 2.4 State Management (Hooks Pattern)
Each dashboard route should have a dedicated hook or utilize the main dashboard hook with selectors.
- `useAgentDashboard` (General data)
- `useAgentLeads` (Specific to the Leads route)

## 3. Standardization Rules

### 3.1 UI Patterns
- **Loading**: Use `Skeleton` loaders matching the exact dimensions of the content.
- **Empty States**: Use the shared `EmptyState` component for lists with 0 items.
- **Lists**: Use `MobileCard` for mobile views and `DataTable` for desktop views.
- **Actions**: Primary actions (e.g., "Add Listing") go in the Page Header.

### 3.2 Navigation Configuration
All routes must be defined in `src/config/dashboardNav.ts`.
- **Groups**: Logical grouping of sidebar items (e.g., "Business", "Financials").
- **Items**: Must have `href`, `label`, and `icon`.

## 4. Implementation Steps
1.  **Update Config**: Modify `dashboardNav.ts` to ensure all functional areas have distinct routes.
2.  **Refactor Pages**: Break down monolithic dashboard pages into smaller, route-specific pages.
    *   `AgentDashboard.tsx` -> `AgentOverview.tsx`, `AgentLeads.tsx`, etc.
3.  **Update Routing**: Define these new routes in `App.tsx` wrapped in `DashboardLayout`.
4.  **Remove Tabs**: Delete all `Tabs`, `TabsList`, `TabsTrigger` usage from dashboard pages.