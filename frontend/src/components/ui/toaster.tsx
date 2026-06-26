import {
  Toast,
  ToastClose,
  ToastDescription,
  ToastProvider,
  ToastTitle,
  ToastViewport,
} from '@/components/ui/toast';
import { useToast } from '@/hooks/use-toast';
import { CheckCircle2 } from 'lucide-react';

export function Toaster() {
  const { toasts } = useToast();

  return (
    <ToastProvider>
      {toasts.map(function ({ id, title, description, action, variant, ...props }) {
        return (
          <Toast key={id} variant={variant === 'success' ? 'default' : variant} {...props}>
            <div className="grid gap-1">
              {title && (
                <div className="flex items-center gap-2">
                  {variant === 'success' && <CheckCircle2 className="h-4 w-4 text-green-600" />}
                  <ToastTitle>{title}</ToastTitle>
                </div>
              )}
              {description && <ToastDescription>{description}</ToastDescription>}
            </div>
            {action}
            <ToastClose />
          </Toast>
        );
      })}
      <ToastViewport />
    </ToastProvider>
  );
}