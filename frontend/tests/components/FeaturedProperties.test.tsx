import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import { FeaturedProperties } from '@/components/FeaturedProperties';
import { AuthContext } from '@/contexts/AuthContextDefinition';
import { searchListings } from '@/services/listingService';
import type { Listing } from '@/types/listingContract';

const mockNavigate = vi.fn();

vi.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
}));

vi.mock('@/services/listingService', () => ({
  searchListings: vi.fn(),
}));

// Minimal active rent_ltr listing with just the fields `listingToCard` reads.
function makeListing(id: string, title: string, rentMonthly: number): Listing {
  return {
    id,
    propertyId: `prop-${id}`,
    listedBy: 'landlord-1',
    intent: 'rent_ltr',
    state: 'active',
    daysOnMarket: 3,
    expiresAt: null,
    title,
    description: 'A nice place.',
    amenities: [],
    utilitiesIncluded: [],
    petPolicy: null,
    availableDate: null,
    terms: {
      rentMonthly,
      securityDeposit: rentMonthly,
      leaseTermsOffered: ['1 Year'],
      furnished: false,
    },
    media: [
      {
        id: `${id}-m1`,
        url: `https://cdn.test/${id}.jpg`,
        cid: null,
        position: 0,
        moderationStatus: 'approved',
      },
    ],
    provenance: {
      identityVerified: true,
      authorityTier: 'T1',
      authorityLabel: 'Documents on file',
      managedByPm: false,
      fairHousingCleared: true,
      verifiedListerBadge: true,
    },
    onChain: null,
    views: 0,
    createdAt: '2026-06-01T00:00:00Z',
    updatedAt: '2026-06-01T00:00:00Z',
    property: {
      id: `prop-${id}`,
      addressLine1: `${id} Main St`,
      city: 'Austin',
      stateOrProvince: 'TX',
      postalCode: '78701',
      propertyType: 'apartment',
      bedroomsTotal: 2,
      bathroomsTotal: 1,
      livingArea: 900,
      parkingFeatures: [],
    },
  } as unknown as Listing;
}

const first = makeListing('listing-aaa', 'Featured Loft A', 2100);
const second = makeListing('listing-bbb', 'Featured Loft B', 2600);

// PropertyCard renders SavePropertyButton → useAuthPrompt → useAuth, which
// throws unless an AuthContext is present. Supply a guest value directly.
const guestAuthValue = {
  profile: null,
  loading: false,
  setSession: vi.fn(),
  signOut: vi.fn(),
  setWalletSession: vi.fn(),
  updateProfile: vi.fn().mockResolvedValue(undefined),
  refreshProfile: vi.fn().mockResolvedValue(undefined),
  walletSignOut: vi.fn(),
};

function renderComponent() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <AuthContext.Provider value={guestAuthValue}>
        <FeaturedProperties />
      </AuthContext.Provider>
    </QueryClientProvider>
  );
}

describe('FeaturedProperties', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(searchListings).mockResolvedValue({
      data: [first, second],
      itemCount: 2,
      pageCount: 1,
    });
  });

  describe('rendering', () => {
    it('fetches active listings and renders a card per listing', async () => {
      renderComponent();
      expect(await screen.findByText(first.title)).toBeInTheDocument();
      expect(screen.getByText(second.title)).toBeInTheDocument();
      expect(searchListings).toHaveBeenCalledOnce();
    });

    it('renders the listing rent', async () => {
      renderComponent();
      expect(
        await screen.findByText(new RegExp((2100).toLocaleString()))
      ).toBeInTheDocument();
      expect(
        screen.getByText(new RegExp((2600).toLocaleString()))
      ).toBeInTheDocument();
    });

    it('renders nothing when there are no active listings', async () => {
      vi.mocked(searchListings).mockResolvedValue({
        data: [],
        itemCount: 0,
        pageCount: 0,
      });
      const { container } = renderComponent();
      // Wait for the query to resolve — the loading spinner clears to nothing.
      await vi.waitFor(() => expect(container).toBeEmptyDOMElement());
    });

    it('renders nothing on error', async () => {
      vi.mocked(searchListings).mockRejectedValue(new Error('boom'));
      const { container } = renderComponent();
      await vi.waitFor(() => expect(container).toBeEmptyDOMElement());
    });
  });

  describe('card navigation', () => {
    it('navigates to /properties/{id} with the listing in router state', async () => {
      renderComponent();
      fireEvent.click(await screen.findByText(first.title));
      expect(mockNavigate).toHaveBeenCalledWith(`/properties/${first.id}`, {
        state: { listing: first },
      });
    });

    it('uses the correct id for the second card', async () => {
      renderComponent();
      fireEvent.click(await screen.findByText(second.title));
      expect(mockNavigate).toHaveBeenCalledWith(`/properties/${second.id}`, {
        state: { listing: second },
      });
    });

    it('navigates on Enter key press', async () => {
      renderComponent();
      await screen.findByText(first.title);
      const card = screen.getByRole('button', {
        name: new RegExp(`view details for ${first.title}`, 'i'),
      });
      fireEvent.keyDown(card, { key: 'Enter' });
      expect(mockNavigate).toHaveBeenCalledWith(`/properties/${first.id}`, {
        state: { listing: first },
      });
    });
  });

  describe('save button', () => {
    it('save-button click does not navigate the card (stopPropagation)', async () => {
      renderComponent();
      await screen.findByText(first.title);
      const firstCard = screen
        .getByRole('button', {
          name: new RegExp(`view details for ${first.title}`, 'i'),
        })
        .closest('.group') as HTMLElement;
      const saveButton = within(firstCard).getByRole('button', {
        name: /save property/i,
      });
      fireEvent.click(saveButton);
      expect(mockNavigate).not.toHaveBeenCalled();
    });
  });
});
