import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

const mockUseWalletConnect = vi.fn();
vi.mock('@/hooks/auth/useWalletConnect', () => ({
  useWalletConnect: () => mockUseWalletConnect(),
}));

// Same ProviderList stub as Login.test.tsx — page-level tests treat it as
// an external boundary; real rendering is exercised by the source-of-truth
// component scope.
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

import Register from '@/pages/auth/Register';

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

function renderRegister() {
  return render(
    <MemoryRouter>
      <Register />
    </MemoryRouter>
  );
}

function renderRegisterAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Register />
    </MemoryRouter>
  );
}

describe('Register', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setWalletConnect();
  });

  describe('disconnected state', () => {
    it('renders the role selector with Tenant pre-selected', () => {
      renderRegister();
      expect(
        screen.getByRole('radio', { name: /tenant/i }),
        'Tenant radio must be present so first-time users can pick a role'
      ).toBeChecked();
      expect(
        screen.getByRole('radio', { name: /landlord/i }),
        'Landlord radio must be present as the alternative'
      ).not.toBeChecked();
    });

    it('renders ProviderList with social options', () => {
      renderRegister();
      expect(
        screen.getByRole('button', { name: /google/i }),
        'Google provider button must be the entry point on the unconnected Register page'
      ).toBeInTheDocument();
    });

    it('clicking a provider drives handleConnectProvider', () => {
      const handleConnectProvider = vi.fn();
      setWalletConnect({ handleConnectProvider });
      renderRegister();
      fireEvent.click(screen.getByRole('button', { name: /google/i }));
      expect(
        handleConnectProvider,
        'provider click must invoke useWalletConnect.handleConnectProvider with the SDK key'
      ).toHaveBeenCalledWith('csprclick-w3a-google');
    });
  });

  describe('connected state', () => {
    const account = {
      publicKey: '0203665f958313f836f59d16abf75162dc2d1e12d79eed322a951b31fe5ac3e98672',
      accountHash: 'hash',
      provider: 'csprclick-w3a-google',
    };

    it('renders the truncated public key + Sign in button', () => {
      setWalletConnect({ isConnected: true, account });
      renderRegister();
      expect(
        screen.getByText(account.publicKey.slice(0, 20), { exact: false }),
        'connected Register must display the wallet address before the user signs the nonce'
      ).toBeInTheDocument();
      expect(
        screen.getByRole('button', { name: /^sign in$/i }),
        'connected Register must offer the Sign in button to trigger nonce/signature'
      ).toBeInTheDocument();
    });

    it('passes the default tenant role to login() when Sign in is clicked', () => {
      const login = vi.fn();
      setWalletConnect({ isConnected: true, account, login });
      renderRegister();
      fireEvent.click(screen.getByRole('button', { name: /^sign in$/i }));
      expect(
        login,
        'Sign in must propagate the currently-selected role to the backend (default tenant)'
      ).toHaveBeenCalledWith('tenant');
    });

    it('forwards landlord role when the user picked Landlord before connecting', () => {
      // RoleSelector is disabled once the wallet connects (locks in the
      // first-registration role). To test the Landlord path we have to flip
      // the role BEFORE connect — render disconnected, click Landlord, then
      // simulate the post-connect render via a fresh setWalletConnect call.
      const login = vi.fn();
      setWalletConnect({ login });
      const { rerender } = renderRegister();
      fireEvent.click(screen.getByRole('radio', { name: /landlord/i }));

      setWalletConnect({ isConnected: true, account, login });
      rerender(
        <MemoryRouter>
          <Register />
        </MemoryRouter>
      );

      fireEvent.click(screen.getByRole('button', { name: /^sign in$/i }));
      expect(
        login,
        'when the user pre-selected Landlord, that role must reach the backend on first registration'
      ).toHaveBeenCalledWith('landlord');
    });

    it('disables Sign in while signing or already authenticated', () => {
      setWalletConnect({ isConnected: true, account, isSigningIn: true });
      renderRegister();
      expect(
        screen.getByRole('button', { name: /signing in/i }),
        'Sign in button must reflect in-flight state and be disabled to prevent double-submit'
      ).toBeDisabled();
    });

    it('shows the lock-hint on RoleSelector once a wallet is connected', () => {
      setWalletConnect({ isConnected: true, account });
      renderRegister();
      expect(
        screen.getByText(/set during first connection/i),
        'connected state must explain that the role choice is now locked at the wallet level'
      ).toBeInTheDocument();
    });

    it('"Use a different account" link calls disconnect and reloads', () => {
      const disconnect = vi.fn();
      const reloadSpy = vi.fn();
      Object.defineProperty(window, 'location', {
        configurable: true,
        value: { ...window.location, reload: reloadSpy },
      });

      setWalletConnect({ isConnected: true, account, disconnect });
      renderRegister();
      fireEvent.click(screen.getByRole('button', { name: /use a different account/i }));
      expect(disconnect, 'switch flow must invoke useWalletConnect.disconnect').toHaveBeenCalled();
      expect(
        reloadSpy,
        'switch flow must hard-reload to wipe in-memory CSPR.click SDK cache'
      ).toHaveBeenCalled();
    });
  });

  describe('error surface', () => {
    it('displays the alert when useWalletConnect exposes an error', () => {
      setWalletConnect({ error: 'Sign-in was cancelled.' });
      renderRegister();
      expect(
        screen.getByText('Sign-in was cancelled.'),
        'auth/wallet errors must surface in the destructive Alert region'
      ).toBeInTheDocument();
    });
  });

  describe('navigation', () => {
    it('exposes a Sign in link to /auth/login for returning users', () => {
      renderRegister();
      const link = screen.getByRole('link', { name: /sign in/i });
      expect(
        link,
        'Register must offer a Sign in entrypoint for returning users'
      ).toHaveAttribute('href', '/auth/login');
    });
  });

  describe('?role= deep-link', () => {
    it('pre-selects landlord when ?role=landlord is present', () => {
      renderRegisterAt('/auth/register?role=landlord');
      expect(
        screen.getByRole('radio', { name: /landlord/i }),
        'help-hub deep-link must pre-select Landlord so the user lands on the right role'
      ).toBeChecked();
    });

    it('pre-selects tenant when ?role=tenant is present', () => {
      renderRegisterAt('/auth/register?role=tenant');
      expect(
        screen.getByRole('radio', { name: /tenant/i }),
        'tenant deep-link must pre-select Tenant'
      ).toBeChecked();
    });

    it('falls back to tenant for an unsupported ?role= value', () => {
      // Backend role contract only knows tenant/landlord today; anything else
      // (e.g. property_manager) must silently default rather than 500 the page.
      renderRegisterAt('/auth/register?role=property_manager');
      expect(
        screen.getByRole('radio', { name: /tenant/i }),
        'unsupported roles must fall back to Tenant — the safer default'
      ).toBeChecked();
    });

    it('defaults to tenant when ?role= is absent', () => {
      renderRegisterAt('/auth/register');
      expect(
        screen.getByRole('radio', { name: /tenant/i }),
        'no query param means the standard Tenant default'
      ).toBeChecked();
    });
  });
});
