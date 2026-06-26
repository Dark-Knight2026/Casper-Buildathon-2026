/**
 * Export Type Definitions
 */

export type ExportFormat = 'csv' | 'excel' | 'pdf';

export interface ExportOptions {
  filename?: string;
  columns?: string[];
  dateRange?: {
    start: Date;
    end: Date;
  };
  filters?: Record<string, unknown>;
}

export interface ExportResult {
  success: boolean;
  filename: string;
  error?: string;
}

export interface PDFExportOptions extends ExportOptions {
  title?: string;
  orientation?: 'portrait' | 'landscape';
  includeHeaders?: boolean;
  includeFooters?: boolean;
}