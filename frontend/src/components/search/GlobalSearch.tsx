import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, X, Filter, Clock, Star, TrendingUp, Loader2 } from 'lucide-react';
import { useSearch } from '@/contexts/SearchContext';
import { SearchableEntity } from '@/types/search';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command';

interface GlobalSearchProps {
  isOpen: boolean;
  onClose: () => void;
}

const entityTypeLabels: Record<SearchableEntity, string> = {
  all: 'All',
  property: 'Properties',
  tenant: 'Tenants',
  document: 'Documents',
  agent: 'Agents',
  lease: 'Leases',
  maintenance: 'Maintenance',
};

const entityTypeIcons: Record<SearchableEntity, string> = {
  all: '🔍',
  property: '🏠',
  tenant: '👤',
  document: '📄',
  agent: '👔',
  lease: '📝',
  maintenance: '🔧',
};

export function GlobalSearch({ isOpen, onClose }: GlobalSearchProps) {
  const navigate = useNavigate();
  const {
    query,
    setQuery,
    results,
    isSearching,
    search,
    suggestions,
    getSuggestions,
    searchHistory,
    savedSearches,
  } = useSearch();

  const [selectedEntityTypes, setSelectedEntityTypes] = useState<SearchableEntity[]>(['all']);
  const [showFilters, setShowFilters] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      // Focus input when dialog opens
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  useEffect(() => {
    if (query.length > 0) {
      const debounce = setTimeout(() => {
        getSuggestions(query);
        search(query, selectedEntityTypes);
      }, 300);
      return () => clearTimeout(debounce);
    }
  }, [query, selectedEntityTypes, search, getSuggestions]);

  const handleResultClick = (url?: string) => {
    if (url) {
      navigate(url);
      onClose();
    }
  };

  const toggleEntityType = (type: SearchableEntity) => {
    if (type === 'all') {
      setSelectedEntityTypes(['all']);
    } else {
      const newTypes = selectedEntityTypes.includes(type)
        ? selectedEntityTypes.filter(t => t !== type)
        : [...selectedEntityTypes.filter(t => t !== 'all'), type];
      
      setSelectedEntityTypes(newTypes.length === 0 ? ['all'] : newTypes);
    }
  };

  const getEntityTypeBadgeColor = (type: SearchableEntity): string => {
    const colors: Record<SearchableEntity, string> = {
      all: 'bg-gray-100 text-gray-800',
      property: 'bg-blue-100 text-blue-800',
      tenant: 'bg-green-100 text-green-800',
      document: 'bg-purple-100 text-purple-800',
      agent: 'bg-orange-100 text-orange-800',
      lease: 'bg-pink-100 text-pink-800',
      maintenance: 'bg-yellow-100 text-yellow-800',
    };
    return colors[type] || colors.all;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[80vh] p-0">
        <DialogHeader className="px-6 pt-6 pb-4">
          <DialogTitle className="text-2xl font-bold">Search Everything</DialogTitle>
        </DialogHeader>

        {/* Search Input */}
        <div className="px-6 pb-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <Input
              ref={inputRef}
              type="text"
              placeholder="Search properties, tenants, documents, agents..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="pl-10 pr-10 h-12 text-lg"
            />
            {query && (
              <button
                onClick={() => setQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            )}
          </div>

          {/* Entity Type Filters */}
          <div className="flex flex-wrap gap-2 mt-4">
            {(Object.keys(entityTypeLabels) as SearchableEntity[]).map((type) => (
              <Badge
                key={type}
                variant={selectedEntityTypes.includes(type) ? 'default' : 'outline'}
                className={`cursor-pointer ${
                  selectedEntityTypes.includes(type) ? getEntityTypeBadgeColor(type) : ''
                }`}
                onClick={() => toggleEntityType(type)}
              >
                <span className="mr-1">{entityTypeIcons[type]}</span>
                {entityTypeLabels[type]}
              </Badge>
            ))}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowFilters(!showFilters)}
              className="ml-auto"
            >
              <Filter className="h-4 w-4 mr-2" />
              Filters
            </Button>
          </div>
        </div>

        {/* Results */}
        <ScrollArea className="max-h-[400px] px-6 pb-6">
          {isSearching && (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
            </div>
          )}

          {!isSearching && query && results.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              <Search className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p className="text-lg font-medium">No results found</p>
              <p className="text-sm">Try adjusting your search or filters</p>
            </div>
          )}

          {!isSearching && !query && (
            <div className="space-y-6">
              {/* Recent Searches */}
              {searchHistory.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-gray-500 mb-3 flex items-center">
                    <Clock className="h-4 w-4 mr-2" />
                    Recent Searches
                  </h3>
                  <div className="space-y-2">
                    {searchHistory.slice(0, 5).map((item) => (
                      <button
                        key={item.id}
                        onClick={() => setQuery(item.query)}
                        className="w-full text-left px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-sm">{item.query}</span>
                          <span className="text-xs text-gray-400">
                            {item.resultCount} results
                          </span>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Saved Searches */}
              {savedSearches.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-gray-500 mb-3 flex items-center">
                    <Star className="h-4 w-4 mr-2" />
                    Saved Searches
                  </h3>
                  <div className="space-y-2">
                    {savedSearches.slice(0, 5).map((item) => (
                      <button
                        key={item.id}
                        onClick={() => setQuery(item.query.query)}
                        className="w-full text-left px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium">{item.name}</span>
                          <span className="text-xs text-gray-400">
                            {item.resultCount} results
                          </span>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Popular Searches */}
              <div>
                <h3 className="text-sm font-semibold text-gray-500 mb-3 flex items-center">
                  <TrendingUp className="h-4 w-4 mr-2" />
                  Popular Searches
                </h3>
                <div className="flex flex-wrap gap-2">
                  {['2 bedroom apartments', 'Downtown properties', 'Pet-friendly', 'Under $2000'].map(
                    (term) => (
                      <Badge
                        key={term}
                        variant="secondary"
                        className="cursor-pointer hover:bg-gray-200"
                        onClick={() => setQuery(term)}
                      >
                        {term}
                      </Badge>
                    )
                  )}
                </div>
              </div>
            </div>
          )}

          {!isSearching && results.length > 0 && (
            <div className="space-y-2">
              {results.map((result) => (
                <button
                  key={result.id}
                  onClick={() => handleResultClick(result.url)}
                  className="w-full text-left p-4 rounded-lg hover:bg-gray-50 transition-colors border border-transparent hover:border-gray-200"
                >
                  <div className="flex items-start gap-4">
                    {result.imageUrl && (
                      <img
                        src={result.imageUrl}
                        alt={result.title}
                        className="w-16 h-16 rounded-lg object-cover flex-shrink-0"
                      />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-lg">{entityTypeIcons[result.type]}</span>
                        <Badge variant="secondary" className={getEntityTypeBadgeColor(result.type)}>
                          {entityTypeLabels[result.type]}
                        </Badge>
                      </div>
                      <h4 className="font-semibold text-gray-900 mb-1 truncate">
                        {result.title}
                      </h4>
                      {result.subtitle && (
                        <p className="text-sm text-gray-600 mb-1">{result.subtitle}</p>
                      )}
                      {result.description && (
                        <p className="text-sm text-gray-500 line-clamp-2">
                          {result.description}
                        </p>
                      )}
                    </div>
                    <div className="text-right flex-shrink-0">
                      <div className="text-xs text-gray-400">
                        {Math.round(result.relevanceScore * 100)}% match
                      </div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </ScrollArea>

        {/* Keyboard Shortcuts Hint */}
        <div className="px-6 py-3 border-t bg-gray-50 text-xs text-gray-500 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <span>
              <kbd className="px-2 py-1 bg-white border rounded">↑↓</kbd> Navigate
            </span>
            <span>
              <kbd className="px-2 py-1 bg-white border rounded">Enter</kbd> Select
            </span>
            <span>
              <kbd className="px-2 py-1 bg-white border rounded">Esc</kbd> Close
            </span>
          </div>
          <span>{results.length} results</span>
        </div>
      </DialogContent>
    </Dialog>
  );
}