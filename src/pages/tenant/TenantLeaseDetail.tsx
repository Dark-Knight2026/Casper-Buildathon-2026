/**
 * Tenant Lease Detail Page
 * Detailed view of a specific lease with document management
 */

import { useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import {
  ArrowLeft, FileText, Calendar, DollarSign, Home, Upload,
  CheckCircle2, Clock, Shield, AlertTriangle, History,
  MessageSquare, Download, ExternalLink, User,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { LeaseAgreement } from '@/types/lease';

type DetailLease = LeaseAgreement & {
  propertyAddress: string;
  paymentDueDay: number;
  restrictions?: string[];
  petDeposit?: number;
};

// Fallback mock — used when page is accessed directly (e.g. page refresh)
// TODO: remove when GET /api/v1/leases/:id is ready
const MOCK_FALLBACK: DetailLease = {
  id: 'mock-lease-1',
  propertyId: 'mock-prop-1',
  landlordId: 'mock-landlord-1',
  tenantIds: ['mock-tenant-1'],
  type: 'residential-long-term',
  status: 'active',
  startDate: new Date('2025-01-01'),
  endDate: new Date('2026-01-01'),
  monthlyRent: 1500,
  securityDeposit: 3000,
  petDeposit: 0,
  propertyAddress: '123 Demo Street, New York, NY 10001',
  paymentDueDay: 1,
  restrictions: ['No smoking', 'No pets over 25 lbs', 'Max 2 occupants'],
  utilities: [
    { utilityType: 'water', responsibleParty: 'landlord' },
    { utilityType: 'trash', responsibleParty: 'landlord' },
  ],
  clauses: [],
  addendums: [],
  createdByRole: 'landlord',
  approvalStatus: 'approved',
  approvalHistory: [],
  signatureStatus: 'signed',
  signatureProgress: {
    landlord: { signed: true,  timestamp: new Date('2024-12-15') },
    tenant:   { signed: true,  timestamp: new Date('2024-12-20') },
    agent:    { signed: false, timestamp: null },
  },
  documentLinks: {
    generatedPDF: null,
    signedPDF:    null,
    attachments:  [],
  },
  complianceScore: 95,
  complianceIssues: [],
  stateSpecificRules: [
    'NY RPL § 226-b — 30-day notice required for month-to-month termination',
    'NY Admin. Code § 27-2013 — Landlord responsible for heat & hot water',
  ],
  versionHistory: [
    {
      id: 'v1',
      versionNumber: 1,
      leaseId: 'mock-lease-1',
      content: 'Initial version',
      changes: ['Lease created', 'Terms agreed between parties'],
      createdBy: 'mock-landlord-1',
      createdByName: 'John Smith',
      createdAt: new Date('2024-12-01'),
      isCurrent: true,
    },
  ],
  currentVersion: 1,
  comments: [
    {
      id: 'c1',
      leaseId: 'mock-lease-1',
      userId: 'mock-landlord-1',
      userName: 'John Smith',
      content: 'Lease has been finalized and signed by both parties. Welcome!',
      isResolved: true,
      replies: [],
      createdAt: new Date('2024-12-20'),
      updatedAt: new Date('2024-12-20'),
    },
  ],
  signingWorkflow: {
    id: 'sw1',
    leaseId: 'mock-lease-1',
    workflowType: 'sequential',
    steps: [],
    currentStep: 2,
    status: 'completed',
    createdAt: new Date('2024-12-01'),
  },
  signatures: [
    {
      id: 'sig1',
      leaseId: 'mock-lease-1',
      signerId: 'mock-landlord-1',
      signerName: 'John Smith',
      signerRole: 'Landlord',
      signatureType: 'electronic',
      signatureData: '',
      ipAddress: '',
      userAgent: '',
      timestamp: new Date('2024-12-15'),
      authenticationMethod: 'email',
      authenticationVerified: true,
      status: 'completed',
    },
    {
      id: 'sig2',
      leaseId: 'mock-lease-1',
      signerId: 'mock-tenant-1',
      signerName: 'Jane Doe',
      signerRole: 'Tenant',
      signatureType: 'electronic',
      signatureData: '',
      ipAddress: '',
      userAgent: '',
      timestamp: new Date('2024-12-20'),
      authenticationMethod: 'email',
      authenticationVerified: true,
      status: 'completed',
    },
  ],
  createdAt: new Date('2024-12-01'),
  updatedAt: new Date('2024-12-20'),
  createdBy: 'mock-landlord-1',
  lastModifiedBy: 'mock-tenant-1',
};

const STATUS_COLORS: Record<string, string> = {
  active:     'bg-green-100 text-green-800',
  pending:    'bg-yellow-100 text-yellow-800',
  expired:    'bg-red-100 text-red-800',
  terminated: 'bg-secondary text-secondary-foreground',
  draft:      'bg-blue-100 text-blue-800',
};

const APPROVAL_COLORS: Record<string, string> = {
  approved:          'bg-green-100 text-green-800',
  pending:           'bg-yellow-100 text-yellow-800',
  rejected:          'bg-red-100 text-red-800',
  changes_requested: 'bg-orange-100 text-orange-800',
  not_required:      'bg-secondary text-secondary-foreground',
};

const WORKFLOW_COLORS: Record<string, string> = {
  completed:    'bg-green-100 text-green-800',
  'in-progress': 'bg-blue-100 text-blue-800',
  pending:      'bg-yellow-100 text-yellow-800',
  expired:      'bg-red-100 text-red-800',
  cancelled:    'bg-secondary text-secondary-foreground',
};

const LEASE_TYPE_LABELS: Record<string, string> = {
  'residential-long-term':  'Residential Long-Term',
  'residential-short-term': 'Residential Short-Term',
  'commercial':             'Commercial',
  'student-housing':        'Student Housing',
  'vacation-rental':        'Vacation Rental',
  'month-to-month':         'Month-to-Month',
};

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);

const formatDate = (date: Date) =>
  new Intl.DateTimeFormat('en-US', { year: 'numeric', month: 'long', day: 'numeric' }).format(new Date(date));

const formatDateShort = (date: Date) =>
  new Intl.DateTimeFormat('en-US', { year: 'numeric', month: 'short', day: 'numeric' }).format(new Date(date));

function ComplianceScoreBadge({ score }: { score: number }) {
  const color = score >= 90
    ? 'bg-green-100 text-green-800'
    : score >= 70
    ? 'bg-yellow-100 text-yellow-800'
    : 'bg-red-100 text-red-800';
  return <Badge className={color}>{score} / 100</Badge>;
}

export function TenantLeaseDetail() {
  const { leaseId } = useParams<{ leaseId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const [showUpload, setShowUpload] = useState(false);

  // Use lease passed via navigation state, fallback to mock if accessed directly
  // TODO: replace fallback with GET /api/v1/leases/:id when backend is ready
  const lease: DetailLease = (location.state?.lease as DetailLease) ?? MOCK_FALLBACK;

  const sp = lease.signatureProgress;
  const hasSignatureProgress = sp?.landlord || sp?.tenant;

  return (
    <div className="container mx-auto px-4 py-8">
      <Button variant="ghost" className="mb-6" onClick={() => navigate('/tenant/leases')}>
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to Leases
      </Button>

      {/* Header */}
      <div className="mb-8 flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-1">{lease.propertyAddress}</h1>
          <p className="text-muted-foreground">Lease ID: {(leaseId ?? lease.id).slice(0, 8)}…</p>
        </div>
        <Badge className={STATUS_COLORS[lease.status] ?? STATUS_COLORS.pending}>
          {lease.status.toUpperCase()}
        </Badge>
      </div>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="documents">Documents</TabsTrigger>
          <TabsTrigger value="terms">Terms & Conditions</TabsTrigger>
          <TabsTrigger value="activity">Activity</TabsTrigger>
        </TabsList>

        {/* ── Overview ── */}
        <TabsContent value="overview" className="space-y-6">

          {/* Financial */}
          <Card>
            <CardHeader>
              <CardTitle>Financial Information</CardTitle>
              <CardDescription>Rent and deposit details</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="flex items-start gap-3">
                <DollarSign className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Monthly Rent</p>
                  <p className="text-2xl font-bold text-foreground">{formatCurrency(lease.monthlyRent)}</p>
                  <p className="text-xs text-muted-foreground mt-1">Due on day {lease.paymentDueDay}</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Home className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Security Deposit</p>
                  <p className="text-2xl font-bold text-foreground">{formatCurrency(lease.securityDeposit)}</p>
                  <p className="text-xs text-muted-foreground mt-1">Refundable</p>
                </div>
              </div>

              {lease.petDeposit != null && lease.petDeposit > 0 && (
                <div className="flex items-start gap-3">
                  <Home className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Pet Deposit</p>
                    <p className="text-2xl font-bold text-foreground">{formatCurrency(lease.petDeposit)}</p>
                    <p className="text-xs text-muted-foreground mt-1">Additional deposit</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Lease Period */}
          <Card>
            <CardHeader>
              <CardTitle>Lease Period</CardTitle>
              <CardDescription>Start and end dates</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="flex items-start gap-3">
                <Calendar className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Start Date</p>
                  <p className="text-lg font-semibold text-foreground">{formatDate(lease.startDate)}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Calendar className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm font-medium text-muted-foreground">End Date</p>
                  <p className="text-lg font-semibold text-foreground">{formatDate(lease.endDate)}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {LEASE_TYPE_LABELS[lease.type] ?? lease.type}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Property Details */}
          <Card>
            <CardHeader>
              <CardTitle>Property Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-1">Address</p>
                <p className="text-base text-foreground">{lease.propertyAddress}</p>
              </div>

              {lease.utilities && lease.utilities.length > 0 && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-2">Utilities Included</p>
                  <div className="flex flex-wrap gap-2">
                    {lease.utilities.map((u, i) => (
                      <Badge key={i} variant="secondary" className="capitalize">
                        {u.utilityType}
                        {u.responsibleParty !== 'landlord' && ` (${u.responsibleParty})`}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {lease.restrictions && lease.restrictions.length > 0 && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-2">Restrictions</p>
                  <ul className="list-disc list-inside space-y-1">
                    {lease.restrictions.map((r, i) => (
                      <li key={i} className="text-sm text-muted-foreground">{r}</li>
                    ))}
                  </ul>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Landlord */}
          <Card>
            <CardHeader>
              <CardTitle>Landlord</CardTitle>
              <CardDescription>Contact details</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">ID: {lease.landlordId}</p>
              <p className="text-xs text-muted-foreground mt-2">
                For maintenance or inquiries use the maintenance request system or messages.
              </p>
            </CardContent>
          </Card>

          {/* Signatures & Approval */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-primary" />
                Signatures & Approval
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap gap-4">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Signature Status</p>
                  <Badge className={
                    lease.signatureStatus === 'signed'
                      ? 'bg-green-100 text-green-800'
                      : 'bg-yellow-100 text-yellow-800'
                  }>
                    {lease.signatureStatus === 'signed' ? 'Fully Signed' : 'Pending Signatures'}
                  </Badge>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Approval Status</p>
                  <Badge className={APPROVAL_COLORS[lease.approvalStatus] ?? APPROVAL_COLORS.pending}>
                    {lease.approvalStatus.replace(/_/g, ' ').toUpperCase()}
                  </Badge>
                </div>
                {lease.signingWorkflow?.status && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Workflow</p>
                    <Badge className={WORKFLOW_COLORS[lease.signingWorkflow.status] ?? ''}>
                      {lease.signingWorkflow.status.replace(/-/g, ' ').toUpperCase()}
                    </Badge>
                  </div>
                )}
              </div>

              {hasSignatureProgress && (
                <>
                  <Separator />
                  <div>
                    <p className="text-sm font-medium text-foreground mb-2">Signature Progress</p>
                    <div className="space-y-2">
                      {(['landlord', 'tenant', 'agent'] as const).map(role => {
                        const progress = sp?.[role];
                        if (!progress) return null;
                        return (
                          <div key={role} className="flex items-center justify-between py-1">
                            <div className="flex items-center gap-2">
                              {progress.signed
                                ? <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0" />
                                : <Clock className="h-4 w-4 text-yellow-600 shrink-0" />}
                              <span className="text-sm capitalize text-foreground">{role}</span>
                            </div>
                            <span className="text-xs text-muted-foreground">
                              {progress.signed && progress.timestamp
                                ? `Signed ${formatDateShort(progress.timestamp)}`
                                : 'Pending'}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </>
              )}

              {lease.signatures && lease.signatures.length > 0 && (
                <>
                  <Separator />
                  <div>
                    <p className="text-sm font-medium text-foreground mb-2">Signature Records</p>
                    <div className="space-y-2">
                      {lease.signatures.map(sig => (
                        <div key={sig.id} className="flex items-center justify-between py-1">
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4 text-muted-foreground shrink-0" />
                            <div>
                              <p className="text-sm text-foreground">{sig.signerName}</p>
                              <p className="text-xs text-muted-foreground capitalize">{sig.signerRole}</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <Badge className={sig.status === 'completed' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}>
                              {sig.status}
                            </Badge>
                            <p className="text-xs text-muted-foreground mt-0.5">{formatDateShort(sig.timestamp)}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Compliance */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-primary" />
                Compliance
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-1">Compliance Score</p>
                <ComplianceScoreBadge score={lease.complianceScore} />
              </div>

              {lease.complianceIssues && lease.complianceIssues.length > 0 ? (
                <div className="space-y-2">
                  <p className="text-sm font-medium text-foreground">Issues</p>
                  {lease.complianceIssues.map(issue => (
                    <div key={issue.id} className="flex items-start gap-2 rounded-md border p-3">
                      <AlertTriangle className={`h-4 w-4 shrink-0 mt-0.5 ${
                        issue.severity === 'critical' ? 'text-red-500' :
                        issue.severity === 'warning'  ? 'text-yellow-500' :
                                                        'text-blue-500'
                      }`} />
                      <div>
                        <p className="text-sm font-medium text-foreground">{issue.ruleTitle}</p>
                        <p className="text-xs text-muted-foreground">{issue.description}</p>
                        <p className="text-xs text-primary mt-1">{issue.recommendation}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0" />
                  No compliance issues found
                </div>
              )}

              {lease.stateSpecificRules && lease.stateSpecificRules.length > 0 && (
                <>
                  <Separator />
                  <div>
                    <p className="text-sm font-medium text-foreground mb-2">Applicable State Rules</p>
                    <ul className="space-y-1">
                      {lease.stateSpecificRules.map((rule, i) => (
                        <li key={i} className="text-xs text-muted-foreground flex items-start gap-1.5">
                          <span className="text-primary mt-0.5 shrink-0">•</span>
                          {rule}
                        </li>
                      ))}
                    </ul>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Documents ── */}
        <TabsContent value="documents">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Lease Documents</CardTitle>
                  <CardDescription>View and download lease-related documents</CardDescription>
                </div>
                {/* TODO: wire to POST /api/v1/leases/:id/documents */}
                <Button variant="outline" size="sm" onClick={() => setShowUpload(v => !v)}>
                  <Upload className="mr-2 h-4 w-4" />
                  Upload Document
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {showUpload && (
                <div className="border rounded-lg p-4 bg-muted/40 text-sm text-muted-foreground text-center">
                  Document upload — available after backend integration
                </div>
              )}

              {/* Document links */}
              <div className="space-y-2">
                <p className="text-sm font-medium text-foreground">Lease Files</p>
                <div className="flex items-center justify-between rounded-lg border p-3">
                  <div className="flex items-center gap-3">
                    <FileText className="h-5 w-5 text-muted-foreground shrink-0" />
                    <div>
                      <p className="text-sm font-medium text-foreground">Generated Lease PDF</p>
                      <p className="text-xs text-muted-foreground">Draft document</p>
                    </div>
                  </div>
                  {lease.documentLinks?.generatedPDF ? (
                    <Button variant="outline" size="sm" asChild>
                      <a href={lease.documentLinks.generatedPDF} target="_blank" rel="noopener noreferrer">
                        <Download className="mr-2 h-4 w-4" />
                        Download
                      </a>
                    </Button>
                  ) : (
                    <span className="text-xs text-muted-foreground">Not available</span>
                  )}
                </div>

                <div className="flex items-center justify-between rounded-lg border p-3">
                  <div className="flex items-center gap-3">
                    <FileText className="h-5 w-5 text-muted-foreground shrink-0" />
                    <div>
                      <p className="text-sm font-medium text-foreground">Signed Lease PDF</p>
                      <p className="text-xs text-muted-foreground">Fully executed document</p>
                    </div>
                  </div>
                  {lease.documentLinks?.signedPDF ? (
                    <Button variant="outline" size="sm" asChild>
                      <a href={lease.documentLinks.signedPDF} target="_blank" rel="noopener noreferrer">
                        <Download className="mr-2 h-4 w-4" />
                        Download
                      </a>
                    </Button>
                  ) : (
                    <span className="text-xs text-muted-foreground">Not available</span>
                  )}
                </div>
              </div>

              {/* Attachments */}
              {lease.documentLinks?.attachments && lease.documentLinks.attachments.length > 0 && (
                <>
                  <Separator />
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-foreground">Attachments</p>
                    {lease.documentLinks.attachments.map((att, i) => (
                      <div key={i} className="flex items-center justify-between rounded-lg border p-3">
                        <div className="flex items-center gap-3">
                          <FileText className="h-5 w-5 text-muted-foreground shrink-0" />
                          <div>
                            <p className="text-sm font-medium text-foreground">{att.name}</p>
                            <p className="text-xs text-muted-foreground capitalize">{att.type}</p>
                          </div>
                        </div>
                        <Button variant="outline" size="sm" asChild>
                          <a href={att.url} target="_blank" rel="noopener noreferrer">
                            <ExternalLink className="mr-2 h-4 w-4" />
                            Open
                          </a>
                        </Button>
                      </div>
                    ))}
                  </div>
                </>
              )}

              <p className="text-xs text-center text-muted-foreground pt-2">
                Documents will be available after backend integration
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Terms ── */}
        <TabsContent value="terms">
          <Card>
            <CardHeader>
              <CardTitle>Terms & Conditions</CardTitle>
              <CardDescription>Important lease terms and conditions</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <h3 className="font-semibold text-foreground mb-2">Payment Terms</h3>
                <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                  <li>Monthly rent of {formatCurrency(lease.monthlyRent)} due on day {lease.paymentDueDay}</li>
                  <li>Late fee may apply after 5 days past due date</li>
                  <li>Security deposit of {formatCurrency(lease.securityDeposit)} held for damages</li>
                  {lease.petDeposit != null && lease.petDeposit > 0 && (
                    <li>Pet deposit of {formatCurrency(lease.petDeposit)} for pet-related damages</li>
                  )}
                </ul>
              </div>

              <Separator />

              <div>
                <h3 className="font-semibold text-foreground mb-2">Lease Duration</h3>
                <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                  <li>Lease type: {LEASE_TYPE_LABELS[lease.type] ?? lease.type}</li>
                  <li>Start date: {formatDate(lease.startDate)}</li>
                  <li>End date: {formatDate(lease.endDate)}</li>
                </ul>
              </div>

              {lease.restrictions && lease.restrictions.length > 0 && (
                <>
                  <Separator />
                  <div>
                    <h3 className="font-semibold text-foreground mb-2">Restrictions</h3>
                    <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                      {lease.restrictions.map((r, i) => <li key={i}>{r}</li>)}
                    </ul>
                  </div>
                </>
              )}

              <Separator />

              <div>
                <h3 className="font-semibold text-foreground mb-2">Maintenance & Repairs</h3>
                <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                  <li>Tenant responsible for minor repairs and maintenance</li>
                  <li>Landlord responsible for major repairs and structural issues</li>
                  <li>Submit maintenance requests through the platform</li>
                </ul>
              </div>

              <Separator />

              <div>
                <h3 className="font-semibold text-foreground mb-2">Termination</h3>
                <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                  <li>Written notice required for early termination</li>
                  <li>Security deposit returned within 30 days after move-out</li>
                  <li>Property must be returned in original condition</li>
                </ul>
              </div>

              {lease.clauses && lease.clauses.length > 0 && (
                <>
                  <Separator />
                  <div>
                    <h3 className="font-semibold text-foreground mb-3">Lease Clauses</h3>
                    <div className="space-y-3">
                      {lease.clauses.map(clause => (
                        <div key={clause.id} className="rounded-lg border p-4">
                          <div className="flex items-start justify-between gap-2 mb-1">
                            <p className="text-sm font-medium text-foreground">{clause.title}</p>
                            {clause.isMandatory && (
                              <Badge variant="secondary" className="text-xs shrink-0">Mandatory</Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground">{clause.content}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}

              {lease.addendums && lease.addendums.length > 0 && (
                <>
                  <Separator />
                  <div>
                    <h3 className="font-semibold text-foreground mb-3">Addendums</h3>
                    <div className="space-y-3">
                      {lease.addendums.map(addendum => (
                        <div key={addendum.id} className="rounded-lg border p-4">
                          <div className="flex items-start justify-between gap-2 mb-1">
                            <p className="text-sm font-medium text-foreground">{addendum.title}</p>
                            <Badge variant="secondary" className="text-xs shrink-0 capitalize">
                              {addendum.type.replace(/-/g, ' ')}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">{addendum.content}</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            Effective: {formatDateShort(addendum.effectiveDate)}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Activity ── */}
        <TabsContent value="activity" className="space-y-6">

          {/* Comments */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5 text-primary" />
                Comments
              </CardTitle>
            </CardHeader>
            <CardContent>
              {lease.comments && lease.comments.length > 0 ? (
                <div className="space-y-4">
                  {lease.comments.map(comment => (
                    <div key={comment.id} className="flex items-start gap-3">
                      <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                        <User className="h-4 w-4 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-0.5">
                          <span className="text-sm font-medium text-foreground">{comment.userName}</span>
                          <span className="text-xs text-muted-foreground">{formatDateShort(comment.createdAt)}</span>
                          {comment.isResolved && (
                            <Badge className="bg-green-100 text-green-800 text-xs">Resolved</Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">{comment.content}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-6">No comments yet</p>
              )}
            </CardContent>
          </Card>

          {/* Version History */}
          {lease.versionHistory && lease.versionHistory.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <History className="h-5 w-5 text-primary" />
                  Version History
                </CardTitle>
                <CardDescription>Current version: {lease.currentVersion}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {lease.versionHistory.map(version => (
                    <div key={version.id} className="flex items-start gap-3">
                      <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center shrink-0 text-xs font-bold text-muted-foreground">
                        v{version.versionNumber}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                          <span className="text-sm font-medium text-foreground">Version {version.versionNumber}</span>
                          {version.isCurrent && (
                            <Badge className="bg-blue-100 text-blue-800 text-xs">Current</Badge>
                          )}
                          <span className="text-xs text-muted-foreground">{formatDateShort(version.createdAt)}</span>
                        </div>
                        <p className="text-xs text-muted-foreground mb-1">By {version.createdByName}</p>
                        {version.changes.length > 0 && (
                          <ul className="space-y-0.5">
                            {version.changes.map((change, i) => (
                              <li key={i} className="text-xs text-muted-foreground flex items-center gap-1.5">
                                <span className="text-primary shrink-0">•</span>
                                {change}
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Metadata */}
          <Card>
            <CardHeader>
              <CardTitle>Lease Information</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Created</p>
                  <p className="text-foreground font-medium">{formatDate(lease.createdAt)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Last Updated</p>
                  <p className="text-foreground font-medium">{formatDate(lease.updatedAt)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Created By</p>
                  <p className="text-foreground font-medium">{lease.createdBy}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Last Modified By</p>
                  <p className="text-foreground font-medium">{lease.lastModifiedBy}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Version</p>
                  <p className="text-foreground font-medium">v{lease.currentVersion}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Created By Role</p>
                  <p className="text-foreground font-medium capitalize">{lease.createdByRole}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
