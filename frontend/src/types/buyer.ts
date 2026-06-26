export interface Property {
  id: string;
  title: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  price: number;
  bedrooms: number;
  bathrooms: number;
  squareFeet: number;
  propertyType: 'house' | 'condo' | 'townhouse' | 'apartment' | 'land';
  status: 'active' | 'pending' | 'sold' | 'off-market';
  images: string[];
  description: string;
  yearBuilt: number;
  lotSize?: number;
  features: string[];
  agentId: string;
  agentName: string;
  agentPhone: string;
  agentEmail: string;
  listingDate: string;
  daysOnMarket: number;
  views: number;
  inquiries: number;
  tourRequests: number;
  latitude?: number;
  longitude?: number;
  schoolRating?: number;
  walkScore?: number;
  transitScore?: number;
  crimeRate?: 'low' | 'medium' | 'high';
  nearbyAmenities?: string[];
}

export interface BuyerProfile {
  id: string;
  name: string;
  email: string;
  phone: string;
  avatar?: string;
  preferences: {
    minPrice: number;
    maxPrice: number;
    bedrooms: number[];
    bathrooms: number[];
    propertyTypes: string[];
    locations: string[];
    mustHaveFeatures: string[];
    commuteAddress?: string;
    maxCommuteTime?: number;
  };
  savedSearches: SavedSearch[];
  prequalificationStatus: 'not-started' | 'in-progress' | 'approved';
  prequalificationAmount?: number;
  lenderInfo?: {
    name: string;
    contact: string;
    loanOfficer: string;
  };
}

export interface SavedSearch {
  id: string;
  name: string;
  filters: PropertyFilters;
  alertsEnabled: boolean;
  createdAt: string;
  lastRun?: string;
  newListingsCount?: number;
}

export interface PropertyFilters {
  minPrice?: number;
  maxPrice?: number;
  bedrooms?: number[];
  bathrooms?: number[];
  propertyTypes?: string[];
  cities?: string[];
  states?: string[];
  minSquareFeet?: number;
  maxSquareFeet?: number;
  features?: string[];
  maxCommuteTime?: number;
  commuteAddress?: string;
  schoolRating?: number;
  walkScore?: number;
}

export interface Wishlist {
  id: string;
  name: string;
  properties: Property[];
  createdAt: string;
  updatedAt: string;
  notes?: string;
}

export interface Tour {
  id: string;
  propertyId: string;
  property: Property;
  scheduledDate: string;
  scheduledTime: string;
  type: 'in-person' | 'virtual' | 'self-guided';
  status: 'scheduled' | 'completed' | 'cancelled' | 'rescheduled';
  agentId: string;
  agentName: string;
  notes?: string;
  feedback?: string;
  rating?: number;
}

export interface Offer {
  id: string;
  propertyId: string;
  property: Property;
  offerAmount: number;
  earnestMoney: number;
  contingencies: string[];
  closingDate: string;
  status: 'draft' | 'submitted' | 'accepted' | 'rejected' | 'countered' | 'withdrawn';
  submittedAt?: string;
  responseDate?: string;
  counterOffer?: {
    amount: number;
    terms: string;
    expiresAt: string;
  };
  documents: Document[];
}

export interface Document {
  id: string;
  name: string;
  type: string;
  url: string;
  uploadedAt: string;
  uploadedBy: string;
  size: number;
  status: 'pending' | 'reviewed' | 'approved' | 'rejected';
}

export interface Message {
  id: string;
  senderId: string;
  senderName: string;
  senderRole: 'buyer' | 'agent' | 'lender' | 'inspector' | 'title-company';
  recipientId: string;
  recipientName: string;
  subject: string;
  content: string;
  timestamp: string;
  read: boolean;
  attachments?: Document[];
  propertyId?: string;
}

export interface MarketInsight {
  id: string;
  location: string;
  averagePrice: number;
  medianPrice: number;
  priceChange: number;
  priceChangePercent: number;
  daysOnMarket: number;
  inventoryLevel: 'low' | 'medium' | 'high';
  marketTrend: 'buyers' | 'sellers' | 'balanced';
  recentSales: number;
  newListings: number;
  period: string;
}

export interface PropertyComparison {
  properties: Property[];
  comparisonFields: string[];
}

export interface MortgageCalculation {
  loanAmount: number;
  downPayment: number;
  interestRate: number;
  loanTerm: number;
  monthlyPayment: number;
  totalInterest: number;
  totalPayment: number;
  propertyTax?: number;
  homeInsurance?: number;
  hoa?: number;
  pmi?: number;
  totalMonthlyPayment: number;
}

export interface Notification {
  id: string;
  type: 'new-listing' | 'price-drop' | 'tour-reminder' | 'offer-update' | 'message' | 'document';
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  actionUrl?: string;
  propertyId?: string;
}

export interface BuyerActivity {
  date: string;
  propertiesViewed: number;
  toursScheduled: number;
  offersSubmitted: number;
  messagesReceived: number;
}