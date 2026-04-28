import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

// ── Mocks ──────────────────────────────────────────────────────────────────

const mockNavigate = vi.fn();
vi.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
}));

const mockUseICOWallet = vi.fn();
vi.mock('@/hooks/ico/useICOWallet', () => ({
  useICOWallet: () => mockUseICOWallet(),
}));

const mockUseBackendAuth = vi.fn();
vi.mock('@/hooks/ico/useBackendAuth', () => ({
  useBackendAuth: (...args: unknown[]) => mockUseBackendAuth(...args),
}));

const mockUseAuth = vi.fn();
vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => mockUseAuth(),
}));

vi.mock('@/lib/logger', () => ({
  default: { log: vi.fn(), debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

// register/constants.tsx imports React + WALLET_KEYS — keep the test isolated
// from those by stubbing only what useWalletConnect actually consumes.
vi.mock('@/pages/auth/register/constants', () => ({
  TERMINAL_PROVIDER_STATUSES: new Set(['rejected-by-user', 'transport-open-user-cancelled']),
}));

import { useWalletConnect } from '@/hooks/auth/useWalletConnect';

// ── Helpers ────────────────────────────────────────────────────────────────

const TOKEN_KEY = 'leasefi_jwt';
const PUBLIC_KEY = '01abc123';

function makeJwt(payload: Record<string, unknown>): string {
  const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const body = btoa(JSON.stringify(payload));
  return `${header}.${body}.signature`;
}

function makeClickRef() {
  return { on: vi.fn(), off: vi.fn() };
}

function setWalletState(overrides: Partial<{
  isConnected: boolean;
  account: { publicKey: string; accountHash: string; provider: string } | null;
  isConnecting: boolean;
  error: string | null;
  clickRef: ReturnType<typeof makeClickRef>;
}> = {}) {
  mockUseICOWallet.mockReturnValue({
    isConnected: false,
    account: null,
    isConnecting: false,
    error: null,
    clickRef: makeClickRef(),
    syncActiveAccount: vi.fn(),
    connect: vi.fn(),
    ...overrides,
  });
}

function setBackendAuthState(overrides: Partial<{
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  login: ReturnType<typeof vi.fn>;
}> = {}) {
  mockUseBackendAuth.mockReturnValue({
    isAuthenticated: false,
    isLoading: false,
    error: null,
    login: vi.fn(),
    ...overrides,
  });
}

function setAuthContext(overrides: Partial<{
  profile: { id: string; role: string } | null;
  setWalletSession: ReturnType<typeof vi.fn>;
}> = {}) {
  mockUseAuth.mockReturnValue({
    profile: null,
    setWalletSession: vi.fn(),
    ...overrides,
  });
}

// ── Tests ──────────────────────────────────────────────────────────────────

describe('useWalletConnect', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    setWalletState();
    setBackendAuthState();
    setAuthContext();
  });

  describe('already-authenticated short-circuit', () => {
    it('redirects landlord profile to /landlord/dashboard on mount', () => {
      setAuthContext({ profile: { id: 'u1', role: 'landlord' }, setWalletSession: vi.fn() });

      renderHook(() => useWalletConnect());

      expect(mockNavigate).toHaveBeenCalledWith('/landlord/dashboard', { replace: true });
    });

    it('redirects tenant profile to /tenant/dashboard on mount', () => {
      setAuthContext({ profile: { id: 'u2', role: 'tenant' }, setWalletSession: vi.fn() });

      renderHook(() => useWalletConnect());

      expect(mockNavigate).toHaveBeenCalledWith('/tenant/dashboard', { replace: true });
    });

    it('does not redirect when no profile is loaded', () => {
      renderHook(() => useWalletConnect());

      expect(mockNavigate).not.toHaveBeenCalled();
    });

    it('does not call login when already authenticated', () => {
      const login = vi.fn();
      setAuthContext({ profile: { id: 'u1', role: 'tenant' } });
      setWalletState({
        isConnected: true,
        account: { publicKey: PUBLIC_KEY, accountHash: 'hash', provider: 'casper-wallet' },
      });
      setBackendAuthState({ isAuthenticated: true, login });

      renderHook(() => useWalletConnect());

      expect(login).not.toHaveBeenCalled();
    });
  });

  describe('connect → auth → redirect by role', () => {
    it('calls login() once wallet connects and backend auth has not started', () => {
      const login = vi.fn();
      setWalletState({
        isConnected: true,
        account: { publicKey: PUBLIC_KEY, accountHash: 'hash', provider: 'casper-wallet' },
      });
      setBackendAuthState({ login });

      renderHook(() => useWalletConnect());

      expect(login).toHaveBeenCalledTimes(1);
    });

    it('does not call login() while backend auth is in flight', () => {
      const login = vi.fn();
      setWalletState({
        isConnected: true,
        account: { publicKey: PUBLIC_KEY, accountHash: 'hash', provider: 'casper-wallet' },
      });
      setBackendAuthState({ isLoading: true, login });

      renderHook(() => useWalletConnect());

      expect(login).not.toHaveBeenCalled();
    });

    it('decodes JWT and syncs walletSession on successful backend auth', () => {
      const setWalletSession = vi.fn();
      const token = makeJwt({ sub: 'user-42', role: 'landlord' });
      localStorage.setItem(TOKEN_KEY, token);

      setAuthContext({ setWalletSession });
      setBackendAuthState({ isAuthenticated: true });

      renderHook(() => useWalletConnect());

      expect(setWalletSession).toHaveBeenCalledWith(token, 'user-42', 'landlord');
    });

    it('redirects by role once profile hydrates after JWT sync', () => {
      const token = makeJwt({ sub: 'user-7', role: 'landlord' });
      localStorage.setItem(TOKEN_KEY, token);
      setBackendAuthState({ isAuthenticated: true });

      const { rerender } = renderHook(() => useWalletConnect());
      expect(mockNavigate).not.toHaveBeenCalled();

      // AuthContext hydrates the profile after setWalletSession resolves
      setAuthContext({ profile: { id: 'user-7', role: 'landlord' } });
      rerender();

      expect(mockNavigate).toHaveBeenCalledWith('/landlord/dashboard', { replace: true });
    });

    it('does not crash on malformed JWT', () => {
      localStorage.setItem(TOKEN_KEY, 'not-a-jwt');
      const setWalletSession = vi.fn();
      setAuthContext({ setWalletSession });
      setBackendAuthState({ isAuthenticated: true });

      expect(() => renderHook(() => useWalletConnect())).not.toThrow();
      expect(setWalletSession).not.toHaveBeenCalled();
    });

    it('does nothing when isAuthenticated flips true but no token is in storage', () => {
      const setWalletSession = vi.fn();
      setAuthContext({ setWalletSession });
      setBackendAuthState({ isAuthenticated: true });

      renderHook(() => useWalletConnect());

      expect(setWalletSession).not.toHaveBeenCalled();
    });
  });

  describe('error handling', () => {
    it('exposes wallet error via .error', () => {
      setWalletState({ error: 'Wallet not available' });

      const { result } = renderHook(() => useWalletConnect());

      expect(result.current.error).toBe('Wallet not available');
    });

    it('exposes backend auth error via .error', () => {
      setBackendAuthState({ error: 'Backend rejected signature' });

      const { result } = renderHook(() => useWalletConnect());

      expect(result.current.error).toBe('Backend rejected signature');
    });

    it('prefers wallet error over backend error when both are present', () => {
      setWalletState({ error: 'wallet-err' });
      setBackendAuthState({ error: 'backend-err' });

      const { result } = renderHook(() => useWalletConnect());

      expect(result.current.error).toBe('wallet-err');
    });
  });

  describe('provider cancellation listeners', () => {
    it('resets connectingProvider on csprclick:cancelled', () => {
      const clickRef = makeClickRef();
      setWalletState({ clickRef });

      const { result } = renderHook(() => useWalletConnect());

      act(() => {
        result.current.setConnectingProvider('casper-wallet');
      });
      expect(result.current.connectingProvider).toBe('casper-wallet');

      const cancelledHandler = clickRef.on.mock.calls.find(c => c[0] === 'csprclick:cancelled')?.[1];
      act(() => { cancelledHandler?.(); });

      expect(result.current.connectingProvider).toBeNull();
    });

    it('resets connectingProvider on terminal provider-status-update', () => {
      const clickRef = makeClickRef();
      setWalletState({ clickRef });

      const { result } = renderHook(() => useWalletConnect());

      act(() => {
        result.current.setConnectingProvider('ledger');
      });

      const statusHandler = clickRef.on.mock.calls.find(c => c[0] === 'csprclick:provider-status-update')?.[1];
      act(() => { statusHandler?.({ status: 'transport-open-user-cancelled' }); });

      expect(result.current.connectingProvider).toBeNull();
    });

    it('ignores non-terminal provider-status-update', () => {
      const clickRef = makeClickRef();
      setWalletState({ clickRef });

      const { result } = renderHook(() => useWalletConnect());

      act(() => {
        result.current.setConnectingProvider('ledger');
      });

      const statusHandler = clickRef.on.mock.calls.find(c => c[0] === 'csprclick:provider-status-update')?.[1];
      act(() => { statusHandler?.({ status: 'connecting' }); });

      expect(result.current.connectingProvider).toBe('ledger');
    });
  });
});
