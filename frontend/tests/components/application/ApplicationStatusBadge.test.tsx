import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ApplicationStatusBadge } from '@/components/application/ApplicationStatusBadge';
import type { ApplicationStatus } from '@/types/applicationContract';

describe('ApplicationStatusBadge', () => {
  it.each<[ApplicationStatus, string]>([
    ['approved', 'Approved'],
    ['conditional', 'Conditional'],
    ['rejected', 'Rejected'],
    ['under_review', 'Under review'],
    ['draft', 'Draft'],
    ['pending', 'Pending'],
  ])('renders %s as "%s"', (status, label) => {
    render(<ApplicationStatusBadge status={status} />);
    expect(screen.getByText(label)).toBeInTheDocument();
  });
});
