import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';

import { FeaturedProperties } from '@/components/FeaturedProperties';
import { FEATURED_PROPERTIES } from '@/data/featuredProperties';

const mockNavigate = vi.fn();

vi.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
}));

const [first, second] = FEATURED_PROPERTIES;

function renderComponent() {
  return render(<FeaturedProperties />);
}

describe('FeaturedProperties', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('rendering', () => {
    it('renders all property cards', () => {
      renderComponent();
      expect(
        screen.getByText(first.title),
        'first featured property title should be rendered'
      ).toBeInTheDocument();
      expect(
        screen.getByText(second.title),
        'second featured property title should be rendered'
      ).toBeInTheDocument();
    });

    it('renders property rent', () => {
      renderComponent();
      expect(
        screen.getByText(new RegExp(first.rent.toLocaleString())),
        'first property rent value should be visible'
      ).toBeInTheDocument();
      expect(
        screen.getByText(new RegExp(second.rent.toLocaleString())),
        'second property rent value should be visible'
      ).toBeInTheDocument();
    });

    it('renders property images with alt text', () => {
      renderComponent();
      expect(
        screen.getByAltText(first.title),
        'first property image should expose the title as alt text'
      ).toBeInTheDocument();
      expect(
        screen.getByAltText(second.title),
        'second property image should expose the title as alt text'
      ).toBeInTheDocument();
    });
  });

  describe('card navigation', () => {
    it('navigates to property detail on card click', () => {
      renderComponent();
      fireEvent.click(screen.getByText(first.title));
      expect(
        mockNavigate,
        'card click should navigate to /properties/{id} with property in router state'
      ).toHaveBeenCalledWith(`/properties/${first.id}`, { state: { property: first } });
    });

    it('navigates to correct id for second card', () => {
      renderComponent();
      fireEvent.click(screen.getByText(second.title));
      expect(
        mockNavigate,
        'second card click should navigate using the second property id'
      ).toHaveBeenCalledWith(`/properties/${second.id}`, { state: { property: second } });
    });

    it('navigates on Enter key press', () => {
      renderComponent();
      const card = screen.getByRole('button', {
        name: new RegExp(`view details for ${first.title}`, 'i'),
      });
      fireEvent.keyDown(card, { key: 'Enter' });
      expect(
        mockNavigate,
        'Enter key on focused card should trigger navigation'
      ).toHaveBeenCalledWith(`/properties/${first.id}`, { state: { property: first } });
    });

    it('navigates on Space key press', () => {
      renderComponent();
      const card = screen.getByRole('button', {
        name: new RegExp(`view details for ${first.title}`, 'i'),
      });
      fireEvent.keyDown(card, { key: ' ' });
      expect(
        mockNavigate,
        'Space key on focused card should trigger navigation'
      ).toHaveBeenCalledWith(`/properties/${first.id}`, { state: { property: first } });
    });

    it('does not navigate on other key press', () => {
      renderComponent();
      const card = screen.getByRole('button', {
        name: new RegExp(`view details for ${first.title}`, 'i'),
      });
      fireEvent.keyDown(card, { key: 'Tab' });
      expect(
        mockNavigate,
        'non-activation keys (e.g. Tab) should not trigger navigation'
      ).not.toHaveBeenCalled();
    });
  });

  describe('save button', () => {
    it('save button click does not trigger card navigation (stopPropagation)', () => {
      renderComponent();
      const firstCard = screen
        .getByRole('button', { name: new RegExp(`view details for ${first.title}`, 'i') })
        .closest('.group') as HTMLElement;
      const saveButton = within(firstCard).getByRole('button', {
        name: /save property/i,
      });
      fireEvent.click(saveButton);
      expect(
        mockNavigate,
        'save-property button click must stopPropagation and not navigate the card'
      ).not.toHaveBeenCalled();
    });

    it('cards are keyboard focusable (tabIndex=0)', () => {
      renderComponent();
      const cards = screen.getAllByRole('button', { name: /view details for/i });
      cards.forEach((card) => {
        expect(card, 'each card should be keyboard focusable (tabindex="0")').toHaveAttribute(
          'tabindex',
          '0'
        );
      });
    });
  });
});
