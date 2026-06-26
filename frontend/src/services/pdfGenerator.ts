/**
 * PDF Generator Service
 * Generate PDF documents from lease agreements
 */

import { LeaseAgreement } from '@/types/lease';
import { logger } from '@/utils/logger';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

class PDFGeneratorService {
  /**
   * Generate PDF from lease agreement
   */
  async generatePDF(lease: LeaseAgreement): Promise<Blob> {
    try {
      const pdf = new jsPDF();
      
      // Add content to PDF
      pdf.setFontSize(20);
      pdf.text('Lease Agreement', 20, 20);
      
      pdf.setFontSize(12);
      pdf.text(`Lease ID: ${lease.id}`, 20, 40);
      pdf.text(`Type: ${lease.type}`, 20, 50);
      pdf.text(`Status: ${lease.status}`, 20, 60);
      
      if (lease.startDate) {
        pdf.text(`Start Date: ${new Date(lease.startDate).toLocaleDateString()}`, 20, 70);
      }
      
      if (lease.endDate) {
        pdf.text(`End Date: ${new Date(lease.endDate).toLocaleDateString()}`, 20, 80);
      }
      
      if (lease.monthlyRent) {
        pdf.text(`Monthly Rent: $${lease.monthlyRent.toLocaleString()}`, 20, 90);
      }
      
      return pdf.output('blob');
    } catch (error) {
      logger.error('Error generating PDF:', error);
      throw new Error(error instanceof Error ? error.message : 'Failed to generate PDF');
    }
  }

  /**
   * Generate PDF from HTML element
   */
  async generateFromHTML(element: HTMLElement): Promise<Blob> {
    try {
      const canvas = await html2canvas(element);
      const imgData = canvas.toDataURL('image/png');
      
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'px',
        format: [canvas.width, canvas.height]
      });
      
      pdf.addImage(imgData, 'PNG', 0, 0, canvas.width, canvas.height);
      return pdf.output('blob');
    } catch (error) {
      logger.error('Error generating PDF from HTML:', error);
      throw new Error(error instanceof Error ? error.message : 'Failed to generate PDF from HTML');
    }
  }

  /**
   * Download PDF
   */
  async downloadPDF(lease: LeaseAgreement, filename?: string): Promise<void> {
    try {
      const blob = await this.generatePDF(lease);
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename || `lease_${lease.id}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      logger.error('Error downloading PDF:', error);
      throw new Error(error instanceof Error ? error.message : 'Failed to download PDF');
    }
  }

  /**
   * Preview PDF in new window
   */
  async previewPDF(lease: LeaseAgreement): Promise<void> {
    try {
      const blob = await this.generatePDF(lease);
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank');
    } catch (error) {
      logger.error('Error previewing PDF:', error);
      throw new Error(error instanceof Error ? error.message : 'Failed to preview PDF');
    }
  }
}

export const PDFGenerator = new PDFGeneratorService();
export default PDFGenerator;