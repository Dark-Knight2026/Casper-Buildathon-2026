import { supabase } from '@/lib/supabase/client';
import { signatureService } from './signatureService';
import type {
  SignatureWorkflow,
  Signature,
  CreateWorkflowParams,
  WorkflowStatus,
} from '@/types/signature';

class SignatureWorkflowService {
  /**
   * Create a new signature workflow
   */
  async createWorkflow(params: CreateWorkflowParams): Promise<SignatureWorkflow> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      // Create workflow
      const { data: workflow, error: workflowError } = await supabase
        .from('signature_workflows')
        .insert({
          document_id: params.document_id,
          document_type: params.document_type,
          workflow_type: params.workflow_type,
          initiated_by: user.id,
          total_signers: params.signers.length,
          signed_count: 0,
          status: 'pending',
          expires_at: params.expires_at?.toISOString(),
        })
        .select()
        .single();

      if (workflowError) throw workflowError;

      // Create signature records for each signer
      const signatures = await Promise.all(
        params.signers.map(signer =>
          signatureService.createSignature({
            document_id: params.document_id,
            document_type: params.document_type,
            signer_id: signer.signer_id,
            signer_role: signer.signer_role,
            signer_name: signer.signer_name,
            signer_email: signer.signer_email,
            order_index: signer.order_index,
          })
        )
      );

      return {
        ...workflow,
        signatures,
      } as SignatureWorkflow;
    } catch (error) {
      console.error('Error creating workflow:', error);
      throw error;
    }
  }

  /**
   * Get workflow by ID
   */
  async getWorkflow(workflowId: string): Promise<SignatureWorkflow> {
    try {
      const { data: workflow, error: workflowError } = await supabase
        .from('signature_workflows')
        .select('*')
        .eq('id', workflowId)
        .single();

      if (workflowError) throw workflowError;

      // Get signatures
      const signatures = await signatureService.getSignaturesByDocument(
        workflow.document_id
      );

      return {
        ...workflow,
        signatures,
      } as SignatureWorkflow;
    } catch (error) {
      console.error('Error getting workflow:', error);
      throw error;
    }
  }

  /**
   * Get workflow by document ID
   */
  async getWorkflowByDocument(documentId: string): Promise<SignatureWorkflow | null> {
    try {
      const { data: workflow, error } = await supabase
        .from('signature_workflows')
        .select('*')
        .eq('document_id', documentId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (error) {
        if (error.code === 'PGRST116') return null; // No rows returned
        throw error;
      }

      // Get signatures
      const signatures = await signatureService.getSignaturesByDocument(documentId);

      return {
        ...workflow,
        signatures,
      } as SignatureWorkflow;
    } catch (error) {
      console.error('Error getting workflow by document:', error);
      throw error;
    }
  }

  /**
   * Update workflow status
   */
  async updateWorkflowStatus(
    workflowId: string,
    status: WorkflowStatus
  ): Promise<void> {
    try {
      const updateData: Record<string, unknown> = {
        status,
        updated_at: new Date().toISOString(),
      };

      if (status === 'completed') {
        updateData.completed_at = new Date().toISOString();
      }

      const { error } = await supabase
        .from('signature_workflows')
        .update(updateData)
        .eq('id', workflowId);

      if (error) throw error;
    } catch (error) {
      console.error('Error updating workflow status:', error);
      throw error;
    }
  }

  /**
   * Check if user can sign (for sequential workflows)
   */
  async canUserSign(workflowId: string, userId: string): Promise<boolean> {
    try {
      const workflow = await this.getWorkflow(workflowId);

      if (!workflow.signatures) return false;

      // Find user's signature
      const userSignature = workflow.signatures.find(s => s.signer_id === userId);
      if (!userSignature) return false;

      // If already signed or declined, cannot sign again
      if (userSignature.status !== 'pending') return false;

      // For parallel workflows, anyone can sign anytime
      if (workflow.workflow_type === 'parallel') return true;

      // For sequential workflows, check if it's user's turn
      const allSignatures = workflow.signatures.sort((a, b) => a.order_index - b.order_index);
      const userIndex = allSignatures.findIndex(s => s.signer_id === userId);

      // Check if all previous signers have signed
      for (let i = 0; i < userIndex; i++) {
        if (allSignatures[i].status !== 'signed') {
          return false;
        }
      }

      return true;
    } catch (error) {
      console.error('Error checking if user can sign:', error);
      return false;
    }
  }

  /**
   * Get next signer in sequential workflow
   */
  async getNextSigner(workflowId: string): Promise<Signature | null> {
    try {
      const workflow = await this.getWorkflow(workflowId);

      if (!workflow.signatures || workflow.workflow_type !== 'sequential') {
        return null;
      }

      // Find first pending signature in order
      const sortedSignatures = workflow.signatures.sort(
        (a, b) => a.order_index - b.order_index
      );

      return sortedSignatures.find(s => s.status === 'pending') || null;
    } catch (error) {
      console.error('Error getting next signer:', error);
      return null;
    }
  }

  /**
   * Update signed count and check if workflow is complete
   */
  async updateWorkflowProgress(workflowId: string): Promise<void> {
    try {
      const workflow = await this.getWorkflow(workflowId);

      const signedCount = workflow.signatures?.filter(s => s.status === 'signed').length || 0;

      const { error } = await supabase
        .from('signature_workflows')
        .update({
          signed_count: signedCount,
          status: signedCount === workflow.total_signers ? 'completed' : 'in_progress',
          completed_at: signedCount === workflow.total_signers ? new Date().toISOString() : null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', workflowId);

      if (error) throw error;
    } catch (error) {
      console.error('Error updating workflow progress:', error);
      throw error;
    }
  }

  /**
   * Get pending workflows for a user
   */
  async getUserPendingWorkflows(userId: string): Promise<SignatureWorkflow[]> {
    try {
      // Get user's pending signatures
      const pendingSignatures = await signatureService.getUserPendingSignatures(userId);

      // Get workflows for these signatures
      const workflowIds = [...new Set(pendingSignatures.map(s => s.document_id))];

      const workflows = await Promise.all(
        workflowIds.map(async (docId) => {
          const workflow = await this.getWorkflowByDocument(docId);
          return workflow;
        })
      );

      return workflows.filter(w => w !== null) as SignatureWorkflow[];
    } catch (error) {
      console.error('Error getting user pending workflows:', error);
      throw error;
    }
  }
}

export const signatureWorkflowService = new SignatureWorkflowService();