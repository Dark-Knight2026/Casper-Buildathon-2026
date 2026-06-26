# tests/hooks/auth

Tests for hooks under `src/hooks/auth/` — auth-flow state machinery, separate
from the Casper-specific hooks in `tests/hooks/ico/`.

| File | Responsibility |
|------|----------------|
| useReauthGate.test.ts | State machine for the `403 reauthentication_required` round-trip — happy path replay, still-blocked loop guard, no-wallet / cancelled / login-failed error paths, manual `reset()` |
| useSensitiveAction.test.ts | `useReauthGate` wrapper with post-reauth cleanup — returns the underlying call result, strips `csprclick:*` localStorage keys (unrelated keys intact), re-throws and skips side effects on failure, forwards `state`/`reset` |
