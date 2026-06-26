import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Maximize2, Minimize2, Square } from 'lucide-react';

interface WidgetSizeSelectorProps {
  currentSize: 'small' | 'medium' | 'large';
  onSizeChange: (size: 'small' | 'medium' | 'large') => void;
  disabled?: boolean;
}

export default function WidgetSizeSelector({ currentSize, onSizeChange, disabled }: WidgetSizeSelectorProps) {
  const sizes: Array<{ value: 'small' | 'medium' | 'large'; label: string; icon: React.ReactNode }> = [
    { value: 'small', label: 'Small', icon: <Minimize2 className="h-4 w-4" /> },
    { value: 'medium', label: 'Medium', icon: <Square className="h-4 w-4" /> },
    { value: 'large', label: 'Large', icon: <Maximize2 className="h-4 w-4" /> }
  ];

  return (
    <div className="flex flex-col gap-2">
      <Label className="text-xs text-gray-600 dark:text-gray-400">Widget Size</Label>
      <div className="flex gap-1">
        {sizes.map((size) => (
          <Button
            key={size.value}
            variant={currentSize === size.value ? 'default' : 'outline'}
            size="sm"
            onClick={() => onSizeChange(size.value)}
            disabled={disabled}
            className="flex-1"
            title={size.label}
          >
            {size.icon}
            <span className="ml-1 hidden sm:inline">{size.label}</span>
          </Button>
        ))}
      </div>
    </div>
  );
}