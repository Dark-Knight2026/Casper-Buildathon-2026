export interface Property {
  id: string;
  sellerId: string;
  address: string;
  propertyType: 'single_family' | 'condo' | 'townhouse' | 'multi_family' | 'commercial';
  listingType: 'sale' | 'lease' | 'lease_to_own';
  price: number;
  bedrooms?: number;
  bathrooms?: number;
  squareFeet?: number;
  lotSize?: number;
  yearBuilt?: number;
  description: string;
  features: string[];
  media: PropertyMedia[];
  documents: PropertyDocument[];
  status: 'draft' | 'active' | 'pending' | 'sold' | 'leased' | 'withdrawn';
  isAgentRepresented: boolean;
  assignedAgentId?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface PropertyMedia {
  id: string;
  type: 'photo' | 'video' | '3d_tour';
  url: string;
  title: string;
  isPrimary: boolean;
  uploadedAt: Date;
}

export interface PropertyDocument {
  id: string;
  type: 'title' | 'disclosure' | 'inspection' | 'hoa' | 'deed' | 'other';
  name: string;
  url: string;
  uploadedAt: Date;
  expiresAt?: Date;
}

export interface Offer {
  id: string;
  propertyId: string;
  buyerId: string;
  buyerName: string;
  buyerAgentId?: string;
  buyerAgentName?: string;
  offerAmount: number;
  offerType: 'purchase' | 'lease' | 'lease_to_own';
  earnestMoney: number;
  financing: 'cash' | 'conventional' | 'fha' | 'va' | 'other';
  preApprovalAmount?: number;
  contingencies: string[];
  proposedClosingDate: Date;
  inspectionPeriod: number;
  status: 'pending' | 'countered' | 'accepted' | 'rejected' | 'expired';
  message: string;
  createdAt: Date;
  expiresAt: Date;
}

export interface AgentProfile {
  id: string;
  name: string;
  email: string;
  phone: string;
  licenseNumber: string;
  brokerage: string;
  aqiScore: number;
  specialties: string[];
  yearsExperience: number;
  dealsCompleted: number;
  averageDaysToClose: number;
  clientRating: number;
  commissionRate: number;
  profilePhoto?: string;
  bio: string;
}

export interface CommissionAgreement {
  id: string;
  propertyId: string;
  agentId: string;
  sellerId: string;
  commissionRate: number;
  flatFee?: number;
  terms: string;
  signedAt: Date;
  expiresAt: Date;
  status: 'draft' | 'active' | 'completed' | 'terminated';
}

export interface PropertyValuation {
  propertyId: string;
  estimatedValue: number;
  confidenceRange: [number, number];
  comparables: Comparable[];
  marketTrends: MarketTrend[];
  lastUpdated: Date;
}

export interface Comparable {
  id: string;
  address: string;
  soldPrice: number;
  soldDate: Date;
  bedrooms: number;
  bathrooms: number;
  squareFeet: number;
  daysOnMarket: number;
  distance: number; // miles from subject property
}

export interface MarketTrend {
  period: string;
  averagePrice: number;
  medianDaysOnMarket: number;
  priceChange: number; // percentage
  inventoryLevel: 'low' | 'normal' | 'high';
}

export interface ROIScenario {
  id: string;
  propertyId: string;
  scenarioName: string;
  type: 'sale_now' | 'rent_then_sell' | 'lease_to_own';
  assumptions: {
    salePrice?: number;
    monthlyRent?: number;
    rentGrowthRate?: number;
    appreciationRate?: number;
    holdingPeriod?: number; // years
    maintenanceCosts?: number;
    propertyTaxes?: number;
    insurance?: number;
  };
  projectedROI: number;
  projectedCashFlow: number[];
  projectedValue: number;
  createdAt: Date;
}

export interface Transaction {
  id: string;
  propertyId: string;
  offerId: string;
  sellerId: string;
  buyerId: string;
  listingAgentId?: string;
  buyingAgentId?: string;
  status: 'pending' | 'in_escrow' | 'completed' | 'cancelled';
  milestones: TransactionMilestone[];
  participants: TransactionParticipant[];
  documents: TransactionDocument[];
  createdAt: Date;
  expectedClosingDate: Date;
  actualClosingDate?: Date;
}

export interface TransactionMilestone {
  id: string;
  name: string;
  description: string;
  dueDate: Date;
  completedAt?: Date;
  isRequired: boolean;
  assignedTo: string; // participant ID
  status: 'pending' | 'in_progress' | 'completed' | 'overdue';
  dependencies: string[]; // milestone IDs
}

export interface TransactionParticipant {
  id: string;
  role: 'seller' | 'buyer' | 'listing_agent' | 'buying_agent' | 'loan_officer' | 'escrow_officer' | 'title_company' | 'notary' | 'inspector';
  name: string;
  email: string;
  phone: string;
  company?: string;
}

export interface TransactionDocument {
  id: string;
  name: string;
  type: string;
  url: string;
  uploadedBy: string;
  uploadedAt: Date;
  isRequired: boolean;
  status: 'pending' | 'uploaded' | 'reviewed' | 'approved';
}

export interface ChatMessage {
  id: string;
  transactionId: string;
  senderId: string;
  senderName: string;
  senderRole: string;
  message: string;
  attachments?: string[];
  timestamp: Date;
  isRead: boolean;
}

export interface Seller {
  id: string;
  name: string;
  email: string;
  phone: string;
  properties: Property[];
  transactions: Transaction[];
  preferredAgents: string[];
  createdAt: Date;
}