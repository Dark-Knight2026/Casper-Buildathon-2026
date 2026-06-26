// Enhanced Tenant Dashboard Types

export interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  status: 'pending' | 'in_progress' | 'completed' | 'skipped';
  required: boolean;
  order: number;
  substeps?: OnboardingSubstep[];
}

export interface OnboardingSubstep {
  id: string;
  title: string;
  completed: boolean;
  required: boolean;
}

export interface OnboardingProgress {
  tenant_id: string;
  current_step: string;
  steps: OnboardingStep[];
  overall_progress: number;
  started_at: Date;
  completed_at?: Date;
  auto_save_data: Record<string, unknown>;
  co_tenants: CoTenant[];
}

export interface CoTenant {
  id: string;
  name: string;
  email: string;
  phone?: string;
  status: 'invited' | 'pending_signature' | 'completed';
  invited_at: Date;
  completed_at?: Date;
  reminder_sent_at?: Date;
}

export interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  sender_name: string;
  sender_role: 'tenant' | 'landlord' | 'maintenance' | 'system';
  content: string;
  message_type: 'text' | 'voice' | 'image' | 'file' | 'quick_reply';
  attachments?: MessageAttachment[];
  read_by: string[];
  read_receipts: ReadReceipt[];
  replied_to?: string;
  scheduled_for?: Date;
  created_at: Date;
  updated_at: Date;
}

export interface MessageAttachment {
  id: string;
  file_name: string;
  file_url: string;
  file_type: string;
  file_size: number;
}

export interface ReadReceipt {
  user_id: string;
  user_name: string;
  read_at: Date;
}

export interface Conversation {
  id: string;
  participants: ConversationParticipant[];
  title?: string;
  type: 'direct' | 'group' | 'maintenance' | 'support';
  last_message?: Message;
  unread_count: number;
  created_at: Date;
  updated_at: Date;
}

export interface ConversationParticipant {
  user_id: string;
  user_name: string;
  user_role: string;
  joined_at: Date;
}

export interface QuickReply {
  id: string;
  text: string;
  category: string;
}

export interface AIFAQResponse {
  question: string;
  answer: string;
  confidence: number;
  related_questions: string[];
}

export interface PaymentBudget {
  tenant_id: string;
  monthly_rent: number;
  utilities_estimate: number;
  other_expenses: number;
  savings_goal: number;
  current_savings: number;
  budget_alerts: boolean;
}

export interface RoommatePayment {
  payment_id: string;
  total_amount: number;
  splits: PaymentSplit[];
  split_method: 'equal' | 'custom' | 'percentage';
  status: 'pending' | 'partial' | 'completed';
}

export interface PaymentSplit {
  tenant_id: string;
  tenant_name: string;
  amount: number;
  percentage?: number;
  paid: boolean;
  paid_at?: Date;
}

export interface PartialPayment {
  payment_id: string;
  original_amount: number;
  paid_amount: number;
  remaining_amount: number;
  installments: PaymentInstallment[];
}

export interface PaymentInstallment {
  id: string;
  amount: number;
  due_date: Date;
  status: 'pending' | 'completed';
  paid_at?: Date;
}

export interface EarlyPayDiscount {
  id: string;
  discount_percentage: number;
  days_before_due: number;
  description: string;
  active: boolean;
}

export interface MaintenanceTroubleshoot {
  id: string;
  category: string;
  issue: string;
  steps: TroubleshootStep[];
  resolved: boolean;
}

export interface TroubleshootStep {
  id: string;
  description: string;
  action: string;
  completed: boolean;
  result?: 'resolved' | 'not_resolved' | 'needs_professional';
}

export interface MaintenanceChat {
  request_id: string;
  messages: Message[];
  technician_id?: string;
  technician_name?: string;
  active: boolean;
}

export interface MaintenanceTimeline {
  request_id: string;
  estimated_response_time: string;
  estimated_completion_date?: Date;
  current_stage: string;
  stages: TimelineStage[];
}

export interface TimelineStage {
  id: string;
  name: string;
  status: 'pending' | 'in_progress' | 'completed';
  estimated_duration: string;
  completed_at?: Date;
}

export interface ServiceVisit {
  id: string;
  request_id: string;
  technician_name: string;
  scheduled_date: Date;
  estimated_duration: string;
  location: {
    lat: number;
    lng: number;
    address: string;
  };
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
}

export interface DocumentVersion {
  id: string;
  document_id: string;
  version_number: number;
  file_url: string;
  changes_summary: string;
  created_by: string;
  created_at: Date;
}

export interface DocumentComment {
  id: string;
  document_id: string;
  page_number?: number;
  position?: { x: number; y: number };
  author_id: string;
  author_name: string;
  content: string;
  resolved: boolean;
  created_at: Date;
  replies: DocumentCommentReply[];
}

export interface DocumentCommentReply {
  id: string;
  author_id: string;
  author_name: string;
  content: string;
  created_at: Date;
}

export interface DocumentReminder {
  id: string;
  document_id: string;
  reminder_type: 'expiry' | 'signature' | 'renewal' | 'custom';
  reminder_date: Date;
  sent: boolean;
  sent_at?: Date;
}

export interface NotificationChannel {
  type: 'email' | 'sms' | 'push';
  enabled: boolean;
  address?: string;
}

export interface SmartReminder {
  id: string;
  type: 'payment' | 'maintenance' | 'lease' | 'document';
  title: string;
  message: string;
  trigger_date: Date;
  based_on_pattern: boolean;
  pattern_data?: Record<string, unknown>;
  sent: boolean;
}

export interface CalendarSync {
  tenant_id: string;
  enabled: boolean;
  calendar_type: 'google' | 'outlook' | 'apple' | 'ical';
  sync_payments: boolean;
  sync_maintenance: boolean;
  sync_lease_dates: boolean;
  sync_community_events: boolean;
  last_sync: Date;
}

export interface DigestEmail {
  tenant_id: string;
  frequency: 'daily' | 'weekly' | 'monthly';
  enabled: boolean;
  time_of_day: string;
  include_payments: boolean;
  include_maintenance: boolean;
  include_announcements: boolean;
  include_messages: boolean;
}

export interface CommunityPost {
  id: string;
  property_id: string;
  author_id: string;
  author_name: string;
  author_avatar?: string;
  content: string;
  images?: string[];
  category: 'general' | 'event' | 'question' | 'recommendation' | 'marketplace';
  likes: number;
  comments: CommunityComment[];
  created_at: Date;
  updated_at: Date;
}

export interface CommunityComment {
  id: string;
  author_id: string;
  author_name: string;
  content: string;
  created_at: Date;
}

export interface CommunityPoll {
  id: string;
  property_id: string;
  title: string;
  description: string;
  options: PollOption[];
  multiple_choice: boolean;
  ends_at: Date;
  created_by: string;
  created_at: Date;
}

export interface PollOption {
  id: string;
  text: string;
  votes: number;
  voted_by: string[];
}

export interface LocalService {
  id: string;
  name: string;
  category: 'restaurant' | 'grocery' | 'pharmacy' | 'gym' | 'entertainment' | 'other';
  address: string;
  phone?: string;
  website?: string;
  rating: number;
  distance: number;
  recommended_by: string[];
}

export interface CommunityEvent {
  id: string;
  property_id: string;
  title: string;
  description: string;
  event_type: 'social' | 'maintenance' | 'meeting' | 'activity';
  location: string;
  start_time: Date;
  end_time: Date;
  max_attendees?: number;
  attendees: EventAttendee[];
  created_by: string;
  created_at: Date;
}

export interface EventAttendee {
  user_id: string;
  user_name: string;
  status: 'going' | 'maybe' | 'not_going';
  rsvp_at: Date;
}

export interface TenantRecognition {
  id: string;
  tenant_id: string;
  tenant_name: string;
  badge_type: 'on_time_payer' | 'community_contributor' | 'long_term_resident' | 'helpful_neighbor';
  badge_name: string;
  description: string;
  earned_at: Date;
}

export interface VerificationStep {
  id: string;
  type: 'identity' | 'payment_method' | 'employment' | 'reference';
  status: 'pending' | 'in_progress' | 'verified' | 'failed';
  required: boolean;
  documents_required: string[];
  verified_at?: Date;
  verified_by?: string;
}

export interface PaymentMethodVerification {
  payment_method_id: string;
  verification_type: 'micro_deposit' | 'instant' | 'manual';
  status: 'pending' | 'verified' | 'failed';
  verification_code?: string;
  attempts: number;
  verified_at?: Date;
}