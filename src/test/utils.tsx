/**
 * Testing Utilities
 * Helper functions for testing React components
 */

import React, { ReactElement } from 'react';
import { render, RenderOptions } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Create a custom render function that includes providers
const AllTheProviders = ({ children }: { children: React.ReactNode }) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>{children}</BrowserRouter>
    </QueryClientProvider>
  );
};

const customRender = (
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
) => render(ui, { wrapper: AllTheProviders, ...options });

export * from '@testing-library/react';
export { customRender as render };

/**
 * Wait for async operations to complete
 */
export const waitForAsync = () =>
  new Promise((resolve) => setTimeout(resolve, 0));

/**
 * Mock user object for testing
 */
export const mockUser = {
  id: 'test-user-id',
  email: 'test@example.com',
  role: 'tenant' as const,
  created_at: new Date().toISOString(),
};

/**
 * Mock profile object for testing
 */
export const mockProfile = {
  id: 'test-profile-id',
  user_id: 'test-user-id',
  full_name: 'Test User',
  email: 'test@example.com',
  phone: '+1234567890',
  role: 'tenant' as const,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

/**
 * Mock payment object for testing
 */
export const mockPayment = {
  id: 'test-payment-id',
  leaseId: 'test-lease-id',
  tenantId: 'test-tenant-id',
  amount: 1500,
  paymentMethod: 'credit_card' as const,
  paymentStatus: 'completed' as const,
  transactionId: 'txn_123456',
  paymentDate: new Date(),
  createdAt: new Date(),
  updatedAt: new Date(),
};

/**
 * Mock lease object for testing
 */
export const mockLease = {
  id: 'test-lease-id',
  propertyId: 'test-property-id',
  landlordId: 'test-landlord-id',
  tenantIds: ['test-tenant-id'],
  startDate: new Date(),
  endDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
  monthlyRent: 1500,
  securityDeposit: 1500,
  status: 'active' as const,
  createdAt: new Date(),
  updatedAt: new Date(),
};

/**
 * Mock maintenance request object for testing
 */
export const mockMaintenanceRequest = {
  id: 'test-request-id',
  propertyId: 'test-property-id',
  tenantId: 'test-tenant-id',
  landlordId: 'test-landlord-id',
  title: 'Leaking faucet',
  description: 'Kitchen faucet is leaking',
  priority: 'medium' as const,
  status: 'open' as const,
  category: 'plumbing' as const,
  createdAt: new Date(),
  updatedAt: new Date(),
};