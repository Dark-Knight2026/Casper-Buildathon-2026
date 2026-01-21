/**
 * E-Signature Type Definitions
 */

export interface Signature {
  id: string;
  document_id: string;
  document_type: string;
  signer_id: string;
  signer_role: 'landlord' | 'tenant';
  signer_name: string;
  signer_email: string;
  signature_data: string; // Base64 encoded signature image
  signature_url?: string; // URL to stored signature image
  ip_address?: string;
  user_agent?: string;
  signed_at?: Date;
  status: 'pending' | 'signed' | 'declined';
  order_index: number;
  created_at: Date;
  updated_at: Date;
}

export interface SignatureWorkflow {
  id: string;
  document_id: string;
  document_type: string;
  workflow_type: 'sequential' | 'parallel';
  status: 'pending' | 'in_progress' | 'completed' | 'declined' | 'expired';
  initiated_by: string;
  initiated_at: Date;
  completed_at?: Date;
  expires_at?: Date;
  total_signers: number;
  signed_count: number;
  metadata: Record<string, unknown>;
  created_at: Date;
  updated_at: Date;
  signatures?: Signature[];
}

export interface AuditEvent {
  id: string;
  workflow_id: string;
  document_id: string;
  signature_id?: string;
  user_id?: string;
  event_type: 'sent' | 'viewed' | 'signed' | 'declined' | 'completed' | 'expired' | 'reminded';
  event_data: Record<string, unknown>;
  ip_address?: string;
  user_agent?: string;
  timestamp: Date;
}

export interface SignatureVerification {
  isValid: boolean;
  signature: Signature;
  verificationDetails: {
    signatureExists: boolean;
    signerVerified: boolean;
    timestampValid: boolean;
    documentIntact: boolean;
  };
  verifiedAt: Date;
}

export interface CreateWorkflowParams {
  document_id: string;
  document_type: string;
  workflow_type: 'sequential' | 'parallel';
  signers: {
    signer_id: string;
    signer_role: 'landlord' | 'tenant';
    signer_name: string;
    signer_email: string;
    order_index: number;
  }[];
  expires_at?: Date;
}

export interface CreateSignatureParams {
  document_id: string;
  document_type: string;
  signer_id: string;
  signer_role: 'landlord' | 'tenant';
  signer_name: string;
  signer_email: string;
  order_index: number;
}

export type WorkflowStatus = 'pending' | 'in_progress' | 'completed' | 'declined' | 'expired';
export type SignatureStatus = 'pending' | 'signed' | 'declined';
export type AuditEventType = 'sent' | 'viewed' | 'signed' | 'declined' | 'completed' | 'expired' | 'reminded';