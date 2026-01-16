import * as XLSX from 'xlsx';
import { logger } from '@/utils/logger';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

// Extend jsPDF type to include autoTable
interface jsPDFWithAutoTable extends jsPDF {
  lastAutoTable?: {
    finalY: number;
  };
}

/**
 * Export data to CSV format
 */
export function exportToCSV<T extends Record<string, unknown>>(
  data: T[],
  filename: string,
  columns?: Array<{ key: keyof T; label: string }>
): void {
  if (data.length === 0) {
    throw new Error('No data to export');
  }

  // Determine columns
  const cols = columns || Object.keys(data[0]).map((key) => ({ key, label: key }));

  // Create CSV header
  const header = cols.map((col) => col.label).join(',');

  // Create CSV rows
  const rows = data.map((row) =>
    cols
      .map((col) => {
        const value = row[col.key];
        // Handle values with commas, quotes, or newlines
        if (value === null || value === undefined) return '';
        const stringValue = String(value);
        if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
          return `"${stringValue.replace(/"/g, '""')}"`;
        }
        return stringValue;
      })
      .join(',')
  );

  // Combine header and rows
  const csv = [header, ...rows].join('\n');

  // Create blob and download
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  downloadBlob(blob, `${filename}.csv`);
}

/**
 * Export data to Excel format with formatting
 */
export function exportToExcel<T extends Record<string, unknown>>(
  data: T[],
  filename: string,
  options?: {
    columns?: Array<{ key: keyof T; label: string; width?: number }>;
    sheetName?: string;
    includeFilters?: boolean;
    freezeHeader?: boolean;
  }
): void {
  if (data.length === 0) {
    throw new Error('No data to export');
  }

  const {
    columns = Object.keys(data[0]).map((key) => ({ key, label: key })),
    sheetName = 'Sheet1',
    includeFilters = true,
    freezeHeader = true,
  } = options || {};

  // Create worksheet data
  const wsData: unknown[][] = [];

  // Add header row
  wsData.push(columns.map((col) => col.label));

  // Add data rows
  data.forEach((row) => {
    wsData.push(columns.map((col) => row[col.key]));
  });

  // Create worksheet
  const ws = XLSX.utils.aoa_to_sheet(wsData);

  // Set column widths
  ws['!cols'] = columns.map((col) => ({ wch: col.width || 15 }));

  // Freeze header row
  if (freezeHeader) {
    ws['!freeze'] = { xSplit: 0, ySplit: 1 };
  }

  // Add auto-filter
  if (includeFilters) {
    ws['!autofilter'] = { ref: XLSX.utils.encode_range({ s: { c: 0, r: 0 }, e: { c: columns.length - 1, r: data.length } }) };
  }

  // Create workbook
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName);

  // Write file
  XLSX.writeFile(wb, `${filename}.xlsx`);
}

/**
 * Export data to Excel with multiple sheets
 */
export function exportToExcelMultiSheet(
  sheets: Array<{
    name: string;
    data: Array<Record<string, unknown>>;
    columns?: Array<{ key: string; label: string; width?: number }>;
  }>,
  filename: string
): void {
  const wb = XLSX.utils.book_new();

  sheets.forEach((sheet) => {
    if (sheet.data.length === 0) return;

    const columns = sheet.columns || Object.keys(sheet.data[0]).map((key) => ({ key, label: key }));

    // Create worksheet data
    const wsData: unknown[][] = [];
    wsData.push(columns.map((col) => col.label));

    sheet.data.forEach((row) => {
      wsData.push(columns.map((col) => row[col.key]));
    });

    // Create worksheet
    const ws = XLSX.utils.aoa_to_sheet(wsData);
    ws['!cols'] = columns.map((col) => ({ wch: col.width || 15 }));

    XLSX.utils.book_append_sheet(wb, ws, sheet.name);
  });

  XLSX.writeFile(wb, `${filename}.xlsx`);
}

/**
 * Export data to PDF format
 */
export function exportToPDF<T extends Record<string, unknown>>(
  data: T[],
  filename: string,
  options?: {
    columns?: Array<{ key: keyof T; label: string }>;
    title?: string;
    orientation?: 'portrait' | 'landscape';
    pageSize?: 'a4' | 'letter' | 'legal';
    includeDate?: boolean;
  }
): void {
  if (data.length === 0) {
    throw new Error('No data to export');
  }

  const {
    columns = Object.keys(data[0]).map((key) => ({ key, label: key })),
    title = 'Data Export',
    orientation = 'landscape',
    pageSize = 'a4',
    includeDate = true,
  } = options || {};

  // Create PDF document
  const doc = new jsPDF({
    orientation,
    unit: 'mm',
    format: pageSize,
  });

  // Add title
  doc.setFontSize(16);
  doc.text(title, 14, 15);

  // Add date
  if (includeDate) {
    doc.setFontSize(10);
    doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 22);
  }

  // Prepare table data
  const headers = columns.map((col) => col.label);
  const rows = data.map((row) => columns.map((col) => String(row[col.key] ?? '')));

  // Add table
  autoTable(doc, {
    head: [headers],
    body: rows,
    startY: includeDate ? 25 : 20,
    styles: {
      fontSize: 8,
      cellPadding: 2,
    },
    headStyles: {
      fillColor: [41, 128, 185],
      textColor: 255,
      fontStyle: 'bold',
    },
    alternateRowStyles: {
      fillColor: [245, 245, 245],
    },
  });

  // Save PDF
  doc.save(`${filename}.pdf`);
}

/**
 * Export data to PDF with charts
 */
export async function exportToPDFWithCharts(
  data: {
    title: string;
    tables?: Array<{
      title: string;
      data: Array<Record<string, unknown>>;
      columns?: Array<{ key: string; label: string }>;
    }>;
    charts?: Array<{
      title: string;
      imageDataUrl: string;
      width?: number;
      height?: number;
    }>;
  },
  filename: string,
  options?: {
    orientation?: 'portrait' | 'landscape';
    pageSize?: 'a4' | 'letter' | 'legal';
  }
): Promise<void> {
  const { orientation = 'landscape', pageSize = 'a4' } = options || {};

  const doc = new jsPDF({
    orientation,
    unit: 'mm',
    format: pageSize,
  }) as jsPDFWithAutoTable;

  let yPosition = 15;

  // Add main title
  doc.setFontSize(18);
  doc.text(data.title, 14, yPosition);
  yPosition += 10;

  doc.setFontSize(10);
  doc.text(`Generated: ${new Date().toLocaleString()}`, 14, yPosition);
  yPosition += 10;

  // Add charts
  if (data.charts && data.charts.length > 0) {
    for (const chart of data.charts) {
      // Check if we need a new page
      if (yPosition + (chart.height || 80) > doc.internal.pageSize.height - 20) {
        doc.addPage();
        yPosition = 15;
      }

      // Add chart title
      doc.setFontSize(14);
      doc.text(chart.title, 14, yPosition);
      yPosition += 5;

      // Add chart image
      try {
        doc.addImage(
          chart.imageDataUrl,
          'PNG',
          14,
          yPosition,
          chart.width || 180,
          chart.height || 80
        );
        yPosition += (chart.height || 80) + 10;
      } catch (error) {
        logger.error('Failed to add chart image:', error);
      }
    }
  }

  // Add tables
  if (data.tables && data.tables.length > 0) {
    for (const table of data.tables) {
      if (table.data.length === 0) continue;

      if (yPosition > doc.internal.pageSize.height - 40) {
        doc.addPage();
        yPosition = 15;
      }

      // Add table title
      doc.setFontSize(14);
      doc.text(table.title, 14, yPosition);
      yPosition += 5;

      const columns = table.columns || Object.keys(table.data[0]).map((key) => ({ key, label: key }));
      const headers = columns.map((col) => col.label);
      const rows = table.data.map((row) => columns.map((col) => String(row[col.key] ?? '')));

      autoTable(doc, {
        head: [headers],
        body: rows,
        startY: yPosition,
        styles: {
          fontSize: 8,
          cellPadding: 2,
        },
        headStyles: {
          fillColor: [41, 128, 185],
          textColor: 255,
          fontStyle: 'bold',
        },
        alternateRowStyles: {
          fillColor: [245, 245, 245],
        },
      });

      yPosition = doc.lastAutoTable?.finalY ? doc.lastAutoTable.finalY + 10 : yPosition + 50;
    }
  }

  doc.save(`${filename}.pdf`);
}

/**
 * Download blob as file
 */
function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Convert chart element to image data URL
 */
export async function chartToImageDataUrl(chartElement: HTMLElement): Promise<string> {
  // Use html2canvas or similar library to convert chart to image
  // For now, return a placeholder
  return new Promise((resolve) => {
    // This would typically use html2canvas
    // import html2canvas from 'html2canvas';
    // html2canvas(chartElement).then(canvas => resolve(canvas.toDataURL()));
    
    // Placeholder implementation
    resolve('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==');
  });
}

/**
 * Export utilities
 */
export const exportUtils = {
  /**
   * Get file extension from format
   */
  getExtension: (format: 'csv' | 'excel' | 'pdf'): string => {
    const extensions = {
      csv: 'csv',
      excel: 'xlsx',
      pdf: 'pdf',
    };
    return extensions[format];
  },

  /**
   * Format filename with timestamp
   */
  formatFilename: (baseName: string, includeTimestamp = true): string => {
    if (!includeTimestamp) return baseName;
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
    return `${baseName}_${timestamp}`;
  },

  /**
   * Validate export data
   */
  validateData: <T>(data: T[]): void => {
    if (!Array.isArray(data)) {
      throw new Error('Export data must be an array');
    }
    if (data.length === 0) {
      throw new Error('No data to export');
    }
  },
};