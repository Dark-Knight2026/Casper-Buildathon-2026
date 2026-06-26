import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Property } from '../../types/buyer';
import {
  MapPin,
  School,
  Train,
  ShoppingBag,
  Coffee,
  Trees,
  Navigation,
  Layers,
  AlertCircle,
} from 'lucide-react';

interface InteractivePropertyMapProps {
  properties: Property[];
  selectedPropertyId?: string;
  onPropertySelect: (propertyId: string) => void;
}

export function InteractivePropertyMap({
  properties,
  selectedPropertyId,
  onPropertySelect,
}: InteractivePropertyMapProps) {
  const [mapView, setMapView] = useState<'map' | 'satellite'>('map');
  const [showNeighborhoodData, setShowNeighborhoodData] = useState(true);

  const selectedProperty = properties.find((p) => p.id === selectedPropertyId);

  // Calculate map center based on properties
  const centerLat =
    properties.reduce((sum, p) => sum + (p.latitude || 0), 0) / properties.length;
  const centerLng =
    properties.reduce((sum, p) => sum + (p.longitude || 0), 0) / properties.length;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <MapPin className="w-5 h-5 text-blue-600" />
            Interactive Property Map
          </CardTitle>
          <div className="flex gap-2">
            <Button
              variant={mapView === 'map' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setMapView('map')}
            >
              Map
            </Button>
            <Button
              variant={mapView === 'satellite' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setMapView('satellite')}
            >
              Satellite
            </Button>
            <Button
              variant={showNeighborhoodData ? 'default' : 'outline'}
              size="sm"
              onClick={() => setShowNeighborhoodData(!showNeighborhoodData)}
            >
              <Layers className="w-4 h-4 mr-1" />
              Data
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Map Placeholder - In production, integrate Google Maps or Mapbox */}
          <div className="relative bg-gradient-to-br from-blue-100 to-green-100 rounded-lg h-[500px] overflow-hidden">
            {/* Map Background */}
            <div className="absolute inset-0 opacity-20">
              <div className="grid grid-cols-8 grid-rows-8 h-full">
                {Array.from({ length: 64 }).map((_, i) => (
                  <div key={i} className="border border-gray-300" />
                ))}
              </div>
            </div>

            {/* Property Markers */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="relative w-full h-full">
                {properties.map((property, index) => {
                  const isSelected = property.id === selectedPropertyId;
                  // Distribute properties across the map
                  const left = 15 + (index % 3) * 30;
                  const top = 20 + Math.floor(index / 3) * 35;

                  return (
                    <button
                      key={property.id}
                      onClick={() => onPropertySelect(property.id)}
                      className={`absolute transform -translate-x-1/2 -translate-y-1/2 transition-all ${
                        isSelected ? 'scale-125 z-20' : 'hover:scale-110 z-10'
                      }`}
                      style={{ left: `${left}%`, top: `${top}%` }}
                    >
                      <div
                        className={`relative ${
                          isSelected
                            ? 'bg-blue-600 shadow-lg'
                            : 'bg-white shadow-md hover:shadow-lg'
                        } rounded-full p-3 border-2 ${
                          isSelected ? 'border-blue-800' : 'border-gray-300'
                        }`}
                      >
                        <MapPin
                          className={`w-6 h-6 ${
                            isSelected ? 'text-white' : 'text-blue-600'
                          }`}
                        />
                        {/* Price Tag */}
                        <div
                          className={`absolute -top-8 left-1/2 transform -translate-x-1/2 whitespace-nowrap px-2 py-1 rounded text-xs font-semibold ${
                            isSelected
                              ? 'bg-blue-600 text-white'
                              : 'bg-white text-gray-900 border border-gray-300'
                          }`}
                        >
                          ${(property.price / 1000).toFixed(0)}K
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Map Controls */}
            <div className="absolute top-4 right-4 space-y-2">
              <Button size="icon" variant="secondary" className="bg-white">
                <Navigation className="w-4 h-4" />
              </Button>
            </div>

            {/* Scale */}
            <div className="absolute bottom-4 left-4 bg-white px-3 py-1 rounded shadow-md text-xs">
              1 mile
            </div>
          </div>

          {/* Selected Property Details */}
          {selectedProperty && (
            <div className="grid md:grid-cols-2 gap-4">
              {/* Property Info */}
              <Card className="bg-blue-50 border-blue-200">
                <CardContent className="p-4">
                  <h4 className="font-semibold text-lg mb-2">{selectedProperty.title}</h4>
                  <p className="text-sm text-gray-600 mb-3">
                    {selectedProperty.address}, {selectedProperty.city}
                  </p>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <span className="text-gray-600">Price:</span>
                      <span className="font-semibold ml-2">
                        ${selectedProperty.price.toLocaleString()}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-600">Beds:</span>
                      <span className="font-semibold ml-2">{selectedProperty.bedrooms}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">Baths:</span>
                      <span className="font-semibold ml-2">{selectedProperty.bathrooms}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">Sq Ft:</span>
                      <span className="font-semibold ml-2">
                        {selectedProperty.squareFeet.toLocaleString()}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Neighborhood Intelligence */}
              {showNeighborhoodData && (
                <Card>
                  <CardContent className="p-4">
                    <h4 className="font-semibold mb-3 flex items-center gap-2">
                      <Layers className="w-4 h-4" />
                      Neighborhood Intelligence
                    </h4>
                    <div className="space-y-3">
                      {/* School Rating */}
                      {selectedProperty.schoolRating && (
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <School className="w-4 h-4 text-blue-600" />
                            <span className="text-sm">School Rating</span>
                          </div>
                          <Badge
                            className={
                              selectedProperty.schoolRating >= 8
                                ? 'bg-green-600'
                                : selectedProperty.schoolRating >= 6
                                ? 'bg-blue-600'
                                : 'bg-yellow-600'
                            }
                          >
                            {selectedProperty.schoolRating}/10
                          </Badge>
                        </div>
                      )}

                      {/* Walk Score */}
                      {selectedProperty.walkScore && (
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Coffee className="w-4 h-4 text-purple-600" />
                            <span className="text-sm">Walk Score</span>
                          </div>
                          <Badge
                            className={
                              selectedProperty.walkScore >= 80
                                ? 'bg-green-600'
                                : selectedProperty.walkScore >= 60
                                ? 'bg-blue-600'
                                : 'bg-yellow-600'
                            }
                          >
                            {selectedProperty.walkScore}/100
                          </Badge>
                        </div>
                      )}

                      {/* Transit Score */}
                      {selectedProperty.transitScore && (
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Train className="w-4 h-4 text-green-600" />
                            <span className="text-sm">Transit Score</span>
                          </div>
                          <Badge
                            className={
                              selectedProperty.transitScore >= 80
                                ? 'bg-green-600'
                                : selectedProperty.transitScore >= 60
                                ? 'bg-blue-600'
                                : 'bg-yellow-600'
                            }
                          >
                            {selectedProperty.transitScore}/100
                          </Badge>
                        </div>
                      )}

                      {/* Crime Rate */}
                      {selectedProperty.crimeRate && (
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <AlertCircle className="w-4 h-4 text-orange-600" />
                            <span className="text-sm">Crime Rate</span>
                          </div>
                          <Badge
                            className={
                              selectedProperty.crimeRate === 'low'
                                ? 'bg-green-600'
                                : selectedProperty.crimeRate === 'medium'
                                ? 'bg-yellow-600'
                                : 'bg-red-600'
                            }
                          >
                            {selectedProperty.crimeRate.toUpperCase()}
                          </Badge>
                        </div>
                      )}

                      {/* Nearby Amenities */}
                      {selectedProperty.nearbyAmenities &&
                        selectedProperty.nearbyAmenities.length > 0 && (
                          <div>
                            <p className="text-sm font-semibold mb-2 flex items-center gap-2">
                              <ShoppingBag className="w-4 h-4" />
                              Nearby Amenities
                            </p>
                            <div className="flex flex-wrap gap-1">
                              {selectedProperty.nearbyAmenities.map((amenity, index) => (
                                <Badge key={index} variant="outline" className="text-xs">
                                  {amenity}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          {/* Map Legend */}
          <div className="flex flex-wrap gap-4 text-sm text-gray-600">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-blue-600 rounded-full" />
              <span>Selected Property</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-white border-2 border-gray-300 rounded-full" />
              <span>Available Properties</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}