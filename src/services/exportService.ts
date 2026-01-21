import ExcelJS from 'exceljs';
import Papa from 'papaparse';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { ExportFormat, ExportOptions, PDFExportOptions } from '@/types/export';

class ExportService {
  /**
   * Export data to CSV format
   */
  exportToCSV<T extends Record<string, unknown>>(
    data: T[],
    filename: string = 'export.csv',
    options: ExportOptions = {}
  ): void {
    try {
      // Filter columns if specified
      let exportData = data;
      if (options.columns && options.columns.length > 0) {
        exportData = data.map((row) => {
          const filteredRow: Record<string, unknown> = {};
          options.columns!.forEach((col) => {
            if (col in row) {
              filteredRow[col] = row[col];
            }
          });
          return filteredRow as T;
        });
      }

      // Convert to CSV
      const csv = Papa.unparse(exportData);

      // Create blob and download
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      this.downloadBlob(blob, filename);
    } catch (error) {
      console.error('CSV export error:', error);
      throw new Error('Failed to export to CSV');
    }
  }

  /**
   * Export data to Excel format
   */
  async exportToExcel<T extends Record<string, unknown>>(
    data: T[],
    filename: string = 'export.xlsx',
    options: ExportOptions = {}
  ): Promise<void> {
    try {
      // Filter columns if specified
      let exportData = data;
      if (options.columns && options.columns.length > 0) {
        exportData = data.map((row) => {
          const filteredRow: Record<string, unknown> = {};
          options.columns!.forEach((col) => {
            if (col in row) {
              filteredRow[col] = row[col];
            }
          });
          return filteredRow as T;
        });
      }

      // Create workbook and worksheet
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Data');

      // Get column keys
      const columnKeys = Object.keys(exportData[0] || {});

      // Set columns with auto-sizing
      worksheet.columns = columnKeys.map((key) => ({
        header: key,
        key: key,
        width: Math.max(
          key.length,
          ...exportData.map((row) => String(row[key] || '').length)
        ),
      }));

      // Add data rows
      exportData.forEach((row) => {
        worksheet.addRow(row);
      });

      // Style header row
      const headerRow = worksheet.getRow(1);
      headerRow.font = { bold: true };
      headerRow.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFD9D9D9' },
      };

      // Write file
      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      this.downloadBlob(blob, filename);
    } catch (error) {
      console.error('Excel export error:', error);
      throw new Error('Failed to export to Excel');
    }
  }

  /**
   * Export data to PDF format
   */
  exportToPDF<T extends Record<string, unknown>>(
    data: T[],
    filename: string = 'export.pdf',
    options: PDFExportOptions = {}
  ): void {
    try {
      const doc = new jsPDF({
        orientation: options.orientation || 'portrait',
      });

      // Add title if provided
      if (options.title) {
        doc.setFontSize(16);
        doc.setFont('helvetica', 'bold');
        doc.text(options.title, 14, 20);
      }

      // Filter columns if specified
      let exportData = data;
      if (options.columns && options.columns.length > 0) {
        exportData = data.map((row) => {
          const filteredRow: Record<string, unknown> = {};
          options.columns!.forEach((col) => {
            if (col in row) {
              filteredRow[col] = row[col];
            }
          });
          return filteredRow as T;
        });
      }

      // Prepare table data
      const headers = Object.keys(exportData[0] || {});
      const body = exportData.map((row) =>
        headers.map((header) => String(row[header] || ''))
      );

      // Add table
      autoTable(doc, {
        startY: options.title ? 30 : 20,
        head: [headers],
        body: body,
        theme: 'grid',
        styles: { fontSize: 8 },
        headStyles: { fillColor: [66, 66, 66], fontStyle: 'bold' },
      });

      // Add footer if specified
      if (options.includeFooters) {
        const pageCount = doc.getNumberOfPages();
        for (let i = 1; i <= pageCount; i++) {
          doc.setPage(i);
          doc.setFontSize(8);
          doc.text(
            `Page ${i} of ${pageCount}`,
            doc.internal.pageSize.getWidth() / 2,
            doc.internal.pageSize.getHeight() - 10,
            { align: 'center' }
          );
          doc.text(
            `Generated on ${new Date().toLocaleDateString()}`,
            14,
            doc.internal.pageSize.getHeight() - 10
          );
        }
      }

      // Save PDF
      doc.save(filename);
    } catch (error) {
      console.error('PDF export error:', error);
      throw new Error('Failed to export to PDF');
    }
  }

  /**
   * Export data in the specified format
   */
  async export<T extends Record<string, unknown>>(
    data: T[],
    format: ExportFormat,
    filename?: string,
    options: ExportOptions = {}
  ): Promise<void> {
    const timestamp = new Date().toISOString().split('T')[0];
    const defaultFilename = `export-${timestamp}`;

    switch (format) {
      case 'csv':
        this.exportToCSV(data, filename || `${defaultFilename}.csv`, options);
        break;
      case 'excel':
        await this.exportToExcel(data, filename || `${defaultFilename}.xlsx`, options);
        break;
      case 'pdf':
        this.exportToPDF(data, filename || `${defaultFilename}.pdf`, options as PDFExportOptions);
        break;
      default:
        throw new Error(`Unsupported export format: ${format}`);
    }
  }

  /**
   * Download a blob as a file
   */
  private downloadBlob(blob: Blob, filename: string): void {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }
}

export const exportService = new ExportService();