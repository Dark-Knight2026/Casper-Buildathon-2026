import { supabase } from '@/lib/supabase/client';
import { documentStorageService } from './documentStorageService';
import { eSignatureService } from './eSignatureService';
import jsPDF from 'jspdf';

interface LeaseDocumentData {
  renewal_id: string;
  tenant_name: string;
  landlord_name: string;
  property_address: string;
  rent_amount: number;
  lease_term_months: number;
  start_date: string;
  end_date: string;
  special_terms?: string;
  security_deposit?: number;
  late_fee?: number;
  utilities_included?: string[];
}

class LeaseGenerationService {
  /**
   * Generate a new lease document from a renewal offer
   */
  async generateLeaseFromRenewal(renewalId: string): Promise<string> {
    // Get renewal details
    const { data: renewal, error: renewalError } = await supabase
      .from('lease_renewals')
      .select(`
        *,
        lease:leases(
          *,
          property:properties(*),
          tenant:tenants(*),
          landlord:landlords(*)
        )
      `)
      .eq('id', renewalId)
      .single();

    if (renewalError) throw renewalError;

    if (renewal.status !== 'accepted') {
      throw new Error('Can only generate lease for accepted renewal offers');
    }

    // Prepare lease data
    const leaseData: LeaseDocumentData = {
      renewal_id: renewalId,
      tenant_name: `${renewal.lease.tenant.first_name} ${renewal.lease.tenant.last_name}`,
      landlord_name: `${renewal.lease.landlord.first_name} ${renewal.lease.landlord.last_name}`,
      property_address: `${renewal.lease.property.address}, ${renewal.lease.property.city}, ${renewal.lease.property.state} ${renewal.lease.property.zip_code}`,
      rent_amount: renewal.final_rent || renewal.proposed_rent,
      lease_term_months: renewal.final_term_months || renewal.proposed_term_months,
      start_date: renewal.new_lease_start_date,
      end_date: renewal.new_lease_end_date,
      special_terms: renewal.special_terms || undefined,
      security_deposit: renewal.lease.security_deposit,
      late_fee: renewal.lease.late_fee,
    };

    // Generate PDF
    const pdfBlob = await this.generateLeasePDF(leaseData);

    // Upload to storage
    const fileName = `lease_${renewalId}_${Date.now()}.pdf`;
    const filePath = await documentStorageService.uploadDocument(
      pdfBlob,
      fileName,
      renewal.lease.property_id,
      'lease'
    );

    // Create document record
    const { data: document, error: docError } = await supabase
      .from('documents')
      .insert({
        lease_id: renewal.lease_id,
        property_id: renewal.lease.property_id,
        uploaded_by: renewal.landlord_id,
        document_type: 'lease',
        file_name: fileName,
        file_path: filePath,
        file_size: pdfBlob.size,
        mime_type: 'application/pdf',
      })
      .select()
      .single();

    if (docError) throw docError;

    // Send for e-signature
    await eSignatureService.sendForSignature({
      document_id: document.id,
      document_url: filePath,
      signers: [
        {
          email: renewal.lease.tenant.email,
          name: leaseData.tenant_name,
          role: 'tenant',
        },
        {
          email: renewal.lease.landlord.email,
          name: leaseData.landlord_name,
          role: 'landlord',
        },
      ],
      document_title: `Lease Agreement - ${leaseData.property_address}`,
    });

    return document.id;
  }

  /**
   * Generate lease PDF document
   */
  private async generateLeasePDF(data: LeaseDocumentData): Promise<Blob> {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 20;
    const lineHeight = 7;
    let yPosition = 20;

    // Helper function to add text with word wrap
    const addText = (text: string, fontSize: number = 11, isBold: boolean = false) => {
      doc.setFontSize(fontSize);
      doc.setFont('helvetica', isBold ? 'bold' : 'normal');
      const lines = doc.splitTextToSize(text, pageWidth - 2 * margin);
      doc.text(lines, margin, yPosition);
      yPosition += lines.length * lineHeight;
    };

    // Add page break if needed
    const checkPageBreak = () => {
      if (yPosition > 270) {
        doc.addPage();
        yPosition = 20;
      }
    };

    // Title
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text('RESIDENTIAL LEASE AGREEMENT', pageWidth / 2, yPosition, { align: 'center' });
    yPosition += 15;

    // Date
    addText(`Date: ${new Date().toLocaleDateString()}`, 10);
    yPosition += 5;

    // Parties
    addText('THIS LEASE AGREEMENT is made between:', 12, true);
    yPosition += 3;
    addText(`Landlord: ${data.landlord_name} ("Landlord")`);
    addText(`Tenant: ${data.tenant_name} ("Tenant")`);
    yPosition += 5;

    checkPageBreak();

    // Property Description
    addText('1. PROPERTY', 12, true);
    yPosition += 3;
    addText(`The Landlord agrees to lease to the Tenant the residential property located at: ${data.property_address} ("Premises").`);
    yPosition += 5;

    checkPageBreak();

    // Lease Term
    addText('2. LEASE TERM', 12, true);
    yPosition += 3;
    addText(`This lease shall commence on ${new Date(data.start_date).toLocaleDateString()} and continue for a period of ${data.lease_term_months} months, ending on ${new Date(data.end_date).toLocaleDateString()}.`);
    yPosition += 5;

    checkPageBreak();

    // Rent
    addText('3. RENT', 12, true);
    yPosition += 3;
    addText(`The Tenant agrees to pay rent in the amount of $${data.rent_amount.toFixed(2)} per month, due on the first day of each month.`);
    yPosition += 5;

    checkPageBreak();

    // Security Deposit
    if (data.security_deposit) {
      addText('4. SECURITY DEPOSIT', 12, true);
      yPosition += 3;
      addText(`The Tenant has paid a security deposit of $${data.security_deposit.toFixed(2)}, which will be held by the Landlord as security for the performance of the Tenant's obligations under this lease.`);
      yPosition += 5;
      checkPageBreak();
    }

    // Late Fee
    if (data.late_fee) {
      addText('5. LATE FEES', 12, true);
      yPosition += 3;
      addText(`If rent is not received by the 5th day of the month, a late fee of $${data.late_fee.toFixed(2)} will be charged.`);
      yPosition += 5;
      checkPageBreak();
    }

    // Use of Premises
    addText('6. USE OF PREMISES', 12, true);
    yPosition += 3;
    addText('The Premises shall be used and occupied by the Tenant exclusively as a private residence. The Tenant shall not use or permit the Premises to be used for any other purpose without prior written consent of the Landlord.');
    yPosition += 5;

    checkPageBreak();

    // Maintenance and Repairs
    addText('7. MAINTENANCE AND REPAIRS', 12, true);
    yPosition += 3;
    addText('The Tenant shall maintain the Premises in good condition and shall be responsible for any damage caused by the Tenant or guests. The Landlord shall be responsible for major repairs and maintenance of the structure and systems.');
    yPosition += 5;

    checkPageBreak();

    // Utilities
    addText('8. UTILITIES', 12, true);
    yPosition += 3;
    if (data.utilities_included && data.utilities_included.length > 0) {
      addText(`The following utilities are included in the rent: ${data.utilities_included.join(', ')}. All other utilities shall be the responsibility of the Tenant.`);
    } else {
      addText('The Tenant shall be responsible for all utilities, including but not limited to electricity, gas, water, sewer, trash, and internet services.');
    }
    yPosition += 5;

    checkPageBreak();

    // Special Terms
    if (data.special_terms) {
      addText('9. SPECIAL TERMS AND CONDITIONS', 12, true);
      yPosition += 3;
      addText(data.special_terms);
      yPosition += 5;
      checkPageBreak();
    }

    // Termination
    addText('10. TERMINATION', 12, true);
    yPosition += 3;
    addText('Either party may terminate this lease by providing 30 days written notice to the other party. Early termination by the Tenant may result in forfeiture of the security deposit.');
    yPosition += 5;

    checkPageBreak();

    // Governing Law
    addText('11. GOVERNING LAW', 12, true);
    yPosition += 3;
    addText('This lease shall be governed by and construed in accordance with the laws of the state where the Premises is located.');
    yPosition += 10;

    checkPageBreak();

    // Signatures
    addText('SIGNATURES', 12, true);
    yPosition += 10;

    doc.setFontSize(11);
    doc.text('_________________________________', margin, yPosition);
    doc.text('_________________________________', pageWidth / 2 + 10, yPosition);
    yPosition += 7;
    doc.text('Landlord Signature', margin, yPosition);
    doc.text('Tenant Signature', pageWidth / 2 + 10, yPosition);
    yPosition += 7;
    doc.text(`Date: ______________`, margin, yPosition);
    doc.text(`Date: ______________`, pageWidth / 2 + 10, yPosition);

    // Convert to blob
    const pdfBlob = doc.output('blob');
    return pdfBlob;
  }

  /**
   * Generate lease from template with custom data
   */
  async generateLeaseFromTemplate(
    templateId: string,
    leaseData: LeaseDocumentData
  ): Promise<string> {
    // Get template
    const { data: template, error: templateError } = await supabase
      .from('lease_templates')
      .select('*')
      .eq('id', templateId)
      .single();

    if (templateError) throw templateError;

    // Replace placeholders in template content
    let content = template.content;
    content = content.replace(/\{tenant_name\}/g, leaseData.tenant_name);
    content = content.replace(/\{landlord_name\}/g, leaseData.landlord_name);
    content = content.replace(/\{property_address\}/g, leaseData.property_address);
    content = content.replace(/\{rent_amount\}/g, leaseData.rent_amount.toFixed(2));
    content = content.replace(/\{lease_term_months\}/g, leaseData.lease_term_months.toString());
    content = content.replace(/\{start_date\}/g, new Date(leaseData.start_date).toLocaleDateString());
    content = content.replace(/\{end_date\}/g, new Date(leaseData.end_date).toLocaleDateString());
    
    if (leaseData.special_terms) {
      content = content.replace(/\{special_terms\}/g, leaseData.special_terms);
    }

    // Generate PDF from content
    const pdfBlob = await this.generateLeasePDF(leaseData);

    // Upload and create document record
    const fileName = `lease_${leaseData.renewal_id}_${Date.now()}.pdf`;
    const filePath = await documentStorageService.uploadDocument(
      pdfBlob,
      fileName,
      '', // property_id will be set from renewal data
      'lease'
    );

    return filePath;
  }
}

export const leaseGenerationService = new LeaseGenerationService();