import { useState } from 'react';
import { Download, FileSpreadsheet, FileText, File } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useToast } from '@/hooks/use-toast';
import { exportService } from '@/services/exportService';
import type { ExportFormat, ExportOptions } from '@/types/export';

interface ExportButtonProps<T extends Record<string, unknown>> {
  data: T[];
  filename?: string;
  options?: ExportOptions;
  formats?: ExportFormat[];
  variant?: 'default' | 'outline' | 'ghost';
  size?: 'default' | 'sm' | 'lg';
}

export default function ExportButton<T extends Record<string, unknown>>({
  data,
  filename,
  options = {},
  formats = ['csv', 'excel', 'pdf'],
  variant = 'outline',
  size = 'default',
}: ExportButtonProps<T>) {
  const { toast } = useToast();
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async (format: ExportFormat) => {
    if (data.length === 0) {
      toast({
        title: 'No Data',
        description: 'There is no data to export.',
        variant: 'destructive',
      });
      return;
    }

    setIsExporting(true);
    try {
      exportService.export(data, format, filename, options);
      toast({
        title: 'Export Successful',
        description: `Data exported as ${format.toUpperCase()} successfully.`,
      });
    } catch (error) {
      toast({
        title: 'Export Failed',
        description: error instanceof Error ? error.message : 'Failed to export data',
        variant: 'destructive',
      });
    } finally {
      setIsExporting(false);
    }
  };

  const getFormatIcon = (format: ExportFormat) => {
    switch (format) {
      case 'csv':
        return <FileText className="h-4 w-4 mr-2" />;
      case 'excel':
        return <FileSpreadsheet className="h-4 w-4 mr-2" />;
      case 'pdf':
        return <File className="h-4 w-4 mr-2" />;
    }
  };

  const getFormatLabel = (format: ExportFormat) => {
    switch (format) {
      case 'csv':
        return 'Export as CSV';
      case 'excel':
        return 'Export as Excel';
      case 'pdf':
        return 'Export as PDF';
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant={variant} size={size} disabled={isExporting}>
          <Download className="h-4 w-4 mr-2" />
          {isExporting ? 'Exporting...' : 'Export'}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {formats.map((format) => (
          <DropdownMenuItem
            key={format}
            onClick={() => handleExport(format)}
            disabled={isExporting}
          >
            {getFormatIcon(format)}
            {getFormatLabel(format)}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}