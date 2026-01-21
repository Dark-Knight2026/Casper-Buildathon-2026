import { format } from 'date-fns';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, Clock, XCircle } from 'lucide-react';
import type { Signature } from '@/types/signature';

interface SignatureDisplayProps {
  signature: Signature;
  showDetails?: boolean;
  onClick?: () => void;
}

export default function SignatureDisplay({
  signature,
  showDetails = true,
  onClick,
}: SignatureDisplayProps) {
  const getStatusIcon = () => {
    switch (signature.status) {
      case 'signed':
        return <CheckCircle2 className="h-5 w-5 text-green-600" />;
      case 'pending':
        return <Clock className="h-5 w-5 text-yellow-600" />;
      case 'declined':
        return <XCircle className="h-5 w-5 text-red-600" />;
    }
  };

  const getStatusBadge = () => {
    switch (signature.status) {
      case 'signed':
        return <Badge className="bg-green-100 text-green-800">Signed</Badge>;
      case 'pending':
        return <Badge className="bg-yellow-100 text-yellow-800">Pending</Badge>;
      case 'declined':
        return <Badge className="bg-red-100 text-red-800">Declined</Badge>;
    }
  };

  return (
    <Card
      className={onClick ? 'cursor-pointer hover:shadow-md transition-shadow' : ''}
      onClick={onClick}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2">
            {getStatusIcon()}
            <div>
              <p className="font-semibold">{signature.signer_name}</p>
              <p className="text-sm text-gray-600">{signature.signer_email}</p>
            </div>
          </div>
          {getStatusBadge()}
        </div>

        {signature.status === 'signed' && signature.signature_data && (
          <div className="mb-3 border rounded-lg p-2 bg-gray-50">
            <img
              src={signature.signature_data}
              alt={`${signature.signer_name}'s signature`}
              className="max-h-20 mx-auto"
            />
          </div>
        )}

        {showDetails && (
          <div className="space-y-1 text-sm text-gray-600">
            <div className="flex justify-between">
              <span>Role:</span>
              <span className="font-medium capitalize">{signature.signer_role}</span>
            </div>
            {signature.signed_at && (
              <div className="flex justify-between">
                <span>Signed:</span>
                <span className="font-medium">
                  {format(new Date(signature.signed_at), 'MMM dd, yyyy HH:mm')}
                </span>
              </div>
            )}
            {signature.status === 'pending' && (
              <div className="flex justify-between">
                <span>Order:</span>
                <span className="font-medium">#{signature.order_index + 1}</span>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}