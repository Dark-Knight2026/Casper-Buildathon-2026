import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase, isSupabaseConfigured } from '@/lib/supabase/client';
import type {
  CommunicationTemplate,
  CommunicationRecord,
  FollowUpSequence,
  SequenceEnrollment,
  CommunicationAnalytics,
  SendCommunicationPayload,
  TemplateCategory,
  CommunicationType
} from '@/types/communication';

interface UseCommunicationHubReturn {
  templates: CommunicationTemplate[];
  communications: CommunicationRecord[];
  sequences: FollowUpSequence[];
  enrollments: SequenceEnrollment[];
  analytics: CommunicationAnalytics | null;
  loading: boolean;
  error: string | null;
  sendCommunication: (payload: SendCommunicationPayload) => Promise<void>;
  createTemplate: (template: Partial<CommunicationTemplate>) => Promise<void>;
  updateTemplate: (id: string, updates: Partial<CommunicationTemplate>) => Promise<void>;
  deleteTemplate: (id: string) => Promise<void>;
  createSequence: (sequence: Partial<FollowUpSequence>) => Promise<void>;
  enrollInSequence: (sequenceId: string, clientIds: string[]) => Promise<void>;
  pauseEnrollment: (enrollmentId: string) => Promise<void>;
  resumeEnrollment: (enrollmentId: string) => Promise<void>;
  stopEnrollment: (enrollmentId: string) => Promise<void>;
  refreshData: () => Promise<void>;
}

// Mock data generators
function generateMockTemplates(): CommunicationTemplate[] {
  return [
    {
      id: '1',
      name: 'New Lead Introduction',
      category: 'introduction',
      type: 'email',
      subject: 'Welcome! Let\'s Find Your Dream Home',
      body: 'Hi {{client_name}},\n\nThank you for reaching out! I\'m excited to help you find your perfect home in Virginia Beach.\n\nI noticed you\'re interested in properties around {{budget_range}}. I have some great options to show you that match your criteria.\n\nWhen would be a good time for a quick call to discuss your needs?\n\nBest regards,\n{{agent_name}}',
      variables: ['client_name', 'budget_range', 'agent_name'],
      is_active: true,
      usage_count: 45,
      avg_response_rate: 68,
      created_at: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString(),
      updated_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString()
    },
    {
      id: '2',
      name: 'Showing Reminder - 24 Hours',
      category: 'showing_reminder',
      type: 'sms',
      body: 'Hi {{client_name}}! This is a reminder about your property showing tomorrow at {{showing_time}} for {{property_address}}. Looking forward to seeing you! Reply CONFIRM or call me if you need to reschedule.',
      variables: ['client_name', 'showing_time', 'property_address'],
      is_active: true,
      usage_count: 128,
      avg_response_rate: 92,
      created_at: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000).toISOString(),
      updated_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()
    },
    {
      id: '3',
      name: 'Post-Showing Follow-Up',
      category: 'follow_up',
      type: 'email',
      subject: 'What did you think of {{property_address}}?',
      body: 'Hi {{client_name}},\n\nI hope you enjoyed viewing {{property_address}} today! I\'d love to hear your thoughts.\n\nWhat did you like most about the property? Any concerns or questions?\n\nI also have {{similar_count}} similar properties that just came on the market. Would you like to schedule more showings?\n\nLet me know!\n\n{{agent_name}}',
      variables: ['client_name', 'property_address', 'similar_count', 'agent_name'],
      is_active: true,
      usage_count: 89,
      avg_response_rate: 75,
      created_at: new Date(Date.now() - 50 * 24 * 60 * 60 * 1000).toISOString(),
      updated_at: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString()
    },
    {
      id: '4',
      name: 'New Listing Alert',
      category: 'listing_alert',
      type: 'email',
      subject: 'New Property Alert: {{property_address}}',
      body: 'Hi {{client_name}},\n\nGreat news! A new property just hit the market that matches your criteria:\n\n📍 {{property_address}}\n💰 ${{price}}\n🛏️ {{beds}} beds | {{baths}} baths\n📐 {{sqft}} sq ft\n\nThis one won\'t last long in this market. Would you like to schedule a showing?\n\nView photos: {{listing_link}}\n\nBest,\n{{agent_name}}',
      variables: ['client_name', 'property_address', 'price', 'beds', 'baths', 'sqft', 'listing_link', 'agent_name'],
      is_active: true,
      usage_count: 156,
      avg_response_rate: 82,
      created_at: new Date(Date.now() - 40 * 24 * 60 * 60 * 1000).toISOString(),
      updated_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString()
    },
    {
      id: '5',
      name: 'Offer Status Update',
      category: 'offer_update',
      type: 'sms',
      body: 'Hi {{client_name}}, update on your offer for {{property_address}}: {{status_message}}. Call me when you can to discuss next steps!',
      variables: ['client_name', 'property_address', 'status_message'],
      is_active: true,
      usage_count: 67,
      avg_response_rate: 95,
      created_at: new Date(Date.now() - 35 * 24 * 60 * 60 * 1000).toISOString(),
      updated_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString()
    },
    {
      id: '6',
      name: 'Monthly Market Update',
      category: 'market_update',
      type: 'email',
      subject: 'Virginia Beach Real Estate Market Update - {{month}}',
      body: 'Hi {{client_name}},\n\nHere\'s your monthly market update for Virginia Beach:\n\n📊 Median Home Price: ${{median_price}} ({{price_change}})\n⏱️ Average Days on Market: {{avg_dom}} days\n📈 Inventory Level: {{inventory_level}}\n\nKey Insights:\n{{market_insights}}\n\nLet me know if you\'d like to discuss how these trends affect your home search!\n\nBest,\n{{agent_name}}',
      variables: ['client_name', 'month', 'median_price', 'price_change', 'avg_dom', 'inventory_level', 'market_insights', 'agent_name'],
      is_active: true,
      usage_count: 234,
      avg_response_rate: 45,
      created_at: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString(),
      updated_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
    }
  ];
}

function generateMockCommunications(): CommunicationRecord[] {
  const baseDate = new Date();
  return [
    {
      id: '1',
      agent_id: 'agent-1',
      client_id: 'client-1',
      client_name: 'Sarah Mitchell',
      type: 'email',
      status: 'replied',
      template_id: '1',
      subject: 'Welcome! Let\'s Find Your Dream Home',
      body: 'Hi Sarah, Thank you for reaching out!...',
      sent_at: new Date(baseDate.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      delivered_at: new Date(baseDate.getTime() - 2 * 24 * 60 * 60 * 1000 + 5 * 60 * 1000).toISOString(),
      opened_at: new Date(baseDate.getTime() - 2 * 24 * 60 * 60 * 1000 + 45 * 60 * 1000).toISOString(),
      replied_at: new Date(baseDate.getTime() - 1 * 24 * 60 * 60 * 1000 + 3 * 60 * 60 * 1000).toISOString(),
      reply_content: 'Thank you! I\'d love to schedule a call. I\'m available tomorrow afternoon.',
      created_at: new Date(baseDate.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      updated_at: new Date(baseDate.getTime() - 1 * 24 * 60 * 60 * 1000).toISOString()
    },
    {
      id: '2',
      agent_id: 'agent-1',
      client_id: 'client-2',
      client_name: 'James Torres',
      type: 'sms',
      status: 'delivered',
      template_id: '2',
      body: 'Hi James! This is a reminder about your property showing tomorrow at 2:00 PM...',
      sent_at: new Date(baseDate.getTime() - 1 * 24 * 60 * 60 * 1000).toISOString(),
      delivered_at: new Date(baseDate.getTime() - 1 * 24 * 60 * 60 * 1000 + 2 * 60 * 1000).toISOString(),
      created_at: new Date(baseDate.getTime() - 1 * 24 * 60 * 60 * 1000).toISOString(),
      updated_at: new Date(baseDate.getTime() - 1 * 24 * 60 * 60 * 1000).toISOString()
    },
    {
      id: '3',
      agent_id: 'agent-1',
      client_id: 'client-3',
      client_name: 'Michael Chen',
      type: 'email',
      status: 'opened',
      template_id: '4',
      subject: 'New Property Alert: 2847 Ocean View Drive',
      body: 'Hi Michael, Great news! A new property just hit the market...',
      sent_at: new Date(baseDate.getTime() - 12 * 60 * 60 * 1000).toISOString(),
      delivered_at: new Date(baseDate.getTime() - 12 * 60 * 60 * 1000 + 3 * 60 * 1000).toISOString(),
      opened_at: new Date(baseDate.getTime() - 10 * 60 * 60 * 1000).toISOString(),
      created_at: new Date(baseDate.getTime() - 12 * 60 * 60 * 1000).toISOString(),
      updated_at: new Date(baseDate.getTime() - 10 * 60 * 60 * 1000).toISOString()
    },
    {
      id: '4',
      agent_id: 'agent-1',
      client_id: 'client-4',
      client_name: 'Amanda Rodriguez',
      type: 'email',
      status: 'clicked',
      template_id: '3',
      subject: 'What did you think of 1523 Shoreline Avenue?',
      body: 'Hi Amanda, I hope you enjoyed viewing the property today!...',
      sent_at: new Date(baseDate.getTime() - 6 * 60 * 60 * 1000).toISOString(),
      delivered_at: new Date(baseDate.getTime() - 6 * 60 * 60 * 1000 + 4 * 60 * 1000).toISOString(),
      opened_at: new Date(baseDate.getTime() - 5 * 60 * 60 * 1000).toISOString(),
      clicked_at: new Date(baseDate.getTime() - 4 * 60 * 60 * 1000 + 30 * 60 * 1000).toISOString(),
      created_at: new Date(baseDate.getTime() - 6 * 60 * 60 * 1000).toISOString(),
      updated_at: new Date(baseDate.getTime() - 4 * 60 * 60 * 1000).toISOString()
    },
    {
      id: '5',
      agent_id: 'agent-1',
      client_id: 'client-5',
      client_name: 'David Park',
      type: 'sms',
      status: 'replied',
      template_id: '5',
      body: 'Hi David, update on your offer for 4156 Coastal Boulevard: Seller has countered...',
      sent_at: new Date(baseDate.getTime() - 3 * 60 * 60 * 1000).toISOString(),
      delivered_at: new Date(baseDate.getTime() - 3 * 60 * 60 * 1000 + 1 * 60 * 1000).toISOString(),
      replied_at: new Date(baseDate.getTime() - 2 * 60 * 60 * 1000 + 15 * 60 * 1000).toISOString(),
      reply_content: 'Thanks! I\'ll call you in 10 minutes.',
      created_at: new Date(baseDate.getTime() - 3 * 60 * 60 * 1000).toISOString(),
      updated_at: new Date(baseDate.getTime() - 2 * 60 * 60 * 1000).toISOString()
    }
  ];
}

function generateMockSequences(): FollowUpSequence[] {
  return [
    {
      id: '1',
      name: 'New Lead Nurture Sequence',
      description: 'Automated 7-day follow-up sequence for new leads',
      trigger_event: 'new_lead',
      is_active: true,
      steps: [
        {
          step_number: 1,
          delay_days: 0,
          delay_hours: 0,
          type: 'email',
          template_id: '1',
          template_name: 'New Lead Introduction'
        },
        {
          step_number: 2,
          delay_days: 2,
          delay_hours: 0,
          type: 'email',
          template_id: '4',
          template_name: 'New Listing Alert',
          conditions: {
            only_if_no_response: true
          }
        },
        {
          step_number: 3,
          delay_days: 5,
          delay_hours: 0,
          type: 'sms',
          template_id: '2',
          template_name: 'Showing Reminder',
          conditions: {
            skip_if_replied: true
          }
        },
        {
          step_number: 4,
          delay_days: 7,
          delay_hours: 0,
          type: 'email',
          template_id: '6',
          template_name: 'Monthly Market Update',
          conditions: {
            only_if_no_response: true
          }
        }
      ],
      total_enrolled: 23,
      avg_completion_rate: 78,
      avg_response_rate: 65,
      created_at: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString(),
      updated_at: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString()
    },
    {
      id: '2',
      name: 'Post-Showing Follow-Up',
      description: 'Follow-up sequence after property showings',
      trigger_event: 'showing_completed',
      is_active: true,
      steps: [
        {
          step_number: 1,
          delay_days: 0,
          delay_hours: 2,
          type: 'email',
          template_id: '3',
          template_name: 'Post-Showing Follow-Up'
        },
        {
          step_number: 2,
          delay_days: 1,
          delay_hours: 0,
          type: 'sms',
          template_id: '5',
          template_name: 'Offer Status Update',
          conditions: {
            only_if_no_response: true
          }
        },
        {
          step_number: 3,
          delay_days: 3,
          delay_hours: 0,
          type: 'email',
          template_id: '4',
          template_name: 'New Listing Alert',
          conditions: {
            only_if_no_response: true
          }
        }
      ],
      total_enrolled: 45,
      avg_completion_rate: 82,
      avg_response_rate: 71,
      created_at: new Date(Date.now() - 75 * 24 * 60 * 60 * 1000).toISOString(),
      updated_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString()
    }
  ];
}

function generateMockEnrollments(): SequenceEnrollment[] {
  const baseDate = new Date();
  return [
    {
      id: '1',
      sequence_id: '1',
      sequence_name: 'New Lead Nurture Sequence',
      client_id: 'client-1',
      client_name: 'Sarah Mitchell',
      enrolled_at: new Date(baseDate.getTime() - 5 * 24 * 60 * 60 * 1000).toISOString(),
      current_step: 3,
      total_steps: 4,
      status: 'active',
      next_action_at: new Date(baseDate.getTime() + 2 * 24 * 60 * 60 * 1000).toISOString(),
      response_received: true
    },
    {
      id: '2',
      sequence_id: '2',
      sequence_name: 'Post-Showing Follow-Up',
      client_id: 'client-3',
      client_name: 'Michael Chen',
      enrolled_at: new Date(baseDate.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      current_step: 2,
      total_steps: 3,
      status: 'active',
      next_action_at: new Date(baseDate.getTime() + 1 * 24 * 60 * 60 * 1000).toISOString(),
      response_received: false
    },
    {
      id: '3',
      sequence_id: '1',
      sequence_name: 'New Lead Nurture Sequence',
      client_id: 'client-4',
      client_name: 'Amanda Rodriguez',
      enrolled_at: new Date(baseDate.getTime() - 8 * 24 * 60 * 60 * 1000).toISOString(),
      current_step: 4,
      total_steps: 4,
      status: 'completed',
      completed_at: new Date(baseDate.getTime() - 1 * 24 * 60 * 60 * 1000).toISOString(),
      response_received: true
    }
  ];
}

function generateMockAnalytics(): CommunicationAnalytics {
  return {
    total_sent: 487,
    total_delivered: 475,
    total_opened: 356,
    total_clicked: 178,
    total_replied: 142,
    delivery_rate: 97.5,
    open_rate: 73.1,
    click_rate: 36.5,
    response_rate: 29.2,
    avg_response_time_hours: 18.5,
    by_type: {
      email: {
        sent: 312,
        delivered: 305,
        opened: 245,
        replied: 98,
        delivery_rate: 97.8,
        open_rate: 78.5,
        response_rate: 31.4
      },
      sms: {
        sent: 165,
        delivered: 162,
        opened: 162,
        replied: 44,
        delivery_rate: 98.2,
        open_rate: 98.2,
        response_rate: 26.7
      },
      call: {
        sent: 10,
        delivered: 8,
        opened: 8,
        replied: 0,
        delivery_rate: 80.0,
        open_rate: 80.0,
        response_rate: 0
      }
    },
    by_category: {
      introduction: 45,
      follow_up: 89,
      listing_alert: 156,
      showing_reminder: 128,
      offer_update: 67,
      closing_update: 0,
      thank_you: 0,
      market_update: 234,
      birthday: 0,
      anniversary: 0
    },
    top_templates: [
      {
        template_id: '6',
        template_name: 'Monthly Market Update',
        usage_count: 234,
        response_rate: 45
      },
      {
        template_id: '4',
        template_name: 'New Listing Alert',
        usage_count: 156,
        response_rate: 82
      },
      {
        template_id: '2',
        template_name: 'Showing Reminder - 24 Hours',
        usage_count: 128,
        response_rate: 92
      }
    ]
  };
}

export function useCommunicationHub(): UseCommunicationHubReturn {
  const { user } = useAuth();
  const [templates, setTemplates] = useState<CommunicationTemplate[]>([]);
  const [communications, setCommunications] = useState<CommunicationRecord[]>([]);
  const [sequences, setSequences] = useState<FollowUpSequence[]>([]);
  const [enrollments, setEnrollments] = useState<SequenceEnrollment[]>([]);
  const [analytics, setAnalytics] = useState<CommunicationAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDataFromSupabase = useCallback(async (userId: string) => {
    const [templatesData, communicationsData, sequencesData, enrollmentsData, analyticsData] = await Promise.all([
      supabase.from('app_a12f5_communication_templates').select('*').eq('agent_id', userId),
      supabase.from('app_a12f5_communications').select('*').eq('agent_id', userId).order('created_at', { ascending: false }).limit(50),
      supabase.from('app_a12f5_follow_up_sequences').select('*').eq('agent_id', userId),
      supabase.from('app_a12f5_sequence_enrollments').select('*').eq('agent_id', userId),
      supabase.rpc('get_communication_analytics', { p_agent_id: userId }).single()
    ]);

    return {
      templates: templatesData.data || [],
      communications: communicationsData.data || [],
      sequences: sequencesData.data || [],
      enrollments: enrollmentsData.data || [],
      analytics: analyticsData.data
    };
  }, []);

  const fetchDataWithMock = useCallback(async () => {
    await new Promise(resolve => setTimeout(resolve, 600));
    
    return {
      templates: generateMockTemplates(),
      communications: generateMockCommunications(),
      sequences: generateMockSequences(),
      enrollments: generateMockEnrollments(),
      analytics: generateMockAnalytics()
    };
  }, []);

  const fetchData = useCallback(async () => {
    if (!user?.id) return;

    try {
      setLoading(true);
      setError(null);

      let data;
      
      if (isSupabaseConfigured()) {
        try {
          data = await fetchDataFromSupabase(user.id);
        } catch (err) {
          console.warn('Supabase fetch failed, using mock data:', err);
          data = await fetchDataWithMock();
        }
      } else {
        data = await fetchDataWithMock();
      }

      setTemplates(data.templates);
      setCommunications(data.communications);
      setSequences(data.sequences);
      setEnrollments(data.enrollments);
      setAnalytics(data.analytics);

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch communication data';
      console.error('Communication data fetch error:', err);
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [user?.id, fetchDataFromSupabase, fetchDataWithMock]);

  const sendCommunication = useCallback(async (payload: SendCommunicationPayload) => {
    try {
      if (isSupabaseConfigured()) {
        const { error: sendError } = await supabase
          .from('app_a12f5_communications')
          .insert({
            agent_id: user?.id,
            ...payload,
            status: payload.scheduled_at ? 'scheduled' : 'sent'
          });

        if (sendError) throw sendError;
      } else {
        await new Promise(resolve => setTimeout(resolve, 500));
      }

      await fetchData();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to send communication';
      console.error('Send communication error:', err);
      throw new Error(errorMessage);
    }
  }, [user?.id, fetchData]);

  const createTemplate = useCallback(async (template: Partial<CommunicationTemplate>) => {
    try {
      if (isSupabaseConfigured()) {
        const { error: createError } = await supabase
          .from('app_a12f5_communication_templates')
          .insert({
            agent_id: user?.id,
            ...template
          });

        if (createError) throw createError;
      } else {
        await new Promise(resolve => setTimeout(resolve, 400));
      }

      await fetchData();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create template';
      console.error('Create template error:', err);
      throw new Error(errorMessage);
    }
  }, [user?.id, fetchData]);

  const updateTemplate = useCallback(async (id: string, updates: Partial<CommunicationTemplate>) => {
    try {
      if (isSupabaseConfigured()) {
        const { error: updateError } = await supabase
          .from('app_a12f5_communication_templates')
          .update(updates)
          .eq('id', id);

        if (updateError) throw updateError;
      } else {
        await new Promise(resolve => setTimeout(resolve, 400));
      }

      await fetchData();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update template';
      console.error('Update template error:', err);
      throw new Error(errorMessage);
    }
  }, [fetchData]);

  const deleteTemplate = useCallback(async (id: string) => {
    try {
      if (isSupabaseConfigured()) {
        const { error: deleteError } = await supabase
          .from('app_a12f5_communication_templates')
          .delete()
          .eq('id', id);

        if (deleteError) throw deleteError;
      } else {
        await new Promise(resolve => setTimeout(resolve, 300));
      }

      await fetchData();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete template';
      console.error('Delete template error:', err);
      throw new Error(errorMessage);
    }
  }, [fetchData]);

  const createSequence = useCallback(async (sequence: Partial<FollowUpSequence>) => {
    try {
      if (isSupabaseConfigured()) {
        const { error: createError } = await supabase
          .from('app_a12f5_follow_up_sequences')
          .insert({
            agent_id: user?.id,
            ...sequence
          });

        if (createError) throw createError;
      } else {
        await new Promise(resolve => setTimeout(resolve, 400));
      }

      await fetchData();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create sequence';
      console.error('Create sequence error:', err);
      throw new Error(errorMessage);
    }
  }, [user?.id, fetchData]);

  const enrollInSequence = useCallback(async (sequenceId: string, clientIds: string[]) => {
    try {
      if (isSupabaseConfigured()) {
        const enrollments = clientIds.map(clientId => ({
          agent_id: user?.id,
          sequence_id: sequenceId,
          client_id: clientId,
          status: 'active',
          current_step: 0
        }));

        const { error: enrollError } = await supabase
          .from('app_a12f5_sequence_enrollments')
          .insert(enrollments);

        if (enrollError) throw enrollError;
      } else {
        await new Promise(resolve => setTimeout(resolve, 500));
      }

      await fetchData();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to enroll in sequence';
      console.error('Enroll sequence error:', err);
      throw new Error(errorMessage);
    }
  }, [user?.id, fetchData]);

  const pauseEnrollment = useCallback(async (enrollmentId: string) => {
    try {
      if (isSupabaseConfigured()) {
        const { error: updateError } = await supabase
          .from('app_a12f5_sequence_enrollments')
          .update({ status: 'paused' })
          .eq('id', enrollmentId);

        if (updateError) throw updateError;
      } else {
        await new Promise(resolve => setTimeout(resolve, 300));
      }

      await fetchData();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to pause enrollment';
      console.error('Pause enrollment error:', err);
      throw new Error(errorMessage);
    }
  }, [fetchData]);

  const resumeEnrollment = useCallback(async (enrollmentId: string) => {
    try {
      if (isSupabaseConfigured()) {
        const { error: updateError } = await supabase
          .from('app_a12f5_sequence_enrollments')
          .update({ status: 'active' })
          .eq('id', enrollmentId);

        if (updateError) throw updateError;
      } else {
        await new Promise(resolve => setTimeout(resolve, 300));
      }

      await fetchData();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to resume enrollment';
      console.error('Resume enrollment error:', err);
      throw new Error(errorMessage);
    }
  }, [fetchData]);

  const stopEnrollment = useCallback(async (enrollmentId: string) => {
    try {
      if (isSupabaseConfigured()) {
        const { error: updateError } = await supabase
          .from('app_a12f5_sequence_enrollments')
          .update({ status: 'stopped' })
          .eq('id', enrollmentId);

        if (updateError) throw updateError;
      } else {
        await new Promise(resolve => setTimeout(resolve, 300));
      }

      await fetchData();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to stop enrollment';
      console.error('Stop enrollment error:', err);
      throw new Error(errorMessage);
    }
  }, [fetchData]);

  const refreshData = useCallback(async () => {
    await fetchData();
  }, [fetchData]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return {
    templates,
    communications,
    sequences,
    enrollments,
    analytics,
    loading,
    error,
    sendCommunication,
    createTemplate,
    updateTemplate,
    deleteTemplate,
    createSequence,
    enrollInSequence,
    pauseEnrollment,
    resumeEnrollment,
    stopEnrollment,
    refreshData
  };
}