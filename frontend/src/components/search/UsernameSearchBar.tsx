import { useState, useEffect, useRef, useCallback } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { useUsernameSearch } from '@/contexts/UsernameSearchContext';
import { UsernameSearchResult, CSPRUser } from '@/types/username';
import { Search, User, X, AtSign, Hash } from 'lucide-react';

interface UsernameSearchBarProps {
  onUserSelect?: (user: CSPRUser) => void;
  onAssignmentCreate?: (username: string) => void;
  placeholder?: string;
  showAssignButton?: boolean;
  allowMultiSelect?: boolean;
  selectedUsers?: CSPRUser[];
  className?: string;
}

export default function UsernameSearchBar({
  onUserSelect,
  onAssignmentCreate,
  placeholder = "Search users (@username or CSPR.name)",
  showAssignButton = false,
  allowMultiSelect = false,
  selectedUsers = [],
  className = ""
}: UsernameSearchBarProps) {
  const {
    searchUsers,
    searchSuggestions,
    isSearching,
    validateUsername
  } = useUsernameSearch();

  const [searchQuery, setSearchQuery] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedUsersList, setSelectedUsersList] = useState<CSPRUser[]>(selectedUsers);
  const [validationError, setValidationError] = useState<string | null>(null);
  
  const searchRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const performSearch = useCallback(async (query: string) => {
    try {
      setValidationError(null);
      await searchUsers(query);
      setShowSuggestions(true);
    } catch (error) {
      setValidationError(error instanceof Error ? error.message : 'Search failed');
    }
  }, [searchUsers]);

  // Handle search input changes
  useEffect(() => {
    const delayedSearch = setTimeout(() => {
      if (searchQuery.trim().length >= 2) {
        performSearch(searchQuery);
      } else {
        setShowSuggestions(false);
      }
    }, 300);

    return () => clearTimeout(delayedSearch);
  }, [searchQuery, performSearch]);

  // Handle clicks outside to close suggestions
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchQuery(value);
    
    // Clear validation error when user starts typing
    if (validationError) {
      setValidationError(null);
    }
  };

  const handleUserSelect = (result: UsernameSearchResult) => {
    const user = result.user;
    
    if (allowMultiSelect) {
      if (!selectedUsersList.find(u => u.id === user.id)) {
        const newSelection = [...selectedUsersList, user];
        setSelectedUsersList(newSelection);
        onUserSelect?.(user);
      }
    } else {
      setSearchQuery(user.username_alias);
      onUserSelect?.(user);
    }
    
    setShowSuggestions(false);
  };

  const handleRemoveUser = (userId: string) => {
    const newSelection = selectedUsersList.filter(u => u.id !== userId);
    setSelectedUsersList(newSelection);
  };

  const handleAssignClick = () => {
    if (searchQuery.trim()) {
      const validation = validateUsername(searchQuery);
      if (validation.is_valid) {
        onAssignmentCreate?.(searchQuery);
        setSearchQuery('');
      } else {
        setValidationError(validation.error_message || 'Invalid username format');
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (searchSuggestions.length > 0) {
        handleUserSelect(searchSuggestions[0]);
      } else if (showAssignButton && searchQuery.trim()) {
        handleAssignClick();
      }
    } else if (e.key === 'Escape') {
      setShowSuggestions(false);
    }
  };

  const getMatchTypeIcon = (matchType: UsernameSearchResult['match_type']) => {
    switch (matchType) {
      case 'cspr_name':
        return <Hash className="h-3 w-3 text-blue-500" />;
      case 'username_alias':
        return <AtSign className="h-3 w-3 text-green-500" />;
      case 'display_name':
        return <User className="h-3 w-3 text-purple-500" />;
      case 'email':
        return <User className="h-3 w-3 text-gray-500" />;
      default:
        return <User className="h-3 w-3" />;
    }
  };

  const getMatchTypeLabel = (matchType: UsernameSearchResult['match_type']) => {
    switch (matchType) {
      case 'cspr_name':
        return 'CSPR Name';
      case 'username_alias':
        return 'Username';
      case 'display_name':
        return 'Display Name';
      case 'email':
        return 'Email';
      default:
        return 'Match';
    }
  };

  return (
    <div ref={searchRef} className={`relative ${className}`}>
      {/* Selected Users (Multi-select mode) */}
      {allowMultiSelect && selectedUsersList.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-2">
          {selectedUsersList.map((user) => (
            <Badge key={user.id} variant="secondary" className="flex items-center gap-1">
              {user.username_alias}
              <X
                className="h-3 w-3 cursor-pointer"
                onClick={() => handleRemoveUser(user.id)}
              />
            </Badge>
          ))}
        </div>
      )}

      {/* Search Input */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            ref={inputRef}
            type="text"
            placeholder={placeholder}
            value={searchQuery}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            onFocus={() => searchQuery.length >= 2 && setShowSuggestions(true)}
            className={`pl-10 ${validationError ? 'border-red-500' : ''}`}
          />
          {isSearching && (
            <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
            </div>
          )}
        </div>
        
        {showAssignButton && (
          <Button onClick={handleAssignClick} disabled={!searchQuery.trim()}>
            Assign
          </Button>
        )}
      </div>

      {/* Validation Error */}
      {validationError && (
        <p className="text-sm text-red-500 mt-1">{validationError}</p>
      )}

      {/* Search Suggestions */}
      {showSuggestions && searchSuggestions.length > 0 && (
        <Card className="absolute top-full left-0 right-0 mt-1 z-50 max-h-60 overflow-y-auto">
          <CardContent className="p-0">
            {searchSuggestions.map((result, index) => (
              <div
                key={result.user.id}
                className="flex items-center gap-3 p-3 hover:bg-gray-50 cursor-pointer border-b last:border-b-0"
                onClick={() => handleUserSelect(result)}
              >
                {/* Avatar */}
                <div className="h-8 w-8 bg-blue-100 rounded-full flex items-center justify-center">
                  {result.user.avatar ? (
                    <img
                      src={result.user.avatar}
                      alt={result.user.display_name}
                      className="h-8 w-8 rounded-full"
                    />
                  ) : (
                    <User className="h-4 w-4 text-blue-600" />
                  )}
                </div>

                {/* User Info */}
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{result.user.display_name}</span>
                    <Badge variant="outline" className="text-xs">
                      {result.user.role}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <span>{result.user.username_alias}</span>
                    <span className="text-gray-400">•</span>
                    <span>{result.user.cspr_name}</span>
                  </div>
                </div>

                {/* Match Type Indicator */}
                <div className="flex items-center gap-1">
                  {getMatchTypeIcon(result.match_type)}
                  <span className="text-xs text-gray-500">
                    {getMatchTypeLabel(result.match_type)}
                  </span>
                </div>

                {/* Relevance Score */}
                <div className="text-xs text-gray-400">
                  {result.relevance_score}%
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* No Results Message */}
      {showSuggestions && searchSuggestions.length === 0 && searchQuery.length >= 2 && !isSearching && (
        <Card className="absolute top-full left-0 right-0 mt-1 z-50">
          <CardContent className="p-3 text-center text-gray-500">
            <div className="flex flex-col items-center gap-2">
              <Search className="h-6 w-6 text-gray-400" />
              <p>No users found for "{searchQuery}"</p>
              <p className="text-xs">
                Try searching with @username or CSPR.name format
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Format Helper */}
      <div className="mt-2 text-xs text-gray-500">
        <p>
          <strong>Search formats:</strong> @JohnRobinson, CSPR.JohnRobinson, or "John Robinson"
        </p>
      </div>
    </div>
  );
}