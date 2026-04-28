import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import FeaturedProperties from '@/components/FeaturedProperties';
import { FEATURED_PROPERTIES } from '@/data/featuredProperties';

const mockNavigate = vi.fn();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

const [first, second] = FEATURED_PROPERTIES;

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
      expect(screen.getByText(first.title)).toBeInTheDocument();
      expect(screen.getByText(second.title)).toBeInTheDocument();
    });

    it('renders property rent', () => {
      renderComponent();
      expect(screen.getByText(new RegExp(first.rent.toLocaleString()))).toBeInTheDocument();
      expect(screen.getByText(new RegExp(second.rent.toLocaleString()))).toBeInTheDocument();
    });

    it('renders property images with alt text', () => {
      renderComponent();
      expect(screen.getByAltText(first.title)).toBeInTheDocument();
      expect(screen.getByAltText(second.title)).toBeInTheDocument();
    });
  });

  describe('card navigation', () => {
    it('navigates to property detail on card click', () => {
      renderComponent();
      fireEvent.click(screen.getByText(first.title));
      expect(mockNavigate).toHaveBeenCalledWith(
        `/properties/${first.id}`,
        { state: { property: first } }
      );
    });

    it('navigates to correct id for second card', () => {
      renderComponent();
      fireEvent.click(screen.getByText(second.title));
      expect(mockNavigate).toHaveBeenCalledWith(
        `/properties/${second.id}`,
        { state: { property: second } }
      );
    });

    it('navigates on Enter key press', () => {
      renderComponent();
      const card = screen.getByRole('button', {
        name: new RegExp(`view details for ${first.title}`, 'i'),
      });
      fireEvent.keyDown(card, { key: 'Enter' });
      expect(mockNavigate).toHaveBeenCalledWith(
        `/properties/${first.id}`,
        { state: { property: first } }
      );
    });

    it('navigates on Space key press', () => {
      renderComponent();
      const card = screen.getByRole('button', {
        name: new RegExp(`view details for ${first.title}`, 'i'),
      });
      fireEvent.keyDown(card, { key: ' ' });
      expect(mockNavigate).toHaveBeenCalledWith(
        `/properties/${first.id}`,
        { state: { property: first } }
      );
    });

    it('does not navigate on other key press', () => {
      renderComponent();
      const card = screen.getByRole('button', {
        name: new RegExp(`view details for ${first.title}`, 'i'),
      });
      fireEvent.keyDown(card, { key: 'Tab' });
      expect(mockNavigate).not.toHaveBeenCalled();
    });
  });

  describe('favorite button', () => {
    it('heart button click does not trigger card navigation (stopPropagation)', () => {
      renderComponent();
      const firstCard = screen
        .getByRole('button', { name: new RegExp(`view details for ${first.title}`, 'i') })
        .closest('.group') as HTMLElement;
      const heartButton = within(firstCard).getByRole('button', {
        name: new RegExp(`save ${first.title} to favorites`, 'i'),
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
