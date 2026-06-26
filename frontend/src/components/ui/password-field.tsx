/**
 * Password Field Component with Strength Indicator
 */

import * as React from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Eye, EyeOff, AlertCircle, Check } from 'lucide-react';
import { validatePassword } from '@/lib/validation';

export interface PasswordFieldProps {
  label?: string;
  name: string;
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  error?: string;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  showStrength?: boolean;
  showRequirements?: boolean;
  className?: string;
}

export function PasswordField({
  label = 'Password',
  name,
  value,
  onChange,
  onBlur,
  error,
  placeholder = 'Enter your password',
  required = false,
  disabled = false,
  showStrength = true,
  showRequirements = true,
  className,
}: PasswordFieldProps) {
  const [showPassword, setShowPassword] = React.useState(false);
  const [isFocused, setIsFocused] = React.useState(false);

  const validation = validatePassword(value);
  const hasError = !!error;

  const requirements = [
    { label: 'At least 8 characters', met: value.length >= 8 },
    { label: 'One uppercase letter', met: /[A-Z]/.test(value) },
    { label: 'One lowercase letter', met: /[a-z]/.test(value) },
    { label: 'One number', met: /[0-9]/.test(value) },
    { label: 'One special character', met: /[^A-Za-z0-9]/.test(value) },
  ];

  const strengthColors = {
    weak: 'bg-red-500',
    medium: 'bg-yellow-500',
    strong: 'bg-green-500',
  };

  const strengthLabels = {
    weak: 'Weak',
    medium: 'Medium',
    strong: 'Strong',
  };

  const handleTogglePassword = () => {
    setShowPassword(!showPassword);
  };

  const inputId = `field-${name}`;
  const errorId = `${inputId}-error`;

  return (
    <div className={cn('space-y-2', className)}>
      <Label htmlFor={inputId} className={cn('text-sm font-medium', hasError && 'text-destructive')}>
        {label}
        {required && <span className="text-destructive ml-1" aria-label="required">*</span>}
      </Label>

      <div className="relative">
        <Input
          id={inputId}
          name={name}
          type={showPassword ? 'text' : 'password'}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => setIsFocused(true)}
          onBlur={() => {
            setIsFocused(false);
            if (onBlur) onBlur();
          }}
          placeholder={placeholder}
          disabled={disabled}
          required={required}
          aria-invalid={hasError}
          aria-describedby={hasError ? errorId : undefined}
          className={cn(
            'pr-10',
            hasError && 'border-destructive focus-visible:ring-destructive',
            isFocused && 'ring-2 ring-ring ring-offset-2'
          )}
        />
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
          onClick={handleTogglePassword}
          disabled={disabled}
          aria-label={showPassword ? 'Hide password' : 'Show password'}
        >
          {showPassword ? (
            <EyeOff className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
          ) : (
            <Eye className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
          )}
        </Button>
      </div>

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

      {/* Password Strength Indicator */}
      {showStrength && value.length > 0 && !hasError && (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
              <div
                className={cn(
                  'h-full transition-all duration-300',
                  strengthColors[validation.strength]
                )}
                style={{
                  width: validation.strength === 'weak' ? '33%' : validation.strength === 'medium' ? '66%' : '100%',
                }}
                role="progressbar"
                aria-valuenow={validation.strength === 'weak' ? 33 : validation.strength === 'medium' ? 66 : 100}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label="Password strength"
              />
            </div>
            <span className="text-sm font-medium text-muted-foreground">
              {strengthLabels[validation.strength]}
            </span>
          </div>
        </div>
      )}

      {/* Password Requirements */}
      {showRequirements && value.length > 0 && !hasError && (
        <div className="space-y-1" role="list" aria-label="Password requirements">
          {requirements.map((req, index) => (
            <div
              key={index}
              className="flex items-center gap-2 text-sm"
              role="listitem"
            >
              {req.met ? (
                <Check className="h-4 w-4 text-green-600" aria-hidden="true" />
              ) : (
                <div className="h-4 w-4 rounded-full border-2 border-gray-300" aria-hidden="true" />
              )}
              <span className={cn(req.met ? 'text-green-600' : 'text-muted-foreground')}>
                {req.label}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}