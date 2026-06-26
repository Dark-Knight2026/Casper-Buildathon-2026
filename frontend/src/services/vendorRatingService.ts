import { supabase } from '@/lib/supabase/client';
import type {
  VendorRating,
  CreateRatingParams,
  UpdateRatingParams,
  RatingBreakdown,
} from '@/types/vendor';

class VendorRatingService {
  /**
   * Create a new rating
   */
  async createRating(params: CreateRatingParams): Promise<VendorRating> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('vendor_ratings')
        .insert({
          vendor_id: params.vendor_id,
          maintenance_request_id: params.maintenance_request_id,
          rated_by: user.id,
          rating: params.rating,
          review: params.review,
          quality_rating: params.quality_rating,
          timeliness_rating: params.timeliness_rating,
          professionalism_rating: params.professionalism_rating,
          value_rating: params.value_rating,
          would_recommend: params.would_recommend ?? true,
        })
        .select()
        .single();

      if (error) throw error;
      return data as VendorRating;
    } catch (error) {
      console.error('Error creating rating:', error);
      throw error;
    }
  }

  /**
   * Update rating
   */
  async updateRating(id: string, params: UpdateRatingParams): Promise<VendorRating> {
    try {
      const { data, error } = await supabase
        .from('vendor_ratings')
        .update({
          ...params,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as VendorRating;
    } catch (error) {
      console.error('Error updating rating:', error);
      throw error;
    }
  }

  /**
   * Delete rating
   */
  async deleteRating(id: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('vendor_ratings')
        .delete()
        .eq('id', id);

      if (error) throw error;
    } catch (error) {
      console.error('Error deleting rating:', error);
      throw error;
    }
  }

  /**
   * Get rating by ID
   */
  async getRating(id: string): Promise<VendorRating> {
    try {
      const { data, error } = await supabase
        .from('vendor_ratings')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      return data as VendorRating;
    } catch (error) {
      console.error('Error getting rating:', error);
      throw error;
    }
  }

  /**
   * Get all ratings for a vendor
   */
  async getVendorRatings(vendorId: string): Promise<VendorRating[]> {
    try {
      const { data, error } = await supabase
        .from('vendor_ratings')
        .select('*')
        .eq('vendor_id', vendorId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (data as VendorRating[]) || [];
    } catch (error) {
      console.error('Error getting vendor ratings:', error);
      throw error;
    }
  }

  /**
   * Get average rating for a vendor
   */
  async getAverageRating(vendorId: string): Promise<number> {
    try {
      const ratings = await this.getVendorRatings(vendorId);
      
      if (ratings.length === 0) return 0;

      const sum = ratings.reduce((acc, rating) => acc + rating.rating, 0);
      return sum / ratings.length;
    } catch (error) {
      console.error('Error getting average rating:', error);
      return 0;
    }
  }

  /**
   * Get rating breakdown for a vendor
   */
  async getRatingBreakdown(vendorId: string): Promise<RatingBreakdown> {
    try {
      const ratings = await this.getVendorRatings(vendorId);

      if (ratings.length === 0) {
        return {
          average_rating: 0,
          total_ratings: 0,
          five_star: 0,
          four_star: 0,
          three_star: 0,
          two_star: 0,
          one_star: 0,
          average_quality: 0,
          average_timeliness: 0,
          average_professionalism: 0,
          average_value: 0,
          recommendation_rate: 0,
        };
      }

      const totalRatings = ratings.length;
      const sumRating = ratings.reduce((acc, r) => acc + r.rating, 0);
      const averageRating = sumRating / totalRatings;

      // Count star distribution
      const fiveStar = ratings.filter(r => r.rating === 5).length;
      const fourStar = ratings.filter(r => r.rating === 4).length;
      const threeStar = ratings.filter(r => r.rating === 3).length;
      const twoStar = ratings.filter(r => r.rating === 2).length;
      const oneStar = ratings.filter(r => r.rating === 1).length;

      // Calculate category averages
      const qualityRatings = ratings.filter(r => r.quality_rating);
      const averageQuality = qualityRatings.length > 0
        ? qualityRatings.reduce((acc, r) => acc + (r.quality_rating || 0), 0) / qualityRatings.length
        : 0;

      const timelinessRatings = ratings.filter(r => r.timeliness_rating);
      const averageTimeliness = timelinessRatings.length > 0
        ? timelinessRatings.reduce((acc, r) => acc + (r.timeliness_rating || 0), 0) / timelinessRatings.length
        : 0;

      const professionalismRatings = ratings.filter(r => r.professionalism_rating);
      const averageProfessionalism = professionalismRatings.length > 0
        ? professionalismRatings.reduce((acc, r) => acc + (r.professionalism_rating || 0), 0) / professionalismRatings.length
        : 0;

      const valueRatings = ratings.filter(r => r.value_rating);
      const averageValue = valueRatings.length > 0
        ? valueRatings.reduce((acc, r) => acc + (r.value_rating || 0), 0) / valueRatings.length
        : 0;

      // Calculate recommendation rate
      const recommendations = ratings.filter(r => r.would_recommend).length;
      const recommendationRate = (recommendations / totalRatings) * 100;

      return {
        average_rating: averageRating,
        total_ratings: totalRatings,
        five_star: fiveStar,
        four_star: fourStar,
        three_star: threeStar,
        two_star: twoStar,
        one_star: oneStar,
        average_quality: averageQuality,
        average_timeliness: averageTimeliness,
        average_professionalism: averageProfessionalism,
        average_value: averageValue,
        recommendation_rate: recommendationRate,
      };
    } catch (error) {
      console.error('Error getting rating breakdown:', error);
      throw error;
    }
  }

  /**
   * Check if user has already rated vendor for a maintenance request
   */
  async hasRated(vendorId: string, maintenanceRequestId: string): Promise<boolean> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return false;

      const { data, error } = await supabase
        .from('vendor_ratings')
        .select('id')
        .eq('vendor_id', vendorId)
        .eq('maintenance_request_id', maintenanceRequestId)
        .eq('rated_by', user.id)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      return !!data;
    } catch (error) {
      console.error('Error checking if rated:', error);
      return false;
    }
  }
}

export const vendorRatingService = new VendorRatingService();