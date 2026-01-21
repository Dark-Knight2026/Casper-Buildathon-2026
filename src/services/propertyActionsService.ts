import { supabase } from '@/lib/supabase/client';

// ==================== INTERFACES ====================

export interface ContactMessage {
  id: string;
  property_id: string;
  user_id: string;
  landlord_id: string;
  sender_name: string;
  sender_email: string;
  sender_phone: string;
  message: string;
  created_at: string;
}

export interface ViewingSchedule {
  id: string;
  property_id: string;
  user_id: string;
  landlord_id: string;
  viewing_date: string;
  viewing_time: string;
  status: 'pending' | 'confirmed' | 'cancelled';
  created_at: string;
}

export interface RentalApplication {
  id: string;
  property_id: string;
  user_id: string;
  landlord_id: string;
  
  // Personal Information
  full_name: string;
  email: string;
  phone: string;
  date_of_birth: string;
  
  // Current Address
  current_address: string;
  current_city: string;
  current_state: string;
  current_zip: string;
  move_in_date: string;
  
  // Employment
  employer: string;
  job_title: string;
  employment_length: string;
  monthly_income: number;
  
  // References
  reference1_name: string;
  reference1_phone: string;
  reference2_name?: string;
  reference2_phone?: string;
  
  // Additional
  pets: boolean;
  pet_description?: string;
  additional_info?: string;
  background_check_consent: boolean;
  
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
}

export interface Property {
  id: string;
  landlord_id: string;
  title: string;
  description?: string;
  address: string;
  city: string;
  state: string;
  zip_code: string;
  price: number;
  bedrooms: number;
  bathrooms: number;
  square_feet?: number;
  property_type: string;
  amenities?: string[];
  images?: string[];
  available_from?: string;
  is_available: boolean;
  created_at: string;
  updated_at: string;
}

export interface Favorite {
  id: string;
  user_id: string;
  property_id: string;
  created_at: string;
  property?: Property;
}

export interface ContactLandlordData {
  propertyId: string;
  landlordId: string;
  senderName: string;
  senderEmail: string;
  senderPhone: string;
  message: string;
}

export interface ScheduleViewingData {
  propertyId: string;
  landlordId: string;
  viewingDate: Date;
  viewingTime: string;
}

export interface SubmitApplicationData {
  propertyId: string;
  landlordId: string;
  fullName: string;
  email: string;
  phone: string;
  dateOfBirth: string;
  currentAddress: string;
  currentCity: string;
  currentState: string;
  currentZip: string;
  moveInDate: string;
  employer: string;
  jobTitle: string;
  employmentLength: string;
  monthlyIncome: number;
  reference1Name: string;
  reference1Phone: string;
  reference2Name?: string;
  reference2Phone?: string;
  pets: boolean;
  petDescription?: string;
  additionalInfo?: string;
  backgroundCheckConsent: boolean;
}

// ==================== SERVICE ====================

export const propertyActionsService = {
  // ==================== FAVORITES ====================

  /**
   * Add a property to user's favorites
   */
  async addToFavorites(userId: string, propertyId: string): Promise<Favorite> {
    const { data, error } = await supabase
      .from('favorites')
      .insert({
        user_id: userId,
        property_id: propertyId,
      })
      .select()
      .single();

    if (error) {
      // Handle duplicate favorite error gracefully
      if (error.code === '23505') {
        throw new Error('Property is already in your favorites');
      }
      throw error;
    }

    return data;
  },

  /**
   * Remove a property from user's favorites
   */
  async removeFromFavorites(userId: string, propertyId: string): Promise<void> {
    const { error } = await supabase
      .from('favorites')
      .delete()
      .eq('user_id', userId)
      .eq('property_id', propertyId);

    if (error) throw error;
  },

  /**
   * Get all user's favorite properties
   */
  async getFavorites(userId: string): Promise<Favorite[]> {
    const { data, error } = await supabase
      .from('favorites')
      .select(`
        *,
        property:properties (*)
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  /**
   * Check if a property is favorited by user
   */
  async checkIfFavorited(userId: string, propertyId: string): Promise<boolean> {
    const { data, error } = await supabase
      .from('favorites')
      .select('id')
      .eq('user_id', userId)
      .eq('property_id', propertyId)
      .single();

    if (error && error.code !== 'PGRST116') {
      // PGRST116 = not found, which is expected
      console.error('Error checking favorite status:', error);
      return false;
    }

    return !!data;
  },

  /**
   * Get favorite IDs for a user (for quick lookup)
   */
  async getFavoriteIds(userId: string): Promise<string[]> {
    const { data, error } = await supabase
      .from('favorites')
      .select('property_id')
      .eq('user_id', userId);

    if (error) throw error;
    return data?.map(f => f.property_id) || [];
  },

  // ==================== CONTACT ====================

  /**
   * Send a contact message to the landlord
   */
  async contactLandlord(userId: string, data: ContactLandlordData): Promise<ContactMessage> {
    const { data: message, error } = await supabase
      .from('contact_messages')
      .insert({
        property_id: data.propertyId,
        user_id: userId,
        landlord_id: data.landlordId,
        sender_name: data.senderName,
        sender_email: data.senderEmail,
        sender_phone: data.senderPhone,
        message: data.message,
      })
      .select()
      .single();

    if (error) throw error;

    // Trigger email notification
    await this.sendContactNotification(message);

    return message;
  },

  /**
   * Get contact messages for a property
   */
  async getContactMessages(propertyId: string): Promise<ContactMessage[]> {
    const { data, error } = await supabase
      .from('contact_messages')
      .select('*')
      .eq('property_id', propertyId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  /**
   * Get user's sent contact messages
   */
  async getUserContactMessages(userId: string): Promise<ContactMessage[]> {
    const { data, error } = await supabase
      .from('contact_messages')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  // ==================== VIEWINGS ====================

  /**
   * Schedule a property viewing
   */
  async scheduleViewing(userId: string, data: ScheduleViewingData): Promise<ViewingSchedule> {
    const { data: viewing, error } = await supabase
      .from('viewing_schedules')
      .insert({
        property_id: data.propertyId,
        user_id: userId,
        landlord_id: data.landlordId,
        viewing_date: data.viewingDate.toISOString().split('T')[0],
        viewing_time: data.viewingTime,
        status: 'pending',
      })
      .select()
      .single();

    if (error) throw error;

    // Trigger email notification
    await this.sendViewingNotification(viewing);

    return viewing;
  },

  /**
   * Get viewing schedules for a property
   */
  async getViewingSchedules(propertyId: string): Promise<ViewingSchedule[]> {
    const { data, error } = await supabase
      .from('viewing_schedules')
      .select('*')
      .eq('property_id', propertyId)
      .order('viewing_date', { ascending: true });

    if (error) throw error;
    return data || [];
  },

  /**
   * Get user's scheduled viewings
   */
  async getUserViewings(userId: string): Promise<ViewingSchedule[]> {
    const { data, error } = await supabase
      .from('viewing_schedules')
      .select(`
        *,
        property:properties (*)
      `)
      .eq('user_id', userId)
      .order('viewing_date', { ascending: true });

    if (error) throw error;
    return data || [];
  },

  /**
   * Update viewing schedule status
   */
  async updateViewingStatus(
    viewingId: string,
    status: 'pending' | 'confirmed' | 'cancelled'
  ): Promise<ViewingSchedule> {
    const { data, error } = await supabase
      .from('viewing_schedules')
      .update({ status })
      .eq('id', viewingId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  /**
   * Cancel a viewing (tenant action)
   */
  async cancelViewing(userId: string, viewingId: string): Promise<ViewingSchedule> {
    const { data, error } = await supabase
      .from('viewing_schedules')
      .update({ status: 'cancelled' })
      .eq('id', viewingId)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // ==================== APPLICATIONS ====================

  /**
   * Submit a rental application
   */
  async submitApplication(userId: string, data: SubmitApplicationData): Promise<RentalApplication> {
    const { data: application, error } = await supabase
      .from('rental_applications')
      .insert({
        property_id: data.propertyId,
        user_id: userId,
        landlord_id: data.landlordId,
        full_name: data.fullName,
        email: data.email,
        phone: data.phone,
        date_of_birth: data.dateOfBirth,
        current_address: data.currentAddress,
        current_city: data.currentCity,
        current_state: data.currentState,
        current_zip: data.currentZip,
        move_in_date: data.moveInDate,
        employer: data.employer,
        job_title: data.jobTitle,
        employment_length: data.employmentLength,
        monthly_income: data.monthlyIncome,
        reference1_name: data.reference1Name,
        reference1_phone: data.reference1Phone,
        reference2_name: data.reference2Name,
        reference2_phone: data.reference2Phone,
        pets: data.pets,
        pet_description: data.petDescription,
        additional_info: data.additionalInfo,
        background_check_consent: data.backgroundCheckConsent,
        status: 'pending',
      })
      .select()
      .single();

    if (error) throw error;

    // Trigger email notification
    await this.sendApplicationNotification(application);

    return application;
  },

  /**
   * Get rental applications for a property
   */
  async getRentalApplications(propertyId: string): Promise<RentalApplication[]> {
    const { data, error } = await supabase
      .from('rental_applications')
      .select('*')
      .eq('property_id', propertyId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  /**
   * Get user's submitted applications
   */
  async getUserApplications(userId: string): Promise<RentalApplication[]> {
    const { data, error } = await supabase
      .from('rental_applications')
      .select(`
        *,
        property:properties (*)
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  /**
   * Update application status
   */
  async updateApplicationStatus(
    applicationId: string,
    status: 'pending' | 'approved' | 'rejected'
  ): Promise<RentalApplication> {
    const { data, error } = await supabase
      .from('rental_applications')
      .update({ status })
      .eq('id', applicationId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // ==================== EMAIL NOTIFICATIONS ====================

  /**
   * Send contact notification email
   */
  async sendContactNotification(message: ContactMessage): Promise<void> {
    try {
      const { error } = await supabase.functions.invoke('send-email', {
        body: {
          type: 'contact',
          data: message,
        },
      });

      if (error) {
        console.error('Failed to send contact notification:', error);
      }
    } catch (error) {
      console.error('Error sending contact notification:', error);
    }
  },

  /**
   * Send viewing notification email
   */
  async sendViewingNotification(viewing: ViewingSchedule): Promise<void> {
    try {
      const { error } = await supabase.functions.invoke('send-email', {
        body: {
          type: 'viewing',
          data: viewing,
        },
      });

      if (error) {
        console.error('Failed to send viewing notification:', error);
      }
    } catch (error) {
      console.error('Error sending viewing notification:', error);
    }
  },

  /**
   * Send application notification email
   */
  async sendApplicationNotification(application: RentalApplication): Promise<void> {
    try {
      const { error } = await supabase.functions.invoke('send-email', {
        body: {
          type: 'application',
          data: application,
        },
      });

      if (error) {
        console.error('Failed to send application notification:', error);
      }
    } catch (error) {
      console.error('Error sending application notification:', error);
    }
  },
};