import { supabase } from '@/lib/supabase/client';
import type {
  Signature,
  CreateSignatureParams,
  SignatureVerification,
} from '@/types/signature';

class SignatureService {
  /**
   * Create a new signature record
   */
  async createSignature(params: CreateSignatureParams): Promise<Signature> {
    try {
      const { data, error } = await supabase
        .from('signatures')
        .insert({
          document_id: params.document_id,
          document_type: params.document_type,
          signer_id: params.signer_id,
          signer_role: params.signer_role,
          signer_name: params.signer_name,
          signer_email: params.signer_email,
          order_index: params.order_index,
          status: 'pending',
        })
        .select()
        .single();

      if (error) throw error;
      return data as Signature;
    } catch (error) {
      console.error('Error creating signature:', error);
      throw error;
    }
  }

  /**
   * Sign a document
   */
  async signDocument(
    signatureId: string,
    signatureData: string
  ): Promise<Signature> {
    try {
      // Get user agent and IP (IP will be handled by backend)
      const userAgent = navigator.userAgent;

      // Upload signature image to storage
      const signatureUrl = await this.uploadSignature(signatureData, signatureId);

      // Update signature record
      const { data, error } = await supabase
        .from('signatures')
        .update({
          signature_data: signatureData,
          signature_url: signatureUrl,
          user_agent: userAgent,
          signed_at: new Date().toISOString(),
          status: 'signed',
          updated_at: new Date().toISOString(),
        })
        .eq('id', signatureId)
        .select()
        .single();

      if (error) throw error;
      return data as Signature;
    } catch (error) {
      console.error('Error signing document:', error);
      throw error;
    }
  }

  /**
   * Decline a signature request
   */
  async declineSignature(signatureId: string, reason?: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('signatures')
        .update({
          status: 'declined',
          metadata: reason ? { decline_reason: reason } : {},
          updated_at: new Date().toISOString(),
        })
        .eq('id', signatureId);

      if (error) throw error;
    } catch (error) {
      console.error('Error declining signature:', error);
      throw error;
    }
  }

  /**
   * Get a signature by ID
   */
  async getSignature(signatureId: string): Promise<Signature> {
    try {
      const { data, error } = await supabase
        .from('signatures')
        .select('*')
        .eq('id', signatureId)
        .single();

      if (error) throw error;
      return data as Signature;
    } catch (error) {
      console.error('Error getting signature:', error);
      throw error;
    }
  }

  /**
   * Get all signatures for a document
   */
  async getSignaturesByDocument(documentId: string): Promise<Signature[]> {
    try {
      const { data, error } = await supabase
        .from('signatures')
        .select('*')
        .eq('document_id', documentId)
        .order('order_index', { ascending: true });

      if (error) throw error;
      return (data as Signature[]) || [];
    } catch (error) {
      console.error('Error getting signatures by document:', error);
      throw error;
    }
  }

  /**
   * Upload signature image to Supabase Storage
   */
  async uploadSignature(signatureData: string, signatureId: string): Promise<string> {
    try {
      // Convert base64 to blob
      const base64Data = signatureData.split(',')[1];
      const blob = this.base64ToBlob(base64Data, 'image/png');

      // Upload to storage
      const fileName = `${signatureId}.png`;
      const { data, error } = await supabase.storage
        .from('signatures')
        .upload(fileName, blob, {
          contentType: 'image/png',
          upsert: true,
        });

      if (error) throw error;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('signatures')
        .getPublicUrl(fileName);

      return urlData.publicUrl;
    } catch (error) {
      console.error('Error uploading signature:', error);
      throw error;
    }
  }

  /**
   * Verify a signature
   */
  async verifySignature(signatureId: string): Promise<SignatureVerification> {
    try {
      const signature = await this.getSignature(signatureId);

      const verificationDetails = {
        signatureExists: !!signature,
        signerVerified: signature.status === 'signed',
        timestampValid: !!signature.signed_at,
        documentIntact: true, // TODO: Implement document hash verification
      };

      const isValid = Object.values(verificationDetails).every(v => v === true);

      return {
        isValid,
        signature,
        verificationDetails,
        verifiedAt: new Date(),
      };
    } catch (error) {
      console.error('Error verifying signature:', error);
      throw error;
    }
  }

  /**
   * Get pending signatures for a user
   */
  async getUserPendingSignatures(userId: string): Promise<Signature[]> {
    try {
      const { data, error } = await supabase
        .from('signatures')
        .select('*')
        .eq('signer_id', userId)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (data as Signature[]) || [];
    } catch (error) {
      console.error('Error getting user pending signatures:', error);
      throw error;
    }
  }

  /**
   * Get all signatures for a user
   */
  async getUserSignatures(userId: string): Promise<Signature[]> {
    try {
      const { data, error } = await supabase
        .from('signatures')
        .select('*')
        .eq('signer_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (data as Signature[]) || [];
    } catch (error) {
      console.error('Error getting user signatures:', error);
      throw error;
    }
  }

  /**
   * Convert base64 to Blob
   */
  private base64ToBlob(base64: string, contentType: string): Blob {
    const byteCharacters = atob(base64);
    const byteArrays = [];

    for (let offset = 0; offset < byteCharacters.length; offset += 512) {
      const slice = byteCharacters.slice(offset, offset + 512);
      const byteNumbers = new Array(slice.length);
      
      for (let i = 0; i < slice.length; i++) {
        byteNumbers[i] = slice.charCodeAt(i);
      }
      
      const byteArray = new Uint8Array(byteNumbers);
      byteArrays.push(byteArray);
    }

    return new Blob(byteArrays, { type: contentType });
  }
}

export const signatureService = new SignatureService();