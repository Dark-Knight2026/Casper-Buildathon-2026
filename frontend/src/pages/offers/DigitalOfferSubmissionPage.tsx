import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import DigitalOfferForm from '@/components/offers/DigitalOfferForm';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle, FileText, Home } from 'lucide-react';
import { SubmittedOffer, DraftOffer } from '@/types/digitalOffer';

export default function DigitalOfferSubmissionPage() {
  const navigate = useNavigate();
  const [submittedOffer, setSubmittedOffer] = useState<SubmittedOffer | null>(null);
  const [savedDraft, setSavedDraft] = useState<DraftOffer | null>(null);

  // Mock property data - in real app would come from props or API
  const mockProperty = {
    id: 'prop-123',
    address: '123 Dream Home Lane, Beverly Hills, CA 90210',
    listPrice: 850000
  };

  const handleSubmitOffer = (offerData: SubmittedOffer) => {
    console.log('Submitting offer:', offerData);
    setSubmittedOffer(offerData);
    
    // In real app, would make API call to submit offer
    // For now, just simulate success
    setTimeout(() => {
      alert('Offer submitted successfully!');
      navigate('/enhanced-offers-v3');
    }, 1000);
  };

  const handleSaveDraft = (draftData: DraftOffer) => {
    console.log('Saving draft:', draftData);
    setSavedDraft(draftData);
    alert('Draft saved successfully!');
  };

  if (submittedOffer) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-2xl mx-auto px-4">
          <Card>
            <CardContent className="p-8 text-center">
              <CheckCircle className="h-16 w-16 text-green-600 mx-auto mb-4" />
              <h1 className="text-2xl font-bold text-gray-900 mb-2">Offer Submitted Successfully!</h1>
              <p className="text-gray-600 mb-6">
                Your offer for ${submittedOffer.offerAmount.toLocaleString()} has been submitted to the seller.
              </p>
              <div className="space-y-2 text-sm text-gray-500 mb-6">
                <p>Offer ID: #{Date.now()}</p>
                <p>Submitted: {new Date().toLocaleString()}</p>
                <p>Expires: {new Date(submittedOffer.offerExpiration).toLocaleString()}</p>
              </div>
              <div className="flex space-x-4 justify-center">
                <Button onClick={() => navigate('/enhanced-offers-v3')}>
                  <FileText className="h-4 w-4 mr-2" />
                  View All Offers
                </Button>
                <Button variant="outline" onClick={() => navigate('/listings')}>
                  <Home className="h-4 w-4 mr-2" />
                  Browse More Properties
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Submit Digital Offer</h1>
          <p className="text-gray-600">
            Complete the form below to submit your offer digitally. All fields marked with * are required.
          </p>
        </div>

        {savedDraft && (
          <Alert className="mb-6">
            <CheckCircle className="h-4 w-4" />
            <AlertDescription>
              Draft saved at {new Date(savedDraft.savedAt).toLocaleString()}. You can continue editing or submit when ready.
            </AlertDescription>
          </Alert>
        )}

        <DigitalOfferForm
          propertyId={mockProperty.id}
          listPrice={mockProperty.listPrice}
          propertyAddress={mockProperty.address}
          onSubmitOffer={handleSubmitOffer}
          onSaveDraft={handleSaveDraft}
        />
      </div>
    </div>
  );
}