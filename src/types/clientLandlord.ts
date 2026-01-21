export interface ContactDetails {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  alternatePhone?: string;
  preferredContactMethod: 'email' | 'phone' | 'text';
  address?: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
  };
}

export interface PropertyPreferences {
  priceRange: {
    min: number;
    max: number;
  };
  propertyTypes: string[];
  bedrooms: {
    min: number;
    max: number;
  };
  bathrooms: {
    min: number;
    max: number;
  };
  squareFootage: {
    min: number;
    max: number;
  };
  preferredLocations: string[];
  amenities: string[];
  investmentGoals?: string[];
}

export interface ClientSegmentation {
  clientType: 'investor' | 'owner-occupier' | 'first-time-buyer' | 'downsizing' | 'upgrading';
  budgetTier: 'budget' | 'mid-range' | 'luxury' | 'ultra-luxury';
  urgency: 'immediate' | 'within-3-months' | 'within-6-months' | 'flexible';
  source: 'referral' | 'website' | 'social-media' | 'advertising' | 'walk-in' | 'other';
  tags: string[];
}

export interface CommunicationLog {
  id: string;
  date: Date;
  type: 'email' | 'phone' | 'text' | 'meeting' | 'note';
  subject: string;
  content: string;
  agentId: string;
  agentName: string;
  direction: 'inbound' | 'outbound';
  attachments?: string[];
}

export interface PropertyDetails {
  address: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
    coordinates?: {
      lat: number;
      lng: number;
    };
  };
  price: number;
  bedrooms: number;
  bathrooms: number;
  squareFootage: number;
  propertyType: string;
  yearBuilt?: number;
  lotSize?: number;
  features: string[];
  description: string;
  images: string[];
  virtualTourUrl?: string;
}

export interface LeaseInformation {
  startDate: Date;
  endDate: Date;
  monthlyRent: number;
  securityDeposit: number;
  leaseTerms: string;
  renewalOptions?: string;
  specialConditions?: string[];
}

export interface Tenant {
  id: string;
  propertyId: string;
  landlordId: string;
  agentId?: string;
  personalInfo: ContactDetails;
  leaseInfo: LeaseInformation;
  emergencyContact?: ContactDetails;
  paymentHistory: PaymentRecord[];
  status: 'active' | 'pending' | 'terminated' | 'evicted';
  createdAt: Date;
  updatedAt: Date;
}

export interface PaymentRecord {
  id: string;
  date: Date;
  amount: number;
  type: 'rent' | 'deposit' | 'fee' | 'utility';
  status: 'paid' | 'pending' | 'overdue' | 'partial';
  method: 'check' | 'cash' | 'bank-transfer' | 'credit-card' | 'online';
  notes?: string;
}

export interface PropertyExpense {
  id: string;
  type: 'maintenance' | 'insurance' | 'taxes' | 'utilities' | 'management' | 'other';
  amount: number;
  date: Date;
  description: string;
  recurring: boolean;
  frequency?: 'monthly' | 'quarterly' | 'annually';
}

export interface TaxInformation {
  assessedValue: number;
  annualTaxes: number;
  exemptions: string[];
  lastAssessment: Date;
}

export interface Property {
  id: string;
  landlordId: string;
  agentId: string;
  brokerId: string;
  tenantIds: string[];
  details: PropertyDetails;
  status: 'available' | 'rented' | 'sold' | 'pending' | 'maintenance';
  listingDate: Date;
  lastUpdated: Date;
  financialInfo: {
    monthlyIncome?: number;
    expenses: PropertyExpense[];
    taxInfo?: TaxInformation;
  };
}

export interface ClientDocument {
  id: string;
  name: string;
  type: 'contract' | 'financial' | 'identification' | 'insurance' | 'other';
  url: string;
  uploadDate: Date;
  uploadedBy: string;
  size: number;
  mimeType: string;
}

export interface ClientNote {
  id: string;
  content: string;
  createdBy: string;
  createdByName: string;
  createdAt: Date;
  priority: 'low' | 'medium' | 'high';
  category: 'general' | 'follow-up' | 'concern' | 'opportunity';
}

// Updated Client interface - landlords can have MULTIPLE properties
export interface ClientLandlord {
  id: string;
  type: 'landlord';
  personalInfo: ContactDetails;
  propertyIds: string[]; // MULTIPLE properties allowed
  agentId: string;
  brokerId: string;
  preferences: PropertyPreferences;
  segmentation: ClientSegmentation;
  communicationHistory: CommunicationLog[];
  documents: ClientDocument[];
  notes: ClientNote[];
  status: 'active' | 'inactive' | 'prospect' | 'closed';
  createdAt: Date;
  updatedAt: Date;
  lastContactDate?: Date;
}

export interface Agent {
  id: string;
  personalInfo: ContactDetails;
  brokerId: string;
  licenseNumber: string;
  specializations: string[];
  clientIds: string[];
  propertyIds: string[];
  performance: AgentPerformance;
  status: 'active' | 'inactive' | 'suspended';
  hireDate: Date;
}

export interface AgentPerformance {
  totalSales: number;
  totalRentals: number;
  totalCommission: number;
  clientSatisfactionRating: number;
  responseTime: number;
  activeListings: number;
  closedDeals: number;
  monthlyMetrics: MonthlyMetric[];
}

export interface MonthlyMetric {
  month: string;
  year: number;
  sales: number;
  rentals: number;
  commission: number;
  newClients: number;
}

export interface Broker {
  id: string;
  personalInfo: ContactDetails;
  companyInfo: {
    name: string;
    licenseNumber: string;
    address: ContactDetails['address'];
    website?: string;
  };
  agentIds: string[];
  totalProperties: number;
  totalClients: number;
  performance: BrokerPerformance;
  status: 'active' | 'inactive';
}

export interface BrokerPerformance {
  totalRevenue: number;
  totalCommission: number;
  averageAgentPerformance: number;
  clientRetentionRate: number;
  marketShare: number;
  yearlyMetrics: YearlyMetric[];
}

export interface YearlyMetric {
  year: number;
  revenue: number;
  commission: number;
  newAgents: number;
  newClients: number;
  propertiesSold: number;
  propertiesRented: number;
}

// Form interfaces
export interface ClientLandlordFormData {
  personalInfo: Partial<ContactDetails>;
  propertyIds?: string[];
  agentId?: string;
  preferences?: Partial<PropertyPreferences>;
  segmentation?: Partial<ClientSegmentation>;
  notes?: string;
}

export interface PropertyFormData {
  details: Partial<PropertyDetails>;
  landlordId?: string;
  agentId?: string;
  status?: Property['status'];
}

export interface TenantFormData {
  personalInfo: Partial<ContactDetails>;
  propertyId: string;
  leaseInfo: Partial<LeaseInformation>;
  emergencyContact?: Partial<ContactDetails>;
}

// Filter interfaces
export interface ClientLandlordFilter {
  agentId?: string;
  brokerId?: string;
  status?: ClientLandlord['status'];
  clientType?: ClientSegmentation['clientType'];
  budgetTier?: ClientSegmentation['budgetTier'];
  urgency?: ClientSegmentation['urgency'];
  source?: ClientSegmentation['source'];
  tags?: string[];
  priceRange?: {
    min?: number;
    max?: number;
  };
  lastContactDateRange?: {
    start?: Date;
    end?: Date;
  };
}

export interface PropertyFilter {
  agentId?: string;
  brokerId?: string;
  landlordId?: string;
  status?: Property['status'];
  propertyType?: string;
  priceRange?: {
    min?: number;
    max?: number;
  };
  bedrooms?: {
    min?: number;
    max?: number;
  };
  location?: string;
}

// Notification interfaces
export interface NotificationEvent {
  id: string;
  type: 'property_status_change' | 'tenant_added' | 'payment_due' | 'maintenance_request' | 'lease_expiring';
  recipientIds: string[];
  recipientRoles: ('landlord' | 'agent' | 'broker' | 'tenant')[];
  propertyId?: string;
  tenantId?: string;
  landlordId?: string;
  title: string;
  message: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  createdAt: Date;
  readBy: string[];
}