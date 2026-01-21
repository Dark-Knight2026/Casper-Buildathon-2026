import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { ApplicationService } from '@/services/applicationService';
import { ApplicationScoringService } from '@/services/applicationScoringService';
import { BackgroundCheckService } from '@/services/backgroundCheckService';
import type { TenantApplication, ApplicationNote, BackgroundCheck, ApplicationScoreBreakdown } from '@/types/application';
import { 
  ArrowLeft, 
  User, 
  Briefcase, 
  Home, 
  Users, 
  FileText, 
  CheckCircle, 
  XCircle,
  Clock,
  Download,
  MessageSquare
} from 'lucide-react';
import { format } from 'date-fns';

const statusColors: Record<string, string> = {
  draft: 'bg-gray-500',
  pending: 'bg-yellow-500',
  under_review: 'bg-blue-500',
  approved: 'bg-green-500',
  denied: 'bg-red-500',
  conditional: 'bg-orange-500',
};

export default function ApplicationDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const [application, setApplication] = useState<TenantApplication | null>(null);
  const [scoreBreakdown, setScoreBreakdown] = useState<ApplicationScoreBreakdown | null>(null);
  const [backgroundChecks, setBackgroundChecks] = useState<BackgroundCheck[]>([]);
  const [notes, setNotes] = useState<ApplicationNote[]>([]);
  const [newNote, setNewNote] = useState('');
  const [loading, setLoading] = useState(true);

  const loadApplication = useCallback(async () => {
    if (!id) return;
    
    setLoading(true);
    try {
      const data = await ApplicationService.getApplicationById(id);
      setApplication(data);

      // Calculate score if not already calculated
      if (!data.applicationScore) {
        // TODO: Fetch actual property rent from property data
        const propertyRent = 2000;
        const breakdown = await ApplicationScoringService.calculateScore(data, propertyRent);
        setScoreBreakdown(breakdown);
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to load application',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [id, toast]);

  const loadBackgroundChecks = useCallback(async () => {
    if (!id) return;
    
    try {
      const checks = await BackgroundCheckService.getBackgroundChecksByApplication(id);
      setBackgroundChecks(checks);
    } catch (error) {
      console.error('Failed to load background checks:', error);
    }
  }, [id]);

  const loadNotes = useCallback(async () => {
    if (!id) return;
    
    try {
      const data = await ApplicationService.getNotes(id);
      setNotes(data);
    } catch (error) {
      console.error('Failed to load notes:', error);
    }
  }, [id]);

  useEffect(() => {
    if (id) {
      loadApplication();
      loadBackgroundChecks();
      loadNotes();
    }
  }, [id, loadApplication, loadBackgroundChecks, loadNotes]);

  const handleAddNote = async () => {
    if (!id || !newNote.trim() || !user) return;

    try {
      await ApplicationService.addNote(id, user.id, newNote);
      setNewNote('');
      loadNotes();
      toast({
        title: 'Success',
        description: 'Note added successfully',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to add note',
        variant: 'destructive',
      });
    }
  };

  const handleRequestBackgroundCheck = async (checkType: 'credit' | 'criminal' | 'eviction') => {
    if (!id) return;

    try {
      await BackgroundCheckService.requestBackgroundCheck({
        applicationId: id,
        checkType,
      });
      toast({
        title: 'Success',
        description: `${checkType} check requested`,
      });
      loadBackgroundChecks();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to request background check',
        variant: 'destructive',
      });
    }
  };

  const handleApprove = () => {
    navigate(`/landlord/applications/${id}/decision?action=approve`);
  };

  const handleDeny = () => {
    navigate(`/landlord/applications/${id}/decision?action=deny`);
  };

  const handleRequestInfo = () => {
    navigate(`/landlord/applications/${id}/decision?action=request_info`);
  };

  if (!user) {
    return (
      <div className="container mx-auto py-8">
        <p className="text-center text-gray-500">Please log in to view applications</p>
      </div>
    );
  }

  if (loading || !application) {
    return (
      <div className="container mx-auto py-8">
        <p className="text-center text-gray-500">Loading application...</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8">
      <Button variant="ghost" onClick={() => navigate('/landlord/applications')} className="mb-4">
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to Applications
      </Button>

      {/* Header */}
      <div className="flex justify-between items-start mb-6">
        <div>
          <h1 className="text-3xl font-bold mb-2">
            {application.personalInfo.firstName} {application.personalInfo.lastName}
          </h1>
          <p className="text-gray-600">{application.personalInfo.email}</p>
          <p className="text-gray-600">{application.personalInfo.phone}</p>
        </div>
        <div className="text-right">
          <Badge className={statusColors[application.applicationStatus]}>
            {application.applicationStatus.replace('_', ' ').toUpperCase()}
          </Badge>
          {application.submittedAt && (
            <p className="text-sm text-gray-500 mt-2">
              Submitted: {format(new Date(application.submittedAt), 'MMM d, yyyy')}
            </p>
          )}
        </div>
      </div>

      {/* Score Card */}
      {scoreBreakdown && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Application Score</CardTitle>
            <CardDescription>Automated scoring based on application data</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-8">
              <div className="text-center">
                <div className="text-5xl font-bold text-primary mb-2">
                  {scoreBreakdown.totalScore}
                </div>
                <p className="text-sm text-gray-500">out of {scoreBreakdown.maxTotalScore}</p>
                <Badge className="mt-2">
                  {scoreBreakdown.rating.toUpperCase()}
                </Badge>
              </div>
              <div className="flex-1 space-y-3">
                <ScoreItem
                  label="Income Verification"
                  score={scoreBreakdown.incomeVerification.score}
                  maxScore={scoreBreakdown.incomeVerification.maxScore}
                  details={scoreBreakdown.incomeVerification.details}
                />
                <ScoreItem
                  label="Credit Score"
                  score={scoreBreakdown.creditScore.score}
                  maxScore={scoreBreakdown.creditScore.maxScore}
                  details={scoreBreakdown.creditScore.details}
                />
                <ScoreItem
                  label="Rental History"
                  score={scoreBreakdown.rentalHistory.score}
                  maxScore={scoreBreakdown.rentalHistory.maxScore}
                  details={scoreBreakdown.rentalHistory.details}
                />
                <ScoreItem
                  label="Employment Stability"
                  score={scoreBreakdown.employmentStability.score}
                  maxScore={scoreBreakdown.employmentStability.maxScore}
                  details={scoreBreakdown.employmentStability.details}
                />
                <ScoreItem
                  label="Background Check"
                  score={scoreBreakdown.backgroundCheck.score}
                  maxScore={scoreBreakdown.backgroundCheck.maxScore}
                  details={scoreBreakdown.backgroundCheck.details}
                />
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Action Buttons */}
      {application.applicationStatus === 'pending' || application.applicationStatus === 'under_review' ? (
        <div className="flex gap-4 mb-6">
          <Button onClick={handleApprove} className="flex-1">
            <CheckCircle className="mr-2 h-4 w-4" />
            Approve Application
          </Button>
          <Button onClick={handleDeny} variant="destructive" className="flex-1">
            <XCircle className="mr-2 h-4 w-4" />
            Deny Application
          </Button>
          <Button onClick={handleRequestInfo} variant="outline" className="flex-1">
            <MessageSquare className="mr-2 h-4 w-4" />
            Request More Info
          </Button>
        </div>
      ) : null}

      {/* Tabs */}
      <Tabs defaultValue="personal" className="space-y-6">
        <TabsList>
          <TabsTrigger value="personal">
            <User className="mr-2 h-4 w-4" />
            Personal Info
          </TabsTrigger>
          <TabsTrigger value="employment">
            <Briefcase className="mr-2 h-4 w-4" />
            Employment
          </TabsTrigger>
          <TabsTrigger value="rental">
            <Home className="mr-2 h-4 w-4" />
            Rental History
          </TabsTrigger>
          <TabsTrigger value="references">
            <Users className="mr-2 h-4 w-4" />
            References
          </TabsTrigger>
          <TabsTrigger value="documents">
            <FileText className="mr-2 h-4 w-4" />
            Documents
          </TabsTrigger>
          <TabsTrigger value="background">
            <CheckCircle className="mr-2 h-4 w-4" />
            Background Checks
          </TabsTrigger>
          <TabsTrigger value="notes">
            <MessageSquare className="mr-2 h-4 w-4" />
            Notes ({notes.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="personal">
          <PersonalInfoTab application={application} />
        </TabsContent>

        <TabsContent value="employment">
          <EmploymentTab application={application} />
        </TabsContent>

        <TabsContent value="rental">
          <RentalHistoryTab application={application} />
        </TabsContent>

        <TabsContent value="references">
          <ReferencesTab application={application} />
        </TabsContent>

        <TabsContent value="documents">
          <DocumentsTab application={application} />
        </TabsContent>

        <TabsContent value="background">
          <BackgroundChecksTab
            checks={backgroundChecks}
            onRequestCheck={handleRequestBackgroundCheck}
          />
        </TabsContent>

        <TabsContent value="notes">
          <NotesTab
            notes={notes}
            newNote={newNote}
            onNoteChange={setNewNote}
            onAddNote={handleAddNote}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function ScoreItem({ label, score, maxScore, details }: { label: string; score: number; maxScore: number; details: string }) {
  const percentage = (score / maxScore) * 100;
  
  return (
    <div>
      <div className="flex justify-between mb-1">
        <span className="text-sm font-medium">{label}</span>
        <span className="text-sm text-gray-600">
          {score}/{maxScore}
        </span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-2 mb-1">
        <div
          className="bg-primary h-2 rounded-full transition-all"
          style={{ width: `${percentage}%` }}
        />
      </div>
      <p className="text-xs text-gray-500">{details}</p>
    </div>
  );
}

function PersonalInfoTab({ application }: { application: TenantApplication }) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="grid grid-cols-2 gap-6">
          <InfoItem label="Full Name" value={`${application.personalInfo.firstName} ${application.personalInfo.lastName}`} />
          <InfoItem label="Date of Birth" value={application.personalInfo.dateOfBirth} />
          <InfoItem label="Phone" value={application.personalInfo.phone} />
          <InfoItem label="Email" value={application.personalInfo.email} />
          <InfoItem
            label="Current Address"
            value={`${application.personalInfo.currentAddress.street}, ${application.personalInfo.currentAddress.city}, ${application.personalInfo.currentAddress.state} ${application.personalInfo.currentAddress.zipCode}`}
          />
          <InfoItem label="Desired Move-in Date" value={application.personalInfo.desiredMoveInDate} />
          <InfoItem label="Number of Occupants" value={application.personalInfo.numberOfOccupants.toString()} />
          <InfoItem label="Pets" value={application.personalInfo.pets && application.personalInfo.pets.length > 0 ? 'Yes' : 'No'} />
        </div>
      </CardContent>
    </Card>
  );
}

function EmploymentTab({ application }: { application: TenantApplication }) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="grid grid-cols-2 gap-6">
          <InfoItem label="Employer" value={application.employmentInfo.currentEmployer.name} />
          <InfoItem label="Position" value={application.employmentInfo.currentEmployer.position} />
          <InfoItem label="Start Date" value={application.employmentInfo.currentEmployer.startDate} />
          <InfoItem
            label="Monthly Income"
            value={`$${application.employmentInfo.currentEmployer.monthlyIncome.toLocaleString()}`}
          />
          <InfoItem label="Supervisor Name" value={application.employmentInfo.currentEmployer.supervisorName} />
          <InfoItem label="Supervisor Phone" value={application.employmentInfo.currentEmployer.supervisorPhone} />
          <InfoItem label="Employer Address" value={application.employmentInfo.currentEmployer.address} />
        </div>
      </CardContent>
    </Card>
  );
}

function RentalHistoryTab({ application }: { application: TenantApplication }) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="grid grid-cols-2 gap-6">
          <InfoItem label="Current Landlord" value={application.rentalHistory.currentLandlord.name} />
          <InfoItem label="Landlord Phone" value={application.rentalHistory.currentLandlord.phone} />
          <InfoItem label="Rental Address" value={application.rentalHistory.currentLandlord.address} />
          <InfoItem
            label="Monthly Rent"
            value={`$${application.rentalHistory.currentLandlord.monthlyRent.toLocaleString()}`}
          />
          <InfoItem label="Lease Start" value={application.rentalHistory.currentLandlord.leaseStartDate} />
          <InfoItem label="Lease End" value={application.rentalHistory.currentLandlord.leaseEndDate} />
          <div className="col-span-2">
            <InfoItem label="Reason for Moving" value={application.rentalHistory.currentLandlord.reasonForMoving} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function ReferencesTab({ application }: { application: TenantApplication }) {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Personal References</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {application.references.personal.map((ref, index) => (
              <div key={index} className="border-b pb-4 last:border-b-0">
                <h4 className="font-semibold mb-2">Reference {index + 1}</h4>
                <div className="grid grid-cols-3 gap-4">
                  <InfoItem label="Name" value={ref.name} />
                  <InfoItem label="Relationship" value={ref.relationship} />
                  <InfoItem label="Phone" value={ref.phone} />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Emergency Contact</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4">
            <InfoItem label="Name" value={application.references.emergency.name} />
            <InfoItem label="Relationship" value={application.references.emergency.relationship} />
            <InfoItem label="Phone" value={application.references.emergency.phone} />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function DocumentsTab({ application }: { application: TenantApplication }) {
  return (
    <Card>
      <CardContent className="pt-6">
        {application.documents.length === 0 ? (
          <p className="text-center text-gray-500 py-8">No documents uploaded</p>
        ) : (
          <div className="space-y-3">
            {application.documents.map((doc) => (
              <div key={doc.id} className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <p className="font-medium">{doc.name}</p>
                  <p className="text-sm text-gray-500">
                    {doc.type.replace('_', ' ').toUpperCase()} • Uploaded {format(new Date(doc.uploadedAt), 'MMM d, yyyy')}
                  </p>
                </div>
                <Button variant="outline" size="sm" asChild>
                  <a href={doc.url} target="_blank" rel="noopener noreferrer">
                    <Download className="h-4 w-4 mr-2" />
                    Download
                  </a>
                </Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function BackgroundChecksTab({
  checks,
  onRequestCheck,
}: {
  checks: BackgroundCheck[];
  onRequestCheck: (type: 'credit' | 'criminal' | 'eviction') => void;
}) {
  const getCheckStatus = (type: string) => {
    return checks.find((c) => c.checkType === type);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Request Background Checks</CardTitle>
          <CardDescription>Order background checks for this applicant</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4">
            <CheckRequestCard
              title="Credit Report"
              cost={30}
              check={getCheckStatus('credit')}
              onRequest={() => onRequestCheck('credit')}
            />
            <CheckRequestCard
              title="Criminal Background"
              cost={25}
              check={getCheckStatus('criminal')}
              onRequest={() => onRequestCheck('criminal')}
            />
            <CheckRequestCard
              title="Eviction History"
              cost={20}
              check={getCheckStatus('eviction')}
              onRequest={() => onRequestCheck('eviction')}
            />
          </div>
        </CardContent>
      </Card>

      {checks.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Background Check Results</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {checks.map((check) => (
                <div key={check.id} className="border rounded-lg p-4">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h4 className="font-semibold capitalize">{check.checkType} Check</h4>
                      <p className="text-sm text-gray-500">
                        Requested: {format(new Date(check.requestDate), 'MMM d, yyyy')}
                      </p>
                    </div>
                    <Badge
                      className={
                        check.status === 'completed'
                          ? 'bg-green-500'
                          : check.status === 'failed'
                          ? 'bg-red-500'
                          : 'bg-yellow-500'
                      }
                    >
                      {check.status}
                    </Badge>
                  </div>
                  {check.results && (
                    <div className="space-y-2">
                      <p className="text-sm">
                        <span className="font-medium">Result:</span> {check.results.details}
                      </p>
                      {check.results.findings && check.results.findings.length > 0 && (
                        <div>
                          <p className="text-sm font-medium mb-1">Findings:</p>
                          <ul className="list-disc list-inside text-sm text-gray-600">
                            {check.results.findings.map((finding, index) => (
                              <li key={index}>{finding}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function CheckRequestCard({
  title,
  cost,
  check,
  onRequest,
}: {
  title: string;
  cost: number;
  check?: BackgroundCheck;
  onRequest: () => void;
}) {
  return (
    <Card>
      <CardContent className="pt-6">
        <h4 className="font-semibold mb-2">{title}</h4>
        <p className="text-2xl font-bold mb-4">${cost}</p>
        {check ? (
          <Badge className={check.status === 'completed' ? 'bg-green-500' : 'bg-yellow-500'}>
            {check.status}
          </Badge>
        ) : (
          <Button onClick={onRequest} className="w-full">
            Request Check
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

function NotesTab({
  notes,
  newNote,
  onNoteChange,
  onAddNote,
}: {
  notes: ApplicationNote[];
  newNote: string;
  onNoteChange: (value: string) => void;
  onAddNote: () => void;
}) {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Add Note</CardTitle>
          <CardDescription>Internal notes are only visible to landlords</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Textarea
              placeholder="Add a note about this application..."
              value={newNote}
              onChange={(e) => onNoteChange(e.target.value)}
              rows={4}
            />
            <Button onClick={onAddNote} disabled={!newNote.trim()}>
              Add Note
            </Button>
          </div>
        </CardContent>
      </Card>

      {notes.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Previous Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {notes.map((note) => (
                <div key={note.id} className="border-b pb-4 last:border-b-0">
                  <div className="flex justify-between items-start mb-2">
                    <p className="font-medium">{note.userName}</p>
                    <p className="text-sm text-gray-500">
                      {format(new Date(note.createdAt), 'MMM d, yyyy h:mm a')}
                    </p>
                  </div>
                  <p className="text-gray-700">{note.note}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function InfoItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-sm text-gray-500 mb-1">{label}</p>
      <p className="font-medium">{value}</p>
    </div>
  );
}