/**
 * Payment Receipt PDF Generator
 * Generates professional PDF receipts for payments
 */

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { Payment } from '@/services/paymentService';

export interface ReceiptDetails {
  propertyAddress: string;
  tenantName: string;
  landlordName: string;
  tenantEmail?: string;
  landlordEmail?: string;
}

/**
 * Generate a PDF receipt for a payment
 */
export async function generatePaymentReceiptPDF(
  payment: Payment,
  details: ReceiptDetails
): Promise<Blob> {
  const doc = new jsPDF();

  // Header with logo/branding
  doc.setFontSize(24);
  doc.setFont('helvetica', 'bold');
  doc.text('PAYMENT RECEIPT', 105, 20, { align: 'center' });

  // Receipt metadata
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  const receiptNumber = `RCP-${payment.id.substring(0, 8).toUpperCase()}`;
  doc.text(`Receipt #: ${receiptNumber}`, 20, 35);
  doc.text(`Date Issued: ${new Date().toLocaleDateString('en-US', { 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  })}`, 20, 40);
  doc.text(`Transaction ID: ${payment.transactionId || 'N/A'}`, 20, 45);

  // Divider line
  doc.setLineWidth(0.5);
  doc.line(20, 50, 190, 50);

  // Payment details section
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('Payment Details', 20, 60);

  // Payment information table
  autoTable(doc, {
    startY: 65,
    head: [['Description', 'Details']],
    body: [
      ['Property Address', details.propertyAddress],
      ['Tenant Name', details.tenantName],
      ['Tenant Email', details.tenantEmail || 'N/A'],
      ['Landlord Name', details.landlordName],
      ['Landlord Email', details.landlordEmail || 'N/A'],
      ['Payment Date', new Date(payment.paymentDate).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      })],
      ['Payment Method', payment.paymentMethod.replace('_', ' ').toUpperCase()],
      ['Payment Status', payment.paymentStatus.toUpperCase()]
    ],
    theme: 'grid',
    headStyles: { 
      fillColor: [41, 128, 185],
      fontSize: 10,
      fontStyle: 'bold'
    },
    bodyStyles: {
      fontSize: 9
    },
    columnStyles: {
      0: { cellWidth: 60, fontStyle: 'bold' },
      1: { cellWidth: 120 }
    }
  });

  // Amount section
  const finalY = (doc as any).lastAutoTable.finalY || 150;
  doc.setLineWidth(0.5);
  doc.line(20, finalY + 10, 190, finalY + 10);

  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('Amount Paid:', 120, finalY + 20);
  doc.setFontSize(16);
  doc.setTextColor(41, 128, 185);
  doc.text(`$${payment.amount.toFixed(2)}`, 170, finalY + 20);
  doc.setTextColor(0, 0, 0);

  doc.setLineWidth(0.5);
  doc.line(20, finalY + 25, 190, finalY + 25);

  // Footer
  doc.setFontSize(9);
  doc.setFont('helvetica', 'italic');
  doc.text('Thank you for your payment!', 105, finalY + 35, { align: 'center' });
  doc.text('This is a computer-generated receipt and does not require a signature.', 105, finalY + 40, { align: 'center' });
  
  doc.setFontSize(8);
  doc.text('For questions or concerns, please contact your property manager.', 105, finalY + 50, { align: 'center' });

  // Page border
  doc.setLineWidth(1);
  doc.rect(15, 15, 180, 267);

  return doc.output('blob');
}

/**
 * Generate a simple text receipt (fallback)
 */
export function generateTextReceipt(
  payment: Payment,
  details: ReceiptDetails
): string {
  const receiptNumber = `RCP-${payment.id.substring(0, 8).toUpperCase()}`;
  
  return `
===========================================
           PAYMENT RECEIPT
===========================================

Receipt #: ${receiptNumber}
Date Issued: ${new Date().toLocaleDateString()}
Transaction ID: ${payment.transactionId || 'N/A'}

-------------------------------------------
PAYMENT DETAILS
-------------------------------------------

Property Address: ${details.propertyAddress}
Tenant Name: ${details.tenantName}
Landlord Name: ${details.landlordName}

Payment Date: ${new Date(payment.paymentDate).toLocaleDateString()}
Payment Method: ${payment.paymentMethod.replace('_', ' ').toUpperCase()}
Payment Status: ${payment.paymentStatus.toUpperCase()}

-------------------------------------------
AMOUNT PAID: $${payment.amount.toFixed(2)}
-------------------------------------------

Thank you for your payment!

This is a computer-generated receipt.
For questions, please contact your property manager.

===========================================
  `.trim();
}