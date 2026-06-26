import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Property } from '../../types/buyer';
import {
  X,
  Home,
  Bed,
  Bath,
  Maximize,
  DollarSign,
  MapPin,
  TrendingUp,
  TrendingDown,
  School,
  Car,
  Wifi,
  Dumbbell,
  Trees,
  ShoppingCart,
  Download,
} from 'lucide-react';

interface PropertyComparisonProps {
  properties: Property[];
  onRemoveProperty: (propertyId: string) => void;
  onClose: () => void;
}

export function PropertyComparison({
  properties,
  onRemoveProperty,
  onClose,
}: PropertyComparisonProps) {
  const [selectedMetric, setSelectedMetric] = useState<string>('overview');

  const getComparisonValue = (property: Property, metric: string): number => {
    switch (metric) {
      case 'price':
        return property.price;
      case 'sqft':
        return property.sqft;
      case 'bedrooms':
        return property.bedrooms;
      case 'bathrooms':
        return property.bathrooms;
      case 'yearBuilt':
        return property.yearBuilt || 0;
      default:
        return 0;
    }
  };

  const getBestValue = (metric: string): string => {
    if (properties.length === 0) return '';
    
    const values = properties.map((p) => ({
      id: p.id,
      value: getComparisonValue(p, metric),
    }));

    if (metric === 'price') {
      // Lower is better for price
      return values.reduce((min, curr) => (curr.value < min.value ? curr : min)).id;
    } else {
      // Higher is better for other metrics
      return values.reduce((max, curr) => (curr.value > max.value ? curr : max)).id;
    }
  };

  const exportToPDF = () => {
    alert('Exporting comparison to PDF... (Feature coming soon)');
  };

  const comparisonMetrics = [
    { key: 'price', label: 'Price', icon: DollarSign },
    { key: 'sqft', label: 'Square Feet', icon: Maximize },
    { key: 'bedrooms', label: 'Bedrooms', icon: Bed },
    { key: 'bathrooms', label: 'Bathrooms', icon: Bath },
    { key: 'yearBuilt', label: 'Year Built', icon: Home },
  ];

  if (properties.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Property Comparison</CardTitle>
          <CardDescription>No properties selected for comparison</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-center text-gray-500 py-8">
            Add properties to your comparison list to see them side by side
          </p>
          <Button onClick={onClose} className="w-full">
            Close
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-7xl max-h-[90vh] overflow-auto">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Property Comparison</CardTitle>
              <CardDescription>
                Compare up to 4 properties side by side
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={exportToPDF}>
                <Download className="w-4 h-4 mr-2" />
                Export PDF
              </Button>
              <Button variant="ghost" size="icon" onClick={onClose}>
                <X className="w-5 h-5" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Property Images */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {properties.map((property) => (
              <div key={property.id} className="relative">
                <img
                  src={property.images[0]}
                  alt={property.title}
                  className="w-full h-48 object-cover rounded-lg"
                />
                <Button
                  variant="destructive"
                  size="icon"
                  className="absolute top-2 right-2"
                  onClick={() => onRemoveProperty(property.id)}
                >
                  <X className="w-4 h-4" />
                </Button>
                <div className="absolute bottom-2 left-2 right-2 bg-white/95 backdrop-blur-sm rounded p-2">
                  <p className="font-semibold text-sm line-clamp-1">{property.title}</p>
                  <p className="text-xs text-gray-600 line-clamp-1">
                    {property.address}, {property.city}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* Comparison Table */}
          <div className="space-y-4">
            {/* Price Comparison */}
            <div className="border rounded-lg p-4">
              <div className="flex items-center gap-2 mb-3">
                <DollarSign className="w-5 h-5 text-green-600" />
                <h3 className="font-semibold">Price</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {properties.map((property) => (
                  <div
                    key={property.id}
                    className={`p-3 rounded ${
                      getBestValue('price') === property.id
                        ? 'bg-green-50 border-2 border-green-500'
                        : 'bg-gray-50'
                    }`}
                  >
                    <p className="text-2xl font-bold text-green-900">
                      ${property.price.toLocaleString()}
                    </p>
                    {getBestValue('price') === property.id && (
                      <Badge className="mt-1 bg-green-600">Lowest Price</Badge>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Size Comparison */}
            <div className="border rounded-lg p-4">
              <div className="flex items-center gap-2 mb-3">
                <Maximize className="w-5 h-5 text-blue-600" />
                <h3 className="font-semibold">Square Footage</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {properties.map((property) => (
                  <div
                    key={property.id}
                    className={`p-3 rounded ${
                      getBestValue('sqft') === property.id
                        ? 'bg-blue-50 border-2 border-blue-500'
                        : 'bg-gray-50'
                    }`}
                  >
                    <p className="text-2xl font-bold text-blue-900">
                      {property.sqft.toLocaleString()} sq ft
                    </p>
                    <p className="text-sm text-gray-600">
                      ${(property.price / property.sqft).toFixed(0)}/sq ft
                    </p>
                    {getBestValue('sqft') === property.id && (
                      <Badge className="mt-1 bg-blue-600">Largest</Badge>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Bedrooms & Bathrooms */}
            <div className="border rounded-lg p-4">
              <div className="flex items-center gap-2 mb-3">
                <Bed className="w-5 h-5 text-purple-600" />
                <h3 className="font-semibold">Bedrooms & Bathrooms</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {properties.map((property) => (
                  <div key={property.id} className="p-3 bg-gray-50 rounded space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Bedrooms:</span>
                      <span className="font-semibold">{property.bedrooms}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Bathrooms:</span>
                      <span className="font-semibold">{property.bathrooms}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Amenities Comparison */}
            <div className="border rounded-lg p-4">
              <div className="flex items-center gap-2 mb-3">
                <Home className="w-5 h-5 text-orange-600" />
                <h3 className="font-semibold">Amenities</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {properties.map((property) => (
                  <div key={property.id} className="p-3 bg-gray-50 rounded">
                    <div className="flex flex-wrap gap-2">
                      {property.amenities?.parking && (
                        <Badge variant="outline" className="text-xs">
                          <Car className="w-3 h-3 mr-1" />
                          Parking
                        </Badge>
                      )}
                      {property.amenities?.pool && (
                        <Badge variant="outline" className="text-xs">
                          <Wifi className="w-3 h-3 mr-1" />
                          Pool
                        </Badge>
                      )}
                      {property.amenities?.gym && (
                        <Badge variant="outline" className="text-xs">
                          <Dumbbell className="w-3 h-3 mr-1" />
                          Gym
                        </Badge>
                      )}
                      {property.amenities?.garden && (
                        <Badge variant="outline" className="text-xs">
                          <Trees className="w-3 h-3 mr-1" />
                          Garden
                        </Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Location & Neighborhood */}
            <div className="border rounded-lg p-4">
              <div className="flex items-center gap-2 mb-3">
                <MapPin className="w-5 h-5 text-red-600" />
                <h3 className="font-semibold">Location & Neighborhood</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {properties.map((property) => (
                  <div key={property.id} className="p-3 bg-gray-50 rounded space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Walk Score:</span>
                      <span className="font-semibold">
                        {property.neighborhood?.walkScore || 'N/A'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Transit Score:</span>
                      <span className="font-semibold">
                        {property.neighborhood?.transitScore || 'N/A'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">School Rating:</span>
                      <span className="font-semibold">
                        {property.neighborhood?.schoolRating || 'N/A'}/10
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Year Built & Condition */}
            <div className="border rounded-lg p-4">
              <div className="flex items-center gap-2 mb-3">
                <Home className="w-5 h-5 text-gray-600" />
                <h3 className="font-semibold">Property Details</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {properties.map((property) => (
                  <div key={property.id} className="p-3 bg-gray-50 rounded space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Year Built:</span>
                      <span className="font-semibold">{property.yearBuilt || 'N/A'}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Property Type:</span>
                      <span className="font-semibold capitalize">{property.type}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Status:</span>
                      <Badge
                        variant={property.status === 'available' ? 'default' : 'secondary'}
                      >
                        {property.status}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-6 flex justify-end">
            <Button onClick={onClose}>Close Comparison</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}