/**
 * Comprehensive Lease Agreement Type Definitions
 * Supports all lease management features including AI suggestions,
 * collaboration, compliance, templates, and e-signatures
 */

// ============================================================================
// Core Lease Types
// ============================================================================

export interface LeaseAgreement {
  id: string;
  propertyId: string;
  landlordId: string;
  tenantIds: string[];
  agentId?: string | null; // NEW: Agent workflow
  templateId?: string;
  
  // Lease Details
  type: LeaseType;
  status: LeaseStatus;
  startDate: Date;
  endDate: Date;
  
  // Financial Terms
  monthlyRent: number;
  securityDeposit: number;
  lateFee?: number;
  petDeposit?: number;
  utilities?: UtilityResponsibility[];
  
  // Document & Content
  documentUrl?: string;
  clauses: LeaseClause[];
  addendums: LeaseAddendum[];
  
  // NEW: Agent workflow fields (Critical Data Gaps)
  createdByRole: 'landlord' | 'agent' | 'system';
  approvalStatus: ApprovalStatus;
  approvalHistory: ApprovalHistoryEntry[];
  
  // NEW: Commission tracking
  agentCommission?: number | null; // Simplified as per requirement
  agentCommissionStructure?: CommissionStructure | null; // Detailed structure
  commissionStatus?: CommissionStatus | null;
  
  // NEW: Signature tracking (Critical Data Gaps)
  signatureStatus: 'pending' | 'signed'; // Simplified status as per requirement
  signatureProgress: SignatureProgress; // Detailed tracking (Renamed from SignatureStatus)
  signatureRequestId?: string | null;
  
  // NEW: Document management
  documentLinks: DocumentLinks;
  
  // Compliance & Quality
  complianceScore: number;
  complianceIssues: ComplianceIssue[];
  stateSpecificRules: string[];
  clientPreferences?: ClientPreferences;
  
  // Collaboration
  collaborationSessionId?: string;
  versionHistory: LeaseVersion[];
  currentVersion: number;
  comments: LeaseComment[];
  
  // Signatures
  signingWorkflow: SigningWorkflow;
  signatures: LeaseSignature[];
  
  // Metadata
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  lastModifiedBy: string;
  deletedAt?: Date;
}

export type LeaseType = 
  | 'residential-long-term'
  | 'residential-short-term'
  | 'commercial'
  | 'student-housing'
  | 'vacation-rental'
  | 'month-to-month';

export type LeaseStatus =
  | 'draft'
  | 'pending_approval' // NEW
  | 'approved' // NEW
  | 'under-review'
  | 'negotiating'
  | 'pending-signatures'
  | 'partially-signed'
  | 'fully-executed'
  | 'active'
  | 'expiring-soon'
  | 'expired'
  | 'terminated'
  | 'renewed';

export type ApprovalStatus = 
  | 'not_required' 
  | 'pending' 
  | 'approved' 
  | 'rejected' 
  | 'changes_requested';

export type CommissionStatus = 
  | 'pending' 
  | 'earned' 
  | 'paid' 
  | 'disputed';

// ============================================================================
// New Agent Workflow Types
// ============================================================================

export interface ApprovalHistoryEntry {
  id: string;
  leaseId: string;
  action: 'submitted' | 'approved' | 'rejected' | 'changes_requested';
  userId: string;
  comments?: string;
  timestamp: Date;
}

export interface CommissionStructure {
  amount: number;
  percentage: number;
  type: 'flat' | 'percentage';
  paymentSchedule: 'upfront' | 'monthly' | 'annual';
}

export interface SignatureProgress {
  landlord: { signed: boolean; timestamp: Date | null };
  tenant: { signed: boolean; timestamp: Date | null };
  agent: { signed: boolean; timestamp: Date | null };
}

export interface DocumentLinks {
  generatedPDF: string | null;
  signedPDF: string | null;
  attachments: Array<{ name: string; url: string; type: string }>;
}

export interface ClientPreferences {
  autoApprove: boolean;
  requireReview: boolean;
  notificationMethod: 'email' | 'sms' | 'both';
}

// ============================================================================
// Lease Clauses
// ============================================================================

export interface LeaseClause {
  id: string;
  title: string;
  content: string;
  category: ClauseCategory;
  order: number;
  
  // Classification
  isMandatory: boolean;
  isStateSpecific: boolean;
  applicableStates?: string[];
  
  // AI & Suggestions
  suggestedByAI: boolean;
  aiConfidence?: number;
  aiReasoning?: string;
  
  // Customization
  isCustom: boolean;
  isEditable: boolean;
  variables?: ClauseVariable[];
  
  // Metadata
  tags: string[];
  source?: string;
  lastUpdated: Date;
}

export type ClauseCategory =
  | 'rent-payment'
  | 'security-deposit'
  | 'maintenance'
  | 'utilities'
  | 'pets'
  | 'occupancy'
  | 'termination'
  | 'renewal'
  | 'insurance'
  | 'liability'
  | 'dispute-resolution'
  | 'disclosures'
  | 'special-conditions'
  | 'other';

export interface ClauseVariable {
  name: string;
  type: 'text' | 'number' | 'date' | 'currency' | 'boolean';
  value: string | number | Date | boolean;
  placeholder?: string;
  required: boolean;
}

export interface ClauseLibrary {
  id: string;
  name: string;
  description: string;
  clauses: LeaseClause[];
  category: string;
  isPublic: boolean;
  createdBy: string;
  usageCount: number;
  rating: number;
}

// ============================================================================
// AI Features
// ============================================================================

export interface AIClauseSuggestion {
  clause: LeaseClause;
  confidence: number;
  reasoning: string;
  priority: 'high' | 'medium' | 'low';
  category: ClauseCategory;
  isRequired: boolean;
  alternativeOptions?: LeaseClause[];
}

export interface LeaseAnalysis {
  summary: string;
  keyTerms: KeyTerm[];
  risks: RiskAssessment[];
  recommendations: string[];
  complianceScore: number;
  readabilityScore: number;
}

export interface KeyTerm {
  term: string;
  value: string;
  importance: 'critical' | 'important' | 'standard';
  location: string; // clause ID or section
}

export interface RiskAssessment {
  type: 'legal' | 'financial' | 'operational';
  severity: 'high' | 'medium' | 'low';
  description: string;
  recommendation: string;
  clauseId?: string;
}

// ============================================================================
// Compliance
// ============================================================================

export interface ComplianceRule {
  id: string;
  state: string;
  ruleType: ComplianceRuleType;
  title: string;
  description: string;
  requirements: string[];
  penalties?: string;
  effectiveDate: Date;
  sourceUrl?: string;
}

export type ComplianceRuleType =
  | 'mandatory-disclosure'
  | 'prohibited-clause'
  | 'deposit-limit'
  | 'notice-period'
  | 'termination-rules'
  | 'maintenance-standards'
  | 'accessibility'
  | 'safety-requirements';

export interface ComplianceIssue {
  id: string;
  severity: 'critical' | 'warning' | 'info';
  ruleId: string;
  ruleTitle: string;
  description: string;
  clauseId?: string;
  recommendation: string;
  autoFixAvailable: boolean;
}

export interface ComplianceReport {
  leaseId: string;
  overallScore: number;
  state: string;
  checkDate: Date;
  issues: ComplianceIssue[];
  passedRules: string[];
  summary: string;
}

// ============================================================================
// Collaboration
// ============================================================================

export interface CollaborationSession {
  id: string;
  leaseId: string;
  participants: Participant[];
  status: 'active' | 'paused' | 'completed';
  startedAt: Date;
  endedAt?: Date;
  changes: CollaborationChange[];
}

export interface Participant {
  userId: string;
  name: string;
  role: 'landlord' | 'tenant' | 'agent' | 'attorney';
  permissions: ParticipantPermissions;
  isOnline: boolean;
  lastSeen: Date;
  cursorPosition?: number;
}

export interface ParticipantPermissions {
  canEdit: boolean;
  canComment: boolean;
  canApprove: boolean;
  canDelete: boolean;
}

export interface CollaborationChange {
  id: string;
  userId: string;
  userName: string;
  timestamp: Date;
  changeType: 'add' | 'edit' | 'delete' | 'comment' | 'approve';
  clauseId?: string;
  oldValue?: string;
  newValue?: string;
  comment?: string;
}

export interface LeaseComment {
  id: string;
  leaseId: string;
  clauseId?: string;
  userId: string;
  userName: string;
  content: string;
  isResolved: boolean;
  replies: LeaseCommentReply[];
  createdAt: Date;
  updatedAt: Date;
}

export interface LeaseCommentReply {
  id: string;
  userId: string;
  userName: string;
  content: string;
  createdAt: Date;
}

export interface LeaseVersion {
  id: string;
  versionNumber: number;
  leaseId: string;
  content: string;
  changes: string[];
  createdBy: string;
  createdByName: string;
  createdAt: Date;
  isCurrent: boolean;
}

// ============================================================================
// Templates
// ============================================================================

export interface LeaseTemplate {
  id: string;
  name: string;
  description: string;
  category: LeaseType;
  
  // Content
  clauses: LeaseClause[];
  defaultTerms: DefaultLeaseTerms;
  
  // Classification
  isPublic: boolean;
  isVerified: boolean;
  applicableStates: string[];
  
  // Metadata
  createdBy: string;
  createdByName: string;
  organizationId?: string;
  
  // Performance
  usageCount: number;
  rating: number;
  reviews: TemplateReview[];
  
  // Compliance
  complianceVerified: boolean;
  lastComplianceCheck: Date;
  
  createdAt: Date;
  updatedAt: Date;
}

export interface DefaultLeaseTerms {
  leaseDuration: number; // months
  rentPaymentDay: number; // day of month
  lateFeeAmount?: number;
  lateFeeGracePeriod?: number;
  securityDepositAmount?: number;
  petDepositAmount?: number;
  noticePeriod?: number; // days
}

export interface TemplateReview {
  id: string;
  userId: string;
  userName: string;
  rating: number;
  comment: string;
  createdAt: Date;
}

export interface TemplateMarketplaceFilter {
  category?: LeaseType;
  state?: string;
  isPublic?: boolean;
  isVerified?: boolean;
  minRating?: number;
  searchTerm?: string;
  sortBy?: 'rating' | 'usage' | 'recent';
}

// ============================================================================
// Signatures & E-Signing
// ============================================================================

export interface SigningWorkflow {
  id: string;
  leaseId: string;
  workflowType: 'sequential' | 'parallel' | 'conditional' | 'hybrid';
  steps: SigningStep[];
  currentStep: number;
  status: 'pending' | 'in-progress' | 'completed' | 'expired' | 'cancelled';
  expiresAt?: Date;
  createdAt: Date;
}

export interface SigningStep {
  id: string;
  order: number;
  signers: SignerInfo[];
  requiresAll: boolean; // true = all must sign, false = any can sign
  condition?: SigningCondition;
  status: 'pending' | 'in-progress' | 'completed' | 'skipped';
  completedAt?: Date;
}

export interface SignerInfo {
  id: string;
  userId?: string;
  name: string;
  email: string;
  role: 'landlord' | 'tenant' | 'agent' | 'guarantor' | 'witness';
  authenticationType: 'none' | 'email' | 'sms' | 'pin' | 'id-verification';
  authenticationData?: string;
  remindersSent: number;
  lastReminderDate?: Date;
}

export interface SigningCondition {
  type: 'if-approved' | 'if-rejected' | 'if-modified';
  targetStepId: string;
  alternativeStepId?: string;
}

export interface LeaseSignature {
  id: string;
  leaseId: string;
  signerId: string;
  signerName: string;
  signerRole: string;
  
  // Signature Data
  signatureType: 'drawn' | 'typed' | 'uploaded' | 'electronic';
  signatureData: string; // base64 or signature ID
  
  // Verification
  ipAddress: string;
  userAgent: string;
  timestamp: Date;
  location?: GeolocationData;
  
  // Authentication
  authenticationMethod: string;
  authenticationVerified: boolean;
  
  // Status
  status: 'pending' | 'completed' | 'declined' | 'expired';
  declineReason?: string;
}

export interface GeolocationData {
  latitude: number;
  longitude: number;
  accuracy: number;
}

// ============================================================================
// Addendums
// ============================================================================

export interface LeaseAddendum {
  id: string;
  parentLeaseId: string;
  type: AddendumType;
  title: string;
  content: string;
  
  // Relationship
  effectiveDate: Date;
  expiresAt?: Date;
  supersedes?: string[]; // IDs of previous addendums
  
  // Changes
  modifications: LeaseModification[];
  
  // Signatures
  requiresSignature: boolean;
  signingWorkflow?: SigningWorkflow;
  signatures: LeaseSignature[];
  
  // Status
  status: 'draft' | 'pending-approval' | 'active' | 'superseded' | 'expired';
  
  createdAt: Date;
  createdBy: string;
}

export type AddendumType =
  | 'rent-increase'
  | 'pet-addendum'
  | 'parking-addendum'
  | 'additional-occupant'
  | 'maintenance-responsibility'
  | 'lease-extension'
  | 'early-termination'
  | 'other';

export interface LeaseModification {
  id: string;
  clauseId?: string;
  modificationType: 'add' | 'modify' | 'remove';
  oldValue?: string;
  newValue?: string;
  description: string;
}

// ============================================================================
// Utilities & Helpers
// ============================================================================

export interface UtilityResponsibility {
  utilityType: 'electricity' | 'gas' | 'water' | 'internet' | 'trash' | 'other';
  responsibleParty: 'landlord' | 'tenant' | 'shared';
  estimatedCost?: number;
  notes?: string;
}

export interface LeaseStatistics {
  totalLeases: number;
  activeLeases: number;
  expiringLeases: number;
  averageRent: number;
  averageComplianceScore: number;
  renewalRate: number;
  averageTimeToSign: number; // days
}

export interface LeaseFilter {
  status?: LeaseStatus[];
  type?: LeaseType[];
  landlordId?: string;
  tenantId?: string;
  agentId?: string;
  propertyId?: string;
  startDateRange?: { start: Date; end: Date };
  endDateRange?: { start: Date; end: Date };
  minRent?: number;
  maxRent?: number;
  complianceScoreMin?: number;
  searchTerm?: string;
}

// ============================================================================
// Notifications & Events
// ============================================================================

export interface LeaseNotification {
  id: string;
  leaseId: string;
  type: LeaseNotificationType;
  recipientIds: string[];
  title: string;
  message: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  actionRequired: boolean;
  actionUrl?: string;
  createdAt: Date;
  readBy: string[];
}

export type LeaseNotificationType =
  | 'signature-required'
  | 'signature-completed'
  | 'lease-expiring'
  | 'renewal-available'
  | 'compliance-issue'
  | 'comment-added'
  | 'change-proposed'
  | 'approval-required'
  | 'document-updated';

// ============================================================================
// Form Data Types
// ============================================================================

export interface LeaseFormData {
  propertyId: string;
  landlordId: string;
  tenantIds: string[];
  agentId?: string;
  templateId?: string;
  type: LeaseType;
  startDate: Date;
  endDate: Date;
  monthlyRent: number;
  securityDeposit: number;
  clauses?: LeaseClause[];
  customTerms?: string;
  
  // NEW: Agent fields
  agentCommission?: number; // Simplified
  agentCommissionStructure?: CommissionStructure;
  clientPreferences?: ClientPreferences;
  
  // Extended fields for wizard
  propertyAddress?: string;
  state?: string;
  units?: string;
  landlordName?: string;
  landlordEmail?: string;
  landlordPhone?: string;
  autoRenewal?: boolean;
  renewalNoticePeriod?: number;
  noticePeriod?: number;
  earlyTerminationFee?: number;
  rentDueDay?: string;
  lateFeeAmount?: number;
  lateFeeGracePeriod?: string;
  petDeposit?: number;
  paymentMethods?: string[];
}

export interface AddendumFormData {
  parentLeaseId: string;
  type: AddendumType;
  title: string;
  content: string;
  effectiveDate: Date;
  modifications: LeaseModification[];
  requiresSignature: boolean;
}

// ============================================================================
// NEW: Missing Types - Payment, Maintenance, Screening, Renewal, Termination, Audit
// ============================================================================

/**
 * Lease Payment Schedule
 * Tracks recurring and one-time payments associated with a lease
 */
export interface LeasePaymentSchedule {
  id: string;
  leaseId: string;
  tenantId: string;
  
  // Payment Details
  paymentType: 'rent' | 'security-deposit' | 'pet-deposit' | 'late-fee' | 'utility' | 'other';
  amount: number;
  currency: string;
  
  // Schedule
  frequency: 'one-time' | 'monthly' | 'quarterly' | 'annually';
  dueDate: Date;
  nextDueDate?: Date;
  
  // Status
  status: 'scheduled' | 'pending' | 'paid' | 'overdue' | 'cancelled';
  paidDate?: Date;
  paidAmount?: number;
  
  // Payment Method
  paymentMethod?: 'bank-transfer' | 'credit-card' | 'debit-card' | 'check' | 'cash' | 'other';
  transactionId?: string;
  
  // Late Fee Tracking
  lateFeeApplied: boolean;
  lateFeeAmount?: number;
  gracePeriodDays?: number;
  
  // Metadata
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
}

/**
 * Lease Maintenance Request
 * Tracks maintenance and repair requests related to a leased property
 */
export interface LeaseMaintenanceRequest {
  id: string;
  leaseId: string;
  propertyId: string;
  requestedBy: string; // userId
  requestedByRole: 'tenant' | 'landlord' | 'agent';
  
  // Request Details
  title: string;
  description: string;
  category: 'plumbing' | 'electrical' | 'hvac' | 'appliance' | 'structural' | 'pest-control' | 'other';
  priority: 'low' | 'medium' | 'high' | 'emergency';
  
  // Status & Assignment
  status: 'submitted' | 'acknowledged' | 'in-progress' | 'completed' | 'cancelled';
  assignedTo?: string; // contractor/maintenance staff userId
  
  // Scheduling
  requestedDate: Date;
  scheduledDate?: Date;
  completedDate?: Date;
  
  // Cost
  estimatedCost?: number;
  actualCost?: number;
  responsibleParty: 'landlord' | 'tenant';
  
  // Documentation
  photos: string[]; // URLs to uploaded photos
  documents: string[]; // URLs to related documents
  
  // Communication
  comments: MaintenanceComment[];
  
  // Metadata
  createdAt: Date;
  updatedAt: Date;
}

export interface MaintenanceComment {
  id: string;
  userId: string;
  userName: string;
  userRole: 'tenant' | 'landlord' | 'agent' | 'contractor';
  content: string;
  createdAt: Date;
}

/**
 * Lease Tenant Screening
 * Stores tenant screening and background check information
 */
export interface LeaseTenantScreening {
  id: string;
  leaseId?: string; // May be null if screening happens before lease creation
  applicantId: string;
  
  // Personal Information
  applicantName: string;
  applicantEmail: string;
  applicantPhone: string;
  dateOfBirth: Date;
  ssn?: string; // Encrypted/hashed
  
  // Screening Status
  status: 'pending' | 'in-progress' | 'completed' | 'approved' | 'rejected';
  overallScore?: number; // 0-100
  
  // Credit Check
  creditCheck: {
    requested: boolean;
    completed: boolean;
    score?: number;
    reportUrl?: string;
    issues?: string[];
  };
  
  // Background Check
  backgroundCheck: {
    requested: boolean;
    completed: boolean;
    criminalRecord: boolean;
    evictionHistory: boolean;
    reportUrl?: string;
    notes?: string;
  };
  
  // Employment Verification
  employmentVerification: {
    requested: boolean;
    completed: boolean;
    employer?: string;
    position?: string;
    annualIncome?: number;
    verified: boolean;
    notes?: string;
  };
  
  // Rental History
  rentalHistory: {
    requested: boolean;
    completed: boolean;
    previousLandlords: PreviousLandlord[];
    notes?: string;
  };
  
  // References
  references: Reference[];
  
  // Decision
  decision?: 'approved' | 'rejected' | 'conditional';
  decisionReason?: string;
  decisionDate?: Date;
  decisionBy?: string;
  
  // Metadata
  screeningProvider?: string;
  consentGiven: boolean;
  consentDate?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface PreviousLandlord {
  name: string;
  phone: string;
  email?: string;
  address: string;
  rentAmount: number;
  tenancyStart: Date;
  tenancyEnd: Date;
  verified: boolean;
  feedback?: string;
}

export interface Reference {
  name: string;
  relationship: string;
  phone: string;
  email?: string;
  verified: boolean;
  notes?: string;
}

/**
 * Lease Renewal Offer
 * Manages lease renewal proposals and negotiations
 */
export interface LeaseRenewalOffer {
  id: string;
  originalLeaseId: string;
  landlordId: string;
  tenantIds: string[];
  
  // Offer Details
  offerStatus: 'draft' | 'sent' | 'under-review' | 'accepted' | 'rejected' | 'countered' | 'expired';
  
  // Proposed Terms
  proposedStartDate: Date;
  proposedEndDate: Date;
  proposedRent: number;
  rentIncreasePercentage?: number;
  rentIncreaseReason?: string;
  
  // Changes from Original
  changedTerms: RenewalTermChange[];
  newClauses?: LeaseClause[];
  removedClauses?: string[]; // clause IDs
  
  // Negotiation
  counterOffers: CounterOffer[];
  currentCounterOffer?: number; // index in counterOffers array
  
  // Timeline
  offerSentDate?: Date;
  offerExpiryDate: Date;
  responseDeadline: Date;
  tenantResponseDate?: Date;
  
  // Decision
  tenantDecision?: 'accept' | 'reject' | 'counter';
  tenantNotes?: string;
  
  // New Lease
  newLeaseId?: string; // ID of the renewed lease if accepted
  
  // Metadata
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
}

export interface RenewalTermChange {
  termType: 'rent' | 'duration' | 'deposit' | 'clause' | 'other';
  oldValue: string;
  newValue: string;
  description: string;
}

export interface CounterOffer {
  id: string;
  offeredBy: 'landlord' | 'tenant';
  offeredDate: Date;
  proposedRent?: number;
  proposedStartDate?: Date;
  proposedEndDate?: Date;
  proposedChanges: RenewalTermChange[];
  notes?: string;
  status: 'active' | 'accepted' | 'rejected' | 'superseded';
}

/**
 * Lease Termination Request
 * Handles early termination and move-out processes
 */
export interface LeaseTerminationRequest {
  id: string;
  leaseId: string;
  requestedBy: string; // userId
  requestedByRole: 'landlord' | 'tenant';
  
  // Termination Details
  terminationType: 'early-termination' | 'mutual-agreement' | 'breach' | 'natural-expiry';
  reason: string;
  requestedTerminationDate: Date;
  approvedTerminationDate?: Date;
  
  // Status
  status: 'submitted' | 'under-review' | 'approved' | 'rejected' | 'completed';
  
  // Financial Impact
  earlyTerminationFee?: number;
  remainingRentOwed?: number;
  securityDepositReturn?: number;
  securityDepositDeductions?: DepositDeduction[];
  
  // Move-Out Process
  moveOutDate?: Date;
  moveOutInspection?: MoveOutInspection;
  finalWalkthrough?: {
    scheduled: boolean;
    date?: Date;
    completed: boolean;
    attendees?: string[];
    notes?: string;
  };
  
  // Documentation
  noticeDocument?: string; // URL to termination notice
  agreementDocument?: string; // URL to termination agreement
  photos?: string[]; // Move-out condition photos
  
  // Approval
  approvedBy?: string;
  approvalDate?: Date;
  approvalNotes?: string;
  rejectionReason?: string;
  
  // Metadata
  createdAt: Date;
  updatedAt: Date;
}

export interface DepositDeduction {
  description: string;
  amount: number;
  category: 'cleaning' | 'repairs' | 'unpaid-rent' | 'damages' | 'other';
  evidence?: string[]; // URLs to photos/documents
}

export interface MoveOutInspection {
  inspectionDate: Date;
  inspectedBy: string;
  propertyCondition: 'excellent' | 'good' | 'fair' | 'poor';
  issues: InspectionIssue[];
  photos: string[];
  notes?: string;
  tenantPresent: boolean;
  tenantSignature?: string;
  landlordSignature?: string;
}

export interface InspectionIssue {
  location: string; // e.g., "Living Room", "Kitchen"
  description: string;
  severity: 'minor' | 'moderate' | 'major';
  estimatedRepairCost?: number;
  photos?: string[];
}

/**
 * Lease Audit Log
 * Comprehensive tracking of all lease-related actions and changes
 */
export interface LeaseAuditLog {
  id: string;
  leaseId: string;
  
  // Action Details
  action: LeaseAuditAction;
  actionCategory: 'creation' | 'modification' | 'signature' | 'payment' | 'maintenance' | 'termination' | 'access' | 'other';
  description: string;
  
  // Actor Information
  userId: string;
  userName: string;
  userRole: 'landlord' | 'tenant' | 'agent' | 'system' | 'admin';
  
  // Change Tracking
  entityType?: 'lease' | 'clause' | 'addendum' | 'payment' | 'document' | 'signature';
  entityId?: string;
  changedFields?: FieldChange[];
  
  // Context
  ipAddress?: string;
  userAgent?: string;
  location?: GeolocationData;
  
  // Metadata
  timestamp: Date;
  sessionId?: string;
  requestId?: string;
  
  // Additional Data
  metadata?: Record<string, unknown>;
}

export type LeaseAuditAction =
  | 'lease-created'
  | 'lease-updated'
  | 'lease-deleted'
  | 'clause-added'
  | 'clause-modified'
  | 'clause-removed'
  | 'addendum-created'
  | 'signature-requested'
  | 'signature-completed'
  | 'signature-declined'
  | 'payment-scheduled'
  | 'payment-received'
  | 'payment-overdue'
  | 'maintenance-requested'
  | 'maintenance-completed'
  | 'termination-requested'
  | 'termination-approved'
  | 'renewal-offered'
  | 'renewal-accepted'
  | 'document-uploaded'
  | 'document-viewed'
  | 'document-downloaded'
  | 'access-granted'
  | 'access-revoked'
  | 'status-changed'
  | 'comment-added'
  | 'notification-sent';

export interface FieldChange {
  fieldName: string;
  oldValue: string | number | boolean | null;
  newValue: string | number | boolean | null;
  dataType: 'string' | 'number' | 'boolean' | 'date' | 'object' | 'array';
}