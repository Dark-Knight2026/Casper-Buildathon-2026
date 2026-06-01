import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useICOWallet } from '@/hooks/ico/useICOWallet';

// Mock CSPR.click SDK. The hook reads accounts via `getActiveAccountAsync`
// (the SDK's async variant that verifies against accounts.cspr.click); the
// sync `getActiveAccount` is no longer called. `disconnect` and
// `signInWithAccount` are also mocked because the hook awaits them in the
// disconnect / unsolicited-account-change paths.
const mockClickRef = {
  on: vi.fn(),
  off: vi.fn(),
  signIn: vi.fn(),
  signOut: vi.fn(),
  getActiveAccountAsync: vi.fn(),
  disconnect: vi.fn(),
  signInWithAccount: vi.fn(),
};

vi.mock('@make-software/csprclick-ui', () => ({
  useClickRef: () => mockClickRef,
}));

// Mock casper-js-sdk PublicKey
vi.mock('casper-js-sdk', () => ({
  PublicKey: {
    fromHex: vi.fn((hex: string) => ({
      accountHash: () => ({
        toPrefixedString: () => `account-hash-${hex.slice(0, 64)}`,
      }),
    })),
  },
}));

const mockPublicKey = '01abc123def456789abc123def456789abc123def456789abc123def456789abc1';
const mockProvider = 'casper-wallet';

describe('useICOWallet', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockClickRef.getActiveAccountAsync.mockResolvedValue(null);
    mockClickRef.disconnect.mockResolvedValue(undefined);
    mockClickRef.signInWithAccount.mockResolvedValue(undefined);
  });

  // --- Initial state ---

  describe('initial state', () => {
    it('should start disconnected when no active account', () => {
      const { result } = renderHook(() => useICOWallet());

      expect(result.current.isConnected).toBe(false);
      expect(result.current.account).toBeNull();
      expect(result.current.isConnecting).toBe(false);
      expect(result.current.error).toBeNull();
    });

    it('should be connected if already signed in', async () => {
      mockClickRef.getActiveAccountAsync.mockResolvedValue({
        public_key: mockPublicKey,
        provider: mockProvider,
      });

      const { result } = renderHook(() => useICOWallet());

      // Mount IIFE awaits getActiveAccountAsync — flush before asserting.
      await waitFor(() => expect(result.current.isConnected).toBe(true));
      expect(result.current.account?.publicKey).toBe(mockPublicKey);
      expect(result.current.account?.provider).toBe(mockProvider);
    });

    it('should derive account hash from public key', async () => {
      mockClickRef.getActiveAccountAsync.mockResolvedValue({
        public_key: mockPublicKey,
        provider: mockProvider,
      });

      const { result } = renderHook(() => useICOWallet());

      await waitFor(() => expect(result.current.account?.accountHash).toContain('account-hash-'));
    });
  });

  // --- Event listeners ---

  describe('event listeners', () => {
    it('should register event listeners on mount', () => {
      renderHook(() => useICOWallet());

      expect(mockClickRef.on).toHaveBeenCalledWith('csprclick:signed_in', expect.any(Function));
      expect(mockClickRef.on).toHaveBeenCalledWith('csprclick:switched_account', expect.any(Function));
      expect(mockClickRef.on).toHaveBeenCalledWith('csprclick:signed_out', expect.any(Function));
      expect(mockClickRef.on).toHaveBeenCalledWith('csprclick:disconnected', expect.any(Function));
      expect(mockClickRef.on).toHaveBeenCalledWith('csprclick:ready', expect.any(Function));
      expect(mockClickRef.on).toHaveBeenCalledWith('csprclick:cancelled', expect.any(Function));
      expect(mockClickRef.on).toHaveBeenCalledWith('csprclick-w3a-google:connected', expect.any(Function));
      expect(mockClickRef.on).toHaveBeenCalledWith('csprclick-w3a-apple:connected', expect.any(Function));
      expect(mockClickRef.on).toHaveBeenCalledWith('csprclick:unsolicited_account_change', expect.any(Function));
    });

    it('should remove all event listeners on unmount', () => {
      const { unmount } = renderHook(() => useICOWallet());

      unmount();

      expect(mockClickRef.off).toHaveBeenCalledWith('csprclick:signed_in', expect.any(Function));
      expect(mockClickRef.off).toHaveBeenCalledWith('csprclick:switched_account', expect.any(Function));
      expect(mockClickRef.off).toHaveBeenCalledWith('csprclick:signed_out', expect.any(Function));
      expect(mockClickRef.off).toHaveBeenCalledWith('csprclick:disconnected', expect.any(Function));
      expect(mockClickRef.off).toHaveBeenCalledWith('csprclick:ready', expect.any(Function));
      expect(mockClickRef.off).toHaveBeenCalledWith('csprclick:cancelled', expect.any(Function));
      expect(mockClickRef.off).toHaveBeenCalledWith('csprclick-w3a-google:connected', expect.any(Function));
      expect(mockClickRef.off).toHaveBeenCalledWith('csprclick-w3a-apple:connected', expect.any(Function));
      expect(mockClickRef.off).toHaveBeenCalledWith('csprclick:unsolicited_account_change', expect.any(Function));
    });

    it('should handle signed_in event', () => {
      const { result } = renderHook(() => useICOWallet());

      // Get the signed_in handler
      const signedInCall = mockClickRef.on.mock.calls.find(
        (call) => call[0] === 'csprclick:signed_in'
      );
      const handleSignedIn = signedInCall?.[1];

      act(() => {
        handleSignedIn?.({
          account: {
            public_key: mockPublicKey,
            provider: mockProvider,
          },
        });
      });

      expect(result.current.isConnected).toBe(true);
      expect(result.current.account?.publicKey).toBe(mockPublicKey);
      expect(result.current.isConnecting).toBe(false);
      expect(result.current.error).toBeNull();
    });

    it('should handle switched_account event', () => {
      mockClickRef.getActiveAccountAsync.mockResolvedValue({
        public_key: mockPublicKey,
        provider: mockProvider,
      });

      const { result } = renderHook(() => useICOWallet());

      const newPublicKey = '02def456789abc123def456789abc123def456789abc123def456789abc123def4';

      // Get the switched_account handler
      const switchedCall = mockClickRef.on.mock.calls.find(
        (call) => call[0] === 'csprclick:switched_account'
      );
      const handleSwitched = switchedCall?.[1];

      act(() => {
        handleSwitched?.({
          account: {
            public_key: newPublicKey,
            provider: 'ledger',
          },
        });
      });

      expect(result.current.account?.publicKey).toBe(newPublicKey);
      expect(result.current.account?.provider).toBe('ledger');
    });

    it('should handle signed_out event', async () => {
      mockClickRef.getActiveAccountAsync.mockResolvedValue({
        public_key: mockPublicKey,
        provider: mockProvider,
      });

      const { result } = renderHook(() => useICOWallet());

      await waitFor(() => expect(result.current.isConnected).toBe(true));

      // Get the signed_out handler
      const signedOutCall = mockClickRef.on.mock.calls.find(
        (call) => call[0] === 'csprclick:signed_out'
      );
      const handleSignedOut = signedOutCall?.[1];

      act(() => {
        handleSignedOut?.();
      });

      expect(result.current.isConnected).toBe(false);
      expect(result.current.account).toBeNull();
    });

    it('should handle disconnected event', () => {
      mockClickRef.getActiveAccountAsync.mockResolvedValue({
        public_key: mockPublicKey,
        provider: mockProvider,
      });

      const { result } = renderHook(() => useICOWallet());

      // Get the disconnected handler
      const disconnectedCall = mockClickRef.on.mock.calls.find(
        (call) => call[0] === 'csprclick:disconnected'
      );
      const handleDisconnected = disconnectedCall?.[1];

      act(() => {
        handleDisconnected?.();
      });

      expect(result.current.isConnected).toBe(false);
      expect(result.current.account).toBeNull();
    });

    it('should handle ready event with active account (mobile redirect)', async () => {
      const { result } = renderHook(() => useICOWallet());

      // Simulate SDK becoming ready with an active account (mobile redirect flow)
      mockClickRef.getActiveAccountAsync.mockResolvedValue({
        public_key: mockPublicKey,
        provider: mockProvider,
      });

      const readyCall = mockClickRef.on.mock.calls.find(
        (call) => call[0] === 'csprclick:ready'
      );
      const handleReady = readyCall?.[1];

      await act(async () => {
        await handleReady?.();
      });

      expect(result.current.isConnected).toBe(true);
      expect(result.current.account?.publicKey).toBe(mockPublicKey);
      expect(result.current.account?.provider).toBe(mockProvider);
      expect(result.current.account?.accountHash).toContain('account-hash-');
      expect(result.current.isConnecting).toBe(false);
    });

    it('should handle ready event without active account', () => {
      const { result } = renderHook(() => useICOWallet());

      // SDK ready but no account connected
      mockClickRef.getActiveAccountAsync.mockResolvedValue(null);

      const readyCall = mockClickRef.on.mock.calls.find(
        (call) => call[0] === 'csprclick:ready'
      );
      const handleReady = readyCall?.[1];

      act(() => {
        handleReady?.();
      });

      expect(result.current.isConnected).toBe(false);
      expect(result.current.account).toBeNull();
    });

    it('should handle cancelled event and reset isConnecting', () => {
      const { result } = renderHook(() => useICOWallet());

      // Start connecting first
      act(() => {
        result.current.connect();
      });

      expect(result.current.isConnecting).toBe(true);

      // Simulate user cancelling the sign-in modal
      const cancelledCall = mockClickRef.on.mock.calls.find(
        (call) => call[0] === 'csprclick:cancelled'
      );
      const handleCancelled = cancelledCall?.[1];

      act(() => {
        handleCancelled?.();
      });

      expect(result.current.isConnecting).toBe(false);
      expect(result.current.isConnected).toBe(false);
      expect(result.current.account).toBeNull();
    });

    it('should handle social provider connected event by re-reading the active account', async () => {
      const { result } = renderHook(() => useICOWallet());

      // Social providers fire `...:connected` with no usable payload — the
      // account is read back via getActiveAccountAsync.
      const googleKey = '03abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789';
      mockClickRef.getActiveAccountAsync.mockResolvedValue({
        public_key: googleKey,
        provider: 'csprclick-w3a-google',
      });

      const socialCall = mockClickRef.on.mock.calls.find(
        (call) => call[0] === 'csprclick-w3a-google:connected'
      );
      const handleSocialConnected = socialCall?.[1];

      await act(async () => {
        await handleSocialConnected?.({});
      });

      expect(result.current.isConnected).toBe(true);
      expect(result.current.account?.publicKey).toBe(googleKey);
      expect(result.current.account?.provider).toBe('csprclick-w3a-google');
    });

    it('should restore the session on unsolicited account change', async () => {
      renderHook(() => useICOWallet());

      const evtAccount = { provider: mockProvider, public_key: mockPublicKey };

      const unsolicitedCall = mockClickRef.on.mock.calls.find(
        (call) => call[0] === 'csprclick:unsolicited_account_change'
      );
      const handleUnsolicited = unsolicitedCall?.[1];

      await act(async () => {
        await handleUnsolicited?.({ account: evtAccount });
      });

      expect(mockClickRef.signInWithAccount).toHaveBeenCalledWith(evtAccount);
    });
  });

  // --- Connect ---

  describe('connect', () => {
    it('should call signIn on clickRef', () => {
      const { result } = renderHook(() => useICOWallet());

      act(() => {
        result.current.connect();
      });

      expect(mockClickRef.signIn).toHaveBeenCalled();
    });

    it('should set error if signIn throws', () => {
      mockClickRef.signIn.mockImplementation(() => {
        throw new Error('Wallet not available');
      });

      const { result } = renderHook(() => useICOWallet());

      act(() => {
        result.current.connect();
      });

      expect(result.current.error).toBe('Wallet not available');
    });
  });

  // --- Disconnect ---

  describe('disconnect', () => {
    it('should call signOut on clickRef', async () => {
      mockClickRef.getActiveAccountAsync.mockResolvedValue({
        public_key: mockPublicKey,
        provider: mockProvider,
      });

      const { result } = renderHook(() => useICOWallet());

      await act(async () => {
        await result.current.disconnect();
      });

      expect(mockClickRef.signOut).toHaveBeenCalled();
    });

    it('should not throw if signOut fails', () => {
      mockClickRef.signOut.mockImplementation(() => {
        throw new Error('SignOut failed');
      });

      const { result } = renderHook(() => useICOWallet());

      expect(() => {
        act(() => {
          result.current.disconnect();
        });
      }).not.toThrow();
    });
  });

  // --- syncActiveAccount ---

  describe('syncActiveAccount', () => {
    it('should connect to the active account read from the SDK', async () => {
      const { result } = renderHook(() => useICOWallet());

      mockClickRef.getActiveAccountAsync.mockResolvedValue({
        public_key: mockPublicKey,
        provider: 'csprclick-w3a-google',
      });

      await act(async () => {
        await result.current.syncActiveAccount();
      });

      expect(result.current.isConnected).toBe(true);
      expect(result.current.account?.publicKey).toBe(mockPublicKey);
      expect(result.current.account?.provider).toBe('csprclick-w3a-google');
    });

    it('should no-op when there is no active account', async () => {
      const { result } = renderHook(() => useICOWallet());

      mockClickRef.getActiveAccountAsync.mockResolvedValue(null);

      await act(async () => {
        await result.current.syncActiveAccount();
      });

      expect(result.current.isConnected).toBe(false);
      expect(result.current.account).toBeNull();
    });
  });

  // --- clickRef exposure ---

  describe('clickRef', () => {
    it('should expose clickRef for direct SDK access', () => {
      const { result } = renderHook(() => useICOWallet());

      expect(result.current.clickRef).toBe(mockClickRef);
    });
  });
});
