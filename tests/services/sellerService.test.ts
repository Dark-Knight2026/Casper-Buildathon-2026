/**
 * Unit tests for sellerService
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { sellerService } from '../sellerService';

// Mock Supabase client
vi.mock('@/lib/supabase/client', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(() => Promise.resolve({ data: null, error: null })),
          order: vi.fn(() => ({
            range: vi.fn(() => Promise.resolve({ data: [], error: null, count: 0 }))
          }))
        })),
        in: vi.fn(() => ({
          order: vi.fn(() => ({
            range: vi.fn(() => Promise.resolve({ data: [], error: null, count: 0 }))
          }))
        })),
        gte: vi.fn(() => ({
          lte: vi.fn(() => ({
            in: vi.fn(() => ({
              or: vi.fn(() => ({
                order: vi.fn(() => ({
                  range: vi.fn(() => Promise.resolve({ data: [], error: null, count: 0 }))
                }))
              }))
            }))
          }))
        })),
        order: vi.fn(() => ({
          range: vi.fn(() => Promise.resolve({ data: [], error: null, count: 0 }))
        }))
      })),
      insert: vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn(() => Promise.resolve({ data: {}, error: null }))
        }))
      })),
      update: vi.fn(() => ({
        eq: vi.fn(() => ({
          select: vi.fn(() => ({
            single: vi.fn(() => Promise.resolve({ data: {}, error: null }))
          }))
        }))
      })),
      delete: vi.fn(() => ({
        eq: vi.fn(() => Promise.resolve({ error: null }))
      }))
    })),
    rpc: vi.fn(() => Promise.resolve({ data: null, error: null })),
    functions: {
      invoke: vi.fn(() => Promise.resolve({ data: { recommendation: {} }, error: null }))
    },
    channel: vi.fn(() => ({
      on: vi.fn(() => ({
        subscribe: vi.fn()
      }))
    }))
  }
}));

describe('sellerService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Listing Management', () => {
    it('should have getListings method', () => {
      expect(typeof sellerService.getListings).toBe('function');
    });

    it('should have getListingById method', () => {
      expect(typeof sellerService.getListingById).toBe('function');
    });

    it('should have createListing method', () => {
      expect(typeof sellerService.createListing).toBe('function');
    });

    it('should have updateListing method', () => {
      expect(typeof sellerService.updateListing).toBe('function');
    });

    it('should have deleteListing method', () => {
      expect(typeof sellerService.deleteListing).toBe('function');
    });

    it('should have incrementViews method', () => {
      expect(typeof sellerService.incrementViews).toBe('function');
    });
  });

  describe('Offer Management', () => {
    it('should have getOffers method', () => {
      expect(typeof sellerService.getOffers).toBe('function');
    });

    it('should have getOfferById method', () => {
      expect(typeof sellerService.getOfferById).toBe('function');
    });

    it('should have updateOfferStatus method', () => {
      expect(typeof sellerService.updateOfferStatus).toBe('function');
    });
  });

  describe('Showing Management', () => {
    it('should have getShowings method', () => {
      expect(typeof sellerService.getShowings).toBe('function');
    });

    it('should have updateShowingStatus method', () => {
      expect(typeof sellerService.updateShowingStatus).toBe('function');
    });
  });

  describe('Document Management', () => {
    it('should have getDocuments method', () => {
      expect(typeof sellerService.getDocuments).toBe('function');
    });
  });

  describe('Market Analytics', () => {
    it('should have getMarketAnalytics method', () => {
      expect(typeof sellerService.getMarketAnalytics).toBe('function');
    });

    it('should have generatePricingRecommendation method', () => {
      expect(typeof sellerService.generatePricingRecommendation).toBe('function');
    });
  });

  describe('Real-time Subscriptions', () => {
    it('should have subscribeToListings method', () => {
      expect(typeof sellerService.subscribeToListings).toBe('function');
    });

    it('should have subscribeToOffers method', () => {
      expect(typeof sellerService.subscribeToOffers).toBe('function');
    });

    it('should have subscribeToShowings method', () => {
      expect(typeof sellerService.subscribeToShowings).toBe('function');
    });
  });
});