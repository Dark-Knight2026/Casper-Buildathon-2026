/**
 * Fuzzy matching utility for search
 * Implements Levenshtein distance algorithm for string similarity
 */

/**
 * Calculate Levenshtein distance between two strings
 * Returns a number between 0 (no match) and 1 (perfect match)
 */
export function calculateSimilarity(str1: string, str2: string): number {
  const s1 = str1.toLowerCase();
  const s2 = str2.toLowerCase();

  // Quick exact match check
  if (s1 === s2) return 1;
  if (s1.length === 0 || s2.length === 0) return 0;

  // Check if one string contains the other
  if (s1.includes(s2) || s2.includes(s1)) {
    return 0.8 + (0.2 * Math.min(s1.length, s2.length) / Math.max(s1.length, s2.length));
  }

  // Calculate Levenshtein distance
  const matrix: number[][] = [];

  for (let i = 0; i <= s2.length; i++) {
    matrix[i] = [i];
  }

  for (let j = 0; j <= s1.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= s2.length; i++) {
    for (let j = 1; j <= s1.length; j++) {
      if (s2.charAt(i - 1) === s1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          matrix[i][j - 1] + 1,     // insertion
          matrix[i - 1][j] + 1      // deletion
        );
      }
    }
  }

  const distance = matrix[s2.length][s1.length];
  const maxLength = Math.max(s1.length, s2.length);
  
  // Convert distance to similarity score (0-1)
  return 1 - (distance / maxLength);
}

/**
 * Fuzzy match a query against a text field
 * Returns true if similarity is above threshold
 */
export function fuzzyMatch(query: string, text: string, threshold: number = 0.6): boolean {
  if (!query || !text) return false;
  
  const similarity = calculateSimilarity(query, text);
  return similarity >= threshold;
}

/**
 * Calculate relevance score for a search result
 * Considers multiple factors: exact match, partial match, position, and field importance
 */
export function calculateRelevanceScore(
  query: string,
  fields: { text: string; weight: number }[]
): number {
  let totalScore = 0;
  let totalWeight = 0;

  const queryLower = query.toLowerCase();

  fields.forEach(({ text, weight }) => {
    if (!text) return;

    const textLower = text.toLowerCase();
    let fieldScore = 0;

    // Exact match bonus
    if (textLower === queryLower) {
      fieldScore = 1.0;
    }
    // Contains query bonus
    else if (textLower.includes(queryLower)) {
      // Position bonus: earlier matches score higher
      const position = textLower.indexOf(queryLower);
      const positionScore = 1 - (position / textLower.length);
      fieldScore = 0.7 + (0.3 * positionScore);
    }
    // Fuzzy match
    else {
      fieldScore = calculateSimilarity(queryLower, textLower);
    }

    totalScore += fieldScore * weight;
    totalWeight += weight;
  });

  return totalWeight > 0 ? totalScore / totalWeight : 0;
}

/**
 * Generate search suggestions based on partial input
 * Uses fuzzy matching to find similar terms
 */
export function generateFuzzySuggestions(
  partial: string,
  candidates: string[],
  limit: number = 5
): string[] {
  if (!partial || partial.length < 2) return [];

  const scored = candidates
    .map(candidate => ({
      text: candidate,
      score: calculateSimilarity(partial, candidate),
    }))
    .filter(item => item.score > 0.5)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);

  return scored.map(item => item.text);
}