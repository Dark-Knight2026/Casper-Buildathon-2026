/**
 * Listing Enhancement Utilities
 * Core functions for enhanced listing features
 */

import { supabase, isSupabaseConfigured } from './supabase';
import { logger } from '@/utils/logger';
import { uploadFile, compressImage, validateFile, deleteFile } from './storageHelpers';
import type {
  EnhancedListing,
  ListingPhoto,
  ListingAnalytics,
  PricingRecommendation,
  AIDescriptionRequest,
  AIDescriptionResponse,
  ListingTemplate,
  ListingInquiry,
  ShowingRequest,
  NeighborhoodData,
} from '@/types/listing-enhanced';

/**
 * Photo Management
 */
export async function uploadListingPhoto(
  listingId: string,
  file: File,
  order: number,
  isFeatured: boolean = false
): Promise<ListingPhoto | null> {
  if (!isSupabaseConfigured()) {
    logger.warn('Supabase not configured');
    return null;
  }

  try {
    // Validate file
    const validation = validateFile(file, {
      maxSize: 10 * 1024 * 1024, // 10MB
      allowedTypes: ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'],
    });

    if (!validation.valid) {
      throw new Error(validation.error);
    }

    // Compress image
    const compressedFile = await compressImage(file, 1920, 1080, 0.85);

    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('User not authenticated');
    }

    // Upload to Supabase Storage
    const fileExt = compressedFile.name.split('.').pop();
    const fileName = `${user.id}/${listingId}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
    const uploadResult = await uploadFile('listing-photos', fileName, compressedFile);

    if (!uploadResult.success) {
      throw new Error(uploadResult.error);
    }

    // Create photo record in database
    const { data: photoData, error: photoError } = await supabase
      .from('listing_photos')
      .insert({
        listing_id: listingId,
        url: uploadResult.url,
        order,
        is_featured: isFeatured,
        uploaded_by: user.id,
        metadata: {
          width: 1920,
          height: 1080,
          size: compressedFile.size,
          format: fileExt,
        },
      })
      .select()
      .single();

    if (photoError) throw photoError;

    return {
      id: photoData.id,
      listingId: photoData.listing_id,
      url: photoData.url,
      order: photoData.order,
      isFeatured: photoData.is_featured,
      uploadedAt: new Date(photoData.uploaded_at),
      uploadedBy: photoData.uploaded_by,
      metadata: photoData.metadata,
    };
  } catch (error) {
    logger.error('Failed to upload photo:', error);
    return null;
  }
}

export async function reorderListingPhotos(
  listingId: string,
  photoOrders: { photoId: string; order: number }[]
): Promise<boolean> {
  if (!isSupabaseConfigured()) return false;

  try {
    for (const { photoId, order } of photoOrders) {
      await supabase
        .from('listing_photos')
        .update({ order })
        .eq('id', photoId)
        .eq('listing_id', listingId);
    }
    return true;
  } catch (error) {
    logger.error('Failed to reorder photos:', error);
    return false;
  }
}

export async function setFeaturedPhoto(
  listingId: string,
  photoId: string
): Promise<boolean> {
  if (!isSupabaseConfigured()) return false;

  try {
    // Remove featured from all photos
    await supabase
      .from('listing_photos')
      .update({ is_featured: false })
      .eq('listing_id', listingId);

    // Set new featured photo
    await supabase
      .from('listing_photos')
      .update({ is_featured: true })
      .eq('id', photoId)
      .eq('listing_id', listingId);

    return true;
  } catch (error) {
    logger.error('Failed to set featured photo:', error);
    return false;
  }
}

export async function deleteListingPhoto(photoId: string): Promise<boolean> {
  if (!isSupabaseConfigured()) return false;

  try {
    // Get photo data
    const { data: photo } = await supabase
      .from('listing_photos')
      .select('url')
      .eq('id', photoId)
      .single();

    if (photo) {
      // Extract file path from URL
      const url = new URL(photo.url);
      const pathParts = url.pathname.split('/');
      const filePath = pathParts.slice(-3).join('/'); // user_id/listing_id/filename

      // Delete from storage
      await deleteFile('listing-photos', filePath);
    }

    // Delete record
    await supabase.from('listing_photos').delete().eq('id', photoId);
    return true;
  } catch (error) {
    logger.error('Failed to delete photo:', error);
    return false;
  }
}

/**
 * AI Description Generation
 */
export async function generateAIDescription(
  request: AIDescriptionRequest
): Promise<AIDescriptionResponse | null> {
  if (!isSupabaseConfigured()) return null;

  try {
    const { data, error } = await supabase.functions.invoke('generate-listing-description', {
      body: request,
    });

    if (error) throw error;
    return data as AIDescriptionResponse;
  } catch (error) {
    logger.error('Failed to generate AI description:', error);
    return null;
  }
}

/**
 * Pricing Intelligence
 */
export async function getPricingRecommendation(
  listingId: string
): Promise<PricingRecommendation | null> {
  if (!isSupabaseConfigured()) return null;

  try {
    const { data, error } = await supabase.functions.invoke('get-pricing-recommendation', {
      body: { listingId },
    });

    if (error) throw error;
    return data as PricingRecommendation;
  } catch (error) {
    logger.error('Failed to get pricing recommendation:', error);
    return null;
  }
}

/**
 * Listing Analytics
 */
export async function trackListingView(
  listingId: string,
  source: string = 'direct'
): Promise<void> {
  if (!isSupabaseConfigured()) return;

  try {
    const { data: { user } } = await supabase.auth.getUser();

    await supabase.from('listing_views').insert({
      listing_id: listingId,
      source,
      viewed_at: new Date().toISOString(),
      user_id: user?.id,
    });
  } catch (error) {
    logger.error('Failed to track listing view:', error);
  }
}

export async function getListingAnalytics(
  listingId: string
): Promise<ListingAnalytics | null> {
  if (!isSupabaseConfigured()) return null;

  try {
    const { data, error } = await supabase
      .from('listing_analytics')
      .select('*')
      .eq('listing_id', listingId)
      .single();

    if (error) throw error;

    return {
      listingId: data.listing_id,
      totalViews: data.total_views,
      uniqueViews: data.unique_views,
      averageTimeOnPage: data.average_time_on_page,
      inquiries: data.inquiries,
      showingRequests: data.showing_requests,
      favorites: data.favorites,
      shares: data.shares,
      trafficSources: data.traffic_sources || [],
      viewsByDay: data.views_by_day || [],
      engagementMetrics: data.engagement_metrics || {
        photoViews: [],
        mostViewedSection: 'overview',
        averageScrollDepth: 0,
        bounceRate: 0,
        conversionRate: 0,
      },
      lastUpdated: new Date(data.last_updated),
    };
  } catch (error) {
    logger.error('Failed to get listing analytics:', error);
    return null;
  }
}

/**
 * Template Management
 */
export async function saveListingAsTemplate(
  listing: Partial<EnhancedListing>,
  templateName: string,
  description?: string
): Promise<ListingTemplate | null> {
  if (!isSupabaseConfigured()) return null;

  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { data, error } = await supabase
      .from('listing_templates')
      .insert({
        name: templateName,
        description,
        property_type: listing.propertyType,
        template_data: listing,
        created_by: user.id,
      })
      .select()
      .single();

    if (error) throw error;

    return {
      id: data.id,
      name: data.name,
      description: data.description,
      propertyType: data.property_type,
      templateData: data.template_data,
      createdBy: data.created_by,
      createdAt: new Date(data.created_at),
      isPublic: data.is_public,
      usageCount: data.usage_count,
    };
  } catch (error) {
    logger.error('Failed to save template:', error);
    return null;
  }
}

export async function getListingTemplates(
  propertyType?: string
): Promise<ListingTemplate[]> {
  if (!isSupabaseConfigured()) return [];

  try {
    let query = supabase
      .from('listing_templates')
      .select('*')
      .order('usage_count', { ascending: false });

    if (propertyType) {
      query = query.eq('property_type', propertyType);
    }

    const { data, error } = await query;
    if (error) throw error;

    return data.map(item => ({
      id: item.id,
      name: item.name,
      description: item.description,
      propertyType: item.property_type,
      templateData: item.template_data,
      createdBy: item.created_by,
      createdAt: new Date(item.created_at),
      isPublic: item.is_public,
      usageCount: item.usage_count,
    }));
  } catch (error) {
    logger.error('Failed to get templates:', error);
    return [];
  }
}

/**
 * Inquiry Management
 */
export async function submitListingInquiry(
  inquiry: Omit<ListingInquiry, 'id' | 'submittedAt' | 'status'>
): Promise<ListingInquiry | null> {
  if (!isSupabaseConfigured()) return null;

  try {
    const { data, error } = await supabase
      .from('listing_inquiries')
      .insert({
        listing_id: inquiry.listingId,
        inquirer_name: inquiry.inquirerName,
        inquirer_email: inquiry.inquirerEmail,
        inquirer_phone: inquiry.inquirerPhone,
        message: inquiry.message,
        inquiry_type: inquiry.inquiryType,
        source: inquiry.source,
        priority: inquiry.priority,
      })
      .select()
      .single();

    if (error) throw error;

    return {
      id: data.id,
      listingId: data.listing_id,
      inquirerName: data.inquirer_name,
      inquirerEmail: data.inquirer_email,
      inquirerPhone: data.inquirer_phone,
      message: data.message,
      inquiryType: data.inquiry_type,
      source: data.source,
      status: data.status,
      priority: data.priority,
      submittedAt: new Date(data.submitted_at),
    };
  } catch (error) {
    logger.error('Failed to submit inquiry:', error);
    return null;
  }
}

/**
 * Showing Management
 */
export async function requestShowing(
  request: Omit<ShowingRequest, 'id' | 'createdAt' | 'status'>
): Promise<ShowingRequest | null> {
  if (!isSupabaseConfigured()) return null;

  try {
    const { data, error } = await supabase
      .from('showing_requests')
      .insert({
        listing_id: request.listingId,
        requested_by: request.requestedBy,
        requested_by_email: request.requestedByEmail,
        requested_by_phone: request.requestedByPhone,
        preferred_date: request.preferredDate.toISOString(),
        preferred_time: request.preferredTime,
        alternate_date: request.alternateDate?.toISOString(),
        alternate_time: request.alternateTime,
        notes: request.notes,
      })
      .select()
      .single();

    if (error) throw error;

    return {
      id: data.id,
      listingId: data.listing_id,
      requestedBy: data.requested_by,
      requestedByEmail: data.requested_by_email,
      requestedByPhone: data.requested_by_phone,
      preferredDate: new Date(data.preferred_date),
      preferredTime: data.preferred_time,
      alternateDate: data.alternate_date ? new Date(data.alternate_date) : undefined,
      alternateTime: data.alternate_time,
      notes: data.notes,
      status: data.status,
      createdAt: new Date(data.created_at),
    };
  } catch (error) {
    logger.error('Failed to request showing:', error);
    return null;
  }
}

/**
 * Address Validation (Google Maps API)
 */
export async function validateAddress(address: string): Promise<{
  isValid: boolean;
  formattedAddress?: string;
  components?: {
    street?: string;
    city?: string;
    state?: string;
    zipCode?: string;
    country?: string;
  };
  coordinates?: {
    lat: number;
    lng: number;
  };
}> {
  // This would integrate with Google Maps Geocoding API
  // For now, return a placeholder
  return {
    isValid: true,
    formattedAddress: address,
  };
}

/**
 * Neighborhood Data
 */
export async function getNeighborhoodData(
  address: string
): Promise<NeighborhoodData | null> {
  if (!isSupabaseConfigured()) return null;

  try {
    const { data, error } = await supabase.functions.invoke('get-neighborhood-data', {
      body: { address },
    });

    if (error) throw error;
    return data as NeighborhoodData;
  } catch (error) {
    logger.error('Failed to get neighborhood data:', error);
    return null;
  }
}

/**
 * QR Code Generation
 */
export function generateListingQRCode(listingId: string): string {
  const listingUrl = `${window.location.origin}/listings/${listingId}`;
  return `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(listingUrl)}`;
}

/**
 * SEO Optimization
 */
export function generateSEOMetadata(listing: Partial<EnhancedListing>): {
  title: string;
  description: string;
  keywords: string[];
} {
  const { title, address, price, bedrooms, bathrooms, propertyType } = listing;

  const seoTitle = title || `${bedrooms}BR/${bathrooms}BA ${propertyType} for Sale`;
  const seoDescription = `${seoTitle} in ${address?.city}, ${address?.state}. Listed at $${price?.toLocaleString()}. ${listing.description?.substring(0, 100)}...`;
  const seoKeywords = [
    propertyType || '',
    `${bedrooms} bedroom`,
    address?.city || '',
    address?.state || '',
    'real estate',
    'for sale',
  ].filter(Boolean);

  return {
    title: seoTitle,
    description: seoDescription,
    keywords: seoKeywords,
  };
}