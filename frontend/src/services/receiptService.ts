import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { ReceiptData, ReceiptGenerationOptions } from '@/types/receipt';

class ReceiptService {
  /**
   * Generate a PDF receipt for a payment
   */
  async generateReceipt(
    receiptData: ReceiptData,
    options: ReceiptGenerationOptions = {}
  ): Promise<Blob> {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    let yPosition = 20;

    // Header
    doc.setFontSize(24);
    doc.setFont('helvetica', 'bold');
    doc.text('PAYMENT RECEIPT', pageWidth / 2, yPosition, { align: 'center' });
    yPosition += 15;

    // Receipt Number and Date
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Receipt #: ${receiptData.receiptNumber}`, 20, yPosition);
    doc.text(`Date: ${receiptData.paymentDate}`, pageWidth - 20, yPosition, { align: 'right' });
    yPosition += 10;

    // Divider line
    doc.setDrawColor(200, 200, 200);
    doc.line(20, yPosition, pageWidth - 20, yPosition);
    yPosition += 15;

    // Landlord Information
    if (options.companyInfo) {
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text('From:', 20, yPosition);
      yPosition += 7;
      
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text(options.companyInfo.name, 20, yPosition);
      yPosition += 5;
      if (options.companyInfo.address) {
        doc.text(options.companyInfo.address, 20, yPosition);
        yPosition += 5;
      }
      if (options.companyInfo.phone) {
        doc.text(`Phone: ${options.companyInfo.phone}`, 20, yPosition);
        yPosition += 5;
      }
      if (options.companyInfo.email) {
        doc.text(`Email: ${options.companyInfo.email}`, 20, yPosition);
        yPosition += 5;
      }
      yPosition += 5;
    } else {
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text('From:', 20, yPosition);
      yPosition += 7;
      
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text(receiptData.landlord.name, 20, yPosition);
      yPosition += 5;
      if (receiptData.landlord.company) {
        doc.text(receiptData.landlord.company, 20, yPosition);
        yPosition += 5;
      }
      doc.text(receiptData.landlord.email, 20, yPosition);
      yPosition += 5;
      if (receiptData.landlord.phone) {
        doc.text(receiptData.landlord.phone, 20, yPosition);
        yPosition += 5;
      }
      yPosition += 5;
    }

    // Tenant Information
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('To:', 20, yPosition);
    yPosition += 7;
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(receiptData.tenant.name, 20, yPosition);
    yPosition += 5;
    doc.text(receiptData.tenant.email, 20, yPosition);
    yPosition += 5;
    if (receiptData.tenant.phone) {
      doc.text(receiptData.tenant.phone, 20, yPosition);
      yPosition += 5;
    }
    yPosition += 5;

    // Property Information
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('Property:', 20, yPosition);
    yPosition += 7;
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(receiptData.property.address, 20, yPosition);
    yPosition += 5;
    if (receiptData.property.unit) {
      doc.text(`Unit: ${receiptData.property.unit}`, 20, yPosition);
      yPosition += 5;
    }
    doc.text(
      `${receiptData.property.city}, ${receiptData.property.state} ${receiptData.property.zipCode}`,
      20,
      yPosition
    );
    yPosition += 15;

    // Payment Details Table
    const tableData: string[][] = [];
    
    if (options.includeBreakdown && receiptData.breakdown.length > 0) {
      receiptData.breakdown.forEach((item) => {
        tableData.push([item.description, `$${item.amount.toFixed(2)}`]);
      });
    } else {
      tableData.push(['Payment', `$${receiptData.amount.toFixed(2)}`]);
    }

    autoTable(doc, {
      startY: yPosition,
      head: [['Description', 'Amount']],
      body: tableData,
      foot: [['Total', `$${receiptData.amount.toFixed(2)}`]],
      theme: 'striped',
      headStyles: { fillColor: [66, 66, 66], fontSize: 11, fontStyle: 'bold' },
      footStyles: { fillColor: [240, 240, 240], fontSize: 12, fontStyle: 'bold' },
      styles: { fontSize: 10 },
      margin: { left: 20, right: 20 },
    });

    // Get the final Y position after the table
    const finalY = (doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY || yPosition;
    yPosition = finalY + 15;

    // Payment Method
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('Payment Method:', 20, yPosition);
    doc.setFont('helvetica', 'normal');
    doc.text(receiptData.paymentMethod, 70, yPosition);
    yPosition += 10;

    // Notes
    if (options.includeNotes && receiptData.notes) {
      doc.setFont('helvetica', 'bold');
      doc.text('Notes:', 20, yPosition);
      yPosition += 7;
      doc.setFont('helvetica', 'normal');
      const splitNotes = doc.splitTextToSize(receiptData.notes, pageWidth - 40);
      doc.text(splitNotes, 20, yPosition);
      yPosition += splitNotes.length * 5 + 10;
    }

    // Footer
    yPosition = doc.internal.pageSize.getHeight() - 30;
    doc.setFontSize(9);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(128, 128, 128);
    doc.text(
      'Thank you for your payment. Please keep this receipt for your records.',
      pageWidth / 2,
      yPosition,
      { align: 'center' }
    );
    yPosition += 5;
    doc.text(
      `Generated on ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}`,
      pageWidth / 2,
      yPosition,
      { align: 'center' }
    );

    return doc.output('blob');
  }

  /**
   * Download receipt as PDF
   */
  async downloadReceipt(
    receiptData: ReceiptData,
    options: ReceiptGenerationOptions = {}
  ): Promise<void> {
    const blob = await this.generateReceipt(receiptData, options);
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `receipt-${receiptData.receiptNumber}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  /**
   * Generate receipt number
   */
  generateReceiptNumber(paymentId: string): string {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const shortId = paymentId.substring(0, 8).toUpperCase();
    return `RCP-${year}${month}${day}-${shortId}`;
  }

  /**
   * Email receipt (placeholder for future implementation)
   */
  async emailReceipt(
    receiptData: ReceiptData,
    email: string,
    options: ReceiptGenerationOptions = {}
  ): Promise<void> {
    // This would integrate with an email service
    // For now, just generate and download
    console.log(`Emailing receipt to ${email}`);
    await this.downloadReceipt(receiptData, options);
  }
}

export const receiptService = new ReceiptService();