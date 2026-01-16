export interface Property {
  id: string;
  title: string;
  description: string;
  address: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
    country?: string;
    coordinates?: {
      lat: number;
      lng: number;
    };
  };
  price: number;
  priceHistory?: {
    date: Date;
    price: number;
    event: 'listed' | 'price_change' | 'sold' | 'withdrawn';
  }[];
  propertyType: 'single_family' | 'condo' | 'townhouse' | 'multi_family' | 'land' | 'commercial' | 'other';
  listingType: 'rental' | 'for_sale';
  status: 'active' | 'pending' | 'sold' | 'withdrawn' | 'draft';
  listingDate: Date;
  lastUpdated: Date;
  daysOnMarket: number;
  
  // Property Details
  bedrooms?: number;
  bathrooms?: number;
  halfBaths?: number;
  squareFootage?: number;
  lotSize?: number;
  yearBuilt?: number;
  garage?: {
    spaces: number;
    type: 'attached' | 'detached' | 'carport' | 'none';
  };
  
  // Features & Amenities
  features?: string[];
  appliances?: string[];
  flooring?: string[];
  heating?: string;
  cooling?: string;
  utilities?: string[];
  
  // Financial Information
  taxes?: {
    annual: number;
    year: number;
  };
  hoa?: {
    fee: number;
    frequency: 'monthly' | 'quarterly' | 'annually';
    includes: string[];
  };
  insurance?: number;
  
  // Media
  images?: {
    id: string;
    url: string;
    caption?: string;
    isPrimary: boolean;
    order: number;
  }[];
  virtualTour?: string;
  floorPlan?: string;
  videos?: string[];
  
  // Listing Information
  listingAgent: string;
  coListingAgent?: string;
  brokerage: string;
  mlsNumber?: string;
  commission?: {
    buyerAgent: number;
    listingAgent: number;
  };
  
  // Showing Information
  showingInstructions?: string;
  showingRestrictions?: string;
  lockboxCode?: string;
  keyLocation?: string;
  
  // Marketing
  marketingRemarks?: string;
  privateRemarks?: string;
  keywords?: string[];
  
  // Analytics
  views?: number;
  inquiries?: number;
  showings?: {
    id: string;
    date: Date;
    agent: string;
    feedback?: string;
    interested: boolean;
  }[];
  
  // Investment Analysis
  investmentAnalysis?: {
    capRate?: number;
    cashFlow?: number;
    roi?: number;
    rentEstimate?: number;
  };
  
  // Legal & Disclosures
  disclosures?: {
    id: string;
    type: string;
    description: string;
    acknowledged: boolean;
  }[];
  restrictions?: string[];
  zoning?: string;
  
  // Client Information
  clientId?: string;
  clientType: 'seller' | 'landlord' | 'developer';
  
  // System Fields
  createdBy: string;
  createdAt: Date;
  updatedBy: string;
  updatedAt: Date;
}

export interface ListingFormData {
  // Basic Information
  title: string;
  description: string;
  address: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
    country?: string;
  };
  price: number;
  propertyType: 'single_family' | 'condo' | 'townhouse' | 'multi_family' | 'land' | 'commercial' | 'other';
  listingType: 'rental' | 'for_sale';
  
  // Property Details
  bedrooms?: number;
  bathrooms?: number;
  halfBaths?: number;
  squareFootage?: number;
  lotSize?: number;
  yearBuilt?: number;
  garage?: {
    spaces: number;
    type: 'attached' | 'detached' | 'carport' | 'none';
  };
  
  // Features & Amenities
  features?: string[];
  appliances?: string[];
  flooring?: string[];
  heating?: string;
  cooling?: string;
  utilities?: string[];
  
  // Financial Information
  taxes?: {
    annual: number;
    year: number;
  };
  hoa?: {
    fee: number;
    frequency: 'monthly' | 'quarterly' | 'annually';
    includes: string[];
  };
  
  // Listing Information
  coListingAgent?: string;
  mlsNumber?: string;
  commission?: {
    buyerAgent: number;
    listingAgent: number;
  };
  
  // Showing Information
  showingInstructions?: string;
  showingRestrictions?: string;
  
  // Marketing
  marketingRemarks?: string;
  privateRemarks?: string;
  keywords?: string[];
  
  // Client Information
  clientId?: string;
  clientType: 'seller' | 'landlord' | 'developer';
  
  // Legal & Disclosures
  disclosures?: string[];
  restrictions?: string[];
  zoning?: string;
}

export interface ListingFilters {
  status?: string[];
  propertyType?: string[];
  listingType?: ('rental' | 'for_sale')[];
  priceRange?: {
    min: number;
    max: number;
  };
  bedrooms?: number[];
  bathrooms?: number[];
  squareFootageRange?: {
    min: number;
    max: number;
  };
  yearBuiltRange?: {
    min: number;
    max: number;
  };
  features?: string[];
  location?: string[];
  listingAgent?: string;
  dateRange?: {
    start: Date;
    end: Date;
  };
  searchTerm?: string;
  daysOnMarketRange?: {
    min: number;
    max: number;
  };
}

export interface ListingStats {
  total: number;
  active: number;
  pending: number;
  sold: number;
  withdrawn: number;
  draft: number;
  byType: {
    single_family: number;
    condo: number;
    townhouse: number;
    multi_family: number;
    land: number;
    commercial: number;
    other: number;
  };
  byListingType: {
    rental: number;
    for_sale: number;
  };
  byPriceRange: {
    under_200k: number;
    _200k_400k: number;
    _400k_600k: number;
    _600k_800k: number;
    _800k_1m: number;
    over_1m: number;
  };
  averagePrice: number;
  averageDaysOnMarket: number;
  totalValue: number;
  averageViews: number;
  averageInquiries: number;
  conversionRate: number;
}

export interface ShowingRequest {
  id: string;
  propertyId: string;
  requestedBy: {
    name: string;
    email: string;
    phone: string;
    agent?: string;
  };
  preferredDates: Date[];
  message?: string;
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed';
  confirmedDate?: Date;
  feedback?: string;
  createdAt: Date;
}

export interface PropertyInquiry {
  id: string;
  propertyId: string;
  inquirerName: string;
  inquirerEmail: string;
  inquirerPhone?: string;
  message: string;
  type: 'general' | 'showing' | 'offer' | 'information';
  status: 'new' | 'responded' | 'closed';
  response?: string;
  respondedAt?: Date;
  createdAt: Date;
}

export interface MarketAnalysis {
  propertyId: string;
  comparableProperties: {
    id: string;
    address: string;
    price: number;
    soldDate?: Date;
    squareFootage?: number;
    bedrooms?: number;
    bathrooms?: number;
    distance: number; // in miles
  }[];
  suggestedPriceRange: {
    min: number;
    max: number;
    recommended: number;
  };
  marketTrends: {
    averageDaysOnMarket: number;
    pricePerSquareFoot: number;
    inventoryLevel: 'low' | 'normal' | 'high';
    marketCondition: 'seller' | 'balanced' | 'buyer';
  };
  generatedAt: Date;
}