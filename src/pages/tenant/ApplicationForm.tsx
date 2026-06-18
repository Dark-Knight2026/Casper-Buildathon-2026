import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import {
  submitApplication,
  updateDraftApplication,
  submitDraftApplication,
  getApplication,
} from '@/services/applicationService';
import { ApiClient } from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, CheckCircle } from 'lucide-react';
import { VerificationDisclaimer } from '@/components/property/VerificationDisclaimer';

/** Red required marker. `required` on the input conveys it to screen readers,
 *  so the asterisk is decorative (aria-hidden) to avoid a double announcement. */
function RequiredMark() {
  return (
    <span className="ml-0.5 text-red-600" aria-hidden="true">
      *
    </span>
  );
}

// The full form shape — single source of truth for `formData` state and
// `validateApplication`. Validation only reads the subset in `REQUIRED_FIELDS`,
// but typing the state with this means a renamed/added field surfaces at compile
// time instead of drifting.
interface ApplicationFormValues {
  fullName: string;
  email: string;
  phone: string;
  dateOfBirth: string;
  currentAddress: string;
  currentCity: string;
  currentState: string;
  currentZip: string;
  moveInDate: string;
  employer: string;
  jobTitle: string;
  employmentLength: string;
  monthlyIncome: string;
  reference1Name: string;
  reference1Phone: string;
  reference2Name: string;
  reference2Phone: string;
  pets: boolean;
  petDescription: string;
  additionalInfo: string;
  backgroundCheckConsent: boolean;
}

const REQUIRED_FIELDS: { key: keyof ApplicationFormValues; label: string }[] = [
  { key: 'fullName', label: 'Full name' },
  { key: 'email', label: 'Email' },
  { key: 'phone', label: 'Phone' },
  { key: 'dateOfBirth', label: 'Date of birth' },
  { key: 'currentAddress', label: 'Street address' },
  { key: 'currentCity', label: 'City' },
  { key: 'currentState', label: 'State' },
  { key: 'currentZip', label: 'ZIP code' },
  { key: 'moveInDate', label: 'Desired move-in date' },
  { key: 'employer', label: 'Employer' },
  { key: 'jobTitle', label: 'Job title' },
  { key: 'employmentLength', label: 'Length of employment' },
  { key: 'monthlyIncome', label: 'Monthly income' },
  { key: 'reference1Name', label: 'Reference 1 name' },
  { key: 'reference1Phone', label: 'Reference 1 phone' },
];

/**
 * Client-side validation mirroring the backend, run before we hit the API — so
 * the tenant gets an immediate, specific message instead of a 400 toast (and so
 * "Save as draft", which bypasses native form validation, is also checked).
 * Returns the first problem, or null. Consent is only required for a real submit.
 */
function validateApplication(
  data: ApplicationFormValues,
  requireConsent: boolean
): string | null {
  for (const { key, label } of REQUIRED_FIELDS) {
    if (!String(data[key] ?? '').trim()) return `${label} is required.`;
  }
  if (!/^\S+@\S+\.\S+$/.test(data.email.trim())) {
    return 'Enter a valid email address.';
  }
  const income = Number.parseFloat(data.monthlyIncome);
  if (!Number.isFinite(income) || income <= 0) {
    return 'Monthly income must be a number greater than 0.';
  }
  if (requireConsent && !data.backgroundCheckConsent) {
    return 'You must consent to a background check to submit.';
  }
  return null;
}

export default function ApplicationForm() {
  const navigate = useNavigate();
  const location = useLocation();
  const { profile } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  // Editing an existing draft? Its id arrives via router state or a `draftId`
  // query param (so a deep link / refresh still resolves it). A new application
  // carries a `listingId` instead.
  const draftId =
    location.state?.draftId ||
    new URLSearchParams(location.search).get('draftId') ||
    '';

  const { data: draft } = useQuery({
    queryKey: ['application', draftId],
    queryFn: () => getApplication(draftId),
    enabled: !!draftId,
  });

  // The listing being applied to — for a new application from the detail page
  // (PL-20) or a `listingId` deep-link param; for a draft, the draft's own
  // listing. The backend derives the landlord from the listing.
  const listingId =
    draft?.listingId ||
    location.state?.listingId ||
    new URLSearchParams(location.search).get('listingId') ||
    '';

  const [formData, setFormData] = useState<ApplicationFormValues>({
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

  // Prefill the form once an existing draft loads.
  useEffect(() => {
    if (!draft) return;
    setFormData({
      fullName: draft.fullName,
      email: draft.email,
      phone: draft.phone,
      dateOfBirth: draft.dateOfBirth,
      currentAddress: draft.currentAddress,
      currentCity: draft.currentCity,
      currentState: draft.currentState,
      currentZip: draft.currentZip,
      moveInDate: draft.moveInDate,
      employer: draft.employer,
      jobTitle: draft.jobTitle,
      employmentLength: draft.employmentLength,
      monthlyIncome: String(draft.monthlyIncome),
      reference1Name: draft.reference1Name,
      reference1Phone: draft.reference1Phone,
      reference2Name: draft.reference2Name ?? '',
      reference2Phone: draft.reference2Phone ?? '',
      pets: draft.pets,
      petDescription: draft.petDescription ?? '',
      additionalInfo: draft.additionalInfo ?? '',
      backgroundCheckConsent: draft.backgroundCheckConsent,
    });
  }, [draft]);

  const buildBody = (asDraft: boolean) => ({
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
    asDraft,
  });

  // Persist the form. `asDraft` keeps it editable (status `draft`); otherwise it
  // goes to the landlord (`pending`). Editing an existing draft PATCHes it, then
  // submits separately when finalising. The backend validates every field even
  // for a draft (it's a complete-but-unsent application), so "Save as draft"
  // still needs the form filled — only the consent gate is relaxed.
  const persist = async (asDraft: boolean) => {
    setError('');

    if (!profile) {
      setError('You must be logged in to submit an application');
      return;
    }
    if (!draftId && !listingId) {
      setError(
        'Listing information is missing. Please return to the listing page and try again.'
      );
      return;
    }
    // Validate the fields up front — the backend requires them even for a draft;
    // consent is only enforced on a real submit.
    const validationError = validateApplication(formData, !asDraft);
    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);
    try {
      if (draftId) {
        await updateDraftApplication(draftId, buildBody(true));
        if (!asDraft) await submitDraftApplication(draftId);
      } else {
        await submitApplication(listingId, buildBody(asDraft));
      }

      if (asDraft) {
        toast({ title: 'Draft saved' });
        navigate('/tenant/my-applications');
        return;
      }
      setSuccess(true);
      setTimeout(() => {
        navigate('/tenant/my-applications');
      }, 3000);
    } catch (err) {
      // Surface the backend's actual message (e.g. validation / already-applied
      // / listing-not-active) in a toast rather than a silent inline alert.
      const message = ApiClient.handleError(err);
      setError(message);
      toast({
        title: asDraft
          ? 'Could not save draft'
          : 'Could not submit application',
        description: message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    void persist(false);
  };

  if (success) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <Alert className="bg-green-50 border-green-200">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <AlertDescription className="text-green-800 ml-2">
                <p className="font-semibold mb-2">
                  Application Submitted Successfully!
                </p>
                <p>
                  Your rental application has been submitted. The landlord will
                  review it and contact you soon.
                </p>
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
              Complete this form to apply for the property. All fields are
              required unless marked optional.
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
                    <Label htmlFor="fullName">
                      Full Name
                      <RequiredMark />
                    </Label>
                    <Input
                      id="fullName"
                      value={formData.fullName}
                      onChange={(e) =>
                        setFormData({ ...formData, fullName: e.target.value })
                      }
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">
                      Email
                      <RequiredMark />
                    </Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) =>
                        setFormData({ ...formData, email: e.target.value })
                      }
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone">
                      Phone
                      <RequiredMark />
                    </Label>
                    <Input
                      id="phone"
                      type="tel"
                      value={formData.phone}
                      onChange={(e) =>
                        setFormData({ ...formData, phone: e.target.value })
                      }
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="dateOfBirth">
                      Date of Birth
                      <RequiredMark />
                    </Label>
                    <Input
                      id="dateOfBirth"
                      type="date"
                      value={formData.dateOfBirth}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          dateOfBirth: e.target.value,
                        })
                      }
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
                    <Label htmlFor="currentAddress">
                      Street Address
                      <RequiredMark />
                    </Label>
                    <Input
                      id="currentAddress"
                      value={formData.currentAddress}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          currentAddress: e.target.value,
                        })
                      }
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="currentCity">
                      City
                      <RequiredMark />
                    </Label>
                    <Input
                      id="currentCity"
                      value={formData.currentCity}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          currentCity: e.target.value,
                        })
                      }
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="currentState">
                      State
                      <RequiredMark />
                    </Label>
                    <Input
                      id="currentState"
                      value={formData.currentState}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          currentState: e.target.value,
                        })
                      }
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="currentZip">
                      ZIP Code
                      <RequiredMark />
                    </Label>
                    <Input
                      id="currentZip"
                      value={formData.currentZip}
                      onChange={(e) =>
                        setFormData({ ...formData, currentZip: e.target.value })
                      }
                      required
                    />
                  </div>
                </div>
              </div>

              {/* Employment */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">
                  Employment Information
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="employer">
                      Current Employer
                      <RequiredMark />
                    </Label>
                    <Input
                      id="employer"
                      value={formData.employer}
                      onChange={(e) =>
                        setFormData({ ...formData, employer: e.target.value })
                      }
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="jobTitle">
                      Job Title
                      <RequiredMark />
                    </Label>
                    <Input
                      id="jobTitle"
                      value={formData.jobTitle}
                      onChange={(e) =>
                        setFormData({ ...formData, jobTitle: e.target.value })
                      }
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="employmentLength">
                      Length of Employment
                      <RequiredMark />
                    </Label>
                    <Input
                      id="employmentLength"
                      placeholder="e.g., 2 years"
                      value={formData.employmentLength}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          employmentLength: e.target.value,
                        })
                      }
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="monthlyIncome">
                      Monthly Income
                      <RequiredMark />
                    </Label>
                    <Input
                      id="monthlyIncome"
                      type="number"
                      placeholder="$"
                      value={formData.monthlyIncome}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          monthlyIncome: e.target.value,
                        })
                      }
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="moveInDate">
                      Desired Move-in Date
                      <RequiredMark />
                    </Label>
                    <Input
                      id="moveInDate"
                      type="date"
                      value={formData.moveInDate}
                      onChange={(e) =>
                        setFormData({ ...formData, moveInDate: e.target.value })
                      }
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
                    <Label htmlFor="reference1Name">
                      Reference 1 Name
                      <RequiredMark />
                    </Label>
                    <Input
                      id="reference1Name"
                      value={formData.reference1Name}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          reference1Name: e.target.value,
                        })
                      }
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="reference1Phone">
                      Reference 1 Phone
                      <RequiredMark />
                    </Label>
                    <Input
                      id="reference1Phone"
                      type="tel"
                      value={formData.reference1Phone}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          reference1Phone: e.target.value,
                        })
                      }
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="reference2Name">
                      Reference 2 Name (Optional)
                    </Label>
                    <Input
                      id="reference2Name"
                      value={formData.reference2Name}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          reference2Name: e.target.value,
                        })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="reference2Phone">
                      Reference 2 Phone (Optional)
                    </Label>
                    <Input
                      id="reference2Phone"
                      type="tel"
                      value={formData.reference2Phone}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          reference2Phone: e.target.value,
                        })
                      }
                    />
                  </div>
                </div>
              </div>

              {/* Additional Information */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">
                  Additional Information
                </h3>
                <div className="space-y-4">
                  <div className="flex items-start space-x-2">
                    <Checkbox
                      id="pets"
                      checked={formData.pets}
                      onCheckedChange={(checked) =>
                        setFormData({ ...formData, pets: checked as boolean })
                      }
                    />
                    <Label
                      htmlFor="pets"
                      className="text-sm leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                    >
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
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            petDescription: e.target.value,
                          })
                        }
                      />
                    </div>
                  )}
                  <div className="space-y-2">
                    <Label htmlFor="additionalInfo">
                      Additional Comments (Optional)
                    </Label>
                    <Textarea
                      id="additionalInfo"
                      value={formData.additionalInfo}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          additionalInfo: e.target.value,
                        })
                      }
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
                      setFormData({
                        ...formData,
                        backgroundCheckConsent: checked as boolean,
                      })
                    }
                  />
                  <Label
                    htmlFor="backgroundCheckConsent"
                    className="text-sm leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    I consent to a background and credit check as part of the
                    application process
                    <span className="ml-1 text-muted-foreground">
                      (required to submit)
                    </span>
                  </Label>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate(-1)}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  disabled={loading}
                  onClick={() => void persist(true)}
                  className="flex-1"
                >
                  {loading ? 'Saving…' : 'Save as draft'}
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
