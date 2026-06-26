import React, { createContext, useContext, useState, ReactNode, useCallback } from 'react';
import { Property, ListingFormData, ListingFilters, ListingStats, ShowingRequest, PropertyInquiry } from '@/types/listing';
import { useAuth } from './AuthContext';

interface ListingContextType {
  listings: Property[];
  filteredListings: Property[];
  filters: ListingFilters;
  stats: ListingStats;
  isLoading: boolean;
  addListing: (listingData: ListingFormData) => Promise<Property>;
  updateListing: (id: string, listingData: Partial<Property>) => Promise<Property>;
  deleteListing: (id: string) => Promise<void>;
  getListing: (id: string) => Property | undefined;
  setFilters: (filters: ListingFilters) => void;
  refreshListings: () => Promise<void>;
  updateListingStatus: (listingId: string, status: Property['status']) => Promise<void>;
  addShowing: (listingId: string, showing: Omit<ShowingRequest, 'id' | 'createdAt'>) => Promise<void>;
  addInquiry: (listingId: string, inquiry: Omit<PropertyInquiry, 'id' | 'createdAt'>) => Promise<void>;
}

const ListingContext = createContext<ListingContextType | undefined>(undefined);

// Enhanced mock data for demonstration
const mockListings: Property[] = [
  {
    id: '1',
    title: 'Stunning Waterfront Colonial',
    description: 'Beautiful 4-bedroom colonial home with breathtaking water views. This meticulously maintained property features hardwood floors throughout, updated kitchen with granite countertops, and a spacious master suite with walk-in closet.',
    address: {
      street: '1234 Ocean View Drive',
      city: 'Virginia Beach',
      state: 'VA',
      zipCode: '23451',
      country: 'USA',
      coordinates: { lat: 36.8529, lng: -75.9780 }
    },
    price: 485000,
    priceHistory: [
      { date: new Date('2024-01-01'), price: 495000, event: 'listed' },
      { date: new Date('2024-01-15'), price: 485000, event: 'price_change' }
    ],
    propertyType: 'single_family',
    status: 'active',
    listingDate: new Date('2024-01-01'),
    lastUpdated: new Date('2024-01-15'),
    daysOnMarket: 15,
    bedrooms: 4,
    bathrooms: 3,
    halfBaths: 1,
    squareFootage: 2800,
    lotSize: 0.75,
    yearBuilt: 1995,
    garage: {
      spaces: 2,
      type: 'attached'
    },
    features: ['Waterfront', 'Hardwood Floors', 'Updated Kitchen', 'Master Suite', 'Fireplace', 'Deck'],
    appliances: ['Dishwasher', 'Disposal', 'Microwave', 'Range/Oven', 'Refrigerator', 'Washer/Dryer'],
    flooring: ['Hardwood', 'Tile', 'Carpet'],
    heating: 'Forced Air',
    cooling: 'Central Air',
    utilities: ['Electric', 'Natural Gas', 'Water', 'Sewer'],
    taxes: {
      annual: 4850,
      year: 2023
    },
    hoa: {
      fee: 150,
      frequency: 'monthly',
      includes: ['Water', 'Trash', 'Landscaping']
    },
    images: [
      { id: '1', url: '/images/Property.jpg', caption: 'Front View', isPrimary: true, order: 1 },
      { id: '2', url: '/images/LivingRoom.jpg', caption: 'Living Room', isPrimary: false, order: 2 },
      { id: '3', url: '/images/Kitchen.jpg', caption: 'Kitchen', isPrimary: false, order: 3 }
    ],
    listingAgent: 'Mike Agent',
    brokerage: 'KeyChain Realty',
    mlsNumber: 'MLS123456',
    commission: {
      buyerAgent: 2.5,
      listingAgent: 2.5
    },
    showingInstructions: 'Please call listing agent 24 hours in advance. Lockbox on front door.',
    marketingRemarks: 'Don\'t miss this rare opportunity to own a piece of waterfront paradise! This stunning colonial offers the perfect blend of luxury and comfort.',
    privateRemarks: 'Sellers are motivated. Property shows well. Recent price reduction.',
    keywords: ['waterfront', 'colonial', 'updated', 'views', 'hardwood'],
    views: 245,
    inquiries: 12,
    showings: [
      {
        id: '1',
        date: new Date('2024-01-10'),
        agent: 'Sarah Johnson',
        feedback: 'Clients loved the water views but concerned about the age of the roof.',
        interested: true
      },
      {
        id: '2',
        date: new Date('2024-01-12'),
        agent: 'Robert Smith',
        feedback: 'Great property, clients are very interested.',
        interested: true
      }
    ],
    clientId: '2',
    clientType: 'seller',
    createdBy: 'Mike Agent',
    createdAt: new Date('2024-01-01'),
    updatedBy: 'Mike Agent',
    updatedAt: new Date('2024-01-15')
  },
  {
    id: '2',
    title: 'Modern Downtown Condo',
    description: 'Sleek and modern 2-bedroom condo in the heart of downtown Norfolk. Floor-to-ceiling windows, stainless steel appliances, and building amenities including fitness center and rooftop terrace.',
    address: {
      street: '567 Main Street, Unit 1205',
      city: 'Norfolk',
      state: 'VA',
      zipCode: '23510',
      country: 'USA',
      coordinates: { lat: 36.8468, lng: -76.2852 }
    },
    price: 325000,
    propertyType: 'condo',
    status: 'pending',
    listingDate: new Date('2023-12-15'),
    lastUpdated: new Date('2024-01-08'),
    daysOnMarket: 25,
    bedrooms: 2,
    bathrooms: 2,
    squareFootage: 1200,
    yearBuilt: 2018,
    garage: {
      spaces: 1,
      type: 'attached'
    },
    features: ['City Views', 'Floor-to-Ceiling Windows', 'Modern Kitchen', 'In-Unit Laundry', 'Balcony'],
    appliances: ['Dishwasher', 'Disposal', 'Microwave', 'Range/Oven', 'Refrigerator', 'Washer/Dryer'],
    flooring: ['Luxury Vinyl', 'Tile'],
    heating: 'Heat Pump',
    cooling: 'Central Air',
    utilities: ['Electric', 'Water', 'Sewer'],
    taxes: {
      annual: 2850,
      year: 2023
    },
    hoa: {
      fee: 275,
      frequency: 'monthly',
      includes: ['Water', 'Trash', 'Fitness Center', 'Concierge', 'Maintenance']
    },
    listingAgent: 'Mike Agent',
    brokerage: 'KeyChain Realty',
    mlsNumber: 'MLS789012',
    commission: {
      buyerAgent: 3.0,
      listingAgent: 3.0
    },
    showingInstructions: 'Contact concierge for access. Unit is vacant.',
    marketingRemarks: 'Urban living at its finest! This modern condo offers luxury amenities and unbeatable downtown location.',
    views: 189,
    inquiries: 8,
    clientType: 'seller',
    createdBy: 'Mike Agent',
    createdAt: new Date('2023-12-15'),
    updatedBy: 'Mike Agent',
    updatedAt: new Date('2024-01-08')
  },
  {
    id: '3',
    title: 'Charming Suburban Townhouse',
    description: 'Well-maintained 3-bedroom townhouse in desirable Chesapeake neighborhood. Open floor plan, updated bathrooms, and private patio. Great for families!',
    address: {
      street: '890 Maple Lane',
      city: 'Chesapeake',
      state: 'VA',
      zipCode: '23320',
      country: 'USA'
    },
    price: 285000,
    propertyType: 'townhouse',
    status: 'active',
    listingDate: new Date('2024-01-05'),
    lastUpdated: new Date('2024-01-05'),
    daysOnMarket: 11,
    bedrooms: 3,
    bathrooms: 2,
    halfBaths: 1,
    squareFootage: 1650,
    yearBuilt: 2005,
    garage: {
      spaces: 1,
      type: 'attached'
    },
    features: ['Open Floor Plan', 'Updated Bathrooms', 'Private Patio', 'Storage', 'End Unit'],
    appliances: ['Dishwasher', 'Range/Oven', 'Microwave'],
    flooring: ['Laminate', 'Tile', 'Carpet'],
    heating: 'Heat Pump',
    cooling: 'Central Air',
    taxes: {
      annual: 3200,
      year: 2023
    },
    hoa: {
      fee: 85,
      frequency: 'monthly',
      includes: ['Exterior Maintenance', 'Landscaping']
    },
    listingAgent: 'Mike Agent',
    brokerage: 'KeyChain Realty',
    showingInstructions: 'Tenant occupied. 24-hour notice required.',
    marketingRemarks: 'Perfect starter home or investment property in established neighborhood with great schools.',
    views: 156,
    inquiries: 6,
    clientType: 'seller',
    createdBy: 'Mike Agent',
    createdAt: new Date('2024-01-05'),
    updatedBy: 'Mike Agent',
    updatedAt: new Date('2024-01-05')
  }
];

export function ListingProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [listings, setListings] = useState<Property[]>(mockListings);
  const [filters, setFilters] = useState<ListingFilters>({});
  const [isLoading, setIsLoading] = useState(false);

  // Filter listings based on current filters
  const filteredListings = listings.filter(listing => {
    if (filters.status && filters.status.length > 0 && !filters.status.includes(listing.status)) {
      return false;
    }
    if (filters.propertyType && filters.propertyType.length > 0 && !filters.propertyType.includes(listing.propertyType)) {
      return false;
    }
    if (filters.priceRange) {
      if (filters.priceRange.min && listing.price < filters.priceRange.min) return false;
      if (filters.priceRange.max && listing.price > filters.priceRange.max) return false;
    }
    if (filters.bedrooms && filters.bedrooms.length > 0 && listing.bedrooms && !filters.bedrooms.includes(listing.bedrooms)) {
      return false;
    }
    if (filters.bathrooms && filters.bathrooms.length > 0 && listing.bathrooms && !filters.bathrooms.includes(listing.bathrooms)) {
      return false;
    }
    if (filters.listingAgent && listing.listingAgent !== filters.listingAgent) {
      return false;
    }
    if (filters.searchTerm) {
      const searchTerm = filters.searchTerm.toLowerCase();
      if (!listing.title.toLowerCase().includes(searchTerm) && 
          !listing.description.toLowerCase().includes(searchTerm) &&
          !`${listing.address.street} ${listing.address.city}`.toLowerCase().includes(searchTerm)) {
        return false;
      }
    }
    return true;
  });

  // Calculate stats
  const stats: ListingStats = {
    total: listings.length,
    active: listings.filter(l => l.status === 'active').length,
    pending: listings.filter(l => l.status === 'pending').length,
    sold: listings.filter(l => l.status === 'sold').length,
    withdrawn: listings.filter(l => l.status === 'withdrawn').length,
    draft: listings.filter(l => l.status === 'draft').length,
    byType: {
      single_family: listings.filter(l => l.propertyType === 'single_family').length,
      condo: listings.filter(l => l.propertyType === 'condo').length,
      townhouse: listings.filter(l => l.propertyType === 'townhouse').length,
      multi_family: listings.filter(l => l.propertyType === 'multi_family').length,
      land: listings.filter(l => l.propertyType === 'land').length,
      commercial: listings.filter(l => l.propertyType === 'commercial').length,
      other: listings.filter(l => l.propertyType === 'other').length,
    },
    byPriceRange: {
      under_200k: listings.filter(l => l.price < 200000).length,
      _200k_400k: listings.filter(l => l.price >= 200000 && l.price < 400000).length,
      _400k_600k: listings.filter(l => l.price >= 400000 && l.price < 600000).length,
      _600k_800k: listings.filter(l => l.price >= 600000 && l.price < 800000).length,
      _800k_1m: listings.filter(l => l.price >= 800000 && l.price < 1000000).length,
      over_1m: listings.filter(l => l.price >= 1000000).length,
    },
    averagePrice: listings.length > 0 ? listings.reduce((sum, l) => sum + l.price, 0) / listings.length : 0,
    averageDaysOnMarket: listings.length > 0 ? listings.reduce((sum, l) => sum + l.daysOnMarket, 0) / listings.length : 0,
    totalValue: listings.reduce((sum, l) => sum + l.price, 0),
    averageViews: listings.length > 0 ? listings.reduce((sum, l) => sum + (l.views || 0), 0) / listings.length : 0,
    averageInquiries: listings.length > 0 ? listings.reduce((sum, l) => sum + (l.inquiries || 0), 0) / listings.length : 0,
    conversionRate: listings.length > 0 ? (listings.filter(l => l.status === 'sold').length / listings.length) * 100 : 0
  };

  const addListing = useCallback(async (listingData: ListingFormData): Promise<Property> => {
    setIsLoading(true);
    try {
      const newListing: Property = {
        id: Date.now().toString(),
        ...listingData,
        status: 'draft',
        listingDate: new Date(),
        lastUpdated: new Date(),
        daysOnMarket: 0,
        listingAgent: user?.name || 'Unknown Agent',
        brokerage: 'KeyChain Realty',
        views: 0,
        inquiries: 0,
        showings: [],
        createdBy: user?.name || 'System',
        createdAt: new Date(),
        updatedBy: user?.name || 'System',
        updatedAt: new Date()
      };

      setListings(prev => [...prev, newListing]);
      return newListing;
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  const updateListing = useCallback(async (id: string, listingData: Partial<Property>): Promise<Property> => {
    setIsLoading(true);
    try {
      const updatedListing = listings.find(l => l.id === id);
      if (!updatedListing) throw new Error('Listing not found');

      const updated = { 
        ...updatedListing, 
        ...listingData,
        lastUpdated: new Date(),
        updatedBy: user?.name || 'System'
      };
      
      setListings(prev => prev.map(l => l.id === id ? updated : l));
      return updated;
    } finally {
      setIsLoading(false);
    }
  }, [listings, user]);

  const deleteListing = useCallback(async (id: string): Promise<void> => {
    setIsLoading(true);
    try {
      setListings(prev => prev.filter(l => l.id !== id));
    } finally {
      setIsLoading(false);
    }
  }, []);

  const getListing = useCallback((id: string): Property | undefined => {
    return listings.find(l => l.id === id);
  }, [listings]);

  const refreshListings = useCallback(async (): Promise<void> => {
    setIsLoading(true);
    try {
      // In a real app, this would fetch from an API
      await new Promise(resolve => setTimeout(resolve, 1000));
    } finally {
      setIsLoading(false);
    }
  }, []);

  const updateListingStatus = useCallback(async (listingId: string, status: Property['status']): Promise<void> => {
    const listing = listings.find(l => l.id === listingId);
    if (listing) {
      await updateListing(listingId, { 
        status,
        lastUpdated: new Date()
      });
    }
  }, [listings, updateListing]);

  const addShowing = useCallback(async (listingId: string, showing: Omit<ShowingRequest, 'id' | 'createdAt'>): Promise<void> => {
    const listing = listings.find(l => l.id === listingId);
    if (listing) {
      const newShowing = {
        id: Date.now().toString(),
        date: new Date(),
        agent: showing.requestedBy.agent || 'Unknown',
        feedback: '',
        interested: false
      };
      
      const updatedShowings = [...(listing.showings || []), newShowing];
      await updateListing(listingId, { 
        showings: updatedShowings,
        lastUpdated: new Date()
      });
    }
  }, [listings, updateListing]);

  const addInquiry = useCallback(async (listingId: string, inquiry: Omit<PropertyInquiry, 'id' | 'createdAt'>): Promise<void> => {
    const listing = listings.find(l => l.id === listingId);
    if (listing) {
      await updateListing(listingId, { 
        inquiries: (listing.inquiries || 0) + 1,
        lastUpdated: new Date()
      });
    }
  }, [listings, updateListing]);

  return (
    <ListingContext.Provider value={{
      listings,
      filteredListings,
      filters,
      stats,
      isLoading,
      addListing,
      updateListing,
      deleteListing,
      getListing,
      setFilters,
      refreshListings,
      updateListingStatus,
      addShowing,
      addInquiry
    }}>
      {children}
    </ListingContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useListings() {
  const context = useContext(ListingContext);
  if (context === undefined) {
    throw new Error('useListings must be used within a ListingProvider');
  }
  return context;
}