import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { DetailedListing } from '@/types/listing';
import { ChevronLeft, ChevronRight, Map, Image as ImageIcon, Maximize2 } from 'lucide-react';

interface ListingHeroProps {
  listing: DetailedListing;
}

export default function ListingHero({ listing }: ListingHeroProps) {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [showMap, setShowMap] = useState(false);

  const nextImage = () => {
    setCurrentImageIndex((prev) => 
      prev === listing.images.length - 1 ? 0 : prev + 1
    );
  };

  const prevImage = () => {
    setCurrentImageIndex((prev) => 
      prev === 0 ? listing.images.length - 1 : prev - 1
    );
  };

  return (
    <div className="relative h-96 lg:h-[500px] bg-gray-900">
      {!showMap ? (
        <>
          {/* Image Carousel */}
          <div className="relative h-full overflow-hidden">
            <img
              src={listing.images[currentImageIndex]?.url || '/api/placeholder/800/600'}
              alt={listing.images[currentImageIndex]?.caption || 'Property image'}
              className="w-full h-full object-cover"
            />
            
            {/* Navigation Arrows */}
            {listing.images.length > 1 && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  className="absolute left-4 top-1/2 transform -translate-y-1/2 bg-white/90 hover:bg-white"
                  onClick={prevImage}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="absolute right-4 top-1/2 transform -translate-y-1/2 bg-white/90 hover:bg-white"
                  onClick={nextImage}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </>
            )}

            {/* Image Counter */}
            <div className="absolute bottom-4 left-4">
              <Badge className="bg-black/70 text-white">
                {currentImageIndex + 1} / {listing.images.length}
              </Badge>
            </div>

            {/* Image Caption */}
            {listing.images[currentImageIndex]?.caption && (
              <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2">
                <Badge variant="outline" className="bg-white/90">
                  {listing.images[currentImageIndex].caption}
                </Badge>
              </div>
            )}
          </div>

          {/* Thumbnail Strip */}
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/50 to-transparent p-4">
            <div className="flex space-x-2 overflow-x-auto">
              {listing.images.map((image, index) => (
                <button
                  key={image.id}
                  onClick={() => setCurrentImageIndex(index)}
                  className={`flex-shrink-0 w-16 h-12 rounded overflow-hidden border-2 ${
                    index === currentImageIndex ? 'border-white' : 'border-transparent'
                  }`}
                >
                  <img
                    src={image.url}
                    alt={image.caption}
                    className="w-full h-full object-cover"
                  />
                </button>
              ))}
            </div>
          </div>
        </>
      ) : (
        /* Map View */
        <div className="h-full bg-gray-200 flex items-center justify-center">
          <div className="text-center">
            <Map className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">Interactive map would be displayed here</p>
            <p className="text-sm text-gray-500 mt-2">
              {listing.coordinates.lat}, {listing.coordinates.lng}
            </p>
          </div>
        </div>
      )}

      {/* Top Controls */}
      <div className="absolute top-4 right-4 flex items-center space-x-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowMap(!showMap)}
          className="bg-white/90 hover:bg-white"
        >
          {showMap ? <ImageIcon className="h-4 w-4" /> : <Map className="h-4 w-4" />}
          <span className="ml-2">{showMap ? 'Photos' : 'Map'}</span>
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="bg-white/90 hover:bg-white"
        >
          <Maximize2 className="h-4 w-4" />
          <span className="ml-2">Full Screen</span>
        </Button>
      </div>

      {/* Status Badge */}
      <div className="absolute top-4 left-4">
        <Badge className={`${
          listing.status === 'active' ? 'bg-green-600' :
          listing.status === 'pending' ? 'bg-yellow-600' :
          'bg-gray-600'
        } text-white`}>
          {listing.status.toUpperCase()}
        </Badge>
      </div>
    </div>
  );
}