import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Property } from '@/types/property';
import { MapPin, Maximize2, Minimize2, Navigation } from 'lucide-react';

interface PropertyMapProps {
  properties: Property[];
}

export default function PropertyMap({ properties }: PropertyMapProps) {
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  return (
    <div className={`${isFullscreen ? 'fixed inset-0 z-50 bg-white' : 'relative h-96 lg:h-[600px]'}`}>
      <Card className="h-full">
        <CardContent className="p-0 h-full relative">
          {/* Map Controls */}
          <div className="absolute top-4 right-4 z-10 flex space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsFullscreen(!isFullscreen)}
              className="bg-white/90 hover:bg-white"
            >
              {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="bg-white/90 hover:bg-white"
            >
              <Navigation className="h-4 w-4" />
            </Button>
          </div>

          {/* Map Placeholder */}
          <div className="w-full h-full bg-gray-200 rounded-lg flex items-center justify-center relative overflow-hidden">
            <div className="text-center">
              <MapPin className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 text-lg">Interactive Map View</p>
              <p className="text-gray-500 text-sm">Showing {properties.length} properties</p>
            </div>

            {/* Property Markers */}
            {properties.map((property, index) => (
              <button
                key={property.id}
                onClick={() => setSelectedProperty(property)}
                className="absolute bg-blue-600 text-white rounded-full w-8 h-8 flex items-center justify-center text-sm font-semibold hover:bg-blue-700 transition-colors shadow-lg"
                style={{
                  left: `${20 + (index % 5) * 15}%`,
                  top: `${30 + Math.floor(index / 5) * 20}%`,
                }}
              >
                ${property.type === 'monthly' ? Math.floor(property.price / 1000) + 'K' : Math.floor(property.price / 1000000) + 'M'}
              </button>
            ))}
          </div>

          {/* Property Details Popup */}
          {selectedProperty && (
            <div className="absolute bottom-4 left-4 right-4 z-10">
              <Card className="shadow-lg">
                <CardContent className="p-4">
                  <div className="flex items-start space-x-4">
                    <img
                      src={selectedProperty.images[0]}
                      alt={selectedProperty.title}
                      className="w-24 h-24 object-cover rounded-lg"
                    />
                    <div className="flex-1">
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="font-semibold text-gray-900">{selectedProperty.title}</h3>
                          <p className="text-sm text-gray-600">{selectedProperty.address}</p>
                          <div className="flex items-center space-x-4 mt-2 text-sm text-gray-600">
                            <span>{selectedProperty.bedrooms} bed</span>
                            <span>{selectedProperty.bathrooms} bath</span>
                            <span>{selectedProperty.sqft.toLocaleString()} sqft</span>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-xl font-bold text-gray-900">
                            ${selectedProperty.price.toLocaleString()}
                            {selectedProperty.type === 'monthly' && <span className="text-sm font-normal">/mo</span>}
                          </div>
                          <Badge variant="outline" className="mt-1">
                            {selectedProperty.daysOnMarket} days
                          </Badge>
                        </div>
                      </div>
                      <div className="flex items-center justify-between mt-3">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSelectedProperty(null)}
                        >
                          Close
                        </Button>
                        <Button size="sm">
                          View Details
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Map Legend */}
          <div className="absolute bottom-4 right-4 z-10">
            <Card className="bg-white/90">
              <CardContent className="p-3">
                <div className="space-y-2 text-xs">
                  <div className="flex items-center space-x-2">
                    <div className="w-4 h-4 bg-blue-600 rounded-full"></div>
                    <span>For Sale</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-4 h-4 bg-green-600 rounded-full"></div>
                    <span>For Rent</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-4 h-4 bg-purple-600 rounded-full"></div>
                    <span>Recently Sold</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}