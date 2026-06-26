import { Property } from '@/types/buyer';

export interface UserPreferences {
  priceRange: { min: number; max: number };
  preferredBedrooms: number[];
  preferredBathrooms: number[];
  preferredPropertyTypes: string[];
  preferredAmenities: string[];
  preferredLocations: { lat: number; lng: number }[];
  maxDistance?: number; // in miles
}

export interface PropertyScore {
  property: Property;
  score: number;
  reasons: string[];
}

/**
 * Calculate similarity score between two properties
 */
export function calculatePropertySimilarity(
  property1: Property,
  property2: Property
): number {
  let score = 0;
  const weights = {
    propertyType: 0.25,
    bedrooms: 0.2,
    bathrooms: 0.15,
    price: 0.2,
    amenities: 0.15,
    location: 0.05
  };

  // Property type match
  if (property1.propertyType === property2.propertyType) {
    score += weights.propertyType;
  }

  // Bedrooms similarity (closer is better)
  const bedroomDiff = Math.abs(property1.bedrooms - property2.bedrooms);
  score += weights.bedrooms * Math.max(0, 1 - bedroomDiff / 3);

  // Bathrooms similarity
  const bathroomDiff = Math.abs(property1.bathrooms - property2.bathrooms);
  score += weights.bathrooms * Math.max(0, 1 - bathroomDiff / 2);

  // Price similarity (within 30% range)
  const priceDiff = Math.abs(property1.price - property2.price) / property1.price;
  score += weights.price * Math.max(0, 1 - priceDiff / 0.3);

  // Amenities overlap
  const amenities1 = new Set(property1.amenities || []);
  const amenities2 = new Set(property2.amenities || []);
  const commonAmenities = [...amenities1].filter(a => amenities2.has(a)).length;
  const totalAmenities = Math.max(amenities1.size, amenities2.size);
  if (totalAmenities > 0) {
    score += weights.amenities * (commonAmenities / totalAmenities);
  }

  // Location proximity (if available)
  if (property1.location && property2.location) {
    const distance = calculateDistance(
      property1.location.lat,
      property1.location.lng,
      property2.location.lat,
      property2.location.lng
    );
    score += weights.location * Math.max(0, 1 - distance / 10); // 10 miles threshold
  }

  return score;
}

/**
 * Calculate distance between two coordinates in miles
 */
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 3959; // Earth's radius in miles
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRad(degrees: number): number {
  return degrees * (Math.PI / 180);
}

/**
 * Generate property recommendations based on user preferences and viewing history
 */
export function generateRecommendations(
  allProperties: Property[],
  viewedPropertyIds: string[],
  wishlistedPropertyIds: string[],
  preferences?: UserPreferences,
  limit: number = 6
): PropertyScore[] {
  const viewedProperties = allProperties.filter(p => 
    viewedPropertyIds.includes(p.id.toString())
  );
  const wishlistedProperties = allProperties.filter(p =>
    wishlistedPropertyIds.includes(p.id.toString())
  );

  // Combine viewed and wishlisted for stronger signal
  const interactedProperties = [...viewedProperties, ...wishlistedProperties];
  
  // Filter out already viewed/wishlisted properties
  const candidateProperties = allProperties.filter(
    p => !viewedPropertyIds.includes(p.id.toString()) && 
         !wishlistedPropertyIds.includes(p.id.toString())
  );

  const scoredProperties: PropertyScore[] = candidateProperties.map(property => {
    let score = 0;
    const reasons: string[] = [];

    // Score based on similarity to interacted properties
    if (interactedProperties.length > 0) {
      const similarityScores = interactedProperties.map(interacted =>
        calculatePropertySimilarity(property, interacted)
      );
      const avgSimilarity = similarityScores.reduce((a, b) => a + b, 0) / similarityScores.length;
      score += avgSimilarity * 0.6;
      
      if (avgSimilarity > 0.7) {
        reasons.push('Similar to properties you liked');
      }
    }

    // Score based on user preferences
    if (preferences) {
      // Price range
      if (property.price >= preferences.priceRange.min && 
          property.price <= preferences.priceRange.max) {
        score += 0.15;
        reasons.push('Within your budget');
      }

      // Bedrooms
      if (preferences.preferredBedrooms.includes(property.bedrooms)) {
        score += 0.1;
        reasons.push(`${property.bedrooms} bedrooms as preferred`);
      }

      // Property type
      if (preferences.preferredPropertyTypes.includes(property.propertyType)) {
        score += 0.1;
        reasons.push(`${property.propertyType} type match`);
      }

      // Amenities
      const matchedAmenities = (property.amenities || []).filter(a =>
        preferences.preferredAmenities.includes(a)
      );
      if (matchedAmenities.length > 0) {
        score += 0.05 * (matchedAmenities.length / preferences.preferredAmenities.length);
        reasons.push(`Has ${matchedAmenities.length} preferred amenities`);
      }
    }

    // Boost for highly rated properties
    if (property.rating && property.rating >= 4.5) {
      score += 0.05;
      reasons.push('Highly rated');
    }

    // Boost for newly listed properties
    if (property.listedDate) {
      const daysSinceListed = Math.floor(
        (new Date().getTime() - new Date(property.listedDate).getTime()) / (1000 * 60 * 60 * 24)
      );
      if (daysSinceListed <= 7) {
        score += 0.05;
        reasons.push('Newly listed');
      }
    }

    return { property, score, reasons };
  });

  // Sort by score and return top recommendations
  return scoredProperties
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

/**
 * Find similar properties to a given property
 */
export function findSimilarProperties(
  targetProperty: Property,
  allProperties: Property[],
  limit: number = 4
): PropertyScore[] {
  const candidateProperties = allProperties.filter(p => p.id !== targetProperty.id);

  const scoredProperties: PropertyScore[] = candidateProperties.map(property => {
    const score = calculatePropertySimilarity(targetProperty, property);
    const reasons: string[] = [];

    if (property.propertyType === targetProperty.propertyType) {
      reasons.push('Same property type');
    }
    if (Math.abs(property.price - targetProperty.price) / targetProperty.price < 0.2) {
      reasons.push('Similar price range');
    }
    if (property.bedrooms === targetProperty.bedrooms) {
      reasons.push('Same number of bedrooms');
    }

    return { property, score, reasons };
  });

  return scoredProperties
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

/**
 * Extract user preferences from viewing and wishlist history
 */
export function extractUserPreferences(
  viewedProperties: Property[],
  wishlistedProperties: Property[]
): UserPreferences {
  const allInteracted = [...viewedProperties, ...wishlistedProperties];

  if (allInteracted.length === 0) {
    return {
      priceRange: { min: 0, max: 10000 },
      preferredBedrooms: [2, 3],
      preferredBathrooms: [2],
      preferredPropertyTypes: ['apartment', 'house'],
      preferredAmenities: [],
      preferredLocations: []
    };
  }

  // Calculate price range (with some buffer)
  const prices = allInteracted.map(p => p.price);
  const avgPrice = prices.reduce((a, b) => a + b, 0) / prices.length;
  const priceStdDev = Math.sqrt(
    prices.reduce((sq, n) => sq + Math.pow(n - avgPrice, 2), 0) / prices.length
  );

  // Most common bedrooms
  const bedroomCounts = new Map<number, number>();
  allInteracted.forEach(p => {
    bedroomCounts.set(p.bedrooms, (bedroomCounts.get(p.bedrooms) || 0) + 1);
  });
  const preferredBedrooms = Array.from(bedroomCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 2)
    .map(([bedrooms]) => bedrooms);

  // Most common property types
  const typeCounts = new Map<string, number>();
  allInteracted.forEach(p => {
    typeCounts.set(p.propertyType, (typeCounts.get(p.propertyType) || 0) + 1);
  });
  const preferredPropertyTypes = Array.from(typeCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 2)
    .map(([type]) => type);

  // Most common amenities
  const amenityCounts = new Map<string, number>();
  allInteracted.forEach(p => {
    if (p.amenities) {
      p.amenities.forEach(a => {
        amenityCounts.set(a, (amenityCounts.get(a) || 0) + 1);
      });
    }
  });
  const preferredAmenities = Array.from(amenityCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([amenity]) => amenity);

  // Preferred locations
  const preferredLocations = allInteracted
    .filter(p => p.location)
    .map(p => p.location!);

  return {
    priceRange: {
      min: Math.max(0, avgPrice - priceStdDev * 1.5),
      max: avgPrice + priceStdDev * 1.5
    },
    preferredBedrooms,
    preferredBathrooms: [2, 2.5, 3],
    preferredPropertyTypes,
    preferredAmenities,
    preferredLocations
  };
}