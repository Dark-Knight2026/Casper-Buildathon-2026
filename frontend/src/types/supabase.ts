/**
 * Supabase Database Types
 * Auto-generated types for type-safe database operations
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      leases: {
        Row: {
          id: string
          landlord_id: string
          tenant_ids: string[]
          agent_id: string | null
          property_id: string
          property_address: string
          type: string
          status: string
          start_date: string
          end_date: string
          monthly_rent: number
          security_deposit: number
          payment_due_day: number
          late_fee_amount: number | null
          late_fee_grace_period: number | null
          utilities_included: string[]
          pet_policy: Json | null
          maintenance_responsibilities: Json | null
          special_terms: string | null
          created_at: string
          updated_at: string
          created_by: string
          last_modified_by: string | null
          deleted_at: string | null
        }
        Insert: {
          id?: string
          landlord_id: string
          tenant_ids: string[]
          agent_id?: string | null
          property_id: string
          property_address: string
          type: string
          status?: string
          start_date: string
          end_date: string
          monthly_rent: number
          security_deposit: number
          payment_due_day?: number
          late_fee_amount?: number | null
          late_fee_grace_period?: number | null
          utilities_included?: string[]
          pet_policy?: Json | null
          maintenance_responsibilities?: Json | null
          special_terms?: string | null
          created_at?: string
          updated_at?: string
          created_by: string
          last_modified_by?: string | null
          deleted_at?: string | null
        }
        Update: {
          id?: string
          landlord_id?: string
          tenant_ids?: string[]
          agent_id?: string | null
          property_id?: string
          property_address?: string
          type?: string
          status?: string
          start_date?: string
          end_date?: string
          monthly_rent?: number
          security_deposit?: number
          payment_due_day?: number
          late_fee_amount?: number | null
          late_fee_grace_period?: number | null
          utilities_included?: string[]
          pet_policy?: Json | null
          maintenance_responsibilities?: Json | null
          special_terms?: string | null
          created_at?: string
          updated_at?: string
          created_by?: string
          last_modified_by?: string | null
          deleted_at?: string | null
        }
      }
      payments: {
        Row: {
          id: string
          lease_id: string
          tenant_id: string
          amount: number
          payment_method: string
          payment_status: string
          transaction_id: string | null
          payment_date: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          lease_id: string
          tenant_id: string
          amount: number
          payment_method: string
          payment_status?: string
          transaction_id?: string | null
          payment_date: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          lease_id?: string
          tenant_id?: string
          amount?: number
          payment_method?: string
          payment_status?: string
          transaction_id?: string | null
          payment_date?: string
          created_at?: string
          updated_at?: string
        }
      }
      documents: {
        Row: {
          id: string
          lease_id: string
          file_name: string
          file_path: string
          file_size: number
          mime_type: string
          uploaded_by: string
          uploaded_at: string
          version: number
          is_deleted: boolean
          deleted_at: string | null
          metadata: Json | null
        }
        Insert: {
          id?: string
          lease_id: string
          file_name: string
          file_path: string
          file_size: number
          mime_type: string
          uploaded_by: string
          uploaded_at?: string
          version?: number
          is_deleted?: boolean
          deleted_at?: string | null
          metadata?: Json | null
        }
        Update: {
          id?: string
          lease_id?: string
          file_name?: string
          file_path?: string
          file_size?: number
          mime_type?: string
          uploaded_by?: string
          uploaded_at?: string
          version?: number
          is_deleted?: boolean
          deleted_at?: string | null
          metadata?: Json | null
        }
      }
      signature_requests: {
        Row: {
          id: string
          lease_id: string
          document_url: string
          workflow_type: string
          signers: Json
          expires_at: string
          status: string
          created_at: string
          created_by: string
          completed_at: string | null
        }
        Insert: {
          id?: string
          lease_id: string
          document_url: string
          workflow_type?: string
          signers: Json
          expires_at: string
          status?: string
          created_at?: string
          created_by: string
          completed_at?: string | null
        }
        Update: {
          id?: string
          lease_id?: string
          document_url?: string
          workflow_type?: string
          signers?: Json
          expires_at?: string
          status?: string
          created_at?: string
          created_by?: string
          completed_at?: string | null
        }
      }
      messages: {
        Row: {
          id: string
          lease_id: string | null
          sender_id: string
          recipient_id: string
          subject: string | null
          body: string
          is_read: boolean
          read_at: string | null
          created_at: string
          metadata: Json | null
        }
        Insert: {
          id?: string
          lease_id?: string | null
          sender_id: string
          recipient_id: string
          subject?: string | null
          body: string
          is_read?: boolean
          read_at?: string | null
          created_at?: string
          metadata?: Json | null
        }
        Update: {
          id?: string
          lease_id?: string | null
          sender_id?: string
          recipient_id?: string
          subject?: string | null
          body?: string
          is_read?: boolean
          read_at?: string | null
          created_at?: string
          metadata?: Json | null
        }
      }
      audit_logs: {
        Row: {
          id: string
          user_id: string
          action: string
          resource_type: string
          resource_id: string
          changes: Json | null
          ip_address: string | null
          user_agent: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          action: string
          resource_type: string
          resource_id: string
          changes?: Json | null
          ip_address?: string | null
          user_agent?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          action?: string
          resource_type?: string
          resource_id?: string
          changes?: Json | null
          ip_address?: string | null
          user_agent?: string | null
          created_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
  }
}