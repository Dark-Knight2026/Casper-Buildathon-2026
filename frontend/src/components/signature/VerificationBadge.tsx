import { CheckCircle2, ShieldCheck } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { format } from 'date-fns';
import type { Signature } from '@/types/signature';

interface VerificationBadgeProps {
  signature: Signature;
  onClick?: () => void;
}

export default function VerificationBadge({ signature, onClick }: VerificationBadgeProps) {
  if (signature.status !== 'signed') {
    return null;
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge
            variant="outline"
            className="cursor-pointer bg-green-50 text-green-700 border-green-200 hover:bg-green-100"
            onClick={onClick}
          >
            <ShieldCheck className="h-3 w-3 mr-1" />
            Verified
          </Badge>
        </TooltipTrigger>
        <TooltipContent>
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <span className="font-semibold">Signature Verified</span>
            </div>
            <div className="text-sm space-y-1">
              <p>Signer: {signature.signer_name}</p>
              <p>Email: {signature.signer_email}</p>
              {signature.signed_at && (
                <p>Signed: {format(new Date(signature.signed_at), 'MMM dd, yyyy HH:mm')}</p>
              )}
            </div>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}