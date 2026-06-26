# Auth hooks

Hooks that mediate between the React tree and the wallet / backend session
machinery. Kept separate from `src/hooks/ico/` because they handle LeaseFi
auth concerns (sessions, reauth, sensitive actions) rather than direct
Casper RPC interaction.

| File | Responsibility |
|------|----------------|
| useWalletConnect.ts | Bridges CSPR.click wallet events into LeaseFi's auth flow — exposes connect/disconnect, sign-in, post-handshake state for the auth pages |
| useReauthGate.ts | State machine for the `403 reauthentication_required` round-trip — prompts the wallet for a fresh signature, exchanges it for a new access cookie, replays the original call once; surfaces `idle / awaiting-signature / replaying / error` so the UI can drive the prompt |
| useSensitiveAction.ts | `useReauthGate` wrapper for endpoints that invalidate the session on success (`PATCH /users/me/role` today). Adds local cleanup: `walletSignOut`, `csprclick:*` localStorage strip, redirect to `/auth/login` |
