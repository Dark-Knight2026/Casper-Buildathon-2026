import { useState, useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Property } from '@/types/buyer';
import { mockProperties as buyerMockProperties } from '@/data/mockProperties';
import {
  generateRecommendations,
  findSimilarProperties,
  extractUserPreferences,
} from '@/utils/recommendationEngine';
import {
  mockBuyerProfile,
  mockProperties,
  mockWishlists,
  mockTours,
  mockOffers,
  mockMessages,
  mockNotifications,
} from '@/lib/buyerMockData';

// Data fetching functions
const fetchBuyerProperties = async () => {
  await new Promise(resolve => setTimeout(resolve, 300));
  
  // `buyerMockProperties` now follows the canonical `Property` shape
  // (`@/types/property`); fields like `id`/`city`/`state`/`zipCode`/`squareFeet`
  // come straight through. We still synthesize buyer-flow extras
  // (`yearBuilt`, `lotSize`, `parking`, `features`, `virtualTourUrl`) here.
  return buyerMockProperties.map((prop) => ({
    ...prop,
    yearBuilt: 2020,
    lotSize: (prop.squareFeet ?? 0) * 2,
    parking: 2,
    features: prop.amenities,
    squareFeet: prop.squareFeet ?? 0,
    virtualTourUrl: '',
    status: 'active' as const,
  }));
};

const fetchWishlistIds = async () => {
  await new Promise(resolve => setTimeout(resolve, 300));
  return mockWishlists.flatMap((w) => w.properties.map((p) => p.id));
};

const fetchViewedIds = async () => {
  await new Promise(resolve => setTimeout(resolve, 300));
  return ['1', '2', '3'];
};

export const useBuyerDashboard = () => {
  const [wishlistPropertyIds, setWishlistPropertyIds] = useState<string[]>([]);
  const [viewedPropertyIds, setViewedPropertyIds] = useState<string[]>([]);
  const [comparisonProperties, setComparisonProperties] = useState<Property[]>([]);

  // Use React Query for data fetching
  const { data: convertedProperties = [], isLoading: propertiesLoading } = useQuery({
    queryKey: ['buyer-dashboard', 'properties'],
    queryFn: fetchBuyerProperties,
  });

  const { data: initialWishlistIds = [], isLoading: wishlistLoading } = useQuery({
    queryKey: ['buyer-dashboard', 'wishlist-ids'],
    queryFn: fetchWishlistIds,
  });

  const { data: initialViewedIds = [], isLoading: viewedLoading } = useQuery({
    queryKey: ['buyer-dashboard', 'viewed-ids'],
    queryFn: fetchViewedIds,
  });

  // Initialize state from query data
  useEffect(() => {
    if (initialWishlistIds.length > 0 && wishlistPropertyIds.length === 0) {
      setWishlistPropertyIds(initialWishlistIds);
    }
  }, [initialWishlistIds, wishlistPropertyIds.length]);

  useEffect(() => {
    if (initialViewedIds.length > 0 && viewedPropertyIds.length === 0) {
      setViewedPropertyIds(initialViewedIds);
    }
  }, [initialViewedIds, viewedPropertyIds.length]);

  // Combine all properties for lookup
  const allProperties = useMemo(() => {
    return [...mockProperties, ...convertedProperties];
  }, [convertedProperties]);

  // Get recently viewed properties
  const recentlyViewedProperties = useMemo(() => {
    return allProperties.filter((p) => viewedPropertyIds.includes(p.id));
  }, [allProperties, viewedPropertyIds]);

  // Generate personalized recommendations
  const recommendedProperties = useMemo(() => {
    const viewedProps = allProperties.filter((p) => viewedPropertyIds.includes(p.id));
    const wishlistedProps = allProperties.filter((p) =>
      wishlistPropertyIds.includes(p.id)
    );
    const preferences = extractUserPreferences(viewedProps, wishlistedProps);

    return generateRecommendations(
      allProperties,
      viewedPropertyIds,
      wishlistPropertyIds,
      preferences,
      6
    );
  }, [allProperties, viewedPropertyIds, wishlistPropertyIds]);

  // Get similar properties based on most recently viewed
  const similarProperties = useMemo(() => {
    if (recentlyViewedProperties.length === 0) return [];
    const latestViewed = recentlyViewedProperties[0];
    return findSimilarProperties(latestViewed, allProperties, 4);
  }, [recentlyViewedProperties, allProperties]);

  const unreadMessages = mockMessages.filter((m) => !m.read).length;
  const unreadNotifications = mockNotifications.filter((n) => !n.read).length;
  const upcomingTours = mockTours.filter((t) => t.status === 'scheduled').length;
  const activeOffers = mockOffers.filter((o) => o.status === 'submitted').length;

  const isLoading = propertiesLoading || wishlistLoading || viewedLoading;

  return {
    isLoading,
    allProperties,
    convertedProperties,
    recentlyViewedProperties,
    recommendedProperties,
    similarProperties,
    wishlistPropertyIds,
    setWishlistPropertyIds,
    viewedPropertyIds,
    setViewedPropertyIds,
    comparisonProperties,
    setComparisonProperties,
    unreadMessages,
    unreadNotifications,
    upcomingTours,
    activeOffers,
    mockBuyerProfile,
    mockTours,
    mockOffers
  };
};