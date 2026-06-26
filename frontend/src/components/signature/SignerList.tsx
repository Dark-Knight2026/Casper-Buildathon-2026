import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import SignatureDisplay from './SignatureDisplay';
import type { Signature } from '@/types/signature';

interface SignerListProps {
  signatures: Signature[];
  workflowType: 'sequential' | 'parallel';
}

export default function SignerList({ signatures, workflowType }: SignerListProps) {
  const sortedSignatures = [...signatures].sort((a, b) => a.order_index - b.order_index);

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          Signers {workflowType === 'sequential' && '(In Order)'}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {sortedSignatures.map((signature, index) => (
          <div key={signature.id} className="relative">
            {workflowType === 'sequential' && (
              <div className="absolute -left-8 top-4 w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center text-sm font-semibold">
                {index + 1}
              </div>
            )}
            <SignatureDisplay signature={signature} showDetails />
          </div>
        ))}
      </CardContent>
    </Card>
  );
}