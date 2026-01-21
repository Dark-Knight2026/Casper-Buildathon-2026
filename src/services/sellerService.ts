/**
 * Seller Service
 * Handles all seller-related operations with Supabase
 * Supports property listings, offers, showings, and analytics
 */

import { supabase } from '@/lib/supabase/client';
import { logger } from '@/utils/logger';

// Type definitions for seller operations
export interface SellerListing {
  id: string;
  sellerId: string;
  title: string;
  description: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  price: number;
  propertyType: 'house' | 'condo' | 'townhouse' | 'land' | 'multi_family' | 'commercial';
  bedrooms: number;
  bathrooms: number;
  sqft: number;
  lotSize?: number;
  yearBuilt?: number;
  status: 'draft' | 'active' | 'pending' | 'sold' | 'withdrawn';
  images: string[];
  features: string[];
  virtualTourUrl?: string;
  listingDate?: Date;
  soldDate?: Date;
  views: number;
  favorites: number;
  offers: number;
  showings: number;
  daysOnMarket: number;
  priceHistory: Array<{ date: Date; price: number; reason?: string }>;
  createdAt: Date;
  updatedAt: Date;
}

export interface SellerOffer {
  id: string;
  listingId: string;
  buyerId: string;
  buyerName: string;
  buyerEmail?: string;
  buyerPhone?: string;
  offerAmount: number;
  earnestMoney: number;
  closingDate: Date;
  contingencies: string[];
  financingType: 'cash' | 'conventional' | 'fha' | 'va' | 'other';
  preApprovalAmount?: number;
  status: 'pending' | 'reviewed' | 'accepted' | 'rejected' | 'countered' | 'expired';
  submittedAt: Date;
  reviewedAt?: Date;
  respondedAt?: Date;
  counterOffer?: {
    amount: number;
    terms: string;
    expiresAt: Date;
  };
  documents: string[];
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface SellerShowing {
  id: string;
  listingId: string;
  buyerId?: string;
  buyerName: string;
  buyerEmail?: string;
  buyerPhone?: string;
  agentId?: string;
  agentName?: string;
  requestedDate: Date;
  duration: number; // minutes
  status: 'requested' | 'approved' | 'declined' | 'completed' | 'cancelled' | 'no_show';
  showingType: 'in_person' | 'virtual';
  specialRequests?: string;
  feedback?: string;
  rating?: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface SellerDocument {
  id: string;
  sellerId: string;
  listingId?: string;
  name: string;
  type: string;
  category: 'disclosure' | 'contract' | 'inspection' | 'appraisal' | 'title' | 'closing' | 'other';
  size: number;
  uploadedAt: Date;
  url: string;
  status: 'pending' | 'approved' | 'rejected';
  sharedWith?: string[]; // Array of user IDs
}

export interface MarketAnalytics {
  listingId: string;
  averagePrice: number;
  medianPrice: number;
  pricePerSqft: number;
  daysOnMarket: number;
  competitorCount: number;
  demandScore: number; // 0-100
  pricingRecommendation: {
    suggestedPrice: number;
    minPrice: number;
    maxPrice: number;
    confidence: number; // 0-100
    reasoning: string;
  };
  marketTrends: {
    priceChange30Days: number;
    priceChange90Days: number;
    inventoryChange: number;
    demandChange: number;
  };
  comparableProperties: Array<{
    id: string;
    address: string;
    price: number;
    sqft: number;
    pricePerSqft: number;
    daysOnMarket: number;
    status: string;
  }>;
  updatedAt: Date;
}

export interface ListingSearchParams {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  status?: string[];
  minPrice?: number;
  maxPrice?: number;
  propertyType?: string[];
  search?: string;
}

export interface OfferSearchParams {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  status?: string[];
  listingId?: string;
  minAmount?: number;
  maxAmount?: number;
}

class SellerService {
  // ============================================================================
  // LISTING MANAGEMENT
  // ============================================================================

  /**
   * Get all listings for a seller
   */
  async getListings(sellerId: string, params: ListingSearchParams = {}): Promise<{
    listings: SellerListing[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    try {
      const {
        page = 1,
        limit = 20,
        sortBy = 'created_at',
        sortOrder = 'desc',
        status,
        minPrice,
        maxPrice,
        propertyType,
        search
      } = params;

      let query = supabase
        .from('seller_listings')
        .select('*', { count: 'exact' })
        .eq('seller_id', sellerId);

      // Apply filters
      if (status && status.length > 0) {
        query = query.in('status', status);
      }

      if (minPrice !== undefined) {
        query = query.gte('price', minPrice);
      }

      if (maxPrice !== undefined) {
        query = query.lte('price', maxPrice);
      }

      if (propertyType && propertyType.length > 0) {
        query = query.in('property_type', propertyType);
      }

      if (search) {
        query = query.or(`title.ilike.%${search}%,address.ilike.%${search}%`);
      }

      // Apply sorting
      query = query.order(sortBy, { ascending: sortOrder === 'asc' });

      // Apply pagination
      const from = (page - 1) * limit;
      const to = from + limit - 1;
      query = query.range(from, to);

      const { data, error, count } = await query;

      if (error) {
        logger.error('Error fetching listings:', error);
        throw new Error('Failed to fetch listings');
      }

      const total = count || 0;
      const totalPages = Math.ceil(total / limit);

      return {
        listings: (data || []).map(this.mapListingRow),
        total,
        page,
        totalPages
      };
    } catch (error) {
      logger.error('Error in getListings:', error);
      throw error instanceof Error ? error : new Error('Failed to fetch listings');
    }
  }

  /**
   * Get a single listing by ID
   */
  async getListingById(listingId: string): Promise<SellerListing | null> {
    try {
      const { data, error } = await supabase
        .from('seller_listings')
        .select('*')
        .eq('id', listingId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return null;
        }
        logger.error('Error fetching listing:', error);
        throw new Error('Failed to fetch listing');
      }

      return data ? this.mapListingRow(data) : null;
    } catch (error) {
      logger.error('Error in getListingById:', error);
      throw error instanceof Error ? error : new Error('Failed to fetch listing');
    }
  }

  /**
   * Create a new listing
   */
  async createListing(sellerId: string, listingData: Partial<SellerListing>): Promise<SellerListing> {
    try {
      const { data, error } = await supabase
        .from('seller_listings')
        .insert({
          seller_id: sellerId,
          title: listingData.title,
          description: listingData.description,
          address: listingData.address,
          city: listingData.city,
          state: listingData.state,
          zip_code: listingData.zipCode,
          price: listingData.price,
          property_type: listingData.propertyType,
          bedrooms: listingData.bedrooms,
          bathrooms: listingData.bathrooms,
          sqft: listingData.sqft,
          lot_size: listingData.lotSize,
          year_built: listingData.yearBuilt,
          status: listingData.status || 'draft',
          images: listingData.images || [],
          features: listingData.features || [],
          virtual_tour_url: listingData.virtualTourUrl,
          views: 0,
          favorites: 0,
          offers: 0,
          showings: 0,
          days_on_market: 0,
          price_history: []
        })
        .select()
        .single();

      if (error) {
        logger.error('Error creating listing:', error);
        throw new Error('Failed to create listing');
      }

      return this.mapListingRow(data);
    } catch (error) {
      logger.error('Error in createListing:', error);
      throw error instanceof Error ? error : new Error('Failed to create listing');
    }
  }

  /**
   * Update an existing listing
   */
  async updateListing(listingId: string, listingData: Partial<SellerListing>): Promise<SellerListing> {
    try {
      const updates: Record<string, unknown> = {
        updated_at: new Date().toISOString()
      };

      if (listingData.title !== undefined) updates.title = listingData.title;
      if (listingData.description !== undefined) updates.description = listingData.description;
      if (listingData.address !== undefined) updates.address = listingData.address;
      if (listingData.city !== undefined) updates.city = listingData.city;
      if (listingData.state !== undefined) updates.state = listingData.state;
      if (listingData.zipCode !== undefined) updates.zip_code = listingData.zipCode;
      if (listingData.price !== undefined) {
        updates.price = listingData.price;
        // Add to price history
        const current = await this.getListingById(listingId);
        if (current && current.price !== listingData.price) {
          const priceHistory = current.priceHistory || [];
          priceHistory.push({
            date: new Date(),
            price: listingData.price,
            reason: 'Price update'
          });
          updates.price_history = priceHistory;
        }
      }
      if (listingData.propertyType !== undefined) updates.property_type = listingData.propertyType;
      if (listingData.bedrooms !== undefined) updates.bedrooms = listingData.bedrooms;
      if (listingData.bathrooms !== undefined) updates.bathrooms = listingData.bathrooms;
      if (listingData.sqft !== undefined) updates.sqft = listingData.sqft;
      if (listingData.lotSize !== undefined) updates.lot_size = listingData.lotSize;
      if (listingData.yearBuilt !== undefined) updates.year_built = listingData.yearBuilt;
      if (listingData.status !== undefined) {
        updates.status = listingData.status;
        if (listingData.status === 'active' && !listingData.listingDate) {
          updates.listing_date = new Date().toISOString();
        }
        if (listingData.status === 'sold' && !listingData.soldDate) {
          updates.sold_date = new Date().toISOString();
        }
      }
      if (listingData.images !== undefined) updates.images = listingData.images;
      if (listingData.features !== undefined) updates.features = listingData.features;
      if (listingData.virtualTourUrl !== undefined) updates.virtual_tour_url = listingData.virtualTourUrl;

      const { data, error } = await supabase
        .from('seller_listings')
        .update(updates)
        .eq('id', listingId)
        .select()
        .single();

      if (error) {
        logger.error('Error updating listing:', error);
        throw new Error('Failed to update listing');
      }

      return this.mapListingRow(data);
    } catch (error) {
      logger.error('Error in updateListing:', error);
      throw error instanceof Error ? error : new Error('Failed to update listing');
    }
  }

  /**
   * Delete a listing
   */
  async deleteListing(listingId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('seller_listings')
        .delete()
        .eq('id', listingId);

      if (error) {
        logger.error('Error deleting listing:', error);
        throw new Error('Failed to delete listing');
      }
    } catch (error) {
      logger.error('Error in deleteListing:', error);
      throw error instanceof Error ? error : new Error('Failed to delete listing');
    }
  }

  /**
   * Increment view count for a listing
   */
  async incrementViews(listingId: string): Promise<void> {
    try {
      const { error } = await supabase.rpc('increment_listing_views', {
        listing_id: listingId
      });

      if (error) {
        logger.error('Error incrementing views:', error);
      }
    } catch (error) {
      logger.error('Error in incrementViews:', error);
    }
  }

  // ============================================================================
  // OFFER MANAGEMENT
  // ============================================================================

  /**
   * Get all offers for a seller's listings
   */
  async getOffers(sellerId: string, params: OfferSearchParams = {}): Promise<{
    offers: SellerOffer[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    try {
      const {
        page = 1,
        limit = 20,
        sortBy = 'submitted_at',
        sortOrder = 'desc',
        status,
        listingId,
        minAmount,
        maxAmount
      } = params;

      // First get seller's listing IDs
      const { data: listings } = await supabase
        .from('seller_listings')
        .select('id')
        .eq('seller_id', sellerId);

      const listingIds = (listings || []).map((l) => l.id);

      if (listingIds.length === 0) {
        return { offers: [], total: 0, page, totalPages: 0 };
      }

      let query = supabase
        .from('seller_offers')
        .select('*', { count: 'exact' })
        .in('listing_id', listingIds);

      // Apply filters
      if (status && status.length > 0) {
        query = query.in('status', status);
      }

      if (listingId) {
        query = query.eq('listing_id', listingId);
      }

      if (minAmount !== undefined) {
        query = query.gte('offer_amount', minAmount);
      }

      if (maxAmount !== undefined) {
        query = query.lte('offer_amount', maxAmount);
      }

      // Apply sorting
      query = query.order(sortBy, { ascending: sortOrder === 'asc' });

      // Apply pagination
      const from = (page - 1) * limit;
      const to = from + limit - 1;
      query = query.range(from, to);

      const { data, error, count } = await query;

      if (error) {
        logger.error('Error fetching offers:', error);
        throw new Error('Failed to fetch offers');
      }

      const total = count || 0;
      const totalPages = Math.ceil(total / limit);

      return {
        offers: (data || []).map(this.mapOfferRow),
        total,
        page,
        totalPages
      };
    } catch (error) {
      logger.error('Error in getOffers:', error);
      throw error instanceof Error ? error : new Error('Failed to fetch offers');
    }
  }

  /**
   * Get a single offer by ID
   */
  async getOfferById(offerId: string): Promise<SellerOffer | null> {
    try {
      const { data, error } = await supabase
        .from('seller_offers')
        .select('*')
        .eq('id', offerId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return null;
        }
        logger.error('Error fetching offer:', error);
        throw new Error('Failed to fetch offer');
      }

      return data ? this.mapOfferRow(data) : null;
    } catch (error) {
      logger.error('Error in getOfferById:', error);
      throw error instanceof Error ? error : new Error('Failed to fetch offer');
    }
  }

  /**
   * Update offer status (accept, reject, counter)
   */
  async updateOfferStatus(
    offerId: string,
    status: SellerOffer['status'],
    counterOffer?: SellerOffer['counterOffer'],
    notes?: string
  ): Promise<SellerOffer> {
    try {
      const updates: Record<string, unknown> = {
        status,
        reviewed_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      if (status === 'accepted' || status === 'rejected' || status === 'countered') {
        updates.responded_at = new Date().toISOString();
      }

      if (counterOffer) {
        updates.counter_offer = counterOffer;
      }

      if (notes) {
        updates.notes = notes;
      }

      const { data, error } = await supabase
        .from('seller_offers')
        .update(updates)
        .eq('id', offerId)
        .select()
        .single();

      if (error) {
        logger.error('Error updating offer:', error);
        throw new Error('Failed to update offer');
      }

      return this.mapOfferRow(data);
    } catch (error) {
      logger.error('Error in updateOfferStatus:', error);
      throw error instanceof Error ? error : new Error('Failed to update offer');
    }
  }

  // ============================================================================
  // SHOWING MANAGEMENT
  // ============================================================================

  /**
   * Get all showings for a seller's listings
   */
  async getShowings(sellerId: string): Promise<SellerShowing[]> {
    try {
      // First get seller's listing IDs
      const { data: listings } = await supabase
        .from('seller_listings')
        .select('id')
        .eq('seller_id', sellerId);

      const listingIds = (listings || []).map((l) => l.id);

      if (listingIds.length === 0) {
        return [];
      }

      const { data, error } = await supabase
        .from('seller_showings')
        .select('*')
        .in('listing_id', listingIds)
        .order('requested_date', { ascending: true });

      if (error) {
        logger.error('Error fetching showings:', error);
        throw new Error('Failed to fetch showings');
      }

      return (data || []).map(this.mapShowingRow);
    } catch (error) {
      logger.error('Error in getShowings:', error);
      throw error instanceof Error ? error : new Error('Failed to fetch showings');
    }
  }

  /**
   * Update showing status
   */
  async updateShowingStatus(
    showingId: string,
    status: SellerShowing['status'],
    feedback?: string,
    rating?: number
  ): Promise<SellerShowing> {
    try {
      const updates: Record<string, unknown> = {
        status,
        updated_at: new Date().toISOString()
      };

      if (feedback) {
        updates.feedback = feedback;
      }

      if (rating) {
        updates.rating = rating;
      }

      const { data, error } = await supabase
        .from('seller_showings')
        .update(updates)
        .eq('id', showingId)
        .select()
        .single();

      if (error) {
        logger.error('Error updating showing:', error);
        throw new Error('Failed to update showing');
      }

      return this.mapShowingRow(data);
    } catch (error) {
      logger.error('Error in updateShowingStatus:', error);
      throw error instanceof Error ? error : new Error('Failed to update showing');
    }
  }

  // ============================================================================
  // DOCUMENT MANAGEMENT
  // ============================================================================

  /**
   * Get all documents for a seller
   */
  async getDocuments(sellerId: string, listingId?: string): Promise<SellerDocument[]> {
    try {
      let query = supabase
        .from('seller_documents')
        .select('*')
        .eq('seller_id', sellerId)
        .order('uploaded_at', { ascending: false });

      if (listingId) {
        query = query.eq('listing_id', listingId);
      }

      const { data, error } = await query;

      if (error) {
        logger.error('Error fetching documents:', error);
        throw new Error('Failed to fetch documents');
      }

      return (data || []).map(this.mapDocumentRow);
    } catch (error) {
      logger.error('Error in getDocuments:', error);
      throw error instanceof Error ? error : new Error('Failed to fetch documents');
    }
  }

  // ============================================================================
  // MARKET ANALYTICS
  // ============================================================================

  /**
   * Get market analytics for a listing
   */
  async getMarketAnalytics(listingId: string): Promise<MarketAnalytics | null> {
    try {
      const { data, error } = await supabase
        .from('market_analytics')
        .select('*')
        .eq('listing_id', listingId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return null;
        }
        logger.error('Error fetching analytics:', error);
        throw new Error('Failed to fetch analytics');
      }

      return data ? this.mapAnalyticsRow(data) : null;
    } catch (error) {
      logger.error('Error in getMarketAnalytics:', error);
      throw error instanceof Error ? error : new Error('Failed to fetch analytics');
    }
  }

  /**
   * Generate pricing recommendation using AI
   */
  async generatePricingRecommendation(listingId: string): Promise<MarketAnalytics['pricingRecommendation']> {
    try {
      // This would call an edge function that uses AI to analyze market data
      const { data, error } = await supabase.functions.invoke('generate_pricing_recommendation', {
        body: { listingId }
      });

      if (error) {
        logger.error('Error generating pricing recommendation:', error);
        throw new Error('Failed to generate pricing recommendation');
      }

      return data.recommendation;
    } catch (error) {
      logger.error('Error in generatePricingRecommendation:', error);
      throw error instanceof Error ? error : new Error('Failed to generate pricing recommendation');
    }
  }

  // ============================================================================
  // PRIVATE HELPER METHODS
  // ============================================================================

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private mapListingRow(row: any): SellerListing {
    return {
      id: row.id,
      sellerId: row.seller_id,
      title: row.title,
      description: row.description,
      address: row.address,
      city: row.city,
      state: row.state,
      zipCode: row.zip_code,
      price: Number(row.price),
      propertyType: row.property_type,
      bedrooms: row.bedrooms,
      bathrooms: row.bathrooms,
      sqft: row.sqft,
      lotSize: row.lot_size,
      yearBuilt: row.year_built,
      status: row.status,
      images: row.images || [],
      features: row.features || [],
      virtualTourUrl: row.virtual_tour_url,
      listingDate: row.listing_date ? new Date(row.listing_date) : undefined,
      soldDate: row.sold_date ? new Date(row.sold_date) : undefined,
      views: row.views || 0,
      favorites: row.favorites || 0,
      offers: row.offers || 0,
      showings: row.showings || 0,
      daysOnMarket: row.days_on_market || 0,
      priceHistory: row.price_history || [],
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at)
    };
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private mapOfferRow(row: any): SellerOffer {
    return {
      id: row.id,
      listingId: row.listing_id,
      buyerId: row.buyer_id,
      buyerName: row.buyer_name,
      buyerEmail: row.buyer_email,
      buyerPhone: row.buyer_phone,
      offerAmount: Number(row.offer_amount),
      earnestMoney: Number(row.earnest_money),
      closingDate: new Date(row.closing_date),
      contingencies: row.contingencies || [],
      financingType: row.financing_type,
      preApprovalAmount: row.pre_approval_amount ? Number(row.pre_approval_amount) : undefined,
      status: row.status,
      submittedAt: new Date(row.submitted_at),
      reviewedAt: row.reviewed_at ? new Date(row.reviewed_at) : undefined,
      respondedAt: row.responded_at ? new Date(row.responded_at) : undefined,
      counterOffer: row.counter_offer,
      documents: row.documents || [],
      notes: row.notes,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at)
    };
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private mapShowingRow(row: any): SellerShowing {
    return {
      id: row.id,
      listingId: row.listing_id,
      buyerId: row.buyer_id,
      buyerName: row.buyer_name,
      buyerEmail: row.buyer_email,
      buyerPhone: row.buyer_phone,
      agentId: row.agent_id,
      agentName: row.agent_name,
      requestedDate: new Date(row.requested_date),
      duration: row.duration,
      status: row.status,
      showingType: row.showing_type,
      specialRequests: row.special_requests,
      feedback: row.feedback,
      rating: row.rating,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at)
    };
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private mapDocumentRow(row: any): SellerDocument {
    return {
      id: row.id,
      sellerId: row.seller_id,
      listingId: row.listing_id,
      name: row.name,
      type: row.type,
      category: row.category,
      size: row.size,
      uploadedAt: new Date(row.uploaded_at),
      url: row.url,
      status: row.status,
      sharedWith: row.shared_with || []
    };
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private mapAnalyticsRow(row: any): MarketAnalytics {
    return {
      listingId: row.listing_id,
      averagePrice: Number(row.average_price),
      medianPrice: Number(row.median_price),
      pricePerSqft: Number(row.price_per_sqft),
      daysOnMarket: row.days_on_market,
      competitorCount: row.competitor_count,
      demandScore: row.demand_score,
      pricingRecommendation: row.pricing_recommendation,
      marketTrends: row.market_trends,
      comparableProperties: row.comparable_properties || [],
      updatedAt: new Date(row.updated_at)
    };
  }

  // ============================================================================
  // REAL-TIME SUBSCRIPTIONS
  // ============================================================================

  /**
   * Subscribe to listing changes
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  subscribeToListings(sellerId: string, callback: (payload: any) => void) {
    return supabase
      .channel('seller_listings_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'seller_listings',
          filter: `seller_id=eq.${sellerId}`
        },
        callback
      )
      .subscribe();
  }

  /**
   * Subscribe to offer changes
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  subscribeToOffers(listingIds: string[], callback: (payload: any) => void) {
    return supabase
      .channel('seller_offers_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'seller_offers',
          filter: `listing_id=in.(${listingIds.join(',')})`
        },
        callback
      )
      .subscribe();
  }

  /**
   * Subscribe to showing changes
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  subscribeToShowings(listingIds: string[], callback: (payload: any) => void) {
    return supabase
      .channel('seller_showings_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'seller_showings',
          filter: `listing_id=in.(${listingIds.join(',')})`
        },
        callback
      )
      .subscribe();
  }
}

export const sellerService = new SellerService();