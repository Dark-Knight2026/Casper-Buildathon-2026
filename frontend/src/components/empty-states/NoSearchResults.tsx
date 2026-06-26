/**
 * No Search Results Empty State
 * Displayed when search returns no results
 */

import { Search, X } from 'lucide-react';
import { EmptyState } from './EmptyState';

interface NoSearchResultsProps {
  query?: string;
  compact?: boolean;
  onClearFilters?: () => void;
}

export function NoSearchResults({ 
  query, 
  compact = false, 
  onClearFilters 
}: NoSearchResultsProps) {
  return (
    <EmptyState
      icon={Search}
      heading="No results found"
      message={
        query
          ? `No results for "${query}". Try adjusting your search or filters.`
          : 'Try adjusting your filters to find what you\'re looking for.'
      }
      action={
        onClearFilters
          ? {
              label: 'Clear Filters',
              onClick: onClearFilters,
              icon: X,
            }
          : undefined
      }
      compact={compact}
    />
  );
}