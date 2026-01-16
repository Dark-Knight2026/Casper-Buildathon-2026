/**
 * Document Service
 * Handle document generation and download functionality
 */

import { jsPDF } from 'jspdf';
import type { PropertyComparison } from '@/types/property';

interface LeaseDocument {
  id: string;
  leaseId: string;
  propertyAddress: string;
  tenantName: string;
  landlordName: string;
  startDate: string;
  endDate: string;
  monthlyRent: number;
  securityDeposit: number;
  terms: string[];
  signatures: {
    tenant: { name: string; date: string; signature?: string };
    landlord: { name: string; date: string; signature?: string };
  };
  attachments?: { name: string; url: string }[];
}

interface PaymentReceipt {
  id: string;
  paymentId: string;
  tenantName: string;
  propertyAddress: string;
  amount: number;
  date: string;
  method: string;
  transactionId: string;
}

class DocumentService {
  /**
   * Generate and download lease agreement PDF
   */
  async downloadLeaseAgreement(lease: LeaseDocument): Promise<void> {
    const doc = new jsPDF();
    let yPosition = 20;

    // Title
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.text('RESIDENTIAL LEASE AGREEMENT', 105, yPosition, { align: 'center' });
    yPosition += 15;

    // Property Information
    doc.setFontSize(14);
    doc.text('Property Information', 20, yPosition);
    yPosition += 8;

    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    doc.text(`Property Address: ${lease.propertyAddress}`, 20, yPosition);
    yPosition += 7;

    // Parties
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Parties', 20, yPosition);
    yPosition += 8;

    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    doc.text(`Landlord: ${lease.landlordName}`, 20, yPosition);
    yPosition += 7;
    doc.text(`Tenant: ${lease.tenantName}`, 20, yPosition);
    yPosition += 10;

    // Lease Terms
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Lease Terms', 20, yPosition);
    yPosition += 8;

    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    doc.text(`Start Date: ${new Date(lease.startDate).toLocaleDateString()}`, 20, yPosition);
    yPosition += 7;
    doc.text(`End Date: ${new Date(lease.endDate).toLocaleDateString()}`, 20, yPosition);
    yPosition += 7;
    doc.text(`Monthly Rent: $${lease.monthlyRent.toLocaleString()}`, 20, yPosition);
    yPosition += 7;
    doc.text(`Security Deposit: $${lease.securityDeposit.toLocaleString()}`, 20, yPosition);
    yPosition += 10;

    // Terms and Conditions
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Terms and Conditions', 20, yPosition);
    yPosition += 8;

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    lease.terms.forEach((term, index) => {
      if (yPosition > 270) {
        doc.addPage();
        yPosition = 20;
      }
      const lines = doc.splitTextToSize(`${index + 1}. ${term}`, 170);
      doc.text(lines, 20, yPosition);
      yPosition += lines.length * 5 + 3;
    });

    // Signatures
    if (yPosition > 220) {
      doc.addPage();
      yPosition = 20;
    }

    yPosition += 10;
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Signatures', 20, yPosition);
    yPosition += 15;

    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    doc.text('Tenant:', 20, yPosition);
    doc.line(20, yPosition + 15, 90, yPosition + 15);
    doc.text(lease.signatures.tenant.name, 20, yPosition + 20);
    doc.text(`Date: ${new Date(lease.signatures.tenant.date).toLocaleDateString()}`, 20, yPosition + 27);

    doc.text('Landlord:', 110, yPosition);
    doc.line(110, yPosition + 15, 180, yPosition + 15);
    doc.text(lease.signatures.landlord.name, 110, yPosition + 20);
    doc.text(`Date: ${new Date(lease.signatures.landlord.date).toLocaleDateString()}`, 110, yPosition + 27);

    // Save PDF
    doc.save(`Lease_Agreement_${lease.leaseId}.pdf`);
  }

  /**
   * Generate and download payment receipt PDF
   */
  async downloadPaymentReceipt(receipt: PaymentReceipt): Promise<void> {
    const doc = new jsPDF();
    let yPosition = 20;

    // Title
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.text('PAYMENT RECEIPT', 105, yPosition, { align: 'center' });
    yPosition += 20;

    // Receipt Details
    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    doc.text(`Receipt #: ${receipt.id}`, 20, yPosition);
    yPosition += 10;
    doc.text(`Transaction ID: ${receipt.transactionId}`, 20, yPosition);
    yPosition += 10;
    doc.text(`Date: ${new Date(receipt.date).toLocaleDateString()}`, 20, yPosition);
    yPosition += 15;

    // Tenant Information
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Tenant Information', 20, yPosition);
    yPosition += 8;

    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    doc.text(`Name: ${receipt.tenantName}`, 20, yPosition);
    yPosition += 7;
    doc.text(`Property: ${receipt.propertyAddress}`, 20, yPosition);
    yPosition += 15;

    // Payment Details
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Payment Details', 20, yPosition);
    yPosition += 8;

    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    doc.text(`Payment Method: ${receipt.method}`, 20, yPosition);
    yPosition += 7;
    doc.text(`Amount Paid: $${receipt.amount.toLocaleString()}`, 20, yPosition);
    yPosition += 20;

    // Thank you message
    doc.setFontSize(11);
    doc.setFont('helvetica', 'italic');
    doc.text('Thank you for your payment!', 105, yPosition, { align: 'center' });

    // Save PDF
    doc.save(`Payment_Receipt_${receipt.id}.pdf`);
  }

  /**
   * Download multiple documents as a ZIP
   */
  async downloadBulkDocuments(documents: LeaseDocument[]): Promise<void> {
    // For simplicity, download each document individually
    // In production, use JSZip to create a ZIP file
    for (const doc of documents) {
      await this.downloadLeaseAgreement(doc);
      // Add delay to prevent browser blocking multiple downloads
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
  }

  /**
   * Generate property comparison report PDF
   */
  async downloadComparisonReport(properties: PropertyComparison[]): Promise<void> {
    const doc = new jsPDF('landscape');
    let yPosition = 20;

    // Title
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text('PROPERTY COMPARISON REPORT', 148, yPosition, { align: 'center' });
    yPosition += 15;

    // Headers
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    const colWidth = 60;
    doc.text('Feature', 20, yPosition);
    properties.forEach((_, index) => {
      doc.text(`Property ${index + 1}`, 80 + index * colWidth, yPosition);
    });
    yPosition += 7;

    // Draw line
    doc.line(20, yPosition, 280, yPosition);
    yPosition += 5;

    // Comparison data
    doc.setFont('helvetica', 'normal');
    const features: Array<{ key: keyof PropertyComparison; label: string; format?: (v: number | boolean | string) => string }> = [
      { key: 'address', label: 'Address' },
      { key: 'rent', label: 'Monthly Rent', format: (v) => `$${(v as number).toLocaleString()}` },
      { key: 'bedrooms', label: 'Bedrooms' },
      { key: 'bathrooms', label: 'Bathrooms' },
      { key: 'sqft', label: 'Square Feet', format: (v) => `${(v as number).toLocaleString()} sqft` },
      { key: 'available', label: 'Available', format: (v) => ((v as boolean) ? 'Yes' : 'No') },
    ];

    features.forEach((feature) => {
      doc.text(feature.label, 20, yPosition);
      properties.forEach((property, index) => {
        const value = property[feature.key];
        const displayValue = feature.format ? feature.format(value) : String(value);
        doc.text(displayValue, 80 + index * colWidth, yPosition);
      });
      yPosition += 7;
    });

    // Save PDF
    doc.save('Property_Comparison.pdf');
  }
}

export const documentService = new DocumentService();