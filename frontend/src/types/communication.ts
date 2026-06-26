export type CommunicationType = 'email' | 'sms' | 'call' | 'meeting';
export type CommunicationStatus = 'draft' | 'scheduled' | 'sent' | 'delivered' | 'opened' | 'clicked' | 'replied' | 'failed';
export type TemplateCategory = 'introduction' | 'follow_up' | 'listing_alert' | 'showing_reminder' | 'offer_update' | 'closing_update' | 'thank_you' | 'market_update' | 'birthday' | 'anniversary';

export interface CommunicationTemplate {
  id: string;
  name: string;
  category: TemplateCategory;
  type: CommunicationType;
  subject?: string; // For emails
  body: string;
  variables: string[]; // e.g., ['client_name', 'property_address', 'showing_date']
  is_active: boolean;
  usage_count: number;
  avg_response_rate?: number;
  created_at: string;
  updated_at: string;
}

export interface CommunicationRecord {
  id: string;
  agent_id: string;
  client_id: string;
  client_name: string;
  type: CommunicationType;
  status: CommunicationStatus;
  template_id?: string;
  subject?: string;
  body: string;
  scheduled_at?: string;
  sent_at?: string;
  delivered_at?: string;
  opened_at?: string;
  clicked_at?: string;
  replied_at?: string;
  reply_content?: string;
  metadata?: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface FollowUpSequence {
  id: string;
  name: string;
  description: string;
  trigger_event: 'new_lead' | 'showing_completed' | 'offer_submitted' | 'listing_viewed' | 'inquiry_received' | 'manual';
  is_active: boolean;
  steps: FollowUpStep[];
  total_enrolled: number;
  avg_completion_rate?: number;
  avg_response_rate?: number;
  created_at: string;
  updated_at: string;
}

export interface FollowUpStep {
  step_number: number;
  delay_days: number;
  delay_hours: number;
  type: CommunicationType;
  template_id: string;
  template_name?: string;
  conditions?: {
    only_if_no_response?: boolean;
    skip_if_replied?: boolean;
  };
}

export interface SequenceEnrollment {
  id: string;
  sequence_id: string;
  sequence_name: string;
  client_id: string;
  client_name: string;
  enrolled_at: string;
  current_step: number;
  total_steps: number;
  status: 'active' | 'paused' | 'completed' | 'stopped';
  next_action_at?: string;
  completed_at?: string;
  response_received: boolean;
}

export interface CommunicationAnalytics {
  total_sent: number;
  total_delivered: number;
  total_opened: number;
  total_clicked: number;
  total_replied: number;
  delivery_rate: number;
  open_rate: number;
  click_rate: number;
  response_rate: number;
  avg_response_time_hours?: number;
  by_type: {
    email: CommunicationTypeStats;
    sms: CommunicationTypeStats;
    call: CommunicationTypeStats;
  };
  by_category: Record<TemplateCategory, number>;
  top_templates: Array<{
    template_id: string;
    template_name: string;
    usage_count: number;
    response_rate: number;
  }>;
}

export interface CommunicationTypeStats {
  sent: number;
  delivered: number;
  opened: number;
  replied: number;
  delivery_rate: number;
  open_rate: number;
  response_rate: number;
}

export interface SendCommunicationPayload {
  client_id: string;
  type: CommunicationType;
  template_id?: string;
  subject?: string;
  body: string;
  scheduled_at?: string;
  metadata?: Record<string, unknown>;
}

export interface BulkSendPayload {
  client_ids: string[];
  type: CommunicationType;
  template_id: string;
  scheduled_at?: string;
}