import { supabase } from '@/lib/supabase/client';

export interface UserProfile {
  id: string;
  user_id: string;
  full_name?: string;
  phone?: string;
  location?: string;
  profile_completed: boolean;
  created_at: string;
  updated_at: string;
}

export interface ProfileUpdateData {
  full_name?: string;
  phone?: string;
  location?: string;
}

export const profileService = {
  async getProfile(userId: string): Promise<UserProfile | null> {
    const { data, error } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    return data;
  },

  async updateProfile(userId: string, profileData: ProfileUpdateData): Promise<UserProfile> {
    // Check if profile exists
    const existing = await this.getProfile(userId);

    if (existing) {
      // Update existing profile
      const { data, error } = await supabase
        .from('user_profiles')
        .update(profileData)
        .eq('user_id', userId)
        .select()
        .single();

      if (error) throw error;
      return data;
    } else {
      // Create new profile
      const { data, error } = await supabase
        .from('user_profiles')
        .insert({ user_id: userId, ...profileData })
        .select()
        .single();

      if (error) throw error;
      return data;
    }
  },

  async markProfileComplete(userId: string): Promise<void> {
    const { error } = await supabase
      .from('user_profiles')
      .update({ profile_completed: true })
      .eq('user_id', userId);

    if (error) throw error;
  }
};