export interface DigitalOfferFormData {
  offerAmount: number;
  emdAmount: number;
  closingDate: string;
  possessionDate: string;
  offerExpiration: string;
  buyerName: string;
  buyerEmail: string;
  buyerPhone: string;
  buyerAddress: string;
  buyerCity: string;
  buyerState: string;
  buyerZip: string;
  agentName: string;
  agentEmail: string;
  agentPhone: string;
  agentLicense: string;
  brokerageName: string;
  financingType: 'cash' | 'conventional' | 'fha' | 'va' | 'usda';
  downPayment: number;
  loanAmount: number;
  preApprovalAmount: number;
  lenderName: string;
  loanOfficerName: string;
  loanOfficerPhone: string;
  inspectionContingency: boolean;
  inspectionPeriod: number;
  financingContingency: boolean;
  financingPeriod: number;
  appraisalContingency: boolean;
  appraisalShortfallHandling: 'buyer_covers' | 'renegotiate' | 'cancel';
  saleOfPropertyContingency: boolean;
  salePropertyAddress: string;
  salePropertyDeadline: string;
  specialConditions: string;
  additionalTerms: string;
}

export interface SubmittedOffer extends DigitalOfferFormData {
  propertyId: string;
  propertyAddress: string;
  listPrice: number;
  netToSeller: number;
  submittedAt: string;
  status: 'submitted' | 'draft';
}

export interface DraftOffer extends DigitalOfferFormData {
  propertyId: string;
  propertyAddress: string;
  listPrice: number;
  savedAt: string;
  status: 'draft';
}