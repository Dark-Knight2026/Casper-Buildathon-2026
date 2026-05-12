import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

// useWalletConnect is the entire integration boundary the page consumes.
// We mock it to control the wallet/auth state directly — the actual hook
// is exercised by tests/hooks/useWalletConnect.test.ts.
const mockUseWalletConnect = vi.fn();
vi.mock('@/hooks/auth/useWalletConnect', () => ({
  useWalletConnect: () => mockUseWalletConnect(),
}));

// ProviderList transitively imports @make-software/csprclick-core-types
// (which has unresolvable extensionless ESM paths under Vitest). The page-
// level test only cares that the Login page hands clicks through to
// handleConnectProvider — we substitute a minimal stub that exposes one
// "Google" button and forwards clicks. Real provider rendering is covered
// by the source ProviderList unit test scope.
vi.mock('@/pages/auth/register/ProviderList', () => ({
  ProviderList: ({
    onConnect,
    disabled,
  }: {
    onConnect: (key: string) => void;
    disabled?: boolean;
  }) => (
    <div>
      <button onClick={() => onConnect('csprclick-w3a-google')} disabled={disabled}>
        Google
      </button>
      <button onClick={() => onConnect('csprclick-w3a-apple')} disabled={disabled}>
        Apple
      </button>
    </div>
  ),
}));

import Login from '@/pages/auth/Login';

interface WalletState {
  isConnected: boolean;
  account: { publicKey: string; accountHash: string; provider: string } | null;
  isAuthenticated: boolean;
  isSigningIn: boolean;
  connectingProvider: string | null;
  error: string | null;
  isLoading: boolean;
  setConnectingProvider: ReturnType<typeof vi.fn>;
  handleConnectProvider: ReturnType<typeof vi.fn>;
  login: ReturnType<typeof vi.fn>;
  disconnect: ReturnType<typeof vi.fn>;
}

function setWalletConnect(overrides: Partial<WalletState> = {}) {
  mockUseWalletConnect.mockReturnValue({
    isConnected: false,
    account: null,
    isAuthenticated: false,
    isSigningIn: false,
    connectingProvider: null,
    error: null,
    isLoading: false,
    setConnectingProvider: vi.fn(),
    handleConnectProvider: vi.fn(),
    login: vi.fn(),
    disconnect: vi.fn(),
    ...overrides,
  });
}

function renderLogin() {
  return render(
    <MemoryRouter>
      <Login />
    </MemoryRouter>
  );
}

describe('Login', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setWalletConnect();
  });

  describe('disconnected state', () => {
    it('renders ProviderList with social options when no wallet is connected', () => {
      renderLogin();
      // ProviderList renders Google + Apple per src/pages/auth/register/constants.tsx
      expect(
        screen.getByRole('button', { name: /google/i }),
        'Google provider button must be reachable from the disconnected Login page'
      ).toBeInTheDocument();
      expect(
        screen.getByRole('button', { name: /apple/i }),
        'Apple provider button must be reachable from the disconnected Login page'
      ).toBeInTheDocument();
    });

    it('does not render the "Sign in" button without a connected wallet', () => {
      renderLogin();
      expect(
        screen.queryByRole('button', { name: /^sign in$/i }),
        'the Sign in button is gated on a connected wallet — must be absent on the provider screen'
      ).toBeNull();
    });

    it('clicking a provider triggers handleConnectProvider with the provider key', () => {
      const handleConnectProvider = vi.fn();
      setWalletConnect({ handleConnectProvider });
      renderLogin();
      fireEvent.click(screen.getByRole('button', { name: /google/i }));
      expect(
        handleConnectProvider,
        'clicking Google must drive useWalletConnect.handleConnectProvider with the SDK provider key'
      ).toHaveBeenCalledWith(expect.stringContaining('google'));
    });
  });

  describe('connected state', () => {
    const account = {
      publicKey: '0203665f958313f836f59d16abf75162dc2d1e12d79eed322a951b31fe5ac3e98672',
      accountHash: 'hash',
      provider: 'csprclick-w3a-google',
    };

    it('renders the truncated public key and Sign in button when wallet is connected', () => {
      setWalletConnect({ isConnected: true, account });
      renderLogin();
      expect(
        screen.getByText(account.publicKey.slice(0, 20), { exact: false }),
        'connected state must surface the wallet public key so user knows which account is about to sign'
      ).toBeInTheDocument();
      expect(
        screen.getByRole('button', { name: /^sign in$/i }),
        'connected state must expose the explicit Sign in button'
      ).toBeInTheDocument();
    });

    it('clicking "Sign in" calls login()', () => {
      const login = vi.fn();
      setWalletConnect({ isConnected: true, account, login });
      renderLogin();
      fireEvent.click(screen.getByRole('button', { name: /^sign in$/i }));
      expect(
        login,
        'Sign in click is the single explicit trigger for the nonce/signature flow'
      ).toHaveBeenCalledTimes(1);
    });

    it('disables Sign in while signing or already authenticated', () => {
      setWalletConnect({ isConnected: true, account, isSigningIn: true });
      renderLogin();
      // Anchor the regex: the page also renders a "Trouble signing in? Reset
      // connection" footer button whose accessible name otherwise matches
      // /signing in/i and makes the selector ambiguous.
      expect(
        screen.getByRole('button', { name: /^Signing in/i }),
        'Sign in button must show in-flight state and be disabled to prevent double-submit'
      ).toBeDisabled();
    });

    it('shows "Use a different account" link that calls disconnect', () => {
      const disconnect = vi.fn();
      // window.location.reload is part of the click handler; mock it to a no-op
      // so the test environment doesn't actually navigate.
      const reloadSpy = vi.fn();
      Object.defineProperty(window, 'location', {
        configurable: true,
        value: { ...window.location, reload: reloadSpy },
      });

      setWalletConnect({ isConnected: true, account, disconnect });
      renderLogin();
      fireEvent.click(screen.getByRole('button', { name: /use a different account/i }));
      expect(
        disconnect,
        'wallet-switch link must drive useWalletConnect.disconnect (clickRef.signOut)'
      ).toHaveBeenCalledTimes(1);
      expect(
        reloadSpy,
        'switch flow must hard-reload to wipe the in-memory CSPR.click SDK cache'
      ).toHaveBeenCalled();
    });
  });

  describe('error surface', () => {
    it('displays an alert when useWalletConnect exposes an error', () => {
      setWalletConnect({ error: 'Sign-in was cancelled.' });
      renderLogin();
      expect(
        screen.getByText('Sign-in was cancelled.'),
        'auth/wallet errors must surface in the destructive Alert region'
      ).toBeInTheDocument();
    });
  });

  describe('navigation', () => {
    it('exposes a Sign up link to /auth/register', () => {
      renderLogin();
      const link = screen.getByRole('link', { name: /sign up/i });
      expect(
        link,
        'Login must offer a Sign up entrypoint for users without an account'
      ).toHaveAttribute('href', '/auth/register');
    });
  });
});
