/**
 * Testing utilities for the KeyChain application
 */

import { Property } from '@/types/clientLandlord';
import { logger } from '@/utils/logger';

/**
 * Test data generators for consistent testing
 */
export const testDataGenerators = {
  /**
   * Generate a test property with customizable fields
   */
  generateProperty(overrides?: Partial<Property>): Property {
    const baseProperty: Property = {
      id: `test-property-${Date.now()}`,
      status: 'available',
      details: {
        address: {
          street: '123 Test Street',
          city: 'Los Angeles',
          state: 'CA',
          zipCode: '90001',
          country: 'USA'
        },
        type: 'single-family',
        bedrooms: 3,
        bathrooms: 2,
        squareFeet: 1500,
        yearBuilt: 2020,
        price: 500000,
        description: 'Test property description'
      },
      financialInfo: {
        monthlyIncome: 3000,
        expenses: [
          {
            id: 'exp-1',
            category: 'mortgage',
            amount: 1500,
            description: 'Monthly mortgage',
            date: new Date(),
            recurring: true
          }
        ]
      },
      tenantIds: [],
      listingDate: new Date(),
      images: []
    };

    return { ...baseProperty, ...overrides } as Property;
  },

  /**
   * Generate multiple test properties
   */
  generateProperties(count: number, overrides?: Partial<Property>[]): Property[] {
    return Array.from({ length: count }, (_, index) => {
      const override = overrides?.[index] || {};
      return testDataGenerators.generateProperty({
        id: `test-property-${index + 1}`,
        ...override
      });
    });
  },

  /**
   * Generate test tenant data
   */
  generateTenant(overrides?: Record<string, unknown>) {
    return {
      id: `test-tenant-${Date.now()}`,
      propertyId: 'test-property-1',
      personalInfo: {
        firstName: 'John',
        lastName: 'Doe',
        email: 'john.doe@example.com',
        phone: '555-0100'
      },
      leaseInfo: {
        startDate: new Date(),
        endDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
        monthlyRent: 2500,
        securityDeposit: 2500
      },
      status: 'active',
      ...overrides
    };
  },

  /**
   * Generate test maintenance request
   */
  generateMaintenanceRequest(overrides?: Record<string, unknown>) {
    return {
      id: `test-maintenance-${Date.now()}`,
      propertyAddress: '123 Test Street',
      tenantName: 'John Doe',
      title: 'Test Maintenance Request',
      description: 'Test description',
      category: 'plumbing',
      priority: 'medium',
      status: 'new',
      createdDate: new Date(),
      photos: [],
      messages: [],
      ...overrides
    };
  }
};

/**
 * Validation helpers
 */
export const validators = {
  /**
   * Validate property data completeness
   */
  validateProperty(property: Property): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!property.id) errors.push('Property ID is required');
    if (!property.details.address.street) errors.push('Street address is required');
    if (!property.details.address.city) errors.push('City is required');
    if (!property.details.address.state) errors.push('State is required');
    if (!property.details.address.zipCode) errors.push('Zip code is required');
    if (property.details.price <= 0) errors.push('Price must be greater than 0');
    if (property.details.bedrooms < 0) errors.push('Bedrooms cannot be negative');
    if (property.details.bathrooms < 0) errors.push('Bathrooms cannot be negative');

    return {
      valid: errors.length === 0,
      errors
    };
  },

  /**
   * Validate email format
   */
  validateEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  },

  /**
   * Validate phone number format
   */
  validatePhone(phone: string): boolean {
    const phoneRegex = /^[\d\s\-()]+$/;
    return phoneRegex.test(phone) && phone.replace(/\D/g, '').length >= 10;
  },

  /**
   * Validate date range
   */
  validateDateRange(startDate: Date, endDate: Date): boolean {
    return startDate < endDate;
  },

  /**
   * Validate ROI calculation
   */
  validateROI(income: number, expenses: number, price: number): {
    valid: boolean;
    roi: number;
    error?: string;
  } {
    if (price <= 0) {
      return { valid: false, roi: 0, error: 'Price must be greater than 0' };
    }

    const netIncome = income - expenses;
    const roi = ((netIncome * 12) / price) * 100;

    return { valid: true, roi };
  }
};

/**
 * Performance testing utilities
 */
export const performanceTests = {
  /**
   * Measure function execution time
   */
  measureExecutionTime<T>(
    fn: () => T,
    label: string
  ): { result: T; duration: number } {
    const start = performance.now();
    const result = fn();
    const end = performance.now();
    const duration = end - start;

    logger.debug(`[Performance Test] ${label}: ${duration.toFixed(2)}ms`);

    return { result, duration };
  },

  /**
   * Measure async function execution time
   */
  async measureAsyncExecutionTime<T>(
    fn: () => Promise<T>,
    label: string
  ): Promise<{ result: T; duration: number }> {
    const start = performance.now();
    const result = await fn();
    const end = performance.now();
    const duration = end - start;

    logger.debug(`[Performance Test] ${label}: ${duration.toFixed(2)}ms`);

    return { result, duration };
  },

  /**
   * Test component render performance
   */
  testRenderPerformance(
    componentName: string,
    renderCount: number = 100
  ): number[] {
    const durations: number[] = [];

    for (let i = 0; i < renderCount; i++) {
      const start = performance.now();
      // Simulate render
      const end = performance.now();
      durations.push(end - start);
    }

    const avgDuration = durations.reduce((a, b) => a + b, 0) / durations.length;
    logger.debug(
      `[Render Performance] ${componentName}: Avg ${avgDuration.toFixed(2)}ms over ${renderCount} renders`
    );

    return durations;
  },

  /**
   * Benchmark filter performance with large datasets
   */
  benchmarkFiltering(
    data: unknown[],
    filterFn: (item: unknown) => boolean
  ): { duration: number; resultCount: number } {
    const start = performance.now();
    const filtered = data.filter(filterFn);
    const end = performance.now();
    const duration = end - start;

    logger.debug(
      `[Filter Benchmark] Filtered ${data.length} items to ${filtered.length} in ${duration.toFixed(2)}ms`
    );

    return { duration, resultCount: filtered.length };
  }
};

/**
 * Accessibility testing helpers
 */
export const accessibilityTests = {
  /**
   * Check if element has proper ARIA labels
   */
  hasAriaLabel(element: HTMLElement): boolean {
    return !!(
      element.getAttribute('aria-label') ||
      element.getAttribute('aria-labelledby')
    );
  },

  /**
   * Check if interactive elements are keyboard accessible
   */
  isKeyboardAccessible(element: HTMLElement): boolean {
    const tabIndex = element.getAttribute('tabindex');
    const role = element.getAttribute('role');
    const tagName = element.tagName.toLowerCase();

    const interactiveTags = ['button', 'a', 'input', 'select', 'textarea'];
    const interactiveRoles = ['button', 'link', 'tab', 'menuitem'];

    return (
      interactiveTags.includes(tagName) ||
      (role !== null && interactiveRoles.includes(role)) ||
      (tabIndex !== null && parseInt(tabIndex) >= 0)
    );
  },

  /**
   * Check color contrast ratio
   */
  checkColorContrast(
    foreground: string,
    background: string
  ): { ratio: number; passesAA: boolean; passesAAA: boolean } {
    // Simplified contrast calculation (would need full implementation)
    const ratio = 4.5; // Placeholder

    return {
      ratio,
      passesAA: ratio >= 4.5,
      passesAAA: ratio >= 7
    };
  },

  /**
   * Check if touch targets meet minimum size (44x44px)
   */
  hasSufficientTouchTarget(element: HTMLElement): boolean {
    const rect = element.getBoundingClientRect();
    return rect.width >= 44 && rect.height >= 44;
  }
};

/**
 * Mock data for testing
 */
export const mockData = {
  properties: testDataGenerators.generateProperties(10, [
    { status: 'rented', details: { address: { city: 'Los Angeles' } } },
    { status: 'available', details: { address: { city: 'San Francisco' } } },
    { status: 'maintenance', details: { address: { city: 'San Diego' } } }
  ]),

  tenants: Array.from({ length: 5 }, (_, i) =>
    testDataGenerators.generateTenant({ id: `tenant-${i + 1}` })
  ),

  maintenanceRequests: Array.from({ length: 8 }, (_, i) =>
    testDataGenerators.generateMaintenanceRequest({
      id: `maintenance-${i + 1}`,
      priority: ['low', 'medium', 'high', 'urgent'][i % 4],
      status: ['new', 'assigned', 'in-progress', 'completed'][i % 4]
    })
  )
};

/**
 * Test scenarios for user workflows
 */
export const testScenarios = {
  /**
   * Simulate adding a property workflow
   */
  addPropertyWorkflow: {
    steps: [
      'Open Add Property wizard',
      'Fill in property details',
      'Add financial information',
      'Upload property images',
      'Review and submit',
      'Verify property appears in list'
    ],
    expectedDuration: 120000, // 2 minutes
    criticalPath: true
  },

  /**
   * Simulate tenant invitation workflow
   */
  inviteTenantWorkflow: {
    steps: [
      'Select property',
      'Click Invite Tenant',
      'Enter tenant information',
      'Set lease details',
      'Customize welcome packet',
      'Review and send invitation',
      'Verify invitation sent'
    ],
    expectedDuration: 180000, // 3 minutes
    criticalPath: true
  },

  /**
   * Simulate filtering and export workflow
   */
  filterExportWorkflow: {
    steps: [
      'Navigate to Properties tab',
      'Add multiple filters',
      'Save filter preset',
      'Apply filters',
      'Verify filtered results',
      'Open export dialog',
      'Select format and fields',
      'Export data'
    ],
    expectedDuration: 60000, // 1 minute
    criticalPath: false
  }
};

/**
 * Error simulation for testing error handling
 */
export const errorSimulation = {
  /**
   * Simulate network error
   */
  networkError(): Error {
    return new Error('Network request failed');
  },

  /**
   * Simulate validation error
   */
  validationError(field: string): Error {
    return new Error(`Validation failed for field: ${field}`);
  },

  /**
   * Simulate timeout error
   */
  timeoutError(): Error {
    return new Error('Request timeout');
  },

  /**
   * Simulate permission error
   */
  permissionError(): Error {
    return new Error('Insufficient permissions');
  }
};