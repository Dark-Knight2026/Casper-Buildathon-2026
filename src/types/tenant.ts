// Tenant Dashboard Data Models

export interface MaintenanceRequest {
  id: string;
  tenant_id: string;
  property_id: string;
  title: string;
  description: string;
  category: 'plumbing' | 'electrical' | 'hvac' | 'appliance' | 'structural' | 'pest_control' | 'other';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'submitted' | 'acknowledged' | 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
  attachments: MaintenanceAttachment[];
  assigned_to?: string;
  assigned_to_name?: string;
  scheduled_date?: Date;
  completed_date?: Date;
  estimated_cost?: number;
  actual_cost?: number;
  notes: MaintenanceNote[];
  tenant_rating?: number;
  tenant_feedback?: string;
  created_at: Date;
  updated_at: Date;
}

export interface MaintenanceAttachment {
  id: string;
  file_name: string;
  file_url: string;
  file_type: string;
  file_size: number;
  uploaded_by: string;
  uploaded_at: Date;
}

export interface MaintenanceNote {
  id: string;
  author_id: string;
  author_name: string;
  author_role: string;
  content: string;
  is_internal: boolean;
  created_at: Date;
}

export interface Payment {
  id: string;
  tenant_id: string;
  property_id: string;
  lease_id: string;
  amount: number;
  due_date: Date;
  paid_date?: Date;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'refunded' | 'cancelled';
  payment_method_id?: string;
  transaction_id?: string;
  receipt_url?: string;
  late_fee: number;
  discount: number;
  total_amount: number;
  payment_type: 'rent' | 'security_deposit' | 'utility' | 'late_fee' | 'other';
  notes?: string;
  created_at: Date;
  updated_at: Date;
}

export interface PaymentMethod {
  id: string;
  tenant_id: string;
  type: 'credit_card' | 'debit_card' | 'bank_account' | 'digital_wallet';
  provider: string;
  last_four: string;
  expiry_date?: string;
  billing_address?: Address;
  is_default: boolean;
  is_auto_pay: boolean;
  auto_pay_day?: number;
  is_verified: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface Address {
  street: string;
  city: string;
  state: string;
  zip_code: string;
  country: string;
}

export interface TenantDocument {
  id: string;
  tenant_id: string;
  property_id: string;
  category: 'lease' | 'insurance' | 'identification' | 'payment_receipt' | 'notice' | 'inspection' | 'other';
  title: string;
  description?: string;
  file_name: string;
  file_url: string;
  file_type: string;
  file_size: number;
  requires_signature: boolean;
  signature_status?: 'pending' | 'signed' | 'declined';
  signed_date?: Date;
  signed_by?: string;
  expiry_date?: Date;
  uploaded_by: string;
  uploaded_by_name: string;
  access_level: 'tenant_only' | 'tenant_landlord' | 'all_parties';
  version: number;
  is_archived: boolean;
  tags: string[];
  created_at: Date;
  updated_at: Date;
}

export interface TenantNotification {
  id: string;
  tenant_id: string;
  type: 'maintenance' | 'payment' | 'lease' | 'announcement' | 'message' | 'document' | 'system';
  title: string;
  message: string;
  priority: 'low' | 'medium' | 'high';
  action_url?: string;
  action_label?: string;
  icon?: string;
  image_url?: string;
  read: boolean;
  read_at?: Date;
  created_at: Date;
  expires_at?: Date;
  metadata?: Record<string, unknown>;
}

export interface NotificationPreferences {
  tenant_id: string;
  email_enabled: boolean;
  email_address?: string;
  sms_enabled: boolean;
  phone_number?: string;
  push_enabled: boolean;
  maintenance_updates: boolean;
  payment_reminders: boolean;
  payment_reminder_days: number[];
  lease_updates: boolean;
  community_announcements: boolean;
  marketing_communications: boolean;
  quiet_hours_enabled: boolean;
  quiet_hours_start?: string;
  quiet_hours_end?: string;
  updated_at: Date;
}

export interface Lease {
  id: string;
  tenant_id: string;
  property_id: string;
  landlord_id: string;
  start_date: Date;
  end_date: Date;
  monthly_rent: number;
  security_deposit: number;
  status: 'active' | 'expired' | 'terminated' | 'pending_renewal';
  lease_document_id?: string;
  renewal_notice_date?: Date;
  termination_notice_date?: Date;
  auto_renew: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface TenantDashboardStats {
  upcoming_payment?: Payment;
  days_until_payment: number;
  total_paid_this_year: number;
  open_maintenance_requests: number;
  pending_documents: number;
  unread_notifications: number;
  lease_expiry_days: number;
  payment_history_count: number;
  maintenance_history_count: number;
}

export interface CommunityAnnouncement {
  id: string;
  property_id: string;
  title: string;
  content: string;
  category: 'maintenance' | 'event' | 'policy' | 'emergency' | 'general';
  priority: 'low' | 'medium' | 'high';
  image_url?: string;
  published_by: string;
  published_by_name: string;
  published_at: Date;
  expires_at?: Date;
  is_pinned: boolean;
}

export interface MaintenanceRequestFilters {
  status?: MaintenanceRequest['status'][];
  category?: MaintenanceRequest['category'][];
  priority?: MaintenanceRequest['priority'][];
  date_range?: {
    start?: Date;
    end?: Date;
  };
  search_query?: string;
}

export interface PaymentFilters {
  status?: Payment['status'][];
  payment_type?: Payment['payment_type'][];
  date_range?: {
    start?: Date;
    end?: Date;
  };
  amount_range?: {
    min?: number;
    max?: number;
  };
}

export interface DocumentFilters {
  category?: TenantDocument['category'][];
  requires_signature?: boolean;
  signature_status?: TenantDocument['signature_status'][];
  date_range?: {
    start?: Date;
    end?: Date;
  };
  search_query?: string;
}

// Form data interfaces
export interface MaintenanceRequestForm {
  title: string;
  description: string;
  category: MaintenanceRequest['category'];
  priority: MaintenanceRequest['priority'];
  preferred_date?: Date;
  preferred_time?: string;
  allow_entry_when_absent: boolean;
  attachments: File[];
}

export interface PaymentForm {
  amount: number;
  payment_method_id: string;
  payment_date?: Date;
  notes?: string;
}

export interface PaymentMethodForm {
  type: PaymentMethod['type'];
  card_number?: string;
  expiry_month?: string;
  expiry_year?: string;
  cvv?: string;
  account_number?: string;
  routing_number?: string;
  billing_address: Address;
  is_default: boolean;
  is_auto_pay: boolean;
  auto_pay_day?: number;
}

export interface DocumentUploadForm {
  category: TenantDocument['category'];
  title: string;
  description?: string;
  file: File;
  tags: string[];
}