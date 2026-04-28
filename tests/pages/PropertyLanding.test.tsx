import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import PropertyLanding from '@/pages/PropertyLanding';
import { Toaster } from '@/components/ui/toaster';
import { FEATURED_PROPERTIES } from '@/data/featuredProperties';

const mockNavigate = vi.fn();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

// Real LandingHeader, FeaturedProperties and use-toast are rendered. Toaster is
// mounted alongside so toast assertions hit real DOM (real app mounts it in
// App.tsx; tests need their own instance).
function renderPage() {
  return render(
    <MemoryRouter>
      <PropertyLanding />
      <Toaster />
    </MemoryRouter>
  );
}

describe('PropertyLanding', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('rendering', () => {
    it('renders hero heading', () => {
      renderPage();
      expect(screen.getByRole('heading', { level: 1, name: /find your.*dream home/i })).toBeInTheDocument();
    });

    it('mounts LandingHeader', () => {
      renderPage();
      // Real header is a <header> element with the LeaseFi brand link
      expect(screen.getByRole('banner')).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /leasefi/i })).toBeInTheDocument();
    });

    it('mounts FeaturedProperties section with real data', () => {
      renderPage();
      // FeaturedProperties renders one card per FEATURED_PROPERTIES entry,
      // each with aria-label="View details for {title}"
      const cards = screen.getAllByRole('button', { name: /view details for/i });
      expect(cards).toHaveLength(FEATURED_PROPERTIES.length);
      expect(screen.getByText(FEATURED_PROPERTIES[0].title)).toBeInTheDocument();
    });

    it('renders all four stat cards with their numeric values', () => {
      renderPage();
      expect(screen.getByText('50K+')).toBeInTheDocument();
      expect(screen.getByText('25K+')).toBeInTheDocument();
      expect(screen.getByText('500+')).toBeInTheDocument();
      expect(screen.getByText('99%')).toBeInTheDocument();
    });

    it('renders all four stat labels', () => {
      renderPage();
      expect(screen.getByText('Properties Listed')).toBeInTheDocument();
      expect(screen.getByText('Happy Clients')).toBeInTheDocument();
      expect(screen.getByText('Expert Agents')).toBeInTheDocument();
      expect(screen.getByText('Success Rate')).toBeInTheDocument();
    });
  });

  describe('navigation', () => {
    it('"Explore Properties" navigates to /listings', () => {
      renderPage();
      fireEvent.click(screen.getByRole('button', { name: /explore properties/i }));
      expect(mockNavigate).toHaveBeenCalledWith('/listings');
    });

    it('"Start Your Search" CTA also navigates to /listings', () => {
      renderPage();
      fireEvent.click(screen.getByRole('button', { name: /start your search/i }));
      expect(mockNavigate).toHaveBeenCalledWith('/listings');
    });
  });

  describe('demo / consultation actions', () => {
    it('"Watch Demo" surfaces the "coming soon" toast in the DOM', async () => {
      renderPage();
      fireEvent.click(screen.getByRole('button', { name: /watch demo/i }));
      expect(await screen.findByText(/demo coming soon/i)).toBeInTheDocument();
    });

    it('"Schedule Consultation" surfaces the "coming soon" toast in the DOM', async () => {
      renderPage();
      fireEvent.click(screen.getByRole('button', { name: /schedule consultation/i }));
      expect(await screen.findByText(/consultation coming soon/i)).toBeInTheDocument();
    });
  });
});
