import React, { useState, useEffect, useCallback } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  ChevronLeft, 
  ChevronRight, 
  ZoomIn, 
  ZoomOut, 
  Maximize2, 
  X,
  Play,
  Pause
} from 'lucide-react';

interface PropertyImage {
  src: string;
  alt: string;
  type: 'exterior' | 'interior' | 'amenity';
}

interface PropertyImageGalleryProps {
  images: PropertyImage[];
  className?: string;
  showThumbnails?: boolean;
  autoPlay?: boolean;
  autoPlayInterval?: number;
}

export default function PropertyImageGallery({ 
  images, 
  className = '', 
  showThumbnails = true,
  autoPlay = false,
  autoPlayInterval = 5000
}: PropertyImageGalleryProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isZoomed, setIsZoomed] = useState(false);
  const [isPlaying, setIsPlaying] = useState(autoPlay);
  const [imageLoaded, setImageLoaded] = useState<boolean[]>(new Array(images.length).fill(false));

  const nextImage = useCallback(() => {
    setCurrentIndex((prev) => (prev + 1) % images.length);
  }, [images.length]);

  const prevImage = useCallback(() => {
    setCurrentIndex((prev) => (prev - 1 + images.length) % images.length);
  }, [images.length]);

  const goToImage = (index: number) => {
    setCurrentIndex(index);
  };

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
    setIsZoomed(false);
  };

  const toggleZoom = () => {
    setIsZoomed(!isZoomed);
  };

  const toggleAutoPlay = () => {
    setIsPlaying(!isPlaying);
  };

  const handleImageLoad = (index: number) => {
    setImageLoaded(prev => {
      const newLoaded = [...prev];
      newLoaded[index] = true;
      return newLoaded;
    });
  };

  // Auto-play functionality
  useEffect(() => {
    if (isPlaying && images.length > 1) {
      const interval = setInterval(nextImage, autoPlayInterval);
      return () => clearInterval(interval);
    }
  }, [isPlaying, images.length, autoPlayInterval, nextImage]);

  if (!images || images.length === 0) {
    return (
      <div className={`bg-gradient-to-br from-gray-100 to-gray-200 rounded-lg overflow-hidden ${className}`}>
        <div className="w-full h-full flex items-center justify-center min-h-[300px]">
          <div className="text-center text-gray-400">
            <div className="w-16 h-16 mx-auto mb-2 bg-gray-300 rounded-full flex items-center justify-center">
              <ZoomIn className="h-8 w-8" />
            </div>
            <p>No images available</p>
          </div>
        </div>
      </div>
    );
  }

  const currentImage = images[currentIndex];

  return (
    <>
      {/* Main Gallery */}
      <div className={`relative group ${className}`}>
        {/* Main Image Container */}
        <div className="relative w-full h-full bg-gray-100 rounded-lg overflow-hidden">
          {/* Loading Skeleton */}
          {!imageLoaded[currentIndex] && (
            <div className="absolute inset-0 bg-gradient-to-br from-gray-200 to-gray-300 animate-pulse">
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-12 h-12 border-4 border-gray-400 border-t-transparent rounded-full animate-spin"></div>
              </div>
            </div>
          )}

          {/* Main Image */}
          <img
            src={currentImage.src}
            alt={currentImage.alt}
            className={`w-full h-full object-cover transition-opacity duration-300 ${
              imageLoaded[currentIndex] ? 'opacity-100' : 'opacity-0'
            }`}
            onLoad={() => handleImageLoad(currentIndex)}
            onClick={toggleFullscreen}
          />

          {/* Image Type Badge */}
          <div className="absolute top-4 left-4 z-10">
            <Badge 
              variant="secondary" 
              className="bg-black/70 text-white border-0 capitalize"
            >
              {currentImage.type}
            </Badge>
          </div>

          {/* Image Counter */}
          <div className="absolute top-4 right-4 z-10">
            <Badge 
              variant="secondary" 
              className="bg-black/70 text-white border-0"
            >
              {currentIndex + 1} / {images.length}
            </Badge>
          </div>

          {/* Navigation Arrows */}
          {images.length > 1 && (
            <>
              <Button
                variant="secondary"
                size="icon"
                className="absolute left-4 top-1/2 transform -translate-y-1/2 bg-white/90 hover:bg-white opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-10"
                onClick={prevImage}
              >
                <ChevronLeft className="h-5 w-5" />
              </Button>
              <Button
                variant="secondary"
                size="icon"
                className="absolute right-4 top-1/2 transform -translate-y-1/2 bg-white/90 hover:bg-white opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-10"
                onClick={nextImage}
              >
                <ChevronRight className="h-5 w-5" />
              </Button>
            </>
          )}

          {/* Bottom Controls */}
          <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex items-center space-x-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-10">
            {/* Auto-play Control */}
            {images.length > 1 && (
              <Button
                variant="secondary"
                size="sm"
                onClick={toggleAutoPlay}
                className="bg-black/70 hover:bg-black/80 text-white border-0"
              >
                {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
              </Button>
            )}

            {/* Fullscreen Button */}
            <Button
              variant="secondary"
              size="sm"
              onClick={toggleFullscreen}
              className="bg-black/70 hover:bg-black/80 text-white border-0"
            >
              <Maximize2 className="h-4 w-4" />
            </Button>
          </div>

          {/* Image Indicators */}
          {images.length > 1 && (
            <div className="absolute bottom-4 left-4 flex space-x-2 z-10">
              {images.map((_, index) => (
                <button
                  key={index}
                  onClick={() => goToImage(index)}
                  className={`w-2 h-2 rounded-full transition-all duration-200 ${
                    index === currentIndex 
                      ? 'bg-white scale-125' 
                      : 'bg-white/50 hover:bg-white/75'
                  }`}
                />
              ))}
            </div>
          )}
        </div>

        {/* Thumbnail Strip */}
        {showThumbnails && images.length > 1 && (
          <div className="mt-4 flex space-x-2 overflow-x-auto pb-2">
            {images.map((image, index) => (
              <button
                key={index}
                onClick={() => goToImage(index)}
                className={`flex-shrink-0 w-20 h-16 rounded-lg overflow-hidden border-2 transition-all duration-200 ${
                  index === currentIndex 
                    ? 'border-purple-500 scale-105' 
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <img
                  src={image.src}
                  alt={image.alt}
                  className="w-full h-full object-cover"
                />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Fullscreen Modal */}
      <Dialog open={isFullscreen} onOpenChange={setIsFullscreen}>
        <DialogContent className="max-w-[95vw] max-h-[95vh] p-0 bg-black">
          <div className="relative w-full h-[95vh] flex items-center justify-center">
            {/* Close Button */}
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleFullscreen}
              className="absolute top-4 right-4 z-20 text-white hover:bg-white/20"
            >
              <X className="h-6 w-6" />
            </Button>

            {/* Zoom Controls */}
            <div className="absolute top-4 left-4 z-20 flex space-x-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={toggleZoom}
                className="text-white hover:bg-white/20"
              >
                {isZoomed ? <ZoomOut className="h-6 w-6" /> : <ZoomIn className="h-6 w-6" />}
              </Button>
            </div>

            {/* Fullscreen Image */}
            <img
              src={currentImage.src}
              alt={currentImage.alt}
              className={`max-w-full max-h-full object-contain transition-transform duration-300 ${
                isZoomed ? 'scale-150 cursor-move' : 'cursor-zoom-in'
              }`}
              onClick={toggleZoom}
            />

            {/* Fullscreen Navigation */}
            {images.length > 1 && (
              <>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={prevImage}
                  className="absolute left-4 top-1/2 transform -translate-y-1/2 text-white hover:bg-white/20 z-20"
                >
                  <ChevronLeft className="h-8 w-8" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={nextImage}
                  className="absolute right-4 top-1/2 transform -translate-y-1/2 text-white hover:bg-white/20 z-20"
                >
                  <ChevronRight className="h-8 w-8" />
                </Button>
              </>
            )}

            {/* Fullscreen Image Counter */}
            <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 z-20">
              <Badge className="bg-black/70 text-white border-0">
                {currentIndex + 1} / {images.length}
              </Badge>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}