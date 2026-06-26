/**
 * Enhanced Form Field Component
 * Provides validation, error display, and character counting
 */

import * as React from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { AlertCircle } from 'lucide-react';

export interface FormFieldProps {
  label: string;
  name: string;
  type?: 'text' | 'email' | 'password' | 'number' | 'tel' | 'url' | 'date' | 'textarea';
  value: string | number;
  onChange: (value: string | number) => void;
  onBlur?: () => void;
  error?: string;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  maxLength?: number;
  showCharCount?: boolean;
  helpText?: string;
  className?: string;
  inputClassName?: string;
}

export function FormField({
  label,
  name,
  type = 'text',
  value,
  onChange,
  onBlur,
  error,
  placeholder,
  required = false,
  disabled = false,
  maxLength,
  showCharCount = false,
  helpText,
  className,
  inputClassName,
}: FormFieldProps) {
  const [isFocused, setIsFocused] = React.useState(false);
  const hasError = !!error;
  const stringValue = String(value || '');
  const charCount = stringValue.length;
  const remainingChars = maxLength ? maxLength - charCount : 0;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    
    // Enforce max length
    if (maxLength && newValue.length > maxLength) {
      return;
    }

    // Convert to number for number inputs
    if (type === 'number') {
      const numValue = parseFloat(newValue);
      onChange(isNaN(numValue) ? '' : numValue);
    } else {
      onChange(newValue);
    }
  };

  const handleFocus = () => {
    setIsFocused(true);
  };

  const handleBlur = () => {
    setIsFocused(false);
    if (onBlur) {
      onBlur();
    }
  };

  const inputId = `field-${name}`;
  const errorId = `${inputId}-error`;
  const helpTextId = `${inputId}-help`;

  return (
    <div className={cn('space-y-2', className)}>
      <Label htmlFor={inputId} className={cn('text-sm font-medium', hasError && 'text-destructive')}>
        {label}
        {required && <span className="text-destructive ml-1" aria-label="required">*</span>}
      </Label>

      {type === 'textarea' ? (
        <Textarea
          id={inputId}
          name={name}
          value={stringValue}
          onChange={handleChange}
          onFocus={handleFocus}
          onBlur={handleBlur}
          placeholder={placeholder}
          disabled={disabled}
          maxLength={maxLength}
          required={required}
          aria-invalid={hasError}
          aria-describedby={cn(
            hasError && errorId,
            helpText && helpTextId
          )}
          className={cn(
            hasError && 'border-destructive focus-visible:ring-destructive',
            isFocused && 'ring-2 ring-ring ring-offset-2',
            inputClassName
          )}
        />
      ) : (
        <Input
          id={inputId}
          name={name}
          type={type}
          value={stringValue}
          onChange={handleChange}
          onFocus={handleFocus}
          onBlur={handleBlur}
          placeholder={placeholder}
          disabled={disabled}
          maxLength={maxLength}
          required={required}
          aria-invalid={hasError}
          aria-describedby={cn(
            hasError && errorId,
            helpText && helpTextId
          )}
          className={cn(
            hasError && 'border-destructive focus-visible:ring-destructive',
            isFocused && 'ring-2 ring-ring ring-offset-2',
            inputClassName
          )}
        />
      )}

      {/* Error Message */}
      {hasError && (
        <div
          id={errorId}
          className="flex items-center gap-2 text-sm text-destructive"
          role="alert"
          aria-live="polite"
        >
          <AlertCircle className="h-4 w-4" aria-hidden="true" />
          <span>{error}</span>
        </div>
      )}

      {/* Help Text and Character Count */}
      <div className="flex items-center justify-between">
        {helpText && (
          <p id={helpTextId} className="text-sm text-muted-foreground">
            {helpText}
          </p>
        )}
        {showCharCount && maxLength && (
          <p
            className={cn(
              'text-sm',
              remainingChars < 20 ? 'text-destructive' : 'text-muted-foreground'
            )}
            aria-live="polite"
          >
            {remainingChars} characters remaining
          </p>
        )}
      </div>
    </div>
  );
}