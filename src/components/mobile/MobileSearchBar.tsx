import React, { useState, useRef } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Search, 
  Mic, 
  X, 
  MapPin, 
  Clock,
  TrendingUp
} from 'lucide-react';

interface MobileSearchBarProps {
  onSearch: (query: string) => void;
  onVoiceSearch?: () => void;
  placeholder?: string;
  recentSearches?: string[];
  trendingSearches?: string[];
}

interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
}

interface SpeechRecognitionResultList {
  [index: number]: SpeechRecognitionResult;
  length: number;
}

interface SpeechRecognitionResult {
  [index: number]: SpeechRecognitionAlternative;
  isFinal: boolean;
  length: number;
}

interface SpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}

interface SpeechRecognition extends EventTarget {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: Event) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
}

declare global {
  interface Window {
    SpeechRecognition: new () => SpeechRecognition;
    webkitSpeechRecognition: new () => SpeechRecognition;
  }
}

export default function MobileSearchBar({ 
  onSearch, 
  onVoiceSearch,
  placeholder = 'Search properties, locations...',
  recentSearches = [],
  trendingSearches = []
}: MobileSearchBarProps) {
  const [query, setQuery] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSearch = (searchQuery: string) => {
    if (searchQuery.trim()) {
      onSearch(searchQuery.trim());
      setQuery('');
      setIsFocused(false);
      inputRef.current?.blur();
    }
  };

  const handleVoiceSearch = () => {
    if (!onVoiceSearch) return;
    
    setIsListening(true);
    
    // Check if browser supports speech recognition
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.lang = 'en-US';
      recognition.continuous = false;
      recognition.interimResults = false;

      recognition.onresult = (event: SpeechRecognitionEvent) => {
        const transcript = event.results[0][0].transcript;
        setQuery(transcript);
        handleSearch(transcript);
        setIsListening(false);
      };

      recognition.onerror = () => {
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognition.start();
    } else {
      onVoiceSearch();
      setIsListening(false);
    }
  };

  const handleClear = () => {
    setQuery('');
    inputRef.current?.focus();
  };

  return (
    <div className="relative w-full">
      {/* Search Input */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 pointer-events-none" />
        
        <Input
          ref={inputRef}
          type="text"
          placeholder={placeholder}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setTimeout(() => setIsFocused(false), 200)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              handleSearch(query);
            }
          }}
          className="w-full h-14 pl-12 pr-24 text-base rounded-full border-2 focus:border-blue-500 touch-manipulation"
        />

        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center space-x-1">
          {query && (
            <Button
              variant="ghost"
              size="icon"
              onClick={handleClear}
              className="h-10 w-10 rounded-full touch-manipulation"
            >
              <X className="h-5 w-5" />
            </Button>
          )}
          
          {onVoiceSearch && (
            <Button
              variant="ghost"
              size="icon"
              onClick={handleVoiceSearch}
              className={`h-10 w-10 rounded-full touch-manipulation ${
                isListening ? 'bg-red-100 text-red-600 animate-pulse' : ''
              }`}
            >
              <Mic className="h-5 w-5" />
            </Button>
          )}
        </div>
      </div>

      {/* Search Suggestions Dropdown */}
      {isFocused && (query || recentSearches.length > 0 || trendingSearches.length > 0) && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-xl border z-50 max-h-96 overflow-y-auto">
          {/* Recent Searches */}
          {!query && recentSearches.length > 0 && (
            <div className="p-4">
              <div className="flex items-center text-sm font-semibold text-gray-700 mb-3">
                <Clock className="h-4 w-4 mr-2" />
                Recent Searches
              </div>
              <div className="space-y-2">
                {recentSearches.map((search, index) => (
                  <button
                    key={index}
                    onClick={() => handleSearch(search)}
                    className="w-full text-left px-4 py-3 hover:bg-gray-50 rounded-lg transition-colors touch-manipulation"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-gray-900">{search}</span>
                      <Search className="h-4 w-4 text-gray-400" />
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Trending Searches */}
          {!query && trendingSearches.length > 0 && (
            <div className="p-4 border-t">
              <div className="flex items-center text-sm font-semibold text-gray-700 mb-3">
                <TrendingUp className="h-4 w-4 mr-2" />
                Trending Searches
              </div>
              <div className="flex flex-wrap gap-2">
                {trendingSearches.map((search, index) => (
                  <Badge
                    key={index}
                    variant="secondary"
                    className="cursor-pointer hover:bg-gray-200 transition-colors px-4 py-2 text-sm touch-manipulation"
                    onClick={() => handleSearch(search)}
                  >
                    {search}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Quick Filters */}
          {!query && (
            <div className="p-4 border-t">
              <div className="text-sm font-semibold text-gray-700 mb-3">
                Quick Filters
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => handleSearch('apartments under $2000')}
                  className="p-3 text-left bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors touch-manipulation"
                >
                  <div className="text-sm font-medium text-blue-900">Budget Friendly</div>
                  <div className="text-xs text-blue-600">Under $2,000</div>
                </button>
                <button
                  onClick={() => handleSearch('pet friendly houses')}
                  className="p-3 text-left bg-green-50 hover:bg-green-100 rounded-lg transition-colors touch-manipulation"
                >
                  <div className="text-sm font-medium text-green-900">Pet Friendly</div>
                  <div className="text-xs text-green-600">All types</div>
                </button>
                <button
                  onClick={() => handleSearch('luxury condos')}
                  className="p-3 text-left bg-purple-50 hover:bg-purple-100 rounded-lg transition-colors touch-manipulation"
                >
                  <div className="text-sm font-medium text-purple-900">Luxury</div>
                  <div className="text-xs text-purple-600">Premium</div>
                </button>
                <button
                  onClick={() => handleSearch('near me')}
                  className="p-3 text-left bg-orange-50 hover:bg-orange-100 rounded-lg transition-colors touch-manipulation"
                >
                  <div className="text-sm font-medium text-orange-900">Near Me</div>
                  <div className="text-xs text-orange-600">Location based</div>
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}