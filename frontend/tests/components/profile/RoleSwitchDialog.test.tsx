import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

// ── Mocks ───────────────────────────────────────────────────────────────────
// Mock at the seam: the dialog's job is to translate the wallet-reauth gate
// and the service result into user-facing copy. We stub the gate, the service
// call, navigation, and toast so each scenario is deterministic. The Radix
// Select is swapped for a native <select> so a role can be chosen without
// jsdom pointer-event polyfills.
//
// Hoisting note (mirrors tests/pages/tenant/TenantProfile.test.tsx): `vi.mock`
// factories close over these module-scope mocks, which are initialised before
// the mocked modules are first imported.

const toastMock = vi.fn();
vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({ toast: toastMock }),
}));

const navigateMock = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual =
    await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return { ...actual, useNavigate: () => navigateMock };
});

const runAndReauthMock = vi.fn();
const resetMock = vi.fn();
let reauthState: import('@/hooks/auth/useReauthGate').ReauthState = {
  status: 'idle',
};
vi.mock('@/hooks/auth/useSensitiveAction', () => ({
  useSensitiveAction: () => ({
    runAndReauth: runAndReauthMock,
    state: reauthState,
    reset: resetMock,
  }),
}));

const patchMyRoleMock = vi.fn();
vi.mock('@/services/userProfileService', async () => {
  const actual = await vi.importActual<
    typeof import('@/services/userProfileService')
  >('@/services/userProfileService');
  return {
    ...actual,
    patchMyRole: (...args: unknown[]) => patchMyRoleMock(...args),
  };
});

vi.mock('@/components/ui/select', async () => {
  const { createElement } = await import('react');
  type Node = import('react').ReactNode;
  const Select = (p: {
    value?: string;
    onValueChange: (v: string) => void;
    disabled?: boolean;
    children?: Node;
  }) =>
    createElement(
      'select',
      {
        'data-testid': 'role-select',
        value: p.value ?? '',
        disabled: p.disabled,
        onChange: (e: { target: { value: string } }) =>
          p.onValueChange(e.target.value),
      },
      p.children,
    );
  const SelectTrigger = () => null;
  const SelectValue = () => null;
  const SelectContent = (p: { children?: Node }) => p.children;
  const SelectItem = (p: { value: string; children?: Node }) =>
    createElement('option', { value: p.value }, p.children);
  return { Select, SelectTrigger, SelectValue, SelectContent, SelectItem };
});

import { ApiError } from '@/lib/api-client';
import { ProfileApiErrorCode } from '@/lib/api-errors';
import { RoleSwitchDialog } from '@/components/profile/RoleSwitchDialog';

const renderDialog = (
  override: {
    currentRole?: string;
    open?: boolean;
    onOpenChange?: (open: boolean) => void;
  } = {},
) =>
  render(
    <MemoryRouter>
      <RoleSwitchDialog
        open
        onOpenChange={() => {}}
        currentRole="tenant"
        {...override}
      />
    </MemoryRouter>,
  );

const selectRole = (value: string) =>
  fireEvent.change(screen.getByTestId('role-select'), { target: { value } });

const clickSwitch = () =>
  fireEvent.click(screen.getByRole('button', { name: /switch role/i }));

beforeEach(() => {
  vi.clearAllMocks();
  reauthState = { status: 'idle' };
});

describe('RoleSwitchDialog', () => {
  it('runs the role change through the reauth gate and shows a success toast', async () => {
    runAndReauthMock.mockResolvedValueOnce(undefined);
    renderDialog();

    selectRole('landlord');
    clickSwitch();

    await waitFor(() =>
      expect(toastMock).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Role switched',
          description: expect.stringContaining('landlord'),
        }),
      ),
    );
    // The service call is wrapped by the reauth gate, not called directly.
    const thunk = runAndReauthMock.mock.calls[0][0] as () => unknown;
    thunk();
    expect(patchMyRoleMock).toHaveBeenCalledWith('landlord');
  });

  it('429 rate_limited → human-readable copy, never the raw token', async () => {
    runAndReauthMock.mockRejectedValueOnce(
      new ApiError(
        'rate_limited',
        429,
        undefined,
        ProfileApiErrorCode.RateLimited,
      ),
    );
    renderDialog();

    selectRole('landlord');
    clickSwitch();

    await waitFor(() =>
      expect(toastMock).toHaveBeenCalledWith(
        expect.objectContaining({
          variant: 'destructive',
          title: 'Role switch unavailable',
          description: 'You can only change your role once per 24 hours.',
        }),
      ),
    );
  });

  it('409 active_leases_blocking → CTA that navigates to the leases page', async () => {
    runAndReauthMock.mockRejectedValueOnce(
      new ApiError(
        'active_leases_blocking',
        409,
        undefined,
        ProfileApiErrorCode.ActiveLeasesBlocking,
      ),
    );
    renderDialog();

    selectRole('landlord');
    clickSwitch();

    await waitFor(() => expect(toastMock).toHaveBeenCalled());
    const calls = toastMock.mock.calls as Array<
      [{ title?: string; action?: unknown }]
    >;
    const blocking = calls.find(
      ([arg]) => arg.title === 'Active leases block this change',
    );
    expect(blocking).toBeTruthy();
    const action = blocking![0].action as {
      props: { altText: string; onClick: () => void; children: unknown };
    };
    expect(action.props.altText).toBe('Review your leases');
    expect(action.props.children).toBe('Review leases');
    action.props.onClick();
    // currentRole is "tenant" → tenant leases surface.
    expect(navigateMock).toHaveBeenCalledWith('/tenant/leases');
  });

  it('reauth-gate error surfaces inline, not as a destructive toast', () => {
    reauthState = { status: 'error', reason: 'cancelled' };
    renderDialog();

    expect(
      screen.getByText(
        'Wallet signature was dismissed. Try again to switch roles.',
      ),
    ).toBeInTheDocument();
    expect(toastMock).not.toHaveBeenCalled();
  });

  it('disables the form and shows progress while awaiting the wallet signature', () => {
    reauthState = { status: 'awaiting-signature' };
    renderDialog();

    expect(
      screen.getByRole('button', { name: /waiting for signature/i }),
    ).toBeDisabled();
    expect(screen.getByTestId('role-select')).toBeDisabled();
    expect(
      screen.getByText('Confirm with your wallet to continue.'),
    ).toBeInTheDocument();
  });
});
