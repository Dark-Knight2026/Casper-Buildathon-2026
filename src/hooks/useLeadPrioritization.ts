import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase, isSupabaseConfigured } from '@/lib/supabase/client';
import type {
  LeadScore,
  LeadAnalytics,
  PrioritizedLead,
  RecordInteractionPayload,
  PriorityLevel,
  LeadStatus
} from '@/types/lead';

interface UseLeadPrioritizationReturn {
  leads: LeadScore[];
  prioritizedLeads: PrioritizedLead[];
  analytics: LeadAnalytics | null;
  loading: boolean;
  error: string | null;
  recordInteraction: (payload: RecordInteractionPayload) => Promise<void>;
  updateLeadStatus: (leadId: string, status: LeadStatus) => Promise<void>;
  refreshLeads: () => Promise<void>;
}

// Mock data generator
function generateMockLeads(userId: string): LeadScore[] {
  return [
    {
      id: '1',
      agent_id: userId,
      client_id: 'client-1',
      client_name: 'Sarah Mitchell',
      client_email: 'sarah.mitchell@email.com',
      client_phone: '(757) 555-0123',
      engagement_score: 92,
      budget_alignment_score: 88,
      timeline_urgency_score: 95,
      response_rate_score: 90,
      property_match_score: 85,
      overall_score: 90,
      priority_level: 'critical',
      budget_min: 450000,
      budget_max: 550000,
      desired_timeline: 'immediate',
      total_interactions: 15,
      last_interaction_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
      days_since_last_contact: 1,
      email_opens: 8,
      email_clicks: 5,
      property_views: 12,
      showings_attended: 3,
      ai_recommendations: 'High engagement and budget alignment. Schedule showing for waterfront properties immediately.',
      next_best_action: 'Schedule showing for 3 waterfront properties this week',
      predicted_conversion_probability: 85,
      lead_status: 'hot',
      lead_source: 'Website Inquiry',
      tags: ['first-time-buyer', 'pre-approved', 'urgent'],
      created_at: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(),
      updated_at: new Date().toISOString(),
      score_calculated_at: new Date().toISOString()
    },
    {
      id: '2',
      agent_id: userId,
      client_id: 'client-2',
      client_name: 'James & Rebecca Torres',
      client_email: 'torres.family@email.com',
      engagement_score: 85,
      budget_alignment_score: 90,
      timeline_urgency_score: 80,
      response_rate_score: 88,
      property_match_score: 82,
      overall_score: 85,
      priority_level: 'critical',
      budget_min: 600000,
      budget_max: 750000,
      desired_timeline: 'within_month',
      total_interactions: 12,
      last_interaction_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      days_since_last_contact: 2,
      email_opens: 6,
      email_clicks: 4,
      property_views: 10,
      showings_attended: 2,
      ai_recommendations: 'Strong buyers with excellent budget. Focus on luxury properties in Virginia Beach.',
      next_best_action: 'Send curated list of 5-bedroom homes in premium neighborhoods',
      predicted_conversion_probability: 80,
      lead_status: 'hot',
      lead_source: 'Referral',
      tags: ['move-up-buyer', 'family', 'high-budget'],
      created_at: new Date(Date.now() - 21 * 24 * 60 * 60 * 1000).toISOString(),
      updated_at: new Date().toISOString(),
      score_calculated_at: new Date().toISOString()
    },
    {
      id: '3',
      agent_id: userId,
      client_id: 'client-3',
      client_name: 'Michael Chen',
      client_email: 'm.chen@email.com',
      client_phone: '(757) 555-0456',
      engagement_score: 75,
      budget_alignment_score: 70,
      timeline_urgency_score: 85,
      response_rate_score: 72,
      property_match_score: 78,
      overall_score: 76,
      priority_level: 'high',
      budget_min: 350000,
      budget_max: 425000,
      desired_timeline: 'within_month',
      total_interactions: 9,
      last_interaction_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
      days_since_last_contact: 3,
      email_opens: 5,
      email_clicks: 3,
      property_views: 7,
      showings_attended: 1,
      ai_recommendations: 'Moderate engagement. Needs more property options in budget range.',
      next_best_action: 'Follow up with updated listings under $425k',
      predicted_conversion_probability: 65,
      lead_status: 'qualified',
      lead_source: 'Open House',
      tags: ['investor', 'cash-buyer'],
      created_at: new Date(Date.now() - 18 * 24 * 60 * 60 * 1000).toISOString(),
      updated_at: new Date().toISOString(),
      score_calculated_at: new Date().toISOString()
    },
    {
      id: '4',
      agent_id: userId,
      client_id: 'client-4',
      client_name: 'Amanda Rodriguez',
      client_email: 'a.rodriguez@email.com',
      engagement_score: 68,
      budget_alignment_score: 75,
      timeline_urgency_score: 60,
      response_rate_score: 65,
      property_match_score: 70,
      overall_score: 68,
      priority_level: 'high',
      budget_min: 280000,
      budget_max: 340000,
      desired_timeline: 'within_quarter',
      total_interactions: 7,
      last_interaction_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
      days_since_last_contact: 5,
      email_opens: 4,
      email_clicks: 2,
      property_views: 5,
      showings_attended: 1,
      ai_recommendations: 'Needs nurturing. Send educational content about first-time buyer programs.',
      next_best_action: 'Share financing options and schedule consultation call',
      predicted_conversion_probability: 55,
      lead_status: 'nurturing',
      lead_source: 'Facebook Ad',
      tags: ['first-time-buyer', 'needs-financing-info'],
      created_at: new Date(Date.now() - 25 * 24 * 60 * 60 * 1000).toISOString(),
      updated_at: new Date().toISOString(),
      score_calculated_at: new Date().toISOString()
    },
    {
      id: '5',
      agent_id: userId,
      client_id: 'client-5',
      client_name: 'David & Lisa Park',
      client_email: 'park.home@email.com',
      engagement_score: 55,
      budget_alignment_score: 65,
      timeline_urgency_score: 50,
      response_rate_score: 58,
      property_match_score: 60,
      overall_score: 58,
      priority_level: 'medium',
      budget_min: 400000,
      budget_max: 500000,
      desired_timeline: 'flexible',
      total_interactions: 5,
      last_interaction_at: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString(),
      days_since_last_contact: 8,
      email_opens: 3,
      email_clicks: 1,
      property_views: 4,
      showings_attended: 0,
      ai_recommendations: 'Low engagement. Re-engage with market update and new listings.',
      next_best_action: 'Send monthly market report and check in on timeline',
      predicted_conversion_probability: 40,
      lead_status: 'contacted',
      lead_source: 'Zillow',
      tags: ['researching', 'flexible-timeline'],
      created_at: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
      updated_at: new Date().toISOString(),
      score_calculated_at: new Date().toISOString()
    },
    {
      id: '6',
      agent_id: userId,
      client_id: 'client-6',
      client_name: 'Jennifer Williams',
      client_email: 'j.williams@email.com',
      engagement_score: 42,
      budget_alignment_score: 55,
      timeline_urgency_score: 40,
      response_rate_score: 45,
      property_match_score: 48,
      overall_score: 46,
      priority_level: 'medium',
      budget_min: 250000,
      budget_max: 300000,
      desired_timeline: 'flexible',
      total_interactions: 3,
      last_interaction_at: new Date(Date.now() - 12 * 24 * 60 * 60 * 1000).toISOString(),
      days_since_last_contact: 12,
      email_opens: 2,
      email_clicks: 0,
      property_views: 2,
      showings_attended: 0,
      ai_recommendations: 'Minimal engagement. Consider automated drip campaign.',
      next_best_action: 'Add to nurture email sequence, check in quarterly',
      predicted_conversion_probability: 25,
      lead_status: 'cold',
      lead_source: 'Realtor.com',
      tags: ['low-engagement', 'long-term'],
      created_at: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000).toISOString(),
      updated_at: new Date().toISOString(),
      score_calculated_at: new Date().toISOString()
    },
    {
      id: '7',
      agent_id: userId,
      client_id: 'client-7',
      client_name: 'Robert Johnson',
      client_email: 'r.johnson@email.com',
      engagement_score: 35,
      budget_alignment_score: 40,
      timeline_urgency_score: 30,
      response_rate_score: 38,
      property_match_score: 35,
      overall_score: 36,
      priority_level: 'low',
      budget_min: 200000,
      budget_max: 250000,
      desired_timeline: 'flexible',
      total_interactions: 2,
      last_interaction_at: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString(),
      days_since_last_contact: 20,
      email_opens: 1,
      email_clicks: 0,
      property_views: 1,
      showings_attended: 0,
      ai_recommendations: 'Very low engagement. Monitor for activity, minimal outreach.',
      next_best_action: 'Quarterly check-in email only',
      predicted_conversion_probability: 15,
      lead_status: 'cold',
      lead_source: 'Website Form',
      tags: ['inactive', 'low-priority'],
      created_at: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString(),
      updated_at: new Date().toISOString(),
      score_calculated_at: new Date().toISOString()
    }
  ];
}

function generateMockAnalytics(leads: LeadScore[]): LeadAnalytics {
  return {
    total_leads: leads.length,
    critical_leads: leads.filter(l => l.priority_level === 'critical').length,
    high_priority_leads: leads.filter(l => l.priority_level === 'high').length,
    medium_priority_leads: leads.filter(l => l.priority_level === 'medium').length,
    low_priority_leads: leads.filter(l => l.priority_level === 'low').length,
    avg_overall_score: Math.round(leads.reduce((sum, l) => sum + l.overall_score, 0) / leads.length),
    hot_leads: leads.filter(l => l.lead_status === 'hot').length,
    cold_leads: leads.filter(l => l.lead_status === 'cold').length,
    avg_days_to_contact: Math.round(leads.reduce((sum, l) => sum + l.days_since_last_contact, 0) / leads.length),
    total_interactions: leads.reduce((sum, l) => sum + l.total_interactions, 0)
  };
}

export function useLeadPrioritization(): UseLeadPrioritizationReturn {
  const { user } = useAuth();
  const [leads, setLeads] = useState<LeadScore[]>([]);
  const [prioritizedLeads, setPrioritizedLeads] = useState<PrioritizedLead[]>([]);
  const [analytics, setAnalytics] = useState<LeadAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchLeadsFromSupabase = useCallback(async (userId: string) => {
    const { data: leadsData, error: leadsError } = await supabase
      .from('app_a12f5_lead_scores')
      .select('*')
      .eq('agent_id', userId)
      .order('overall_score', { ascending: false });

    if (leadsError) throw leadsError;

    const { data: prioritizedData, error: prioritizedError } = await supabase
      .rpc('get_prioritized_leads', { p_agent_id: userId, p_limit: 50 });

    if (prioritizedError) throw prioritizedError;

    const { data: analyticsData, error: analyticsError } = await supabase
      .rpc('get_lead_analytics', { p_agent_id: userId })
      .single();

    if (analyticsError) throw analyticsError;

    return {
      leads: leadsData || [],
      prioritizedLeads: prioritizedData || [],
      analytics: analyticsData
    };
  }, []);

  const fetchLeadsWithMockData = useCallback(async (userId: string) => {
    await new Promise(resolve => setTimeout(resolve, 500));
    
    const mockLeads = generateMockLeads(userId);
    const mockPrioritized: PrioritizedLead[] = mockLeads
      .filter(l => !['converted', 'lost'].includes(l.lead_status))
      .map(l => ({
        lead_id: l.id,
        client_name: l.client_name,
        overall_score: l.overall_score,
        priority_level: l.priority_level,
        lead_status: l.lead_status,
        days_since_last_contact: l.days_since_last_contact,
        next_best_action: l.next_best_action,
        predicted_conversion_probability: l.predicted_conversion_probability
      }))
      .sort((a, b) => {
        const priorityOrder: Record<PriorityLevel, number> = {
          critical: 1,
          high: 2,
          medium: 3,
          low: 4
        };
        return priorityOrder[a.priority_level] - priorityOrder[b.priority_level] ||
               b.overall_score - a.overall_score;
      });

    const mockAnalytics = generateMockAnalytics(mockLeads);

    return {
      leads: mockLeads,
      prioritizedLeads: mockPrioritized,
      analytics: mockAnalytics
    };
  }, []);

  const fetchLeads = useCallback(async () => {
    if (!user?.id) return;

    try {
      setLoading(true);
      setError(null);

      let data;
      
      if (isSupabaseConfigured()) {
        try {
          data = await fetchLeadsFromSupabase(user.id);
        } catch (err) {
          console.warn('Supabase fetch failed, using mock data:', err);
          data = await fetchLeadsWithMockData(user.id);
        }
      } else {
        data = await fetchLeadsWithMockData(user.id);
      }

      setLeads(data.leads);
      setPrioritizedLeads(data.prioritizedLeads);
      setAnalytics(data.analytics);

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch leads';
      console.error('Lead fetch error:', err);
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [user?.id, fetchLeadsFromSupabase, fetchLeadsWithMockData]);

  const recordInteraction = useCallback(async (payload: RecordInteractionPayload) => {
    if (!user?.id) return;

    try {
      if (isSupabaseConfigured()) {
        const { error: interactionError } = await supabase
          .rpc('record_lead_interaction', {
            p_lead_score_id: payload.lead_score_id,
            p_agent_id: user.id,
            p_interaction_type: payload.interaction_type,
            p_interaction_details: payload.interaction_details || {},
            p_sentiment: payload.sentiment || 'neutral',
            p_notes: payload.notes || null
          });

        if (interactionError) throw interactionError;
      } else {
        await new Promise(resolve => setTimeout(resolve, 300));
      }

      await fetchLeads();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to record interaction';
      console.error('Record interaction error:', err);
      throw new Error(errorMessage);
    }
  }, [user?.id, fetchLeads]);

  const updateLeadStatus = useCallback(async (leadId: string, status: LeadStatus) => {
    try {
      if (isSupabaseConfigured()) {
        const { error: updateError } = await supabase
          .from('app_a12f5_lead_scores')
          .update({ lead_status: status })
          .eq('id', leadId);

        if (updateError) throw updateError;
      } else {
        await new Promise(resolve => setTimeout(resolve, 300));
      }

      // Optimistically update local state
      setLeads(prev => prev.map(lead =>
        lead.id === leadId ? { ...lead, lead_status: status } : lead
      ));

      await fetchLeads();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update lead status';
      console.error('Update status error:', err);
      throw new Error(errorMessage);
    }
  }, [fetchLeads]);

  const refreshLeads = useCallback(async () => {
    await fetchLeads();
  }, [fetchLeads]);

  useEffect(() => {
    fetchLeads();
  }, [fetchLeads]);

  return {
    leads,
    prioritizedLeads,
    analytics,
    loading,
    error,
    recordInteraction,
    updateLeadStatus,
    refreshLeads
  };
}