/**
 * Property Type Definitions
 * Extended types for property comparison and management
 */

export interface PropertyComparison {
  id: string;
  address: string;
  rent: number;
  bedrooms: number;
  bathrooms: number;
  sqft: number;
  available: boolean;
  amenities: string[];
  petFriendly: boolean;
  parking: string;
  utilities: string;
  leaseTerms: string[];
}

export interface PropertyComparisonValue {
  value: string | number | boolean;
  isHighlight?: boolean;
  isBest?: boolean;
  isWorst?: boolean;
}

// Property search and filter types
export interface PropertySearchParams {
  minRent?: number;
  maxRent?: number;
  bedrooms?: number;
  bathrooms?: number;
  propertyType?: PropertyType;
  amenities?: string[];
  petPolicy?: string;
  location?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  status?: string[];
  city?: string[];
  minBedrooms?: number;
  maxBedrooms?: number;
  minBathrooms?: number;
  petsAllowed?: boolean;
  furnished?: boolean;
  parkingAvailable?: boolean;
  search?: string;
}

export type PropertyType = 'apartment' | 'house' | 'condo' | 'townhouse' | 'studio' | 'Apartment' | 'House' | 'Condo' | 'Townhouse' | 'Studio' | 'Loft';

// Property form data
export interface PropertyFormData {
  title: string;
  description: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  propertyType: PropertyType;
  bedrooms: number;
  bathrooms: number;
  squareFeet: number | null;
  rent: number;
  securityDeposit: number;
  availableDate: string;
  leaseTerms: string[];
  amenities: string[];
  utilitiesIncluded: string[];
  petPolicy: string;
  petsAllowed: boolean;
  furnished: boolean;
  parkingAvailable: boolean;
  status: 'active' | 'pending' | 'rented' | 'inactive' | 'archived';
}

// Historical data count for property deletion
export interface HistoricalDataCount {
  leases: number;
  payments: number;
  maintenanceRequests: number;
  applications: number;
  hasHistoricalData: boolean;
}

// Property interface
export interface Property {
  id: string;
  landlordId: string;
  title: string;
  description: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  latitude: number | null;
  longitude: number | null;
  propertyType: PropertyType;
  bedrooms: number;
  bathrooms: number;
  squareFeet: number | null;
  rent: number;
  securityDeposit: number;
  availableDate: Date;
  leaseTerms: string[];
  amenities: string[];
  petPolicy: string;
  petsAllowed: boolean;
  furnished: boolean;
  utilitiesIncluded: string[];
  parkingAvailable: boolean;
  images: string[];
  status: 'active' | 'pending' | 'rented' | 'inactive' | 'archived';
  views: number;
  createdAt: Date;
  updatedAt: Date;
}

// Featured property (landing-page demo data with marketing extras)
export interface FeaturedProperty extends Property {
  priceChange: string;
  rating: number;
  daysOnMarket: number;
  photoCount: number;
}

// Property list response
export interface PropertyListResponse {
  properties: Property[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// Property statistics
export interface PropertyStatistics {
  totalViews: number;
  totalApplications: number;
  activeLeases: number;
  monthlyRevenue: number;
  occupancyRate: number;
}

// Unit interface (for multi-unit properties)
export interface Unit {
  id: string;
  propertyId: string;
  unitNumber: string;
  bedrooms: number;
  bathrooms: number;
  squareFeet: number;
  rent: number;
  status: 'available' | 'occupied' | 'maintenance';
  currentTenantId?: string;
  leaseEndDate?: Date;
}

// Available amenities
export const ALL_AMENITIES = [
  'Pool',
  'Gym',
  'Parking',
  'Laundry',
  'Balcony',
  'Air Conditioning',
  'Heating',
  'Dishwasher',
  'Elevator',
  'Security',
  'Storage',
  'Furnished',
  'Hardwood Floors',
  'Stainless Steel Appliances',
  'Granite Countertops',
  'Walk-in Closet',
  'Patio',
  'Fireplace',
  'High Ceilings',
  'Natural Light',
  'Pet-Friendly',
  'Washer/Dryer In Unit',
  'Central AC',
  'Updated Kitchen',
  'Updated Bathroom',
];

// Utilities
export const UTILITIES = [
  'Water',
  'Gas',
  'Electricity',
  'Internet',
  'Cable',
  'Trash',
  'Sewer',
  'HOA Fees',
];

// Lease terms
export const LEASE_TERMS = [
  '6 Months',
  '1 Year',
  '2 Years',
  'Month-to-Month',
  'Flexible',
];

// Pet policies
export const PET_POLICIES = [
  'No Pets',
  'Cats Only',
  'Dogs Only',
  'Cats and Dogs',
  'Small Pets Only',
  'Negotiable',
];

// US States
export const US_STATES = [
  'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA',
  'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD',
  'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ',
  'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC',
  'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY',
];