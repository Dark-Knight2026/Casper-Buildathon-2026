/**
 * Buyer Service
 * Handles all buyer-related operations with Supabase
 * Supports property favorites, offers, tours, and financing tracking
 */

import { supabase } from '@/lib/supabase/client';
import { logger } from '@/utils/logger';

// Type definitions for buyer operations
export interface BuyerFavorite {
  id: string;
  buyerId: string;
  propertyId: string;
  notes?: string;
  addedAt: Date;
  property?: {
    id: string;
    title: string;
    address: string;
    price: number;
    bedrooms: number;
    bathrooms: number;
    sqft: number;
    images: string[];
    status: string;
  };
}

export interface BuyerOffer {
  id: string;
  buyerId: string;
  propertyId: string;
  agentId?: string;
  offerAmount: number;
  earnestMoney: number;
  closingDate: Date;
  contingencies: string[];
  status: 'draft' | 'submitted' | 'under_review' | 'accepted' | 'rejected' | 'countered' | 'withdrawn';
  submittedAt?: Date;
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

export interface BuyerTour {
  id: string;
  buyerId: string;
  propertyId: string;
  agentId?: string;
  scheduledDate: Date;
  duration: number; // minutes
  status: 'scheduled' | 'confirmed' | 'completed' | 'cancelled' | 'rescheduled';
  tourType: 'in_person' | 'virtual';
  notes?: string;
  feedback?: string;
  rating?: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface BuyerFinancing {
  id: string;
  buyerId: string;
  lenderName?: string;
  lenderContact?: string;
  preApprovalAmount?: number;
  preApprovalDate?: Date;
  preApprovalExpiry?: Date;
  interestRate?: number;
  loanType: 'conventional' | 'fha' | 'va' | 'usda' | 'jumbo' | 'other';
  downPaymentAmount?: number;
  downPaymentPercent?: number;
  monthlyPaymentEstimate?: number;
  status: 'not_started' | 'in_progress' | 'pre_approved' | 'approved' | 'denied';
  documents: string[];
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface PropertySearchParams {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  minPrice?: number;
  maxPrice?: number;
  location?: string;
  propertyType?: string[];
  minBedrooms?: number;
  maxBedrooms?: number;
  minBathrooms?: number;
  maxBathrooms?: number;
  minSqft?: number;
  maxSqft?: number;
  features?: string[];
  status?: string[];
}

class BuyerService {
  // ============================================================================
  // FAVORITES MANAGEMENT
  // ============================================================================

  /**
   * Get all favorites for a buyer
   */
  async getFavorites(buyerId: string): Promise<BuyerFavorite[]> {
    try {
      const { data, error } = await supabase
        .from('buyer_favorites')
        .select(`
          *,
          property:properties(*)
        `)
        .eq('buyer_id', buyerId)
        .order('added_at', { ascending: false });

      if (error) {
        logger.error('Error fetching favorites:', error);
        throw new Error('Failed to fetch favorites');
      }

      return (data || []).map(this.mapFavoriteRow);
    } catch (error) {
      logger.error('Error in getFavorites:', error);
      throw error instanceof Error ? error : new Error('Failed to fetch favorites');
    }
  }

  /**
   * Add property to favorites
   */
  async addFavorite(buyerId: string, propertyId: string, notes?: string): Promise<BuyerFavorite> {
    try {
      const { data, error } = await supabase
        .from('buyer_favorites')
        .insert({
          buyer_id: buyerId,
          property_id: propertyId,
          notes,
          added_at: new Date().toISOString()
        })
        .select(`
          *,
          property:properties(*)
        `)
        .single();

      if (error) {
        logger.error('Error adding favorite:', error);
        throw new Error('Failed to add favorite');
      }

      return this.mapFavoriteRow(data);
    } catch (error) {
      logger.error('Error in addFavorite:', error);
      throw error instanceof Error ? error : new Error('Failed to add favorite');
    }
  }

  /**
   * Remove property from favorites
   */
  async removeFavorite(favoriteId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('buyer_favorites')
        .delete()
        .eq('id', favoriteId);

      if (error) {
        logger.error('Error removing favorite:', error);
        throw new Error('Failed to remove favorite');
      }
    } catch (error) {
      logger.error('Error in removeFavorite:', error);
      throw error instanceof Error ? error : new Error('Failed to remove favorite');
    }
  }

  /**
   * Check if property is favorited
   */
  async isFavorite(buyerId: string, propertyId: string): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .from('buyer_favorites')
        .select('id')
        .eq('buyer_id', buyerId)
        .eq('property_id', propertyId)
        .single();

      if (error && error.code !== 'PGRST116') {
        logger.error('Error checking favorite:', error);
        return false;
      }

      return !!data;
    } catch (error) {
      logger.error('Error in isFavorite:', error);
      return false;
    }
  }

  // ============================================================================
  // OFFER MANAGEMENT
  // ============================================================================

  /**
   * Get all offers for a buyer
   */
  async getOffers(buyerId: string): Promise<BuyerOffer[]> {
    try {
      const { data, error } = await supabase
        .from('buyer_offers')
        .select('*')
        .eq('buyer_id', buyerId)
        .order('created_at', { ascending: false });

      if (error) {
        logger.error('Error fetching offers:', error);
        throw new Error('Failed to fetch offers');
      }

      return (data || []).map(this.mapOfferRow);
    } catch (error) {
      logger.error('Error in getOffers:', error);
      throw error instanceof Error ? error : new Error('Failed to fetch offers');
    }
  }

  /**
   * Get a single offer by ID
   */
  async getOfferById(offerId: string): Promise<BuyerOffer | null> {
    try {
      const { data, error } = await supabase
        .from('buyer_offers')
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
   * Create a new offer
   */
  async createOffer(buyerId: string, offerData: Partial<BuyerOffer>): Promise<BuyerOffer> {
    try {
      const { data, error } = await supabase
        .from('buyer_offers')
        .insert({
          buyer_id: buyerId,
          property_id: offerData.propertyId,
          agent_id: offerData.agentId,
          offer_amount: offerData.offerAmount,
          earnest_money: offerData.earnestMoney,
          closing_date: offerData.closingDate?.toISOString(),
          contingencies: offerData.contingencies || [],
          status: offerData.status || 'draft',
          documents: offerData.documents || [],
          notes: offerData.notes
        })
        .select()
        .single();

      if (error) {
        logger.error('Error creating offer:', error);
        throw new Error('Failed to create offer');
      }

      return this.mapOfferRow(data);
    } catch (error) {
      logger.error('Error in createOffer:', error);
      throw error instanceof Error ? error : new Error('Failed to create offer');
    }
  }

  /**
   * Update an existing offer
   */
  async updateOffer(offerId: string, offerData: Partial<BuyerOffer>): Promise<BuyerOffer> {
    try {
      const updates: Record<string, unknown> = {
        updated_at: new Date().toISOString()
      };

      if (offerData.offerAmount !== undefined) updates.offer_amount = offerData.offerAmount;
      if (offerData.earnestMoney !== undefined) updates.earnest_money = offerData.earnestMoney;
      if (offerData.closingDate !== undefined) updates.closing_date = offerData.closingDate.toISOString();
      if (offerData.contingencies !== undefined) updates.contingencies = offerData.contingencies;
      if (offerData.status !== undefined) {
        updates.status = offerData.status;
        if (offerData.status === 'submitted' && !offerData.submittedAt) {
          updates.submitted_at = new Date().toISOString();
        }
      }
      if (offerData.counterOffer !== undefined) updates.counter_offer = offerData.counterOffer;
      if (offerData.documents !== undefined) updates.documents = offerData.documents;
      if (offerData.notes !== undefined) updates.notes = offerData.notes;

      const { data, error } = await supabase
        .from('buyer_offers')
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
      logger.error('Error in updateOffer:', error);
      throw error instanceof Error ? error : new Error('Failed to update offer');
    }
  }

  /**
   * Delete an offer
   */
  async deleteOffer(offerId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('buyer_offers')
        .delete()
        .eq('id', offerId);

      if (error) {
        logger.error('Error deleting offer:', error);
        throw new Error('Failed to delete offer');
      }
    } catch (error) {
      logger.error('Error in deleteOffer:', error);
      throw error instanceof Error ? error : new Error('Failed to delete offer');
    }
  }

  // ============================================================================
  // TOUR MANAGEMENT
  // ============================================================================

  /**
   * Get all tours for a buyer
   */
  async getTours(buyerId: string): Promise<BuyerTour[]> {
    try {
      const { data, error } = await supabase
        .from('buyer_tours')
        .select('*')
        .eq('buyer_id', buyerId)
        .order('scheduled_date', { ascending: true });

      if (error) {
        logger.error('Error fetching tours:', error);
        throw new Error('Failed to fetch tours');
      }

      return (data || []).map(this.mapTourRow);
    } catch (error) {
      logger.error('Error in getTours:', error);
      throw error instanceof Error ? error : new Error('Failed to fetch tours');
    }
  }

  /**
   * Schedule a new tour
   */
  async scheduleTour(buyerId: string, tourData: Partial<BuyerTour>): Promise<BuyerTour> {
    try {
      const { data, error } = await supabase
        .from('buyer_tours')
        .insert({
          buyer_id: buyerId,
          property_id: tourData.propertyId,
          agent_id: tourData.agentId,
          scheduled_date: tourData.scheduledDate?.toISOString(),
          duration: tourData.duration || 30,
          status: tourData.status || 'scheduled',
          tour_type: tourData.tourType || 'in_person',
          notes: tourData.notes
        })
        .select()
        .single();

      if (error) {
        logger.error('Error scheduling tour:', error);
        throw new Error('Failed to schedule tour');
      }

      return this.mapTourRow(data);
    } catch (error) {
      logger.error('Error in scheduleTour:', error);
      throw error instanceof Error ? error : new Error('Failed to schedule tour');
    }
  }

  /**
   * Update a tour
   */
  async updateTour(tourId: string, tourData: Partial<BuyerTour>): Promise<BuyerTour> {
    try {
      const updates: Record<string, unknown> = {
        updated_at: new Date().toISOString()
      };

      if (tourData.scheduledDate !== undefined) updates.scheduled_date = tourData.scheduledDate.toISOString();
      if (tourData.duration !== undefined) updates.duration = tourData.duration;
      if (tourData.status !== undefined) updates.status = tourData.status;
      if (tourData.tourType !== undefined) updates.tour_type = tourData.tourType;
      if (tourData.notes !== undefined) updates.notes = tourData.notes;
      if (tourData.feedback !== undefined) updates.feedback = tourData.feedback;
      if (tourData.rating !== undefined) updates.rating = tourData.rating;

      const { data, error } = await supabase
        .from('buyer_tours')
        .update(updates)
        .eq('id', tourId)
        .select()
        .single();

      if (error) {
        logger.error('Error updating tour:', error);
        throw new Error('Failed to update tour');
      }

      return this.mapTourRow(data);
    } catch (error) {
      logger.error('Error in updateTour:', error);
      throw error instanceof Error ? error : new Error('Failed to update tour');
    }
  }

  /**
   * Cancel a tour
   */
  async cancelTour(tourId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('buyer_tours')
        .update({
          status: 'cancelled',
          updated_at: new Date().toISOString()
        })
        .eq('id', tourId);

      if (error) {
        logger.error('Error cancelling tour:', error);
        throw new Error('Failed to cancel tour');
      }
    } catch (error) {
      logger.error('Error in cancelTour:', error);
      throw error instanceof Error ? error : new Error('Failed to cancel tour');
    }
  }

  // ============================================================================
  // FINANCING MANAGEMENT
  // ============================================================================

  /**
   * Get financing information for a buyer
   */
  async getFinancing(buyerId: string): Promise<BuyerFinancing | null> {
    try {
      const { data, error } = await supabase
        .from('buyer_financing')
        .select('*')
        .eq('buyer_id', buyerId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return null;
        }
        logger.error('Error fetching financing:', error);
        throw new Error('Failed to fetch financing');
      }

      return data ? this.mapFinancingRow(data) : null;
    } catch (error) {
      logger.error('Error in getFinancing:', error);
      throw error instanceof Error ? error : new Error('Failed to fetch financing');
    }
  }

  /**
   * Create or update financing information
   */
  async upsertFinancing(buyerId: string, financingData: Partial<BuyerFinancing>): Promise<BuyerFinancing> {
    try {
      const { data, error } = await supabase
        .from('buyer_financing')
        .upsert({
          buyer_id: buyerId,
          lender_name: financingData.lenderName,
          lender_contact: financingData.lenderContact,
          pre_approval_amount: financingData.preApprovalAmount,
          pre_approval_date: financingData.preApprovalDate?.toISOString(),
          pre_approval_expiry: financingData.preApprovalExpiry?.toISOString(),
          interest_rate: financingData.interestRate,
          loan_type: financingData.loanType || 'conventional',
          down_payment_amount: financingData.downPaymentAmount,
          down_payment_percent: financingData.downPaymentPercent,
          monthly_payment_estimate: financingData.monthlyPaymentEstimate,
          status: financingData.status || 'not_started',
          documents: financingData.documents || [],
          notes: financingData.notes,
          updated_at: new Date().toISOString()
        }, { onConflict: 'buyer_id' })
        .select()
        .single();

      if (error) {
        logger.error('Error upserting financing:', error);
        throw new Error('Failed to save financing');
      }

      return this.mapFinancingRow(data);
    } catch (error) {
      logger.error('Error in upsertFinancing:', error);
      throw error instanceof Error ? error : new Error('Failed to save financing');
    }
  }

  // ============================================================================
  // PROPERTY SEARCH
  // ============================================================================

  /**
   * Search properties with advanced filters
   */
  async searchProperties(params: PropertySearchParams = {}): Promise<{
    properties: unknown[];
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
        minPrice,
        maxPrice,
        location,
        propertyType,
        minBedrooms,
        maxBedrooms,
        minBathrooms,
        maxBathrooms,
        minSqft,
        maxSqft,
        features,
        status
      } = params;

      let query = supabase
        .from('properties')
        .select('*', { count: 'exact' });

      // Apply filters
      if (minPrice !== undefined) {
        query = query.gte('price', minPrice);
      }

      if (maxPrice !== undefined) {
        query = query.lte('price', maxPrice);
      }

      if (location) {
        query = query.ilike('address', `%${location}%`);
      }

      if (propertyType && propertyType.length > 0) {
        query = query.in('property_type', propertyType);
      }

      if (minBedrooms !== undefined) {
        query = query.gte('bedrooms', minBedrooms);
      }

      if (maxBedrooms !== undefined) {
        query = query.lte('bedrooms', maxBedrooms);
      }

      if (minBathrooms !== undefined) {
        query = query.gte('bathrooms', minBathrooms);
      }

      if (maxBathrooms !== undefined) {
        query = query.lte('bathrooms', maxBathrooms);
      }

      if (minSqft !== undefined) {
        query = query.gte('sqft', minSqft);
      }

      if (maxSqft !== undefined) {
        query = query.lte('sqft', maxSqft);
      }

      if (features && features.length > 0) {
        query = query.contains('features', features);
      }

      if (status && status.length > 0) {
        query = query.in('status', status);
      }

      // Apply sorting
      query = query.order(sortBy, { ascending: sortOrder === 'asc' });

      // Apply pagination
      const from = (page - 1) * limit;
      const to = from + limit - 1;
      query = query.range(from, to);

      const { data, error, count } = await query;

      if (error) {
        logger.error('Error searching properties:', error);
        throw new Error('Failed to search properties');
      }

      const total = count || 0;
      const totalPages = Math.ceil(total / limit);

      return { properties: data || [], total, page, totalPages };
    } catch (error) {
      logger.error('Error in searchProperties:', error);
      throw error instanceof Error ? error : new Error('Failed to search properties');
    }
  }

  // ============================================================================
  // PRIVATE HELPER METHODS
  // ============================================================================

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private mapFavoriteRow(row: any): BuyerFavorite {
    return {
      id: row.id,
      buyerId: row.buyer_id,
      propertyId: row.property_id,
      notes: row.notes,
      addedAt: new Date(row.added_at),
      property: row.property ? {
        id: row.property.id,
        title: row.property.title,
        address: row.property.address,
        price: row.property.price,
        bedrooms: row.property.bedrooms,
        bathrooms: row.property.bathrooms,
        sqft: row.property.sqft,
        images: row.property.images || [],
        status: row.property.status
      } : undefined
    };
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private mapOfferRow(row: any): BuyerOffer {
    return {
      id: row.id,
      buyerId: row.buyer_id,
      propertyId: row.property_id,
      agentId: row.agent_id,
      offerAmount: Number(row.offer_amount),
      earnestMoney: Number(row.earnest_money),
      closingDate: new Date(row.closing_date),
      contingencies: row.contingencies || [],
      status: row.status,
      submittedAt: row.submitted_at ? new Date(row.submitted_at) : undefined,
      respondedAt: row.responded_at ? new Date(row.responded_at) : undefined,
      counterOffer: row.counter_offer,
      documents: row.documents || [],
      notes: row.notes,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at)
    };
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private mapTourRow(row: any): BuyerTour {
    return {
      id: row.id,
      buyerId: row.buyer_id,
      propertyId: row.property_id,
      agentId: row.agent_id,
      scheduledDate: new Date(row.scheduled_date),
      duration: row.duration,
      status: row.status,
      tourType: row.tour_type,
      notes: row.notes,
      feedback: row.feedback,
      rating: row.rating,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at)
    };
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private mapFinancingRow(row: any): BuyerFinancing {
    return {
      id: row.id,
      buyerId: row.buyer_id,
      lenderName: row.lender_name,
      lenderContact: row.lender_contact,
      preApprovalAmount: row.pre_approval_amount ? Number(row.pre_approval_amount) : undefined,
      preApprovalDate: row.pre_approval_date ? new Date(row.pre_approval_date) : undefined,
      preApprovalExpiry: row.pre_approval_expiry ? new Date(row.pre_approval_expiry) : undefined,
      interestRate: row.interest_rate ? Number(row.interest_rate) : undefined,
      loanType: row.loan_type,
      downPaymentAmount: row.down_payment_amount ? Number(row.down_payment_amount) : undefined,
      downPaymentPercent: row.down_payment_percent ? Number(row.down_payment_percent) : undefined,
      monthlyPaymentEstimate: row.monthly_payment_estimate ? Number(row.monthly_payment_estimate) : undefined,
      status: row.status,
      documents: row.documents || [],
      notes: row.notes,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at)
    };
  }

  // ============================================================================
  // REAL-TIME SUBSCRIPTIONS
  // ============================================================================

  /**
   * Subscribe to favorites changes
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  subscribeToFavorites(buyerId: string, callback: (payload: any) => void) {
    return supabase
      .channel('buyer_favorites_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'buyer_favorites',
          filter: `buyer_id=eq.${buyerId}`
        },
        callback
      )
      .subscribe();
  }

  /**
   * Subscribe to offers changes
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  subscribeToOffers(buyerId: string, callback: (payload: any) => void) {
    return supabase
      .channel('buyer_offers_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'buyer_offers',
          filter: `buyer_id=eq.${buyerId}`
        },
        callback
      )
      .subscribe();
  }

  /**
   * Subscribe to tours changes
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  subscribeToTours(buyerId: string, callback: (payload: any) => void) {
    return supabase
      .channel('buyer_tours_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'buyer_tours',
          filter: `buyer_id=eq.${buyerId}`
        },
        callback
      )
      .subscribe();
  }
}

export const buyerService = new BuyerService();