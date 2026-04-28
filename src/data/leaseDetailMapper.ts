import type { LeaseAgreement } from '@/types/lease';
import { CURRENT_TENANT_ID, type TenantLease } from '@/data/tenantLeases';

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
