import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Comparable } from '@/types/listing';
import { ChevronLeft, ChevronRight, Bed, Bath, Square, MapPin } from 'lucide-react';
import { useState } from 'react';

interface SimilarHomesCarouselProps {
  comparables: Comparable[];
}

export default function SimilarHomesCarousel({ comparables }: SimilarHomesCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const itemsPerView = 2;

  const nextSlide = () => {
    setCurrentIndex((prev) => 
      prev + itemsPerView >= comparables.length ? 0 : prev + itemsPerView
    );
  };

  const prevSlide = () => {
    setCurrentIndex((prev) => 
      prev === 0 ? Math.max(0, comparables.length - itemsPerView) : prev - itemsPerView
    );
  };

  const visibleComparables = comparables.slice(currentIndex, currentIndex + itemsPerView);

  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-semibold text-gray-900">Similar Homes</h3>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={prevSlide}
              disabled={currentIndex === 0}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={nextSlide}
              disabled={currentIndex + itemsPerView >= comparables.length}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {visibleComparables.map((comp) => (
            <Card key={comp.id} className="hover:shadow-md transition-shadow cursor-pointer">
              <CardContent className="p-4">
                <div className="aspect-video bg-gray-200 rounded-lg mb-4 flex items-center justify-center">
                  <img
                    src="/api/placeholder/300/200"
                    alt={comp.address}
                    className="w-full h-full object-cover rounded-lg"
                  />
                </div>
                
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className="font-semibold text-gray-900">{comp.address}</h4>
                    <Badge variant="outline" className="text-xs">
                      SOLD
                    </Badge>
                  </div>
                  
                  <div className="text-2xl font-bold text-gray-900">
                    ${comp.price.toLocaleString()}
                  </div>
                  
                  <div className="flex items-center space-x-4 text-sm text-gray-600">
                    <div className="flex items-center space-x-1">
                      <Bed className="h-4 w-4" />
                      <span>{comp.beds}</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <Bath className="h-4 w-4" />
                      <span>{comp.baths}</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <Square className="h-4 w-4" />
                      <span>{comp.sqft.toLocaleString()}</span>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center space-x-1 text-gray-600">
                      <MapPin className="h-4 w-4" />
                      <span>{comp.distance} mi away</span>
                    </div>
                    <div className="text-gray-600">
                      ${comp.pricePerSqft}/sq ft
                    </div>
                  </div>
                  
                  <div className="text-xs text-gray-500">
                    Sold {new Date(comp.soldDate).toLocaleDateString()}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="flex justify-center mt-4">
          <div className="flex space-x-2">
            {Array.from({ length: Math.ceil(comparables.length / itemsPerView) }).map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentIndex(index * itemsPerView)}
                className={`w-2 h-2 rounded-full ${
                  Math.floor(currentIndex / itemsPerView) === index
                    ? 'bg-blue-600'
                    : 'bg-gray-300'
                }`}
              />
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}