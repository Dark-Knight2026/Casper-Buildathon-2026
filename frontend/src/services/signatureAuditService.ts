import { supabase } from '@/lib/supabase/client';
import type { AuditEvent, AuditEventType } from '@/types/signature';

interface AuditEventParams {
  workflow_id: string;
  document_id: string;
  signature_id?: string;
  event_type: AuditEventType;
  event_data?: Record<string, unknown>;
}

class SignatureAuditService {
  /**
   * Log an audit event
   */
  async logEvent(params: AuditEventParams): Promise<void> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const userAgent = navigator.userAgent;

      const { error } = await supabase
        .from('signature_audit_trail')
        .insert({
          workflow_id: params.workflow_id,
          document_id: params.document_id,
          signature_id: params.signature_id,
          user_id: user?.id,
          event_type: params.event_type,
          event_data: params.event_data || {},
          user_agent: userAgent,
        });

      if (error) throw error;
    } catch (error) {
      console.error('Error logging audit event:', error);
      // Don't throw - audit logging should not break the main flow
    }
  }

  /**
   * Get audit trail for a workflow
   */
  async getAuditTrail(workflowId: string): Promise<AuditEvent[]> {
    try {
      const { data, error } = await supabase
        .from('signature_audit_trail')
        .select('*')
        .eq('workflow_id', workflowId)
        .order('timestamp', { ascending: false });

      if (error) throw error;
      return (data as AuditEvent[]) || [];
    } catch (error) {
      console.error('Error getting audit trail:', error);
      throw error;
    }
  }

  /**
   * Get audit trail for a document
   */
  async getDocumentAuditTrail(documentId: string): Promise<AuditEvent[]> {
    try {
      const { data, error } = await supabase
        .from('signature_audit_trail')
        .select('*')
        .eq('document_id', documentId)
        .order('timestamp', { ascending: false });

      if (error) throw error;
      return (data as AuditEvent[]) || [];
    } catch (error) {
      console.error('Error getting document audit trail:', error);
      throw error;
    }
  }

  /**
   * Export audit trail as JSON
   */
  async exportAuditTrail(workflowId: string): Promise<string> {
    try {
      const auditTrail = await this.getAuditTrail(workflowId);
      return JSON.stringify(auditTrail, null, 2);
    } catch (error) {
      console.error('Error exporting audit trail:', error);
      throw error;
    }
  }
}

export const signatureAuditService = new SignatureAuditService();