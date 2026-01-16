import { supabase } from '@/lib/supabase/client';

export interface Favorite {
  id: string;
  user_id: string;
  property_id: string;
  created_at: string;
}

export const favoriteService = {
  async addFavorite(userId: string, propertyId: string): Promise<Favorite> {
    const { data, error } = await supabase
      .from('favorites')
      .insert({ user_id: userId, property_id: propertyId })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async removeFavorite(userId: string, propertyId: string): Promise<void> {
    const { error } = await supabase
      .from('favorites')
      .delete()
      .match({ user_id: userId, property_id: propertyId });

    if (error) throw error;
  },

  async getFavorites(userId: string): Promise<Favorite[]> {
    const { data, error } = await supabase
      .from('favorites')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  async isFavorited(userId: string, propertyId: string): Promise<boolean> {
    const { data, error } = await supabase
      .from('favorites')
      .select('id')
      .match({ user_id: userId, property_id: propertyId })
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    return !!data;
  }
};