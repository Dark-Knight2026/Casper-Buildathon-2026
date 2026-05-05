import type { LeaseAgreement } from '@/types/lease';
import type { MaintenanceRequest, Priority, RequestStatus } from '@/services/maintenanceService';
import type { Property } from '@/types/property';
import {
  CURRENT_TENANT_ID,
  type TenantLease,
  type MockMaintenanceRequest,
  type MaintenanceStatus,
  type MaintenancePriority,
} from '@/data/tenantLeases';

const STATUS_MAP: Record<MaintenanceStatus, RequestStatus> = {
  open: 'submitted',
  in_progress: 'in_progress',
  resolved: 'completed',
  cancelled: 'closed',
};

const PRIORITY_MAP: Record<MaintenancePriority, Priority> = {
  low: 'low',
  medium: 'medium',
  high: 'high',
  urgent: 'emergency',
};

// Build a full MaintenanceRequest from the slim MockMaintenanceRequest so that
// MaintenanceRequestDetail renders correctly via location.state.
export function buildMaintenanceRequest(
  req: MockMaintenanceRequest,
  property: Property,
): MaintenanceRequest {
  return {
    id: req.id,
    propertyId: req.propertyId,
    tenantId: CURRENT_TENANT_ID,
    landlordId: property.landlordId,
    vendorId: null,
    title: req.title,
    description: req.description,
    issueType: 'other',
    priority: PRIORITY_MAP[req.priority],
    status: STATUS_MAP[req.status],
    preferredAccessTime: null,
    permissionToEnter: true,
    estimatedCost: null,
    actualCost: null,
    completedAt: req.status === 'resolved' ? req.updatedAt : null,
    rating: null,
    review: null,
    photos: [],
    createdAt: req.createdAt,
    updatedAt: req.updatedAt,
    property: {
      title: property.title,
      address: property.address,
      city: property.city,
      state: property.state,
    },
  };
}

export type DetailLease = LeaseAgreement & {
  propertyAddress: string;
  paymentDueDay: number;
  restrictions?: string[];
  petDeposit?: number;
};

// Build a full DetailLease shape from a slim TenantLease so TenantLeaseDetail
// renders properly via location.state. Defaults represent a typical signed,
// approved residential lease — placeholder until backend provides real records.
export function buildDetailLease(
  lease: TenantLease,
  propertyAddress: string,
  landlordId: string,
): DetailLease {
  const signedAt = new Date(lease.startDate.getTime() - 7 * 86400000);
  return {
    id: lease.id,
    propertyId: lease.propertyId,
    landlordId,
    tenantIds: [CURRENT_TENANT_ID],
    type: 'residential-long-term',
    status: lease.status === 'pending' ? 'pending_approval' : lease.status,
    startDate: lease.startDate,
    endDate: lease.endDate,
    monthlyRent: lease.monthlyRent,
    securityDeposit: lease.securityDeposit,
    petDeposit: 0,
    propertyAddress,
    paymentDueDay: lease.paymentDueDay,
    restrictions: ['No smoking', 'Max 2 occupants', 'Quiet hours 10pm – 7am'],
    utilities: [
      { utilityType: 'water', responsibleParty: 'landlord' },
      { utilityType: 'trash', responsibleParty: 'landlord' },
      { utilityType: 'electricity', responsibleParty: 'tenant' },
    ],
    clauses: [],
    addendums: [],
    createdByRole: 'landlord',
    approvalStatus: 'approved',
    approvalHistory: [],
    signatureStatus: 'signed',
    signatureProgress: {
      landlord: { signed: true, timestamp: signedAt },
      tenant:   { signed: true, timestamp: new Date(signedAt.getTime() + 86400000) },
      agent:    { signed: false, timestamp: null },
    } as LeaseAgreement['signatureProgress'],
    documentLinks: { generatedPDF: null, signedPDF: null, attachments: [] } as LeaseAgreement['documentLinks'],
    complianceScore: 95,
    complianceIssues: [],
    stateSpecificRules: [],
    versionHistory: [
      {
        id: `${lease.id}-v1`,
        versionNumber: 1,
        leaseId: lease.id,
        content: 'Initial version',
        changes: ['Lease created', 'Terms agreed between parties'],
        createdBy: landlordId,
        createdByName: 'Landlord',
        createdAt: signedAt,
        isCurrent: true,
      },
    ] as LeaseAgreement['versionHistory'],
    currentVersion: 1,
    comments: [],
    signingWorkflow: {
      id: `${lease.id}-sw`,
      leaseId: lease.id,
      workflowType: 'sequential',
      steps: [],
      currentStep: 2,
      status: 'completed',
      createdAt: signedAt,
    } as LeaseAgreement['signingWorkflow'],
    signatures: [
      {
        id: `${lease.id}-sig1`, leaseId: lease.id, signerId: landlordId,
        signerName: 'Landlord', signerRole: 'Landlord',
        signatureType: 'electronic', signatureData: '', ipAddress: '', userAgent: '',
        timestamp: signedAt, authenticationMethod: 'email',
        authenticationVerified: true, status: 'completed',
      },
      {
        id: `${lease.id}-sig2`, leaseId: lease.id, signerId: CURRENT_TENANT_ID,
        signerName: 'You', signerRole: 'Tenant',
        signatureType: 'electronic', signatureData: '', ipAddress: '', userAgent: '',
        timestamp: new Date(signedAt.getTime() + 86400000), authenticationMethod: 'email',
        authenticationVerified: true, status: 'completed',
      },
    ] as LeaseAgreement['signatures'],
    createdAt: signedAt,
    updatedAt: lease.startDate,
    createdBy: landlordId,
    lastModifiedBy: CURRENT_TENANT_ID,
  };
}
