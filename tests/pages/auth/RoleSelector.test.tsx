import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { RoleSelector } from '@/pages/auth/register/RoleSelector';

describe('RoleSelector', () => {
  describe('rendering', () => {
    it('renders both Tenant and Landlord options', () => {
      render(<RoleSelector value="tenant" onChange={vi.fn()} />);
      expect(
        screen.getByRole('radio', { name: /tenant/i }),
        'Tenant radio option must be present'
      ).toBeInTheDocument();
      expect(
        screen.getByRole('radio', { name: /landlord/i }),
        'Landlord radio option must be present'
      ).toBeInTheDocument();
    });

    it('marks the value-prop role as checked', () => {
      render(<RoleSelector value="landlord" onChange={vi.fn()} />);
      const landlord = screen.getByRole('radio', { name: /landlord/i });
      expect(
        landlord,
        'Landlord must reflect the controlled value=landlord prop'
      ).toBeChecked();
      const tenant = screen.getByRole('radio', { name: /tenant/i });
      expect(tenant, 'Tenant must NOT be checked when value=landlord').not.toBeChecked();
    });

    it('shows the "set during first connection" hint when isConnected', () => {
      render(<RoleSelector value="tenant" onChange={vi.fn()} isConnected />);
      expect(
        screen.getByText(/set during first connection/i),
        'a hint must explain why role is locked once a wallet is attached'
      ).toBeInTheDocument();
    });

    it('does not show the hint before connection', () => {
      render(<RoleSelector value="tenant" onChange={vi.fn()} />);
      expect(
        screen.queryByText(/set during first connection/i),
        'no lock hint while wallet is unconnected — role is still editable'
      ).toBeNull();
    });
  });

  describe('interaction', () => {
    it('calls onChange("landlord") when the Landlord option is clicked', () => {
      const onChange = vi.fn();
      render(<RoleSelector value="tenant" onChange={onChange} />);
      fireEvent.click(screen.getByRole('radio', { name: /landlord/i }));
      expect(
        onChange,
        'clicking Landlord must propagate the new role through the controlled-component callback'
      ).toHaveBeenCalledWith('landlord');
    });

    it('calls onChange("tenant") when the Tenant option is clicked from landlord', () => {
      const onChange = vi.fn();
      render(<RoleSelector value="landlord" onChange={onChange} />);
      fireEvent.click(screen.getByRole('radio', { name: /tenant/i }));
      expect(onChange, 'switching back to Tenant must fire onChange').toHaveBeenCalledWith(
        'tenant'
      );
    });

    it('does not fire onChange when disabled', () => {
      const onChange = vi.fn();
      render(<RoleSelector value="tenant" onChange={onChange} disabled />);
      fireEvent.click(screen.getByRole('radio', { name: /landlord/i }));
      expect(
        onChange,
        'when disabled (e.g. wallet already connected) clicks must be inert'
      ).not.toHaveBeenCalled();
    });
  });
});
