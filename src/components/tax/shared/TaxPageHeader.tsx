import React from 'react';
import { cn } from '@/lib/utils';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { User, Building, Home, ShoppingCart, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

interface TaxPageHeaderProps {
  title?: string;
  description?: string;
  children?: React.ReactNode;
  className?: string;
  currentRole?: string;
  onRoleChange?: (role: string) => void;
}

export const TaxPageHeader: React.FC<TaxPageHeaderProps> = ({
  title = "Tax Center",
  description = "Centralized tax management for all your real estate activities.",
  children,
  className,
  currentRole,
  onRoleChange
}) => {
  const handleExport = () => {
    toast.success(`Exporting tax report for ${currentRole || 'current'} role...`);
  };

  return (
    <div className={cn("flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-6", className)}>
      <div className="space-y-1">
        <h1 className="text-3xl font-bold tracking-tight text-gray-900">{title}</h1>
        {description && (
          <p className="text-muted-foreground text-lg">
            {description}
          </p>
        )}
      </div>
      
      <div className="flex items-center gap-2">
        {children}
        
        {currentRole && onRoleChange && (
          <>
            <div className="w-[180px]">
              <Select value={currentRole} onValueChange={onRoleChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Select Role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="agent">
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4" />
                      <span>Agent</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="landlord">
                    <div className="flex items-center gap-2">
                      <Building className="h-4 w-4" />
                      <span>Landlord</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="tenant">
                    <div className="flex items-center gap-2">
                      <Home className="h-4 w-4" />
                      <span>Tenant</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="buyer">
                    <div className="flex items-center gap-2">
                      <ShoppingCart className="h-4 w-4" />
                      <span>Buyer</span>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <Button variant="outline" onClick={handleExport}>
              <Download className="mr-2 h-4 w-4" />
              Export
            </Button>
          </>
        )}
      </div>
    </div>
  );
};