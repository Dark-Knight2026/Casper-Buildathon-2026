/**
 * Virtual List Component
 * Efficiently renders large lists using virtualization
 */

import React, { useRef, useState, useEffect, useCallback } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';

interface VirtualListProps<T> {
  items: T[];
  itemHeight: number;
  renderItem: (item: T, index: number) => React.ReactNode;
  overscan?: number;
  className?: string;
  emptyMessage?: string;
}

export function VirtualList<T>({
  items,
  itemHeight,
  renderItem,
  overscan = 3,
  className = '',
  emptyMessage = 'No items to display'
}: VirtualListProps<T>) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [containerHeight, setContainerHeight] = useState(0);

  // Update container height on mount and resize
  useEffect(() => {
    const updateHeight = () => {
      if (scrollRef.current) {
        setContainerHeight(scrollRef.current.clientHeight);
      }
    };

    updateHeight();
    window.addEventListener('resize', updateHeight);
    return () => window.removeEventListener('resize', updateHeight);
  }, []);

  // Handle scroll
  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(e.currentTarget.scrollTop);
  }, []);

  // Calculate visible range
  const totalHeight = items.length * itemHeight;
  const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
  const endIndex = Math.min(
    items.length - 1,
    Math.ceil((scrollTop + containerHeight) / itemHeight) + overscan
  );

  const visibleItems = items.slice(startIndex, endIndex + 1);
  const offsetY = startIndex * itemHeight;

  if (items.length === 0) {
    return (
      <div className={`flex items-center justify-center p-12 text-gray-500 ${className}`}>
        {emptyMessage}
      </div>
    );
  }

  return (
    <div
      ref={scrollRef}
      className={`relative overflow-auto ${className}`}
      onScroll={handleScroll}
      style={{ height: '100%' }}
    >
      <div style={{ height: totalHeight, position: 'relative' }}>
        <div style={{ transform: `translateY(${offsetY}px)` }}>
          {visibleItems.map((item, index) => (
            <div
              key={startIndex + index}
              style={{ height: itemHeight }}
            >
              {renderItem(item, startIndex + index)}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/**
 * Virtual Grid Component
 * Efficiently renders large grids using virtualization
 */
interface VirtualGridProps<T> {
  items: T[];
  itemHeight: number;
  columns: number;
  renderItem: (item: T, index: number) => React.ReactNode;
  gap?: number;
  overscan?: number;
  className?: string;
  emptyMessage?: string;
}

export function VirtualGrid<T>({
  items,
  itemHeight,
  columns,
  renderItem,
  gap = 16,
  overscan = 1,
  className = '',
  emptyMessage = 'No items to display'
}: VirtualGridProps<T>) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [containerHeight, setContainerHeight] = useState(0);

  // Update container height on mount and resize
  useEffect(() => {
    const updateHeight = () => {
      if (scrollRef.current) {
        setContainerHeight(scrollRef.current.clientHeight);
      }
    };

    updateHeight();
    window.addEventListener('resize', updateHeight);
    return () => window.removeEventListener('resize', updateHeight);
  }, []);

  // Handle scroll
  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(e.currentTarget.scrollTop);
  }, []);

  // Calculate grid layout
  const rowHeight = itemHeight + gap;
  const totalRows = Math.ceil(items.length / columns);
  const totalHeight = totalRows * rowHeight;

  const startRow = Math.max(0, Math.floor(scrollTop / rowHeight) - overscan);
  const endRow = Math.min(
    totalRows - 1,
    Math.ceil((scrollTop + containerHeight) / rowHeight) + overscan
  );

  const startIndex = startRow * columns;
  const endIndex = Math.min(items.length - 1, (endRow + 1) * columns - 1);

  const visibleItems = items.slice(startIndex, endIndex + 1);
  const offsetY = startRow * rowHeight;

  if (items.length === 0) {
    return (
      <div className={`flex items-center justify-center p-12 text-gray-500 ${className}`}>
        {emptyMessage}
      </div>
    );
  }

  return (
    <div
      ref={scrollRef}
      className={`relative overflow-auto ${className}`}
      onScroll={handleScroll}
      style={{ height: '100%' }}
    >
      <div style={{ height: totalHeight, position: 'relative' }}>
        <div style={{ transform: `translateY(${offsetY}px)` }}>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: `repeat(${columns}, 1fr)`,
              gap: `${gap}px`
            }}
          >
            {visibleItems.map((item, index) => (
              <div key={startIndex + index}>
                {renderItem(item, startIndex + index)}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default VirtualList;