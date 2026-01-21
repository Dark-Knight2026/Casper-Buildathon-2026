import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  ChevronLeft, 
  ChevronRight, 
  X, 
  ZoomIn, 
  ZoomOut,
  Share2,
  Download
} from 'lucide-react';

interface MobilePropertyGalleryProps {
  images: Array<{ src: string; alt: string }>;
  onClose?: () => void;
  className?: string;
}

export default function MobilePropertyGallery({ 
  images, 
  onClose,
  className = '' 
}: MobilePropertyGalleryProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);
  const [scale, setScale] = useState(1);
  const [isPinching, setIsPinching] = useState(false);
  const [initialDistance, setInitialDistance] = useState<number | null>(null);
  const imageRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const minSwipeDistance = 50;

  const nextImage = useCallback(() => {
    setCurrentIndex((prev) => (prev + 1) % images.length);
    setScale(1);
  }, [images.length]);

  const previousImage = useCallback(() => {
    setCurrentIndex((prev) => (prev - 1 + images.length) % images.length);
    setScale(1);
  }, [images.length]);

  const getDistance = (touch1: React.Touch, touch2: React.Touch) => {
    const dx = touch1.clientX - touch2.clientX;
    const dy = touch1.clientY - touch2.clientY;
    return Math.sqrt(dx * dx + dy * dy);
  };

  // Handle touch swipe for navigation
  const onTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      // Pinch gesture
      setIsPinching(true);
      const distance = getDistance(e.touches[0], e.touches[1]);
      setInitialDistance(distance);
    } else {
      // Swipe gesture
      setTouchEnd(null);
      setTouchStart(e.targetTouches[0].clientX);
    }
  };

  const onTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 2 && isPinching && initialDistance) {
      // Pinch zoom
      const currentDistance = getDistance(e.touches[0], e.touches[1]);
      const scaleChange = currentDistance / initialDistance;
      const newScale = Math.min(Math.max(scale * scaleChange, 0.5), 3);
      setScale(newScale);
      setInitialDistance(currentDistance);
    } else if (e.touches.length === 1 && !isPinching) {
      // Swipe
      setTouchEnd(e.targetTouches[0].clientX);
    }
  };

  const onTouchEnd = () => {
    if (isPinching) {
      setIsPinching(false);
      setInitialDistance(null);
      return;
    }

    if (!touchStart || !touchEnd) return;

    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;

    if (isLeftSwipe && currentIndex < images.length - 1) {
      nextImage();
    } else if (isRightSwipe && currentIndex > 0) {
      previousImage();
    }
  };

  const handleZoomIn = () => {
    setScale((prev) => Math.min(prev + 0.5, 3));
  };

  const handleZoomOut = () => {
    setScale((prev) => Math.max(prev - 0.5, 0.5));
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Property Image',
          text: 'Check out this property!',
          url: window.location.href
        });
      } catch (error) {
        console.log('Error sharing:', error);
      }
    }
  };

  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = images[currentIndex].src;
    link.download = `property-image-${currentIndex + 1}.jpg`;
    link.click();
  };

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') previousImage();
      if (e.key === 'ArrowRight') nextImage();
      if (e.key === 'Escape' && onClose) onClose();
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentIndex, nextImage, previousImage, onClose]);

  return (
    <div className={`fixed inset-0 z-50 bg-black ${className}`}>
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 z-10 bg-gradient-to-b from-black/70 to-transparent p-4">
        <div className="flex items-center justify-between">
          <Badge variant="secondary" className="bg-white/20 text-white backdrop-blur-sm">
            {currentIndex + 1} / {images.length}
          </Badge>
          
          <div className="flex items-center space-x-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={handleShare}
              className="text-white hover:bg-white/20"
            >
              <Share2 className="h-5 w-5" />
            </Button>
            
            <Button
              variant="ghost"
              size="icon"
              onClick={handleDownload}
              className="text-white hover:bg-white/20"
            >
              <Download className="h-5 w-5" />
            </Button>

            {onClose && (
              <Button
                variant="ghost"
                size="icon"
                onClick={onClose}
                className="text-white hover:bg-white/20"
              >
                <X className="h-5 w-5" />
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Main Image */}
      <div
        ref={containerRef}
        className="absolute inset-0 flex items-center justify-center overflow-hidden"
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        <div
          ref={imageRef}
          style={{
            transform: `scale(${scale})`,
            transition: isPinching ? 'none' : 'transform 0.3s ease-out'
          }}
          className="w-full h-full flex items-center justify-center"
        >
          <img
            src={images[currentIndex].src}
            alt={images[currentIndex].alt}
            className="max-w-full max-h-full object-contain"
            draggable={false}
          />
        </div>
      </div>

      {/* Navigation Arrows */}
      {currentIndex > 0 && (
        <Button
          variant="ghost"
          size="icon"
          onClick={previousImage}
          className="absolute left-4 top-1/2 -translate-y-1/2 text-white hover:bg-white/20 w-12 h-12"
        >
          <ChevronLeft className="h-8 w-8" />
        </Button>
      )}

      {currentIndex < images.length - 1 && (
        <Button
          variant="ghost"
          size="icon"
          onClick={nextImage}
          className="absolute right-4 top-1/2 -translate-y-1/2 text-white hover:bg-white/20 w-12 h-12"
        >
          <ChevronRight className="h-8 w-8" />
        </Button>
      )}

      {/* Zoom Controls */}
      <div className="absolute bottom-20 left-1/2 -translate-x-1/2 flex items-center space-x-2 bg-black/50 backdrop-blur-sm rounded-full p-2">
        <Button
          variant="ghost"
          size="icon"
          onClick={handleZoomOut}
          disabled={scale <= 0.5}
          className="text-white hover:bg-white/20 w-10 h-10"
        >
          <ZoomOut className="h-5 w-5" />
        </Button>
        
        <span className="text-white text-sm font-medium px-2 min-w-[60px] text-center">
          {Math.round(scale * 100)}%
        </span>
        
        <Button
          variant="ghost"
          size="icon"
          onClick={handleZoomIn}
          disabled={scale >= 3}
          className="text-white hover:bg-white/20 w-10 h-10"
        >
          <ZoomIn className="h-5 w-5" />
        </Button>
      </div>

      {/* Thumbnail Strip */}
      <div className="absolute bottom-4 left-0 right-0 px-4">
        <div className="flex space-x-2 overflow-x-auto pb-2 scrollbar-hide">
          {images.map((image, index) => (
            <button
              key={index}
              onClick={() => {
                setCurrentIndex(index);
                setScale(1);
              }}
              className={`flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 transition-all ${
                index === currentIndex
                  ? 'border-white scale-110'
                  : 'border-white/30 opacity-60'
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
      </div>

      {/* Swipe Hint */}
      {images.length > 1 && (
        <div className="absolute bottom-24 left-1/2 -translate-x-1/2 text-white/60 text-sm">
          ← Swipe to navigate →
        </div>
      )}

      <style>{`
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
    </div>
  );
}