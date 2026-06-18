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
    doc.text('RESIDENTIAL LEASE AGREEMENT', 105, yPosition, {
      align: 'center',
    });
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
    doc.text(
      `Start Date: ${new Date(lease.startDate).toLocaleDateString()}`,
      20,
      yPosition
    );
    yPosition += 7;
    doc.text(
      `End Date: ${new Date(lease.endDate).toLocaleDateString()}`,
      20,
      yPosition
    );
    yPosition += 7;
    doc.text(
      `Monthly Rent: $${lease.monthlyRent.toLocaleString()}`,
      20,
      yPosition
    );
    yPosition += 7;
    doc.text(
      `Security Deposit: $${lease.securityDeposit.toLocaleString()}`,
      20,
      yPosition
    );
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
    doc.text(
      `Date: ${new Date(lease.signatures.tenant.date).toLocaleDateString()}`,
      20,
      yPosition + 27
    );

    doc.text('Landlord:', 110, yPosition);
    doc.line(110, yPosition + 15, 180, yPosition + 15);
    doc.text(lease.signatures.landlord.name, 110, yPosition + 20);
    doc.text(
      `Date: ${new Date(lease.signatures.landlord.date).toLocaleDateString()}`,
      110,
      yPosition + 27
    );

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
    doc.text(
      `Date: ${new Date(receipt.date).toLocaleDateString()}`,
      20,
      yPosition
    );
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
    doc.text('Thank you for your payment!', 105, yPosition, {
      align: 'center',
    });

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
  async downloadComparisonReport(
    properties: PropertyComparison[]
  ): Promise<void> {
    const doc = new jsPDF('landscape');
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const marginX = 20;
    const labelX = marginX;
    const firstColX = 75; // properties start here; label column is labelX..firstColX
    const lineHeight = 5;
    // Fit every property column within the page; cap the width when there are few.
    const colWidth = Math.min(
      65,
      (pageWidth - marginX - firstColX) / Math.max(properties.length, 1)
    );

    let yPosition = 20;

    // Title
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text('PROPERTY COMPARISON REPORT', pageWidth / 2, yPosition, {
      align: 'center',
    });
    yPosition += 15;

    const drawHeader = () => {
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.text('Feature', labelX, yPosition);
      properties.forEach((_, index) => {
        doc.text(
          `Property ${index + 1}`,
          firstColX + index * colWidth,
          yPosition
        );
      });
      yPosition += 7;
      doc.line(marginX, yPosition, pageWidth - marginX, yPosition);
      yPosition += 5;
      doc.setFont('helvetica', 'normal');
    };
    drawHeader();

    // Every field shown on screen — array fields joined; long values wrap.
    const features: Array<{
      label: string;
      value: (p: PropertyComparison) => string;
    }> = [
      { label: 'Address', value: (p) => p.address },
      { label: 'Monthly Rent', value: (p) => `$${p.rent.toLocaleString()}` },
      { label: 'Bedrooms', value: (p) => String(p.bedrooms) },
      { label: 'Bathrooms', value: (p) => String(p.bathrooms) },
      { label: 'Square Feet', value: (p) => `${p.sqft.toLocaleString()} sqft` },
      { label: 'Available', value: (p) => (p.available ? 'Yes' : 'No') },
      { label: 'Pet Friendly', value: (p) => (p.petFriendly ? 'Yes' : 'No') },
      { label: 'Parking', value: (p) => p.parking },
      { label: 'Utilities', value: (p) => p.utilities },
      {
        label: 'Amenities',
        value: (p) => (p.amenities.length ? p.amenities.join(', ') : '—'),
      },
      {
        label: 'Lease Terms',
        value: (p) => (p.leaseTerms.length ? p.leaseTerms.join(', ') : '—'),
      },
    ];

    doc.setFontSize(10);
    features.forEach((feature) => {
      const labelLines: string[] = doc.splitTextToSize(
        feature.label,
        firstColX - labelX - 4
      );
      const cells = properties.map(
        (p) => doc.splitTextToSize(feature.value(p), colWidth - 4) as string[]
      );
      const maxLines = Math.max(
        labelLines.length,
        ...cells.map((lines) => lines.length)
      );
      const rowHeight = maxLines * lineHeight;

      // Start a new page when the row wouldn't fit.
      if (yPosition + rowHeight > pageHeight - 15) {
        doc.addPage();
        yPosition = 20;
        drawHeader();
      }

      doc.setFont('helvetica', 'bold');
      doc.text(labelLines, labelX, yPosition);
      doc.setFont('helvetica', 'normal');
      cells.forEach((lines, index) => {
        doc.text(lines, firstColX + index * colWidth, yPosition);
      });
      yPosition += rowHeight + 2;
    });

    doc.save('Property_Comparison.pdf');
  }
}

export const documentService = new DocumentService();
