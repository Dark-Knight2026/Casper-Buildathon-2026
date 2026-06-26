# Validation Layer Implementation Plan

**Issue**: TYPE-1 - No Input Validation Layer
**Severity**: HIGH
**Status**: ⏳ **Planned** (Implementation after backend migration)

---

## Problem Statement

Currently, the application lacks comprehensive validation for:

1. ❌ **API Response Validation**: No validation of backend responses
2. ❌ **Webhook Data Validation**: External webhooks (Stripe, etc.) not validated
3. ❌ **Runtime Type Guards**: No runtime checks for external data
4. ❌ **Environment Variable Validation**: No startup validation of config

**Risk**:
- API schema drift → runtime crashes
- Malicious webhook data → security breach
- Type assertion lies → null pointer errors
- Invalid config → application malfunction

---

## Why Not Implemented Yet?

**Reason**: Backend is being completely replaced.

Creating validation schemas for the current API would be **wasted effort** since:
- API endpoints will change
- Response formats will change
- Error schemas will change
- Types will be completely different

**Decision**: Wait until new backend API is stable, then implement validation layer properly.

---

## Implementation Plan

### Phase 1: API Response Validation

**When**: After backend API stabilizes

**Tasks**:
1. Generate Zod schemas from OpenAPI/GraphQL specs (if available)
2. Create manual schemas for each endpoint response
3. Add validation wrapper around API client
4. Handle validation errors gracefully

**Example**:
```typescript
import { z } from 'zod';

// Define schema
const PropertyResponseSchema = z.object({
  id: z.string().uuid(),
  title: z.string().min(1),
  rent: z.number().positive(),
  // ... all fields
});

// Validate response
export async function getProperty(id: string) {
  const response = await apiClient.get(`/properties/${id}`);

  // This will throw if data doesn't match schema
  const data = PropertyResponseSchema.parse(response.data);

  return data;
}
```

**Affected Services**: All 67 services in [src/services/](../src/services/)

---

### Phase 2: Webhook Validation

**When**: During external integration phase

**Tasks**:
1. Create Zod schemas for webhook payloads
2. Implement signature verification
3. Add webhook-specific error handling
4. Log and monitor webhook failures

**Example**:
```typescript
const StripeWebhookSchema = z.object({
  id: z.string(),
  type: z.enum(['payment.succeeded', 'payment.failed', /* ... */]),
  data: z.object({
    // Stripe event data
  }),
});

export function validateStripeWebhook(payload: unknown, signature: string) {
  // 1. Verify signature
  if (!verifySignature(payload, signature)) {
    throw new Error('Invalid webhook signature');
  }

  // 2. Validate schema
  const event = StripeWebhookSchema.parse(payload);

  return event;
}
```

**External Services**:
- Stripe webhooks
- Twilio webhooks
- Email service webhooks
- Any other webhook integrations

---

### Phase 3: Runtime Type Guards

**When**: During validation layer implementation

**Tasks**:
1. Create type guard functions for critical types
2. Add runtime checks at system boundaries
3. Use type guards in error-prone areas

**Example**:
```typescript
function isUser(value: unknown): value is User {
  return (
    typeof value === 'object' &&
    value !== null &&
    'id' in value &&
    'email' in value &&
    'role' in value
  );
}

// Use in code
if (!isUser(data)) {
  throw new Error('Invalid user data received');
}
```

---

### Phase 4: Environment Variable Validation

**When**: Immediately (can be done now)

**Tasks**:
1. Create Zod schema for environment variables
2. Validate at application startup
3. Fail fast if config is invalid
4. Provide clear error messages

**Example**:
```typescript
import { z } from 'zod';

const EnvSchema = z.object({
  VITE_API_URL: z.string().url(),
  VITE_STRIPE_KEY: z.string().min(1),
  VITE_ENV: z.enum(['development', 'staging', 'production']),
  // ... all env vars
});

// Validate at startup (in main.tsx or vite.config.ts)
try {
  EnvSchema.parse(import.meta.env);
} catch (error) {
  console.error('Invalid environment configuration:', error);
  throw new Error('Application cannot start with invalid configuration');
}
```

**File**: Create [src/config/validateEnv.ts](../src/config/validateEnv.ts)

**Status**: ✅ **Can be implemented immediately**

---

## Implementation Strategy

### Approach: Incremental

Don't validate everything at once. Prioritize:

1. **Critical Paths First**:
   - Authentication endpoints
   - Payment processing
   - User data

2. **High-Volume Endpoints**:
   - Property listings
   - Search results
   - Notifications

3. **External Integrations**:
   - Webhooks
   - Third-party APIs

4. **Everything Else**:
   - Admin features
   - Reports
   - Analytics

### Error Handling

When validation fails:

1. **Log Error**: Full details to monitoring system
2. **User-Friendly Message**: Don't expose technical details
3. **Fallback**: Graceful degradation when possible
4. **Alert**: Notify dev team for repeated failures

```typescript
try {
  const data = ResponseSchema.parse(response.data);
  return data;
} catch (error) {
  // Log technical details
  logger.error('API response validation failed', {
    endpoint: '/properties',
    error: error,
    response: response.data,
  });

  // Show user-friendly error
  toast.error('Unable to load properties. Please try again.');

  // Alert if this happens frequently
  if (shouldAlert(error)) {
    alertDevTeam('Validation failures on /properties');
  }

  throw new Error('Invalid API response');
}
```

---

## Testing Strategy

### Validation Tests

```typescript
import { describe, it, expect } from 'vitest';
import { PropertyResponseSchema } from './schemas';

describe('PropertyResponseSchema', () => {
  it('validates correct data', () => {
    const validData = {
      id: '123e4567-e89b-12d3-a456-426614174000',
      title: 'Beautiful Apartment',
      rent: 1500,
      // ...
    };

    expect(() => PropertyResponseSchema.parse(validData)).not.toThrow();
  });

  it('rejects invalid data', () => {
    const invalidData = {
      id: 'not-a-uuid',
      title: '',
      rent: -100,
    };

    expect(() => PropertyResponseSchema.parse(invalidData)).toThrow();
  });

  it('provides helpful error messages', () => {
    const invalidData = { id: 'invalid' };

    try {
      PropertyResponseSchema.parse(invalidData);
    } catch (error) {
      expect(error.message).toContain('Expected uuid');
    }
  });
});
```

---

## Performance Considerations

**Concern**: Will validation slow down the app?

**Answer**: Minimal impact if done right:

1. **Validation is fast**: Zod is optimized
2. **Only validate boundaries**: Not internal data
3. **Cache parsed results**: When possible
4. **Development mode**: Can enable extra validation
5. **Production mode**: Can relax non-critical validation

---

## Benefits

Once implemented:

1. ✅ **Catch bugs early**: Before they crash the app
2. ✅ **Security**: Prevent injection attacks via webhooks
3. ✅ **Documentation**: Schemas document API contracts
4. ✅ **Confidence**: Safe refactoring with runtime checks
5. ✅ **Developer Experience**: Clear error messages
6. ✅ **Type Safety**: Runtime validation matches TypeScript types

---

## Timeline

**Environment Validation**: Can be done now (Phase 4) - **1 day**

**Full Validation Layer**: After backend API stabilizes - **1-2 weeks**

Breakdown:
- Day 1-3: Create schemas for all endpoints
- Day 4-5: Implement validation wrapper
- Day 6-7: Add webhook validation
- Day 8-9: Add type guards
- Day 10: Testing and refinement

---

## Checklist

Validation layer is complete when:

- [ ] All API endpoints have Zod schemas
- [ ] All API responses validated
- [ ] All webhook payloads validated with signature verification
- [ ] Critical paths have type guards
- [ ] Environment variables validated at startup
- [ ] Error handling properly implemented
- [ ] Tests written for all schemas
- [ ] Documentation updated
- [ ] Performance tested (no significant slowdown)
- [ ] Team trained on validation patterns

---

## Related Documents

- [PROJECT_STATUS.md](./PROJECT_STATUS.md) - Why this is delayed
- [MIGRATION_PLAN.md](./MIGRATION_PLAN.md) - Backend migration timeline
- [API_SERVICES.md](./API_SERVICES.md) - Services that need validation

---

**Note**: This issue is HIGH severity but deliberately postponed for strategic reasons. It will be addressed immediately after backend stabilization.
