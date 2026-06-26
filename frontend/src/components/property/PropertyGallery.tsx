import { useState, type ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Home } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PropertyGalleryProps {
  images: string[];
  title: string;
  /** Optional node pinned over the image (e.g. a property-type badge). */
  overlay?: ReactNode;
}

/**
 * Image gallery for the listing detail page: main image with prev/next
 * controls, dot indicators, and a thumbnail strip. Owns its own active-index
 * state so the host page doesn't have to.
 */
export function PropertyGallery({
  images,
  title,
  overlay,
}: PropertyGalleryProps) {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  return (
    <>
      <div className="relative">
        {images.length > 0 ? (
          <>
            <img
              src={images[currentImageIndex]}
              alt={title}
              className="w-full h-96 object-cover"
            />
            {images.length > 1 && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  aria-label="Previous image"
                  className="absolute left-4 top-1/2 transform -translate-y-1/2"
                  onClick={() =>
                    setCurrentImageIndex(Math.max(0, currentImageIndex - 1))
                  }
                  disabled={currentImageIndex === 0}
                >
                  ‹
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  aria-label="Next image"
                  className="absolute right-4 top-1/2 transform -translate-y-1/2"
                  onClick={() =>
                    setCurrentImageIndex(
                      Math.min(images.length - 1, currentImageIndex + 1)
                    )
                  }
                  disabled={currentImageIndex === images.length - 1}
                >
                  ›
                </Button>
                <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex gap-2">
                  {images.map((_, index) => (
                    <button
                      key={index}
                      aria-label={`Go to image ${index + 1}`}
                      aria-current={
                        index === currentImageIndex ? 'true' : undefined
                      }
                      className={cn(
                        'w-2 h-2 rounded-full',
                        index === currentImageIndex ? 'bg-white' : 'bg-white/50'
                      )}
                      onClick={() => setCurrentImageIndex(index)}
                    />
                  ))}
                </div>
              </>
            )}
          </>
        ) : (
          <div className="w-full h-96 bg-gray-200 flex items-center justify-center">
            <Home className="h-24 w-24 text-gray-400" />
          </div>
        )}
        {overlay}
      </div>

      {images.length > 1 && (
        <div className="flex gap-2 p-4 overflow-x-auto">
          {images.map((image, index) => (
            <button
              key={index}
              onClick={() => setCurrentImageIndex(index)}
              className={cn(
                'shrink-0 w-20 h-20 rounded overflow-hidden border-2',
                index === currentImageIndex
                  ? 'border-primary'
                  : 'border-transparent'
              )}
            >
              <img
                src={image}
                alt={`${title} ${index + 1}`}
                className="w-full h-full object-cover"
              />
            </button>
          ))}
        </div>
      )}
    </>
  );
}
