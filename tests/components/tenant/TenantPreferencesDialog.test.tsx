import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';

import { TenantPreferencesDialog } from '@/components/tenant/TenantPreferencesDialog';
import { Toaster } from '@/components/ui/toaster';
import { EMPTY_PREFERENCES } from '@/data/tenantPreferences';
import type { RentalPreferences } from '@/types/tenantPreferences';

// Toaster is mounted alongside the dialog so toast assertions hit real DOM
// (real app mounts it in App.tsx; tests need their own instance). use-toast
// is project-owned, so it is rendered for real rather than mocked.
function renderDialog(overrides: Partial<RentalPreferences> = {}) {
  const onSave = vi.fn();
  const onOpenChange = vi.fn();
  const initial: RentalPreferences = { ...EMPTY_PREFERENCES, ...overrides };
  render(
    <>
      <TenantPreferencesDialog
        open
        onOpenChange={onOpenChange}
        initialPreferences={initial}
        onSave={onSave}
      />
      <Toaster />
    </>
  );
  return { onSave, onOpenChange };
}

describe('TenantPreferencesDialog', () => {
  describe('budget', () => {
    it('writes min and max into the saved payload', () => {
      const { onSave, onOpenChange } = renderDialog();

      fireEvent.change(screen.getByLabelText(/^min$/i), { target: { value: '1500' } });
      fireEvent.change(screen.getByLabelText(/^max$/i), { target: { value: '2500' } });
      fireEvent.click(screen.getByRole('button', { name: /save preferences/i }));

      expect(
        onSave,
        'controlled inputs must reach the parent through the save callback'
      ).toHaveBeenCalledWith(
        expect.objectContaining({ budgetMin: 1500, budgetMax: 2500 })
      );
      expect(
        onOpenChange,
        'successful save closes the dialog so the user lands back on the previous surface'
      ).toHaveBeenCalledWith(false);
    });

    it('blocks saving when min exceeds max and surfaces an error toast', async () => {
      const { onSave, onOpenChange } = renderDialog();

      fireEvent.change(screen.getByLabelText(/^min$/i), { target: { value: '3000' } });
      fireEvent.change(screen.getByLabelText(/^max$/i), { target: { value: '2000' } });
      fireEvent.click(screen.getByRole('button', { name: /save preferences/i }));

      expect(
        onSave,
        'invalid range must NOT propagate to the store — preserves data integrity'
      ).not.toHaveBeenCalled();
      expect(onOpenChange, 'dialog stays open so the user can correct the range').not.toHaveBeenCalledWith(false);
      expect(
        await screen.findByText(/budget range is invalid/i),
        'rejection toast must surface so the user knows why save was blocked'
      ).toBeInTheDocument();
    });
  });

  describe('locations chip input', () => {
    it('adds a city/state pair as a chip', () => {
      const { onSave } = renderDialog();

      fireEvent.change(screen.getByLabelText(/^city$/i), { target: { value: 'Norfolk' } });
      fireEvent.change(screen.getByLabelText(/^state$/i), { target: { value: 'VA' } });
      fireEvent.click(screen.getByRole('button', { name: /add location/i }));
      fireEvent.click(screen.getByRole('button', { name: /save preferences/i }));

      expect(
        onSave,
        'the Add button must commit the typed pair to the locations list'
      ).toHaveBeenCalledWith(
        expect.objectContaining({
          locations: [{ city: 'Norfolk', state: 'VA' }],
        })
      );
    });

    it('removes a chip via the X button', () => {
      const { onSave } = renderDialog({ locations: [{ city: 'Norfolk', state: 'VA' }] });

      fireEvent.click(screen.getByRole('button', { name: /remove norfolk, va/i }));
      fireEvent.click(screen.getByRole('button', { name: /save preferences/i }));

      expect(
        onSave,
        'removing a chip must mutate the saved list, not just hide the badge'
      ).toHaveBeenCalledWith(
        expect.objectContaining({ locations: [] })
      );
    });

    it('disables the Add button until both fields are filled', () => {
      renderDialog();
      const addButton = screen.getByRole('button', { name: /add location/i });
      expect(
        addButton,
        'partial inputs would create malformed locations — disable the trigger'
      ).toBeDisabled();

      fireEvent.change(screen.getByLabelText(/^city$/i), { target: { value: 'Norfolk' } });
      expect(addButton, 'still disabled — state not provided').toBeDisabled();

      fireEvent.change(screen.getByLabelText(/^state$/i), { target: { value: 'VA' } });
      expect(addButton, 'enabled once both inputs carry text').toBeEnabled();
    });
  });

  describe('property types', () => {
    it('toggles a checkbox into the saved list', () => {
      const { onSave } = renderDialog();

      fireEvent.click(screen.getByRole('checkbox', { name: /^condo$/i }));
      fireEvent.click(screen.getByRole('button', { name: /save preferences/i }));

      expect(
        onSave,
        'clicking the type checkbox must add it to propertyTypes'
      ).toHaveBeenCalledWith(
        expect.objectContaining({ propertyTypes: ['Condo'] })
      );
    });
  });

  describe('reset', () => {
    it('Clear all wipes every field back to EMPTY_PREFERENCES on save', () => {
      const { onSave } = renderDialog({
        budgetMin: 1000,
        budgetMax: 2000,
        bedroomsMin: 2,
        locations: [{ city: 'Norfolk', state: 'VA' }],
        propertyTypes: ['Condo'],
      });

      fireEvent.click(screen.getByRole('button', { name: /clear all/i }));
      fireEvent.click(screen.getByRole('button', { name: /save preferences/i }));

      expect(
        onSave,
        'Clear all must produce a payload deep-equal to EMPTY_PREFERENCES so a known baseline is saved'
      ).toHaveBeenCalledWith(EMPTY_PREFERENCES);
    });
  });

  describe('cancel', () => {
    it('Cancel closes without invoking onSave', () => {
      const { onSave, onOpenChange } = renderDialog();

      fireEvent.change(screen.getByLabelText(/^min$/i), { target: { value: '1500' } });
      fireEvent.click(screen.getByRole('button', { name: /^cancel$/i }));

      expect(
        onSave,
        'cancelling discards the draft — no persistence side-effect'
      ).not.toHaveBeenCalled();
      expect(onOpenChange).toHaveBeenCalledWith(false);
    });
  });

  describe('amenities', () => {
    it('toggles an amenity into the saved list', () => {
      const { onSave } = renderDialog();

      // Amenity checkboxes share names with the property-type list, so we
      // scope to the Must-have amenities fieldset to disambiguate.
      const fieldset = screen.getByText(/must-have amenities/i).closest('fieldset')!;
      fireEvent.click(within(fieldset).getByRole('checkbox', { name: /^pool$/i }));
      fireEvent.click(screen.getByRole('button', { name: /save preferences/i }));

      expect(
        onSave,
        'amenity toggle must reach amenities[] — drives BE matcher\'s amenity score'
      ).toHaveBeenCalledWith(
        expect.objectContaining({ amenities: ['Pool'] })
      );
    });
  });

  describe('edge cases', () => {
    it('saves an all-blank payload without rejecting — no fields are required', () => {
      const { onSave, onOpenChange } = renderDialog();

      // No interactions before save — the form opens against EMPTY_PREFERENCES
      // and the tenant just clicks Save. This must succeed because
      // RentalPreferences fields are intentionally all nullable / empty-list
      // tolerant (a half-filled form is a valid state).
      fireEvent.click(screen.getByRole('button', { name: /save preferences/i }));

      expect(
        onSave,
        'all-blank save must produce EMPTY_PREFERENCES — drives the implicit-fallback branch downstream'
      ).toHaveBeenCalledWith(EMPTY_PREFERENCES);
      expect(onOpenChange, 'successful blank save still closes the dialog').toHaveBeenCalledWith(false);
    });

    it('saves a partial payload with only budget filled, leaving every other field empty', () => {
      const { onSave } = renderDialog();

      fireEvent.change(screen.getByLabelText(/^min$/i), { target: { value: '1500' } });
      fireEvent.change(screen.getByLabelText(/^max$/i), { target: { value: '2500' } });
      fireEvent.click(screen.getByRole('button', { name: /save preferences/i }));

      expect(
        onSave,
        'partial preferences must persist exactly what the tenant entered — no auto-fill from defaults'
      ).toHaveBeenCalledWith({
        ...EMPTY_PREFERENCES,
        budgetMin: 1500,
        budgetMax: 2500,
      });
    });

    it('does not add a duplicate location chip when the same city/state is entered twice', () => {
      const { onSave } = renderDialog({ locations: [{ city: 'Norfolk', state: 'VA' }] });

      fireEvent.change(screen.getByLabelText(/^city$/i), { target: { value: 'Norfolk' } });
      fireEvent.change(screen.getByLabelText(/^state$/i), { target: { value: 'VA' } });
      fireEvent.click(screen.getByRole('button', { name: /add location/i }));
      fireEvent.click(screen.getByRole('button', { name: /save preferences/i }));

      expect(
        onSave,
        'duplicate location must be deduped — adding the same chip twice would double-weight the BE matcher'
      ).toHaveBeenCalledWith(
        expect.objectContaining({
          locations: [{ city: 'Norfolk', state: 'VA' }],
        })
      );
    });
  });
});
