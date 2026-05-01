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
      expect(
        screen.getByRole('heading', { level: 1, name: /find your.*dream home/i }),
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

    it('mounts FeaturedProperties section with real data', () => {
      renderPage();
      // FeaturedProperties renders one card per FEATURED_PROPERTIES entry,
      // each with aria-label="View details for {title}"
      const cards = screen.getAllByRole('button', { name: /view details for/i });
      expect(cards, 'should render one card per FEATURED_PROPERTIES entry').toHaveLength(
        FEATURED_PROPERTIES.length
      );
      expect(
        screen.getByText(FEATURED_PROPERTIES[0].title),
        'first featured property title should be visible'
      ).toBeInTheDocument();
    });

    it('renders all four stat cards with their numeric values', () => {
      renderPage();
      expect(screen.getByText('50K+'), 'Properties Listed stat value should be 50K+').toBeInTheDocument();
      expect(screen.getByText('25K+'), 'Happy Clients stat value should be 25K+').toBeInTheDocument();
      expect(screen.getByText('500+'), 'Expert Agents stat value should be 500+').toBeInTheDocument();
      expect(screen.getByText('99%'), 'Success Rate stat value should be 99%').toBeInTheDocument();
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
      fireEvent.click(screen.getByRole('button', { name: /explore properties/i }));
      expect(
        mockNavigate,
        '"Explore Properties" CTA should navigate to /listings'
      ).toHaveBeenCalledWith('/listings');
    });

    it('"Start Your Search" CTA also navigates to /listings', () => {
      renderPage();
      fireEvent.click(screen.getByRole('button', { name: /start your search/i }));
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
      fireEvent.click(screen.getByRole('button', { name: /schedule consultation/i }));
      expect(
        await screen.findByText(/consultation coming soon/i),
        '"Schedule Consultation" should surface a "coming soon" toast'
      ).toBeInTheDocument();
    });
  });
});
