import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

// ── Mocks ──────────────────────────────────────────────────────────────────
//
// We mock at the seam between TenantProfile and the rest of the app so the
// test only exercises the page's own logic (validation, optimistic preview,
// save payload shape, error-code → copy mapping).
//
// Hoisting note: `vi.mock` calls hoist above imports, but the factory closes
// over module-scope variables. We expose helpers (`setProfileMock`,
// `mockUploadAvatar`, etc.) below so each test sets up scenario inputs
// without redefining the mocks.

const refreshProfileMock = vi.fn();
const updateProfileMock = vi.fn();
let profileFixture: ReturnType<typeof makeProfile> | null = null;

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({
    profile: profileFixture,
    refreshProfile: refreshProfileMock,
    updateProfile: updateProfileMock,
    walletSignOut: vi.fn(),
  }),
}));

const mockUploadAvatar = vi.fn();
vi.mock('@/services/userProfileService', async () => {
  const actual = await vi.importActual<typeof import('@/services/userProfileService')>(
    '@/services/userProfileService',
  );
  return {
    ...actual,
    uploadAvatar: (...args: unknown[]) => mockUploadAvatar(...args),
  };
});

// The preferences hook talks to an in-memory store; for this page test we
// only need a stable return value so the section can render.
vi.mock('@/hooks/useTenantPreferences', () => ({
  useTenantPreferences: () => ({
    preferences: {
      budgetMin: null,
      budgetMax: null,
      bedroomsMin: null,
      bathroomsMin: null,
      squareFeetMin: null,
      locations: [],
      propertyTypes: [],
      amenities: [],
    },
    hasExplicitPreferences: false,
    updatePreferences: vi.fn(),
  }),
}));

// Replace the heavy preferences + role-switch dialogs with stubs so they don't
// pull their own dependency trees into this page-level test. Their full
// behaviour is covered in their own component tests.
vi.mock('@/components/tenant/TenantPreferencesDialog', () => ({
  TenantPreferencesDialog: () => null,
}));
vi.mock('@/components/profile/RoleSwitchDialog', () => ({
  RoleSwitchDialog: () => null,
}));

import { TenantProfile } from '@/pages/tenant/TenantProfile';
import { Toaster } from '@/components/ui/toaster';
import { ApiError } from '@/lib/api-client';

// ── Helpers ────────────────────────────────────────────────────────────────

interface ProfileShape {
  id: string;
  role: string;
  firstName: string;
  lastName: string;
  phone?: string;
  bio?: string;
  email: string;
  avatar?: string;
  status?: 'active';
  activeLeasesCount: number;
  createdAt: Date;
  updatedAt: Date;
  walletAddress?: string;
  isProfileComplete: boolean;
}

function makeProfile(overrides: Partial<ProfileShape> = {}): ProfileShape {
  return {
    id: 'u-1',
    role: 'tenant',
    firstName: 'Ada',
    lastName: 'Lovelace',
    phone: '555-1212',
    bio: 'demo bio',
    email: 'ada@example.com',
    activeLeasesCount: 1,
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-02-01'),
    isProfileComplete: true,
    ...overrides,
  };
}

function renderProfile() {
  return render(
    <MemoryRouter>
      <TenantProfile />
      <Toaster />
    </MemoryRouter>,
  );
}

// File constructor accepts a string blob; `type` is what MIME-validation reads
// and `size` is auto-derived from byte length. For the 5 MB cap test we
// override `size` via Object.defineProperty since allocating a 5 MB buffer
// just to hit the branch is wasteful.
function fakeFile(name: string, type: string, size?: number): File {
  const file = new File(['x'], name, { type });
  if (size !== undefined) {
    Object.defineProperty(file, 'size', { value: size });
  }
  return file;
}

beforeEach(() => {
  profileFixture = makeProfile();
  refreshProfileMock.mockReset();
  refreshProfileMock.mockResolvedValue(undefined);
  updateProfileMock.mockReset();
  updateProfileMock.mockResolvedValue(undefined);
  mockUploadAvatar.mockReset();
  // Polyfill URL.createObjectURL / revokeObjectURL for jsdom (not implemented
  // by default). Track invocations so the optimistic-preview tests can assert
  // both creation and cleanup happen.
  Object.defineProperty(URL, 'createObjectURL', {
    configurable: true,
    value: vi.fn(() => 'blob:fake'),
  });
  Object.defineProperty(URL, 'revokeObjectURL', {
    configurable: true,
    value: vi.fn(),
  });
});

// ── Tests ──────────────────────────────────────────────────────────────────

describe('TenantProfile — avatar validation', () => {
  it('rejects an unsupported MIME type before any network call', async () => {
    renderProfile();
    const input = document.querySelector<HTMLInputElement>('input[type=file]')!;
    const gif = fakeFile('cat.gif', 'image/gif', 1024);
    fireEvent.change(input, { target: { files: [gif] } });

    await waitFor(() =>
      expect(
        screen.getByText(/unsupported image format/i),
        'GIF is outside the accepted PNG/JPEG/WebP set — must be rejected client-side before the wasted multipart round-trip'
      ).toBeInTheDocument(),
    );
    expect(
      mockUploadAvatar,
      'client-side MIME check must short-circuit — server enforcement is a defense-in-depth backstop, not the first line'
    ).not.toHaveBeenCalled();
  });

  it('rejects files larger than the 5 MB cap', async () => {
    renderProfile();
    const input = document.querySelector<HTMLInputElement>('input[type=file]')!;
    const oversize = fakeFile('huge.png', 'image/png', 5 * 1024 * 1024 + 1);
    fireEvent.change(input, { target: { files: [oversize] } });

    await waitFor(() =>
      expect(
        screen.getByText(/image too large/i),
        '5 MB cap matches the server limit — exceeding it client-side must be flagged before upload'
      ).toBeInTheDocument(),
    );
    expect(mockUploadAvatar).not.toHaveBeenCalled();
  });
});

describe('TenantProfile — avatar happy path', () => {
  it('shows the optimistic blob URL, uploads, then refreshes and revokes', async () => {
    mockUploadAvatar.mockResolvedValueOnce({ avatar_url: 'https://cdn/u-1.png' });

    renderProfile();
    const input = document.querySelector<HTMLInputElement>('input[type=file]')!;
    const file = fakeFile('avatar.png', 'image/png', 2048);
    fireEvent.change(input, { target: { files: [file] } });

    // The page swaps the avatar to a blob URL immediately, before the server
    // round-trip resolves — that is the "optimistic preview" contract.
    await waitFor(() => {
      const img = document.querySelector<HTMLImageElement>('img[alt$="avatar" i], img[src^="blob:"]');
      expect(img?.src, 'blob: preview must render before uploadAvatar resolves').toContain('blob:');
    });

    expect(mockUploadAvatar, 'service receives the raw File, not the optimistic URL').toHaveBeenCalledWith(file);
    await waitFor(() =>
      expect(
        refreshProfileMock,
        'on success the page MUST trigger a /me refresh so the canonical avatar_url replaces the blob preview'
      ).toHaveBeenCalled(),
    );

    // revokeObjectURL is called twice: once when the optimistic state is
    // cleared inside the success branch, once when the effect cleanup runs.
    // We only assert at least one call landed — the exact count is an
    // implementation detail.
    expect(
      URL.revokeObjectURL,
      'blob URL must be revoked once the server URL is in place — otherwise the browser keeps the file in memory'
    ).toHaveBeenCalled();
  });
});

describe('TenantProfile — avatar error mapping', () => {
  it('maps 413 (PayloadTooLarge) to the size-specific toast', async () => {
    mockUploadAvatar.mockRejectedValueOnce(new ApiError('payload too large', 413));
    renderProfile();
    const input = document.querySelector<HTMLInputElement>('input[type=file]')!;
    fireEvent.change(input, { target: { files: [fakeFile('a.png', 'image/png', 2048)] } });

    await waitFor(() =>
      expect(
        screen.getByText(/image is too large.*5 mb/i),
        '413 has a size-specific copy — falling back to the raw server message would lose the 5 MB hint'
      ).toBeInTheDocument(),
    );
  });

  it('maps 415 (UnsupportedMediaType) to the format-specific toast', async () => {
    // MIME check is client-side, so 415 only fires when the server's magic-byte
    // sniff disagrees with the browser-reported type (e.g. renamed file).
    mockUploadAvatar.mockRejectedValueOnce(new ApiError('bad media', 415));
    renderProfile();
    const input = document.querySelector<HTMLInputElement>('input[type=file]')!;
    fireEvent.change(input, { target: { files: [fakeFile('a.png', 'image/png', 2048)] } });

    await waitFor(() =>
      expect(screen.getByText(/PNG, JPEG, or WebP/i)).toBeInTheDocument(),
    );
  });

  it('maps 429 (TooManyRequests) to the rate-limit toast', async () => {
    mockUploadAvatar.mockRejectedValueOnce(new ApiError('rate limited', 429));
    renderProfile();
    const input = document.querySelector<HTMLInputElement>('input[type=file]')!;
    fireEvent.change(input, { target: { files: [fakeFile('a.png', 'image/png', 2048)] } });

    await waitFor(() =>
      expect(screen.getByText(/too many uploads/i)).toBeInTheDocument(),
    );
  });
});

describe('TenantProfile — profile save', () => {
  it('disables Save when firstName or lastName is empty (server contract)', () => {
    renderProfile();
    const firstName = screen.getByLabelText(/first name/i);
    fireEvent.change(firstName, { target: { value: '   ' } });

    expect(
      screen.getByRole('button', { name: /save changes/i }),
      'whitespace-only firstName would 400 on the server — UI must short-circuit the round-trip'
    ).toBeDisabled();
  });

  it('omits phone from the payload when blank, sends trimmed fields otherwise', async () => {
    renderProfile();
    fireEvent.change(screen.getByLabelText(/first name/i), { target: { value: '  Ada  ' } });
    fireEvent.change(screen.getByLabelText(/last name/i), { target: { value: 'Lovelace' } });
    fireEvent.change(screen.getByLabelText(/phone/i), { target: { value: '   ' } });
    fireEvent.click(screen.getByRole('button', { name: /save changes/i }));

    await waitFor(() => expect(updateProfileMock).toHaveBeenCalled());
    const payload = updateProfileMock.mock.calls[0][0];
    expect(payload.firstName, 'firstName must be trimmed — leading/trailing spaces would distort the displayed name').toBe('Ada');
    expect(payload.lastName).toBe('Lovelace');
    expect(
      'phone' in payload,
      'blank phone must be omitted entirely — sending "" tells the server to wipe the column (rejected with 400)'
    ).toBe(false);
  });
});

describe('TenantProfile — load failures', () => {
  it('falls back to initials when the avatar URL fails to load', () => {
    profileFixture = makeProfile({ avatar: 'https://cdn/broken.png' });
    const { container } = renderProfile();
    const img = container.querySelector('img');
    expect(img).toBeTruthy();

    fireEvent.error(img!);

    // After error the img is removed and the initials block shows up.
    expect(
      within(container).getByText(/AL/),
      'broken avatar must fall back to initials instead of leaving the browser-rendered broken-image alt text'
    ).toBeInTheDocument();
  });
});
