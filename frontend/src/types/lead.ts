export type PriorityLevel = 'critical' | 'high' | 'medium' | 'low';

export type LeadStatus = 
  | 'new' 
  | 'contacted' 
  | 'qualified' 
  | 'nurturing' 
  | 'hot' 
  | 'cold' 
  | 'converted' 
  | 'lost';

export type TimelineUrgency = 'immediate' | 'within_month' | 'within_quarter' | 'flexible';

export type InteractionType =
  | 'email_sent' | 'email_opened' | 'email_clicked' | 'email_replied'
  | 'call_made' | 'call_received' | 'voicemail_left'
  | 'text_sent' | 'text_received'
  | 'property_viewed' | 'showing_scheduled' | 'showing_attended' | 'showing_cancelled'
  | 'meeting_scheduled' | 'meeting_completed'
  | 'offer_discussed' | 'document_signed'
  | 'note_added' | 'status_changed';

export type InteractionSentiment = 'positive' | 'neutral' | 'negative';

export interface LeadScore {
  id: string;
  agent_id: string;
  client_id: string;
  client_name: string;
  client_email?: string;
  client_phone?: string;
  
  // Scoring factors
  engagement_score: number;
  budget_alignment_score: number;
  timeline_urgency_score: number;
  response_rate_score: number;
  property_match_score: number;
  
  // Overall metrics
  overall_score: number;
  priority_level: PriorityLevel;
  
  // Lead details
  budget_min?: number;
  budget_max?: number;
  desired_timeline?: TimelineUrgency;
  property_preferences?: Record<string, unknown>;
  
  // Engagement metrics
  total_interactions: number;
  last_interaction_at?: string;
  days_since_last_contact: number;
  email_opens: number;
  email_clicks: number;
  property_views: number;
  showings_attended: number;
  
  // AI insights
  ai_recommendations?: string;
  next_best_action?: string;
  predicted_conversion_probability?: number;
  
  // Status
  lead_status: LeadStatus;
  lead_source?: string;
  tags?: string[];
  
  // Metadata
  created_at: string;
  updated_at: string;
  score_calculated_at: string;
}

export interface LeadInteraction {
  id: string;
  lead_score_id: string;
  agent_id: string;
  interaction_type: InteractionType;
  interaction_details?: Record<string, unknown>;
  sentiment?: InteractionSentiment;
  notes?: string;
  created_at: string;
}

export interface PrioritizedLead {
  lead_id: string;
  client_name: string;
  overall_score: number;
  priority_level: PriorityLevel;
  lead_status: LeadStatus;
  days_since_last_contact: number;
  next_best_action?: string;
  predicted_conversion_probability?: number;
}

export interface LeadAnalytics {
  total_leads: number;
  critical_leads: number;
  high_priority_leads: number;
  medium_priority_leads: number;
  low_priority_leads: number;
  avg_overall_score: number;
  hot_leads: number;
  cold_leads: number;
  avg_days_to_contact: number;
  total_interactions: number;
}

export interface RecordInteractionPayload {
  lead_score_id: string;
  interaction_type: InteractionType;
  interaction_details?: Record<string, unknown>;
  sentiment?: InteractionSentiment;
  notes?: string;
}