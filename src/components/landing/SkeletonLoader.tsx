import { motion } from 'framer-motion';

interface SkeletonLoaderProps {
  type: 'testimonials' | 'pricing' | 'card';
  count?: number;
}

export default function SkeletonLoader({ type, count = 1 }: SkeletonLoaderProps) {
  if (type === 'testimonials') {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[...Array(count)].map((_, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="bg-white rounded-lg shadow-lg p-6 sm:p-8"
          >
            {/* Quote Icon Skeleton */}
            <div className="w-10 h-10 bg-gray-200 rounded-lg mb-4 animate-pulse" />
            
            {/* Rating Skeleton */}
            <div className="flex items-center gap-1 mb-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="w-5 h-5 bg-gray-200 rounded animate-pulse" />
              ))}
            </div>
            
            {/* Text Skeleton */}
            <div className="space-y-2 mb-6">
              <div className="h-4 bg-gray-200 rounded animate-pulse" />
              <div className="h-4 bg-gray-200 rounded animate-pulse w-5/6" />
              <div className="h-4 bg-gray-200 rounded animate-pulse w-4/6" />
            </div>
            
            {/* Author Skeleton */}
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-gray-200 rounded-full animate-pulse" />
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-gray-200 rounded animate-pulse w-3/4" />
                <div className="h-3 bg-gray-200 rounded animate-pulse w-1/2" />
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    );
  }

  if (type === 'pricing') {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {[...Array(count)].map((_, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="bg-white rounded-lg shadow-lg border-2 border-gray-200 p-8"
          >
            {/* Badge Skeleton */}
            <div className="h-6 w-24 bg-gray-200 rounded-full mb-4 mx-auto animate-pulse" />
            
            {/* Title Skeleton */}
            <div className="h-8 bg-gray-200 rounded mb-4 animate-pulse" />
            
            {/* Price Skeleton */}
            <div className="h-12 bg-gray-200 rounded mb-4 animate-pulse" />
            
            {/* Description Skeleton */}
            <div className="h-4 bg-gray-200 rounded mb-8 animate-pulse" />
            
            {/* Features Skeleton */}
            <div className="space-y-4 mb-8">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="w-5 h-5 bg-gray-200 rounded-full animate-pulse" />
                  <div className="h-4 bg-gray-200 rounded flex-1 animate-pulse" />
                </div>
              ))}
            </div>
            
            {/* Button Skeleton */}
            <div className="h-12 bg-gray-200 rounded animate-pulse" />
          </motion.div>
        ))}
      </div>
    );
  }

  // Default card skeleton
  return (
    <div className="space-y-4">
      {[...Array(count)].map((_, index) => (
        <div key={index} className="bg-white rounded-lg shadow p-6 animate-pulse">
          <div className="h-4 bg-gray-200 rounded mb-2" />
          <div className="h-4 bg-gray-200 rounded w-5/6" />
        </div>
      ))}
    </div>
  );
}