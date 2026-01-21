import { createContext, useState, useEffect, ReactNode } from 'react';
import { logger } from '@/utils/logger';

interface Shortlist {
  id: string;
  name: string;
  description: string;
  agentIds: string[];
  createdAt: string;
  color: string;
}

interface FavoritesContextType {
  favoriteAgentIds: string[];
  shortlists: Shortlist[];
  toggleFavorite: (agentId: string) => void;
  isFavorite: (agentId: string) => boolean;
  createShortlist: (name: string, description: string, color: string) => void;
  deleteShortlist: (shortlistId: string) => void;
  updateShortlist: (shortlistId: string, updates: Partial<Shortlist>) => void;
  addToShortlist: (shortlistId: string, agentId: string) => void;
  removeFromShortlist: (shortlistId: string, agentId: string) => void;
  isInShortlist: (shortlistId: string, agentId: string) => boolean;
  clearAllFavorites: () => void;
}

// eslint-disable-next-line react-refresh/only-export-components
export const FavoritesContext = createContext<FavoritesContextType | undefined>(undefined);

export default function FavoritesProvider({ children }: { children: ReactNode }) {
  const [favoriteAgentIds, setFavoriteAgentIds] = useState<string[]>([]);
  const [shortlists, setShortlists] = useState<Shortlist[]>([]);

  // Load from localStorage on mount
  useEffect(() => {
    const savedFavorites = localStorage.getItem('favoriteAgents');
    const savedShortlists = localStorage.getItem('agentShortlists');
    
    if (savedFavorites) {
      try {
        setFavoriteAgentIds(JSON.parse(savedFavorites));
      } catch (e) {
        logger.error('Failed to parse favorites:', e);
      }
    }

    if (savedShortlists) {
      try {
        setShortlists(JSON.parse(savedShortlists));
      } catch (e) {
        logger.error('Failed to parse shortlists:', e);
      }
    }
  }, []);

  // Save to localStorage whenever favorites change
  useEffect(() => {
    localStorage.setItem('favoriteAgents', JSON.stringify(favoriteAgentIds));
  }, [favoriteAgentIds]);

  // Save to localStorage whenever shortlists change
  useEffect(() => {
    localStorage.setItem('agentShortlists', JSON.stringify(shortlists));
  }, [shortlists]);

  const toggleFavorite = (agentId: string) => {
    setFavoriteAgentIds((prev) => {
      if (prev.includes(agentId)) {
        return prev.filter((id) => id !== agentId);
      } else {
        return [...prev, agentId];
      }
    });
  };

  const isFavorite = (agentId: string) => {
    return favoriteAgentIds.includes(agentId);
  };

  const createShortlist = (name: string, description: string, color: string) => {
    const newShortlist: Shortlist = {
      id: `shortlist-${Date.now()}`,
      name,
      description,
      agentIds: [],
      createdAt: new Date().toISOString(),
      color,
    };
    setShortlists((prev) => [...prev, newShortlist]);
  };

  const deleteShortlist = (shortlistId: string) => {
    setShortlists((prev) => prev.filter((list) => list.id !== shortlistId));
  };

  const updateShortlist = (shortlistId: string, updates: Partial<Shortlist>) => {
    setShortlists((prev) =>
      prev.map((list) =>
        list.id === shortlistId ? { ...list, ...updates } : list
      )
    );
  };

  const addToShortlist = (shortlistId: string, agentId: string) => {
    setShortlists((prev) =>
      prev.map((list) => {
        if (list.id === shortlistId && !list.agentIds.includes(agentId)) {
          return { ...list, agentIds: [...list.agentIds, agentId] };
        }
        return list;
      })
    );
  };

  const removeFromShortlist = (shortlistId: string, agentId: string) => {
    setShortlists((prev) =>
      prev.map((list) => {
        if (list.id === shortlistId) {
          return { ...list, agentIds: list.agentIds.filter((id) => id !== agentId) };
        }
        return list;
      })
    );
  };

  const isInShortlist = (shortlistId: string, agentId: string) => {
    const shortlist = shortlists.find((list) => list.id === shortlistId);
    return shortlist ? shortlist.agentIds.includes(agentId) : false;
  };

  const clearAllFavorites = () => {
    setFavoriteAgentIds([]);
  };

  return (
    <FavoritesContext.Provider
      value={{
        favoriteAgentIds,
        shortlists,
        toggleFavorite,
        isFavorite,
        createShortlist,
        deleteShortlist,
        updateShortlist,
        addToShortlist,
        removeFromShortlist,
        isInShortlist,
        clearAllFavorites,
      }}
    >
      {children}
    </FavoritesContext.Provider>
  );
}