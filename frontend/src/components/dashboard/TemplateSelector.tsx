import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { 
  LayoutGrid, 
  List, 
  Columns, 
  PanelLeft, 
  Minimize2,
  Check 
} from 'lucide-react';
import { DashboardTemplate, TEMPLATE_CONFIGS } from '@/types/dashboard';
import { cn } from '@/lib/utils';

const ICON_MAP = {
  LayoutGrid,
  List,
  Columns,
  PanelLeft,
  Minimize2,
};

interface TemplateSelectorProps {
  dashboardId: string;
  currentTemplate?: DashboardTemplate;
  onTemplateChange: (template: DashboardTemplate) => void;
  className?: string;
}

/**
 * Template Selector - Dropdown for switching dashboard templates
 * Saves preference to localStorage
 * 
 * @example
 * <TemplateSelector
 *   dashboardId="agent-overview"
 *   currentTemplate={template}
 *   onTemplateChange={setTemplate}
 * />
 */
export function TemplateSelector({
  dashboardId,
  currentTemplate = 'grid',
  onTemplateChange,
  className,
}: TemplateSelectorProps) {
  const [selectedTemplate, setSelectedTemplate] = useState<DashboardTemplate>(currentTemplate);

  // Load template preference from localStorage
  useEffect(() => {
    const storageKey = `dashboard_template_${dashboardId}`;
    const saved = localStorage.getItem(storageKey) as DashboardTemplate;
    if (saved && TEMPLATE_CONFIGS[saved]) {
      setSelectedTemplate(saved);
      onTemplateChange(saved);
    }
  }, [dashboardId, onTemplateChange]);

  const handleTemplateChange = (template: DashboardTemplate) => {
    setSelectedTemplate(template);
    onTemplateChange(template);
    
    // Save to localStorage
    const storageKey = `dashboard_template_${dashboardId}`;
    localStorage.setItem(storageKey, template);
  };

  const currentConfig = TEMPLATE_CONFIGS[selectedTemplate];
  const IconComponent = ICON_MAP[currentConfig.icon as keyof typeof ICON_MAP];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className={cn('gap-2', className)}>
          <IconComponent className="h-4 w-4" />
          <span className="hidden sm:inline">{currentConfig.name}</span>
          <span className="sm:hidden">Layout</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-72">
        <DropdownMenuLabel>Dashboard Layout</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {Object.values(TEMPLATE_CONFIGS).map((config) => {
          const Icon = ICON_MAP[config.icon as keyof typeof ICON_MAP];
          const isSelected = selectedTemplate === config.id;
          
          return (
            <DropdownMenuItem
              key={config.id}
              onClick={() => handleTemplateChange(config.id)}
              className="flex items-start gap-3 p-3 cursor-pointer"
            >
              <div className="flex-shrink-0 mt-0.5">
                <Icon className="h-5 w-5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-sm">{config.name}</span>
                  {isSelected && (
                    <Check className="h-4 w-4 text-primary" />
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {config.description}
                </p>
                <div className="flex flex-wrap gap-1 mt-1.5">
                  {config.bestFor.slice(0, 2).map((use, index) => (
                    <span
                      key={index}
                      className="text-xs bg-muted px-1.5 py-0.5 rounded"
                    >
                      {use}
                    </span>
                  ))}
                </div>
              </div>
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}