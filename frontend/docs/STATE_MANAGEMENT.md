# State Management Guide

## Overview

LeaseFi uses **React Context API** for global state management. The application has **18 specialized contexts** that manage different aspects of the application state.

## Why Context API?

- **Type Safety**: Excellent TypeScript integration
- **Simplicity**: Less boilerplate than Redux
- **Performance**: Sufficient for current scale with proper optimization
- **React Native**: Good foundation for future React Native migration
- **Team Familiarity**: Lower learning curve for new developers

## Context Architecture Pattern

All contexts follow a consistent pattern:

```typescript
// 1. Define Context Type
interface MyContextType {
  state: SomeState;
  actions: () => void;
}

// 2. Create Context
const MyContext = createContext<MyContextType | undefined>(undefined);

// 3. Create Provider Component
export const MyProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [state, setState] = useState<SomeState>(initialState);

  const actions = useCallback(() => {
    // action logic
  }, [dependencies]);

  return (
    <MyContext.Provider value={{ state, actions }}>
      {children}
    </MyContext.Provider>
  );
};

// 4. Create Custom Hook
export const useMyContext = () => {
  const context = useContext(MyContext);
  if (!context) {
    throw new Error('useMyContext must be used within MyProvider');
  }
  return context;
};
```

## Core Contexts

### 1. AuthContext
**File**: [src/contexts/AuthContext.tsx](../src/contexts/AuthContext.tsx)

**Purpose**: Manages user authentication and profile data

**State**:
- `user`: Current authenticated user (Supabase User object)
- `profile`: User profile data (role, name, phone, avatar)
- `loading`: Authentication loading state

**Key Methods**:
- `fetchProfile()`: Fetches user profile with retry logic
- `logout()`: Signs user out
- Auto-subscription to auth state changes

**Usage**:
```typescript
import { useAuth } from '@/hooks/useAuth';

const { user, profile, loading } = useAuth();
```

**Performance Notes**:
- Implements retry logic for profile fetching
- Subscribes to Supabase auth changes
- Cleans up subscription on unmount

---

### 2. LeaseContext
**File**: [src/contexts/LeaseContext.tsx](../src/contexts/LeaseContext.tsx)

**Purpose**: Manages lease agreement state and state machine

**State**:
- `lease`: Current lease agreement
- `isLoading`: Loading state
- `error`: Error state
- `state`: Current lease state (draft, pending, active, etc.)
- `dispatch`: State machine dispatch function

**Key Methods**:
- `refreshLease()`: Refetches lease data

**Usage**:
```typescript
import { useLeaseContext } from '@/contexts/LeaseContext';

const { lease, state, dispatch } = useLeaseContext();
```

**State Machine**:
Uses `useLeaseStateMachine` hook for complex lease lifecycle management.

---

### 3. NotificationContext
**File**: [src/contexts/NotificationContext.tsx](../src/contexts/NotificationContext.tsx)

**Purpose**: Manages real-time notifications and preferences

**State**:
- `notifications`: Array of notifications
- `unreadCount`: Count of unread notifications
- `preferences`: User notification preferences

**Key Methods**:
- `addNotification()`: Adds a new notification
- `markAsRead()`: Marks notification as read
- `markAllAsRead()`: Marks all as read
- `deleteNotification()`: Deletes a notification
- `clearAll()`: Clears all notifications
- `playSound()`: Plays notification sound
- `updatePreferences()`: Updates notification settings
- `refreshNotifications()`: Refetches notifications from backend

**Usage**:
```typescript
import { useNotifications } from '@/hooks/useNotifications';

const { notifications, unreadCount, markAsRead } = useNotifications();
```

**Features**:
- Real-time notification sound playback
- Supabase real-time subscriptions
- Granular notification preferences per category

---

### 4. MessagingContext
**File**: [src/contexts/MessagingContext.tsx](../src/contexts/MessagingContext.tsx)

**Purpose**: Manages in-app messaging and conversations

**State**:
- `conversations`: List of conversations
- `activeConversation`: Currently active conversation
- `messages`: Messages in active conversation
- `unreadCount`: Total unread message count

**Key Methods**:
- `sendMessage()`: Sends a message
- `markAsRead()`: Marks conversation as read
- `createConversation()`: Creates new conversation
- `refreshConversations()`: Refetches conversations

---

### 5. SearchContext
**File**: [src/contexts/SearchContext.tsx](../src/contexts/SearchContext.tsx)

**Purpose**: Manages property search state and filters

**State**:
- `searchQuery`: Current search query
- `filters`: Applied filters (price, bedrooms, location, etc.)
- `results`: Search results
- `isLoading`: Search loading state

**Key Methods**:
- `setSearchQuery()`: Updates search query
- `setFilters()`: Updates filters
- `clearFilters()`: Resets filters
- `executeSearch()`: Performs search

---

### 6. ListingContext
**File**: [src/contexts/ListingContext.tsx](../src/contexts/ListingContext.tsx)

**Purpose**: Manages property listing state

**State**:
- `listings`: User's property listings
- `currentListing`: Currently selected listing
- `isLoading`: Loading state

**Key Methods**:
- `createListing()`: Creates new listing
- `updateListing()`: Updates existing listing
- `deleteListing()`: Deletes listing
- `refreshListings()`: Refetches listings

---

### 7. FavoritesContext
**File**: [src/contexts/FavoritesContext.tsx](../src/contexts/FavoritesContext.tsx)

**Purpose**: Manages user's favorite properties

**State**:
- `favorites`: Array of favorite property IDs
- `isLoading`: Loading state

**Key Methods**:
- `addFavorite()`: Adds property to favorites
- `removeFavorite()`: Removes property from favorites
- `isFavorite()`: Checks if property is favorited

---

### 8. ClientContext
**File**: [src/contexts/ClientContext.tsx](../src/contexts/ClientContext.tsx)

**Purpose**: Manages client data for agents/brokers

**State**:
- `clients`: List of clients
- `currentClient`: Currently selected client

**Key Methods**:
- `addClient()`: Adds new client
- `updateClient()`: Updates client info
- `deleteClient()`: Removes client

---

### 9. AgentContext
**File**: [src/contexts/AgentContext.tsx](../src/contexts/AgentContext.tsx)

**Purpose**: Manages agent-specific data

**State**:
- `agentProfile`: Agent profile data
- `performance`: Performance metrics
- `leads`: Agent leads

---

### 10. TenantDashboardContext
**File**: [src/contexts/TenantDashboardContext.tsx](../src/contexts/TenantDashboardContext.tsx)

**Purpose**: Manages tenant dashboard data

**State**:
- `dashboardData`: Aggregated tenant data
- `upcomingPayments`: Upcoming rent payments
- `maintenanceRequests`: Active maintenance requests

---

### 11. LeaseManagementContext
**File**: [src/contexts/LeaseManagementContext.tsx](../src/contexts/LeaseManagementContext.tsx)

**Purpose**: Manages lease management operations for landlords

**State**:
- `leases`: All leases
- `activeLeases`: Currently active leases
- `expiringLeases`: Leases expiring soon

---

### 12. LandlordManagementContext
**File**: [src/contexts/LandlordManagementContext.tsx](../src/contexts/LandlordManagementContext.tsx)

**Purpose**: Manages landlord-specific operations

**State**:
- `properties`: Landlord properties
- `tenants`: Landlord tenants
- `financials`: Financial overview

---

### 13. ClientLandlordContext
**File**: [src/contexts/ClientLandlordContext.tsx](../src/contexts/ClientLandlordContext.tsx)

**Purpose**: Manages client-landlord relationships for agents

---

### 14. TaxPreparationContext
**File**: [src/contexts/TaxPreparationContext.tsx](../src/contexts/TaxPreparationContext.tsx)

**Purpose**: Manages tax preparation and documentation

**State**:
- `taxDocuments`: Tax-related documents
- `taxYear`: Selected tax year
- `summary`: Tax summary data

---

### 15. DashboardPreferencesContext
**File**: [src/contexts/DashboardPreferencesContext.tsx](../src/contexts/DashboardPreferencesContext.tsx)

**Purpose**: Manages user dashboard preferences

**State**:
- `layout`: Dashboard layout configuration
- `widgets`: Enabled dashboard widgets
- `theme`: Theme preferences

---

### 16. OnboardingContext
**File**: [src/contexts/OnboardingContext.tsx](../src/contexts/OnboardingContext.tsx)

**Purpose**: Manages user onboarding flow

**State**:
- `currentStep`: Current onboarding step
- `completed`: Onboarding completion status
- `data`: Onboarding form data

---

### 17. UsernameSearchContext
**File**: [src/contexts/UsernameSearchContext.tsx](../src/contexts/UsernameSearchContext.tsx)

**Purpose**: Manages username/user search functionality

---

### 18. AuthContextDefinition
**File**: [src/contexts/AuthContextDefinition.ts](../src/contexts/AuthContextDefinition.ts)

**Purpose**: TypeScript type definitions for AuthContext

---

## Context Provider Hierarchy

Contexts are nested in the application root in [src/main.tsx](../src/main.tsx):

```tsx
<AuthProvider>
  <NotificationProvider>
    <MessagingProvider>
      <SearchProvider>
        {/* Other providers */}
        <App />
      {/* Other providers */}
      </SearchProvider>
    </MessagingProvider>
  </NotificationProvider>
</AuthProvider>
```

## Performance Optimization Strategies

### 1. Context Splitting
Instead of one large context, we split state into focused contexts:
- ✅ **Good**: Separate contexts for Auth, Notifications, Messaging
- ❌ **Bad**: Single "AppContext" with all state

### 2. Memoization
All context values are memoized:
```typescript
const value = useMemo(() => ({
  state,
  actions
}), [state, actions]);
```

### 3. Callback Memoization
All context methods use `useCallback`:
```typescript
const action = useCallback(() => {
  // logic
}, [dependencies]);
```

### 4. Selective Subscriptions
Components only subscribe to contexts they need:
```typescript
// ✅ Good - only subscribes to notifications
const { notifications } = useNotifications();

// ❌ Bad - subscribes to entire app state
const appState = useAppContext();
```

### 5. Context Composition
Related contexts can be composed:
```typescript
function useLeaseWithNotifications() {
  const lease = useLeaseContext();
  const notifications = useNotifications();
  return { lease, notifications };
}
```

## Common Patterns

### Loading States
```typescript
const { data, isLoading, error } = useMyContext();

if (isLoading) return <Spinner />;
if (error) return <Error />;
return <Content data={data} />;
```

### Optimistic Updates
```typescript
const updateItem = async (id: string, data: UpdateData) => {
  // Optimistically update UI
  setItems(prev => prev.map(item =>
    item.id === id ? { ...item, ...data } : item
  ));

  try {
    await api.updateItem(id, data);
  } catch (error) {
    // Revert on error
    refreshItems();
    toast.error('Update failed');
  }
};
```

### Polling
```typescript
useEffect(() => {
  const interval = setInterval(() => {
    refreshNotifications();
  }, 30000); // Poll every 30s

  return () => clearInterval(interval);
}, [refreshNotifications]);
```

## Migration Considerations

### When to Consider Alternative Solutions

**Consider Zustand/Jotai if**:
- Context re-render issues become problematic
- Need fine-grained subscriptions
- Performance becomes bottleneck

**Consider Redux Toolkit if**:
- Team grows significantly (10+ developers)
- Need time-travel debugging
- Complex state update logic

**Consider TanStack Query for**:
- Server state (already used for API calls)
- Caching and invalidation
- Background refetching

## Best Practices

1. **Always use custom hooks**: Never call `useContext` directly
2. **Type everything**: Full TypeScript coverage
3. **Error boundaries**: Wrap context providers in error boundaries
4. **Throw on missing provider**: Helps catch bugs early
5. **Document side effects**: Comment any async operations
6. **Test context providers**: Write unit tests for context logic

## Testing Contexts

```typescript
import { render, screen } from '@testing-library/react';
import { MyProvider } from '@/contexts/MyContext';

test('provides context value', () => {
  render(
    <MyProvider>
      <TestComponent />
    </MyProvider>
  );

  expect(screen.getByText('Expected Value')).toBeInTheDocument();
});
```

## Related Documentation

- [Architecture Overview](./ARCHITECTURE.md)
- [API Services](./API_SERVICES.md)
