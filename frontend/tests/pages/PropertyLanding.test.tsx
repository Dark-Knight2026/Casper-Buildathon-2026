import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import { MemoryRouter } from 'react-router-dom';

import PropertyLanding from '@/pages/PropertyLanding';
import { Toaster } from '@/components/ui/toaster';
import { searchListings } from '@/services/listingService';
import type { Listing } from '@/types/listingContract';

const mockNavigate = vi.fn();

vi.mock('react-router-dom', async () => {
  const actual =
    await vi.importActual<typeof import('react-router-dom')>(
      'react-router-dom'
    );
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

// LandingHeader (rendered inside PropertyLanding) calls useAuth — stub it so
// the AuthProvider isn't required in tests.
vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({ profile: null }),
}));

// FeaturedProperties now fetches real active listings via GET /listings (PL-28).
vi.mock('@/services/listingService', () => ({
  searchListings: vi.fn(),
}));

// Minimal active rent_ltr listing with just the fields `listingToCard` reads.
function makeListing(id: string, title: string): Listing {
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
      rentMonthly: 2000,
      securityDeposit: 2000,
      leaseTermsOffered: ['1 Year'],
      furnished: false,
    },
    media: [],
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

const FEATURED = [
  makeListing('listing-aaa', 'Featured Loft A'),
  makeListing('listing-bbb', 'Featured Loft B'),
  makeListing('listing-ccc', 'Featured Loft C'),
];

// Real LandingHeader, FeaturedProperties and use-toast are rendered. Toaster is
// mounted alongside so toast assertions hit real DOM (real app mounts it in
// App.tsx; tests need their own instance). FeaturedProperties → PropertyCard →
// SavePropertyButton reads favorite ids via react-query, so a QueryClient must
// be in scope (the query stays disabled for a guest).
function renderPage() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <PropertyLanding />
        <Toaster />
      </MemoryRouter>
    </QueryClientProvider>
  );
}

describe('PropertyLanding', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(searchListings).mockResolvedValue({
      data: FEATURED,
      itemCount: FEATURED.length,
      pageCount: 1,
    });
  });

  describe('rendering', () => {
    it('renders hero heading', () => {
      renderPage();
      expect(
        screen.getByRole('heading', {
          level: 1,
          name: /find your.*dream home/i,
        }),
        'hero <h1> "Find your dream home" should be rendered'
      ).toBeInTheDocument();
    });

    it('mounts LandingHeader', () => {
      renderPage();
      // Real header is a <header> element with the LeaseFi brand link
      expect(
        screen.getByRole('banner'),
        'LandingHeader <header role="banner"> should be mounted'
      ).toBeInTheDocument();
      expect(
        screen.getByRole('link', { name: /leasefi/i }),
        'LandingHeader brand link should be present'
      ).toBeInTheDocument();
    });

    it('mounts FeaturedProperties section with fetched listings', async () => {
      renderPage();
      // FeaturedProperties fetches active listings (PL-28) and renders one card
      // per result, each with aria-label="View details for {title}".
      const cards = await screen.findAllByRole('button', {
        name: /view details for/i,
      });
      expect(
        cards,
        'should render one card per fetched active listing'
      ).toHaveLength(FEATURED.length);
      expect(
        screen.getByText(FEATURED[0].title),
        'first fetched listing title should be visible'
      ).toBeInTheDocument();
    });

    it('renders all four stat cards with their numeric values', () => {
      renderPage();
      expect(
        screen.getByText('50K+'),
        'Properties Listed stat value should be 50K+'
      ).toBeInTheDocument();
      expect(
        screen.getByText('25K+'),
        'Happy Clients stat value should be 25K+'
      ).toBeInTheDocument();
      expect(
        screen.getByText('500+'),
        'Expert Agents stat value should be 500+'
      ).toBeInTheDocument();
      expect(
        screen.getByText('99%'),
        'Success Rate stat value should be 99%'
      ).toBeInTheDocument();
    });

    it('renders all four stat labels', () => {
      renderPage();
      expect(
        screen.getByText('Properties Listed'),
        '"Properties Listed" stat label should be visible'
      ).toBeInTheDocument();
      expect(
        screen.getByText('Happy Clients'),
        '"Happy Clients" stat label should be visible'
      ).toBeInTheDocument();
      expect(
        screen.getByText('Expert Agents'),
        '"Expert Agents" stat label should be visible'
      ).toBeInTheDocument();
      expect(
        screen.getByText('Success Rate'),
        '"Success Rate" stat label should be visible'
      ).toBeInTheDocument();
    });
  });

  describe('navigation', () => {
    it('"Explore Properties" navigates to /listings', () => {
      renderPage();
      fireEvent.click(
        screen.getByRole('button', { name: /explore properties/i })
      );
      expect(
        mockNavigate,
        '"Explore Properties" CTA should navigate to /listings'
      ).toHaveBeenCalledWith('/listings');
    });

    it('"Start Your Search" CTA also navigates to /listings', () => {
      renderPage();
      fireEvent.click(
        screen.getByRole('button', { name: /start your search/i })
      );
      expect(
        mockNavigate,
        '"Start Your Search" CTA should navigate to /listings'
      ).toHaveBeenCalledWith('/listings');
    });
  });

  describe('demo / consultation actions', () => {
    it('"Watch Demo" surfaces the "coming soon" toast in the DOM', async () => {
      renderPage();
      fireEvent.click(screen.getByRole('button', { name: /watch demo/i }));
      expect(
        await screen.findByText(/demo coming soon/i),
        '"Watch Demo" should surface a "coming soon" toast'
      ).toBeInTheDocument();
    });

    it('"Schedule Consultation" surfaces the "coming soon" toast in the DOM', async () => {
      renderPage();
      fireEvent.click(
        screen.getByRole('button', { name: /schedule consultation/i })
      );
      expect(
        await screen.findByText(/consultation coming soon/i),
        '"Schedule Consultation" should surface a "coming soon" toast'
      ).toBeInTheDocument();
    });
  });
});
