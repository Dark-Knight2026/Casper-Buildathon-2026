import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Property } from '@/types/property';
import SwipeablePropertyCard from './SwipeablePropertyCard';
import { Loader2, RefreshCw } from 'lucide-react';

interface MobilePropertyListProps {
  properties: Property[];
  onViewDetails: (property: Property) => void;
  onFavorite: (propertyId: number) => void;
  onCompare: (property: Property) => void;
  favorites?: number[];
  comparisonList?: Property[];
  onLoadMore?: () => void;
  hasMore?: boolean;
  isLoading?: boolean;
  onRefresh?: () => void;
}

export default function MobilePropertyList({
  properties,
  onViewDetails,
  onFavorite,
  onCompare,
  favorites = [],
  comparisonList = [],
  onLoadMore,
  hasMore = false,
  isLoading = false,
  onRefresh
}: MobilePropertyListProps) {
  const [isPullToRefresh, setIsPullToRefresh] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const observerTarget = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const maxPullDistance = 80;
  const refreshThreshold = 60;

  // Infinite scroll observer
  useEffect(() => {
    if (!onLoadMore || !hasMore || isLoading) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          onLoadMore();
        }
      },
      { threshold: 0.1 }
    );

    const currentTarget = observerTarget.current;
    if (currentTarget) {
      observer.observe(currentTarget);
    }

    return () => {
      if (currentTarget) {
        observer.unobserve(currentTarget);
      }
    };
  }, [onLoadMore, hasMore, isLoading]);

  // Pull to refresh
  const handleTouchStart = (e: React.TouchEvent) => {
    if (containerRef.current && containerRef.current.scrollTop === 0) {
      setTouchStart(e.touches[0].clientY);
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (touchStart === null || !onRefresh) return;

    const currentTouch = e.touches[0].clientY;
    const distance = currentTouch - touchStart;

    if (distance > 0 && containerRef.current && containerRef.current.scrollTop === 0) {
      e.preventDefault();
      const clampedDistance = Math.min(distance, maxPullDistance);
      setPullDistance(clampedDistance);

      if (clampedDistance >= refreshThreshold) {
        setIsPullToRefresh(true);
      } else {
        setIsPullToRefresh(false);
      }
    }
  };

  const handleTouchEnd = () => {
    if (isPullToRefresh && onRefresh) {
      onRefresh();
    }

    setTouchStart(null);
    setPullDistance(0);
    setIsPullToRefresh(false);
  };

  return (
    <div
      ref={containerRef}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      className="relative overflow-y-auto h-full"
      style={{ 
        touchAction: pullDistance > 0 ? 'none' : 'auto',
        overscrollBehavior: 'contain'
      }}
    >
      {/* Pull to Refresh Indicator */}
      {onRefresh && (
        <div
          className="absolute top-0 left-0 right-0 flex items-center justify-center transition-all duration-200"
          style={{
            height: pullDistance,
            opacity: pullDistance / maxPullDistance
          }}
        >
          <div className="flex flex-col items-center">
            <RefreshCw
              className={`h-6 w-6 text-blue-600 ${
                isPullToRefresh ? 'animate-spin' : ''
              }`}
              style={{
                transform: `rotate(${pullDistance * 3}deg)`
              }}
            />
            <span className="text-sm text-gray-600 mt-2">
              {isPullToRefresh ? 'Release to refresh' : 'Pull to refresh'}
            </span>
          </div>
        </div>
      )}

      {/* Property List */}
      <div 
        className="space-y-4 p-4"
        style={{
          transform: `translateY(${pullDistance}px)`,
          transition: touchStart ? 'none' : 'transform 0.3s ease-out'
        }}
      >
        {properties.map((property) => (
          <SwipeablePropertyCard
            key={property.id}
            property={property}
            onViewDetails={onViewDetails}
            onFavorite={onFavorite}
            onCompare={onCompare}
            isFavorited={favorites.includes(property.id)}
            isInComparison={comparisonList.some(p => p.id === property.id)}
          />
        ))}

        {/* Loading Indicator */}
        {isLoading && (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            <span className="ml-2 text-gray-600">Loading more properties...</span>
          </div>
        )}

        {/* Infinite Scroll Trigger */}
        {hasMore && !isLoading && (
          <div ref={observerTarget} className="h-4" />
        )}

        {/* End of List */}
        {!hasMore && properties.length > 0 && (
          <div className="text-center py-8 text-gray-500">
            <p>You've reached the end of the list</p>
            <p className="text-sm mt-1">Showing all {properties.length} properties</p>
          </div>
        )}

        {/* Empty State */}
        {properties.length === 0 && !isLoading && (
          <div className="text-center py-12">
            <div className="text-gray-400 mb-4">
              <svg className="w-16 h-16 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No Properties Found</h3>
            <p className="text-gray-600">Try adjusting your search or filters</p>
          </div>
        )}
      </div>
    </div>
  );
}