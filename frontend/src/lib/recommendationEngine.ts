import { Property, BuyerProfile } from '../types/buyer';

interface PropertyScore {
  property: Property;
  score: number;
  reasons: string[];
}

/**
 * AI-powered recommendation engine that analyzes buyer preferences,
 * browsing history, and property features to suggest suitable properties
 */
export class RecommendationEngine {
  /**
   * Calculate recommendation score for a property based on buyer preferences
   */
  static calculatePropertyScore(
    property: Property,
    buyerProfile: BuyerProfile,
    viewedPropertyIds: string[] = [],
    wishlistedPropertyIds: string[] = []
  ): PropertyScore {
    let score = 0;
    const reasons: string[] = [];

    if (!property || !buyerProfile || !buyerProfile.preferences) {
      return { property, score: 0, reasons: [] };
    }

    // Price match (30 points max)
    if (
      property.price >= buyerProfile.preferences.minPrice &&
      property.price <= buyerProfile.preferences.maxPrice
    ) {
      score += 30;
      reasons.push('Within your budget');
    } else if (property.price < buyerProfile.preferences.minPrice) {
      score += 15;
      reasons.push('Below your budget - great value');
    }

    // Bedroom match (20 points)
    if (buyerProfile.preferences.bedrooms && buyerProfile.preferences.bedrooms.includes(property.bedrooms)) {
      score += 20;
      reasons.push(`${property.bedrooms} bedrooms matches your preference`);
    }

    // Bathroom match (15 points)
    if (buyerProfile.preferences.bathrooms && buyerProfile.preferences.bathrooms.includes(property.bathrooms)) {
      score += 15;
      reasons.push('Bathroom count matches your needs');
    }

    // Property type match (15 points)
    if (buyerProfile.preferences.propertyTypes && buyerProfile.preferences.propertyTypes.includes(property.propertyType)) {
      score += 15;
      reasons.push(`${property.propertyType} is your preferred type`);
    }

    // Location match (20 points)
    if (buyerProfile.preferences.locations && buyerProfile.preferences.locations.includes(property.city)) {
      score += 20;
      reasons.push(`Located in ${property.city}, one of your preferred areas`);
    }

    // Feature match (up to 20 points)
    if (property.features && buyerProfile.preferences.mustHaveFeatures) {
      const matchedFeatures = property.features.filter((feature) =>
        buyerProfile.preferences.mustHaveFeatures.some((pref) =>
          feature.toLowerCase().includes(pref.toLowerCase())
        )
      );
      if (matchedFeatures.length > 0) {
        const featureScore = Math.min(20, matchedFeatures.length * 5);
        score += featureScore;
        reasons.push(`Has ${matchedFeatures.length} of your must-have features`);
      }
    }

    // School rating bonus (10 points)
    if (property.schoolRating && property.schoolRating >= 8) {
      score += 10;
      reasons.push('Excellent school rating');
    }

    // Walk score bonus (10 points)
    if (property.walkScore && property.walkScore >= 80) {
      score += 10;
      reasons.push('Highly walkable neighborhood');
    }

    // Low crime rate bonus (10 points)
    if (property.crimeRate === 'low') {
      score += 10;
      reasons.push('Safe neighborhood');
    }

    // Engagement bonus (up to 15 points)
    if (wishlistedPropertyIds && wishlistedPropertyIds.includes(property.id)) {
      score += 15;
      reasons.push('Similar to properties in your wishlist');
    } else if (viewedPropertyIds && viewedPropertyIds.includes(property.id)) {
      score += 10;
      reasons.push('You viewed this property before');
    }

    // Freshness bonus (5 points for new listings)
    if (property.daysOnMarket <= 7) {
      score += 5;
      reasons.push('New listing');
    }

    // Popularity indicator (5 points)
    if (property.views > 300 || property.tourRequests > 10) {
      score += 5;
      reasons.push('High interest from other buyers');
    }

    return {
      property,
      score: Math.min(100, score), // Cap at 100
      reasons: reasons.slice(0, 3), // Show top 3 reasons
    };
  }

  /**
   * Get recommended properties sorted by score
   */
  static getRecommendations(
    allProperties: Property[],
    buyerProfile: BuyerProfile,
    viewedPropertyIds: string[] = [],
    wishlistedPropertyIds: string[] = [],
    limit: number = 10
  ): PropertyScore[] {
    if (!allProperties || !Array.isArray(allProperties)) {
      return [];
    }

    const scoredProperties = allProperties
      .filter((p) => p && p.status === 'active')
      .map((property) =>
        this.calculatePropertyScore(
          property,
          buyerProfile,
          viewedPropertyIds,
          wishlistedPropertyIds
        )
      )
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);

    return scoredProperties;
  }

  /**
   * Find similar properties based on a reference property
   */
  static findSimilarProperties(
    referenceProperty: Property,
    allProperties: Property[],
    limit: number = 5
  ): Property[] {
    if (!referenceProperty || !allProperties || !Array.isArray(allProperties)) {
      return [];
    }

    const similarities = allProperties
      .filter((p) => p && p.id !== referenceProperty.id && p.status === 'active')
      .map((property) => {
        let similarityScore = 0;

        // Price similarity (within 20%)
        const priceDiff = Math.abs(property.price - referenceProperty.price);
        const pricePercent = priceDiff / referenceProperty.price;
        if (pricePercent <= 0.2) similarityScore += 30;
        else if (pricePercent <= 0.4) similarityScore += 15;

        // Same city
        if (property.city === referenceProperty.city) similarityScore += 25;

        // Same property type
        if (property.propertyType === referenceProperty.propertyType) similarityScore += 20;

        // Similar bedrooms
        if (property.bedrooms === referenceProperty.bedrooms) similarityScore += 15;
        else if (Math.abs(property.bedrooms - referenceProperty.bedrooms) === 1)
          similarityScore += 8;

        // Similar bathrooms
        if (property.bathrooms === referenceProperty.bathrooms) similarityScore += 10;

        return { property, similarityScore };
      })
      .sort((a, b) => b.similarityScore - a.similarityScore)
      .slice(0, limit);

    return similarities.map((s) => s.property);
  }
}