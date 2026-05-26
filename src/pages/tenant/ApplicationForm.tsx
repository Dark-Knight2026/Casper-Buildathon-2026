import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { propertyActionsService } from '@/services/propertyActionsService';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, CheckCircle } from 'lucide-react';
import { VerificationDisclaimer } from '@/components/property/VerificationDisclaimer';

export default function ApplicationForm() {
  const navigate = useNavigate();
  const location = useLocation();
  const { profile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  // Get propertyId and landlordId from location state or query params.
  // landlordId must come from the property record (the listing page passes it
  // via navigate state); a placeholder here corrupts every persisted
  // application, so the submit guard below refuses to fire without it.
  const propertyId = location.state?.propertyId || new URLSearchParams(location.search).get('propertyId') || '';
  const landlordId = location.state?.landlordId || new URLSearchParams(location.search).get('landlordId') || '';

  const [formData, setFormData] = useState({
    // Personal Information
    fullName: '',
    email: profile?.email || '',
    phone: '',
    dateOfBirth: '',
    
    // Current Address
    currentAddress: '',
    currentCity: '',
    currentState: '',
    currentZip: '',
    moveInDate: '',
    
    // Employment
    employer: '',
    jobTitle: '',
    employmentLength: '',
    monthlyIncome: '',
    
    // References
    reference1Name: '',
    reference1Phone: '',
    reference2Name: '',
    reference2Phone: '',
    
    // Additional
    pets: false,
    petDescription: '',
    additionalInfo: '',
    backgroundCheckConsent: false,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!formData.backgroundCheckConsent) {
      setError('You must consent to a background check to proceed');
      return;
    }

    if (!profile) {
      setError('You must be logged in to submit an application');
      return;
    }

    if (!propertyId) {
      setError('Property ID is missing. Please return to the property page and try again.');
      return;
    }

    if (!landlordId) {
      setError('Landlord information is missing. Please return to the property page and try again.');
      return;
    }

    setLoading(true);

    try {
      await propertyActionsService.submitApplication(profile.id, {
        propertyId,
        landlordId,
        fullName: formData.fullName,
        email: formData.email,
        phone: formData.phone,
        dateOfBirth: formData.dateOfBirth,
        currentAddress: formData.currentAddress,
        currentCity: formData.currentCity,
        currentState: formData.currentState,
        currentZip: formData.currentZip,
        moveInDate: formData.moveInDate,
        employer: formData.employer,
        jobTitle: formData.jobTitle,
        employmentLength: formData.employmentLength,
        monthlyIncome: parseFloat(formData.monthlyIncome),
        reference1Name: formData.reference1Name,
        reference1Phone: formData.reference1Phone,
        reference2Name: formData.reference2Name || undefined,
        reference2Phone: formData.reference2Phone || undefined,
        pets: formData.pets,
        petDescription: formData.petDescription || undefined,
        additionalInfo: formData.additionalInfo || undefined,
        backgroundCheckConsent: formData.backgroundCheckConsent,
      });

      setSuccess(true);
      setTimeout(() => {
        navigate('/tenant/dashboard');
      }, 3000);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to submit application. Please try again.';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <Alert className="bg-green-50 border-green-200">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <AlertDescription className="text-green-800 ml-2">
                <p className="font-semibold mb-2">Application Submitted Successfully!</p>
                <p>Your rental application has been submitted. The landlord will review it and contact you soon.</p>
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-3xl mx-auto px-4">
        <Card>
          <CardHeader>
            <CardTitle>Rental Application</CardTitle>
            <CardDescription>
              Complete this form to apply for the property. All fields are required unless marked optional.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Task 10 — Verification Disclaimer (compact, no map link — form doesn't carry coords) */}
              <VerificationDisclaimer compact />

              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              {/* Personal Information */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Personal Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="fullName">Full Name</Label>
                    <Input
                      id="fullName"
                      value={formData.fullName}
                      onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone</Label>
                    <Input
                      id="phone"
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="dateOfBirth">Date of Birth</Label>
                    <Input
                      id="dateOfBirth"
                      type="date"
                      value={formData.dateOfBirth}
                      onChange={(e) => setFormData({ ...formData, dateOfBirth: e.target.value })}
                      required
                    />
                  </div>
                </div>
              </div>

              {/* Current Address */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Current Address</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="currentAddress">Street Address</Label>
                    <Input
                      id="currentAddress"
                      value={formData.currentAddress}
                      onChange={(e) => setFormData({ ...formData, currentAddress: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="currentCity">City</Label>
                    <Input
                      id="currentCity"
                      value={formData.currentCity}
                      onChange={(e) => setFormData({ ...formData, currentCity: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="currentState">State</Label>
                    <Input
                      id="currentState"
                      value={formData.currentState}
                      onChange={(e) => setFormData({ ...formData, currentState: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="currentZip">ZIP Code</Label>
                    <Input
                      id="currentZip"
                      value={formData.currentZip}
                      onChange={(e) => setFormData({ ...formData, currentZip: e.target.value })}
                      required
                    />
                  </div>
                </div>
              </div>

              {/* Employment */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Employment Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="employer">Current Employer</Label>
                    <Input
                      id="employer"
                      value={formData.employer}
                      onChange={(e) => setFormData({ ...formData, employer: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="jobTitle">Job Title</Label>
                    <Input
                      id="jobTitle"
                      value={formData.jobTitle}
                      onChange={(e) => setFormData({ ...formData, jobTitle: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="employmentLength">Length of Employment</Label>
                    <Input
                      id="employmentLength"
                      placeholder="e.g., 2 years"
                      value={formData.employmentLength}
                      onChange={(e) => setFormData({ ...formData, employmentLength: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="monthlyIncome">Monthly Income</Label>
                    <Input
                      id="monthlyIncome"
                      type="number"
                      placeholder="$"
                      value={formData.monthlyIncome}
                      onChange={(e) => setFormData({ ...formData, monthlyIncome: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="moveInDate">Desired Move-in Date</Label>
                    <Input
                      id="moveInDate"
                      type="date"
                      value={formData.moveInDate}
                      onChange={(e) => setFormData({ ...formData, moveInDate: e.target.value })}
                      required
                    />
                  </div>
                </div>
              </div>

              {/* References */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">References</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="reference1Name">Reference 1 Name</Label>
                    <Input
                      id="reference1Name"
                      value={formData.reference1Name}
                      onChange={(e) => setFormData({ ...formData, reference1Name: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="reference1Phone">Reference 1 Phone</Label>
                    <Input
                      id="reference1Phone"
                      type="tel"
                      value={formData.reference1Phone}
                      onChange={(e) => setFormData({ ...formData, reference1Phone: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="reference2Name">Reference 2 Name (Optional)</Label>
                    <Input
                      id="reference2Name"
                      value={formData.reference2Name}
                      onChange={(e) => setFormData({ ...formData, reference2Name: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="reference2Phone">Reference 2 Phone (Optional)</Label>
                    <Input
                      id="reference2Phone"
                      type="tel"
                      value={formData.reference2Phone}
                      onChange={(e) => setFormData({ ...formData, reference2Phone: e.target.value })}
                    />
                  </div>
                </div>
              </div>

              {/* Additional Information */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Additional Information</h3>
                <div className="space-y-4">
                  <div className="flex items-start space-x-2">
                    <Checkbox
                      id="pets"
                      checked={formData.pets}
                      onCheckedChange={(checked) =>
                        setFormData({ ...formData, pets: checked as boolean })
                      }
                    />
                    <Label htmlFor="pets" className="text-sm leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                      I have pets
                    </Label>
                  </div>
                  {formData.pets && (
                    <div className="space-y-2">
                      <Label htmlFor="petDescription">Pet Description</Label>
                      <Input
                        id="petDescription"
                        placeholder="e.g., 1 small dog, 2 cats"
                        value={formData.petDescription}
                        onChange={(e) => setFormData({ ...formData, petDescription: e.target.value })}
                      />
                    </div>
                  )}
                  <div className="space-y-2">
                    <Label htmlFor="additionalInfo">Additional Comments (Optional)</Label>
                    <Textarea
                      id="additionalInfo"
                      value={formData.additionalInfo}
                      onChange={(e) => setFormData({ ...formData, additionalInfo: e.target.value })}
                      rows={4}
                    />
                  </div>
                </div>
              </div>

              {/* Consent */}
              <div className="space-y-4">
                <div className="flex items-start space-x-2">
                  <Checkbox
                    id="backgroundCheckConsent"
                    checked={formData.backgroundCheckConsent}
                    onCheckedChange={(checked) =>
                      setFormData({ ...formData, backgroundCheckConsent: checked as boolean })
                    }
                  />
                  <Label htmlFor="backgroundCheckConsent" className="text-sm leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                    I consent to a background and credit check as part of the application process
                  </Label>
                </div>
              </div>

              <div className="flex gap-4">
                <Button type="button" variant="outline" onClick={() => navigate(-1)} className="flex-1">
                  Cancel
                </Button>
                <Button type="submit" disabled={loading} className="flex-1">
                  {loading ? 'Submitting...' : 'Submit Application'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}