// Payment surface (Stripe-backed) is gated until the backend exposes a real
// Stripe customer id per tenant. Without it, the UI would pass a placeholder
// customer id to Stripe and either get a 4xx or create orphaned records that
// aren't linked to any user. Flip to "true" in env once /api/v1/users/me
// returns stripe_customer_id.
export const PAYMENTS_ENABLED = import.meta.env.VITE_PAYMENTS_ENABLED === 'true';

// MFA enrollment is gated until the backend issues TOTP secrets via CSPRNG
// and persists them per-user. The current page generates a "secret" with
// Math.random() that's never sent anywhere — exposing it as a working flow
// would create false confidence in a non-functional security control.
export const MFA_ENABLED = import.meta.env.VITE_MFA_ENABLED === 'true';
