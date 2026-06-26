/**
 * Landlord renewal negotiation — thin wrapper around the shared
 * `RenewalNegotiationThread` (`/api/v1/renewals/{id}/negotiations`).
 */

import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import RenewalNegotiationThread from '@/components/renewals/RenewalNegotiationThread';

export default function LandlordRenewalNegotiation() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  return (
    <div className="container mx-auto px-4 py-6 space-y-6 max-w-3xl">
      <Button
        variant="ghost"
        onClick={() => navigate(`/landlord/renewals/${id}`)}
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to Renewal
      </Button>
      <div>
        <h1 className="text-3xl font-bold">Negotiation</h1>
        <p className="text-muted-foreground">Discuss terms with your tenant.</p>
      </div>
      {id && <RenewalNegotiationThread renewalId={id} />}
    </div>
  );
}
