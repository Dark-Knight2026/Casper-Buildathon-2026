// Property fingerprint utility for duplicate detection
export interface PropertyFingerprint {
  id: string;
  address: string;
  normalizedAddress: string;
  price: number;
  bedrooms: number;
  bathrooms: number;
  sqft: number;
  propertyType: string;
  createdAt: Date;
  ownerId: string;
}

// Normalize address for comparison
export function normalizeAddress(address: string): string {
  const normalized = address
    .toLowerCase()
    .replace(/\b(street|st|avenue|ave|road|rd|boulevard|blvd|drive|dr|lane|ln|court|ct|place|pl)\b/g, '')
    .replace(/[^\w\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  
  return normalized;
}

// Calculate similarity between two addresses using Levenshtein distance
export function calculateAddressSimilarity(addr1: string, addr2: string): number {
  const norm1 = normalizeAddress(addr1);
  const norm2 = normalizeAddress(addr2);
  
  if (norm1 === norm2) return 1.0;
  
  const maxLength = Math.max(norm1.length, norm2.length);
  if (maxLength === 0) return 1.0;
  
  const distance = levenshteinDistance(norm1, norm2);
  return 1 - (distance / maxLength);
}

// Levenshtein distance implementation
function levenshteinDistance(str1: string, str2: string): number {
  const matrix = Array(str2.length + 1).fill(null).map(() => Array(str1.length + 1).fill(null));
  
  for (let i = 0; i <= str1.length; i++) matrix[0][i] = i;
  for (let j = 0; j <= str2.length; j++) matrix[j][0] = j;
  
  for (let j = 1; j <= str2.length; j++) {
    for (let i = 1; i <= str1.length; i++) {
      const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
      matrix[j][i] = Math.min(
        matrix[j][i - 1] + 1, // deletion
        matrix[j - 1][i] + 1, // insertion
        matrix[j - 1][i - 1] + indicator // substitution
      );
    }
  }
  
  return matrix[str2.length][str1.length];
}

// Generate property fingerprint
export function generatePropertyFingerprint(property: {
  address: string;
  price: number;
  bedrooms: number;
  bathrooms: number;
  sqft: number;
  propertyType: string;
  ownerId: string;
}): PropertyFingerprint {
  const normalizedAddress = normalizeAddress(property.address);
  const id = `${normalizedAddress}_${property.price}_${property.bedrooms}_${property.bathrooms}_${property.sqft}`.replace(/\s+/g, '_');
  
  return {
    id,
    address: property.address,
    normalizedAddress,
    price: property.price,
    bedrooms: property.bedrooms,
    bathrooms: property.bathrooms,
    sqft: property.sqft,
    propertyType: property.propertyType,
    createdAt: new Date(),
    ownerId: property.ownerId
  };
}

// Check for potential duplicates
export function findPotentialDuplicates(
  newProperty: PropertyFingerprint,
  existingProperties: PropertyFingerprint[],
  similarityThreshold: number = 0.85
): PropertyFingerprint[] {
  return existingProperties.filter(existing => {
    // Skip if same owner
    if (existing.ownerId === newProperty.ownerId) return false;
    
    // Check address similarity
    const addressSimilarity = calculateAddressSimilarity(existing.address, newProperty.address);
    
    // Check if property details are similar
    const priceDiff = Math.abs(existing.price - newProperty.price) / Math.max(existing.price, newProperty.price);
    const bedroomMatch = existing.bedrooms === newProperty.bedrooms;
    const bathroomMatch = existing.bathrooms === newProperty.bathrooms;
    const sqftDiff = Math.abs(existing.sqft - newProperty.sqft) / Math.max(existing.sqft, newProperty.sqft);
    const typeMatch = existing.propertyType === newProperty.propertyType;
    
    // Consider it a potential duplicate if:
    // - Address similarity is high AND
    // - Price difference is small AND
    // - Property details match closely
    return (
      addressSimilarity >= similarityThreshold &&
      priceDiff <= 0.1 &&
      bedroomMatch &&
      bathroomMatch &&
      sqftDiff <= 0.1 &&
      typeMatch
    );
  });
}

// Fuzzy matching for property search
export function fuzzyMatchProperty(
  searchTerm: string,
  properties: PropertyFingerprint[],
  threshold: number = 0.6
): PropertyFingerprint[] {
  const normalizedSearch = normalizeAddress(searchTerm);
  
  return properties
    .map(property => ({
      property,
      similarity: calculateAddressSimilarity(normalizedSearch, property.address)
    }))
    .filter(item => item.similarity >= threshold)
    .sort((a, b) => b.similarity - a.similarity)
    .map(item => item.property);
}