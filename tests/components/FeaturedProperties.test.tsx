import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import FeaturedProperties from '@/components/FeaturedProperties';

const mockNavigate = vi.fn();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

// vi.hoisted ensures this value is available when vi.mock factory below is hoisted
const { MOCK_PROPERTIES } = vi.hoisted(() => ({
  MOCK_PROPERTIES: [
    {
      id: 'prop-1',
      landlordId: 'landlord-1',
      title: 'Modern Downtown Apartment',
      description: 'A modern apartment in the heart of downtown.',
      address: '100 Main St',
      city: 'Austin',
      state: 'TX',
      zipCode: '78701',
      latitude: 30.267,
      longitude: -97.743,
      propertyType: 'Apartment',
      bedrooms: 2,
      bathrooms: 1,
      squareFeet: 900,
      rent: 2200,
      securityDeposit: 4400,
      availableDate: new Date('2026-05-01'),
      leaseTerms: ['12 months'],
      amenities: ['Gym', 'Rooftop'],
      petPolicy: 'No pets',
      petsAllowed: false,
      furnished: false,
      utilitiesIncluded: [] as string[],
      parkingAvailable: true,
      images: ['/assets/property-1.jpg'],
      status: 'active' as const,
      views: 50,
      createdAt: new Date('2026-01-01'),
      updatedAt: new Date('2026-04-01'),
      priceChange: '+2.5%',
      rating: 4.7,
      daysOnMarket: 10,
      photoCount: 8,
    },
    {
      id: 'prop-2',
      landlordId: 'landlord-2',
      title: 'Cozy Studio Loft',
      description: 'A cozy studio with great natural light.',
      address: '200 Oak Ave',
      city: 'Denver',
      state: 'CO',
      zipCode: '80202',
      latitude: 39.739,
      longitude: -104.984,
      propertyType: 'Studio',
      bedrooms: 0,
      bathrooms: 1,
      squareFeet: 500,
      rent: 1400,
      securityDeposit: 2800,
      availableDate: new Date('2026-06-01'),
      leaseTerms: ['6 months', '12 months'],
      amenities: ['Parking'],
      petPolicy: 'Cats allowed',
      petsAllowed: true,
      furnished: true,
      utilitiesIncluded: ['Water'],
      parkingAvailable: true,
      images: ['/assets/property-2.jpg'],
      status: 'active' as const,
      views: 30,
      createdAt: new Date('2026-02-01'),
      updatedAt: new Date('2026-04-01'),
      priceChange: '-1.0%',
      rating: 4.3,
      daysOnMarket: 5,
      photoCount: 5,
    },
  ],
}));

vi.mock('@/data/featuredProperties', () => ({
  FEATURED_PROPERTIES: MOCK_PROPERTIES,
}));

function renderComponent() {
  return render(
    <MemoryRouter>
      <FeaturedProperties />
    </MemoryRouter>
  );
}

describe('FeaturedProperties', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('rendering', () => {
    it('renders all property cards', () => {
      renderComponent();
      expect(screen.getByText('Modern Downtown Apartment')).toBeInTheDocument();
      expect(screen.getByText('Cozy Studio Loft')).toBeInTheDocument();
    });

    it('renders property rent', () => {
      renderComponent();
      expect(screen.getByText(/2,200/)).toBeInTheDocument();
      expect(screen.getByText(/1,400/)).toBeInTheDocument();
    });

    it('renders property images with alt text', () => {
      renderComponent();
      expect(screen.getByAltText('Modern Downtown Apartment')).toBeInTheDocument();
      expect(screen.getByAltText('Cozy Studio Loft')).toBeInTheDocument();
    });
  });

  describe('card navigation', () => {
    it('navigates to property detail on card click', () => {
      renderComponent();
      fireEvent.click(screen.getByText('Modern Downtown Apartment'));
      expect(mockNavigate).toHaveBeenCalledWith(
        '/properties/prop-1',
        { state: { property: MOCK_PROPERTIES[0] } }
      );
    });

    it('navigates to correct id for second card', () => {
      renderComponent();
      fireEvent.click(screen.getByText('Cozy Studio Loft'));
      expect(mockNavigate).toHaveBeenCalledWith(
        '/properties/prop-2',
        { state: { property: MOCK_PROPERTIES[1] } }
      );
    });

    it('navigates on Enter key press', () => {
      renderComponent();
      const card = screen.getByRole('button', { name: /view details for modern downtown apartment/i });
      fireEvent.keyDown(card, { key: 'Enter' });
      expect(mockNavigate).toHaveBeenCalledWith(
        '/properties/prop-1',
        { state: { property: MOCK_PROPERTIES[0] } }
      );
    });

    it('navigates on Space key press', () => {
      renderComponent();
      const card = screen.getByRole('button', { name: /view details for modern downtown apartment/i });
      fireEvent.keyDown(card, { key: ' ' });
      expect(mockNavigate).toHaveBeenCalledWith(
        '/properties/prop-1',
        { state: { property: MOCK_PROPERTIES[0] } }
      );
    });

    it('does not navigate on other key press', () => {
      renderComponent();
      const card = screen.getByRole('button', { name: /view details for modern downtown apartment/i });
      fireEvent.keyDown(card, { key: 'Tab' });
      expect(mockNavigate).not.toHaveBeenCalled();
    });
  });

  describe('favorite button', () => {
    it('heart button click does not trigger card navigation (stopPropagation)', () => {
      renderComponent();
      const firstCard = screen
        .getByRole('button', { name: /view details for modern downtown apartment/i })
        .closest('.group') as HTMLElement;
      const heartButton = within(firstCard).getByRole('button', {
        name: /save modern downtown apartment to favorites/i,
      });
      fireEvent.click(heartButton);
      expect(mockNavigate).not.toHaveBeenCalled();
    });

    it('cards are keyboard focusable (tabIndex=0)', () => {
      renderComponent();
      const cards = screen.getAllByRole('button', { name: /view details for/i });
      cards.forEach((card) => {
        expect(card).toHaveAttribute('tabindex', '0');
      });
    });
  });
});
