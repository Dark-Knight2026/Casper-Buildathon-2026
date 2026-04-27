import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import PropertyLanding from '@/pages/PropertyLanding';

const mockNavigate = vi.fn();
const mockToast = vi.fn();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({ toast: mockToast }),
}));

vi.mock('@/components/LandingHeader', () => ({
  default: () => <header data-testid="landing-header">LandingHeader</header>,
}));

vi.mock('@/components/FeaturedProperties', () => ({
  default: () => <div data-testid="featured-properties">FeaturedProperties</div>,
}));

function renderPage() {
  return render(
    <MemoryRouter>
      <PropertyLanding />
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
      expect(screen.getByTestId('landing-header')).toBeInTheDocument();
    });

    it('mounts FeaturedProperties section', () => {
      renderPage();
      expect(screen.getByTestId('featured-properties')).toBeInTheDocument();
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
    it('"Watch Demo" triggers a toast notification', () => {
      renderPage();
      fireEvent.click(screen.getByRole('button', { name: /watch demo/i }));
      expect(mockToast).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Demo coming soon',
        })
      );
    });

    it('"Schedule Consultation" triggers a toast notification', () => {
      renderPage();
      fireEvent.click(screen.getByRole('button', { name: /schedule consultation/i }));
      expect(mockToast).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Consultation coming soon',
        })
      );
    });
  });
});
