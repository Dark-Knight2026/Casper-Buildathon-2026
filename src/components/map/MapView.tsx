import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { 
  MapPin, 
  Search, 
  Layers, 
  Maximize2, 
  Minimize2,
  Navigation,
  Home,
  Building,
  DollarSign,
  Filter
} from 'lucide-react';
import { Property } from '@/types/property';
import { getFeaturedImage } from '@/utils/propertyImages';

interface MapViewProps {
  properties: Property[];
  selectedProperty?: Property | null;
  onPropertySelect: (property: Property) => void;
  onLocationChange?: (bounds: MapBounds) => void;
  className?: string;
  isFullscreen?: boolean;
  onToggleFullscreen?: () => void;
}

interface MapBounds {
  north: number;
  south: number;
  east: number;
  west: number;
}

interface PropertyMarker extends Property {
  lat: number;
  lng: number;
}

// Mock coordinates for demonstration - in real implementation, these would come from geocoding
const generateMockCoordinates = (property: Property): { lat: number; lng: number } => {
  // Generate coordinates based on property ID for consistency
  const baseLatitudes = [40.7128, 34.0522, 41.8781, 29.7604, 39.7392]; // NYC, LA, Chicago, Houston, Denver
  const baseLongitudes = [-74.0060, -118.2437, -87.6298, -95.3698, -104.9903];
  
  const index = property.id % baseLatitudes.length;
  const lat = baseLatitudes[index] + (Math.sin(property.id) * 0.1);
  const lng = baseLongitudes[index] + (Math.cos(property.id) * 0.1);
  
  return { lat, lng };
};

export default function MapView({ 
  properties, 
  selectedProperty, 
  onPropertySelect, 
  onLocationChange,
  className = '',
  isFullscreen = false,
  onToggleFullscreen
}: MapViewProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const [mapCenter, setMapCenter] = useState({ lat: 40.7128, lng: -74.0060 }); // NYC default
  const [mapZoom, setMapZoom] = useState(10);
  const [hoveredProperty, setHoveredProperty] = useState<PropertyMarker | null>(null);
  const [searchLocation, setSearchLocation] = useState('');
  const [showClusters, setShowClusters] = useState(true);
  const [mapStyle, setMapStyle] = useState<'standard' | 'satellite' | 'terrain'>('standard');

  // Convert properties to markers with coordinates
  const propertyMarkers: PropertyMarker[] = properties.map(property => ({
    ...property,
    ...generateMockCoordinates(property)
  }));

  // Group nearby markers for clustering
  const clusterMarkers = useCallback((markers: PropertyMarker[], zoom: number) => {
    if (!showClusters || zoom > 12) return markers.map(m => ({ ...m, isCluster: false, count: 1 }));

    const clusters: Array<PropertyMarker & { isCluster: boolean; count: number; clusteredProperties: PropertyMarker[] }> = [];
    const processed = new Set<number>();
    const threshold = 0.01 / Math.pow(2, zoom - 8); // Adjust clustering distance based on zoom

    markers.forEach((marker, index) => {
      if (processed.has(index)) return;

      const nearby = markers.filter((other, otherIndex) => {
        if (processed.has(otherIndex) || index === otherIndex) return false;
        const distance = Math.sqrt(
          Math.pow(marker.lat - other.lat, 2) + Math.pow(marker.lng - other.lng, 2)
        );
        return distance < threshold;
      });

      if (nearby.length > 0) {
        // Create cluster
        nearby.forEach((_, nearbyIndex) => {
          const originalIndex = markers.findIndex(m => m === nearby[nearbyIndex]);
          processed.add(originalIndex);
        });
        processed.add(index);

        const allMarkers = [marker, ...nearby];
        const centerLat = allMarkers.reduce((sum, m) => sum + m.lat, 0) / allMarkers.length;
        const centerLng = allMarkers.reduce((sum, m) => sum + m.lng, 0) / allMarkers.length;

        clusters.push({
          ...marker,
          lat: centerLat,
          lng: centerLng,
          isCluster: true,
          count: allMarkers.length,
          clusteredProperties: allMarkers
        });
      } else {
        // Single marker
        processed.add(index);
        clusters.push({
          ...marker,
          isCluster: false,
          count: 1,
          clusteredProperties: [marker]
        });
      }
    });

    return clusters;
  }, [showClusters]);

  const clusteredMarkers = clusterMarkers(propertyMarkers, mapZoom);

  // Handle location search
  const handleLocationSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchLocation.trim()) return;

    // Mock geocoding - in real implementation, use Google Maps Geocoding API
    const mockLocations: Record<string, { lat: number; lng: number }> = {
      'new york': { lat: 40.7128, lng: -74.0060 },
      'los angeles': { lat: 34.0522, lng: -118.2437 },
      'chicago': { lat: 41.8781, lng: -87.6298 },
      'houston': { lat: 29.7604, lng: -95.3698 },
      'denver': { lat: 39.7392, lng: -104.9903 }
    };

    const location = mockLocations[searchLocation.toLowerCase()];
    if (location) {
      setMapCenter(location);
      setMapZoom(12);
    }
  };

  // Handle marker click
  const handleMarkerClick = (marker: PropertyMarker & { isCluster?: boolean; clusteredProperties?: PropertyMarker[] }) => {
    if (marker.isCluster && marker.clusteredProperties) {
      // Zoom into cluster
      const bounds = marker.clusteredProperties.reduce(
        (acc, prop) => ({
          north: Math.max(acc.north, prop.lat),
          south: Math.min(acc.south, prop.lat),
          east: Math.max(acc.east, prop.lng),
          west: Math.min(acc.west, prop.lng)
        }),
        { north: -90, south: 90, east: -180, west: 180 }
      );
      
      setMapCenter({
        lat: (bounds.north + bounds.south) / 2,
        lng: (bounds.east + bounds.west) / 2
      });
      setMapZoom(Math.min(mapZoom + 3, 18));
    } else {
      onPropertySelect(marker);
    }
  };

  // Get price color for marker
  const getPriceColor = (price: number) => {
    if (price < 2000) return 'bg-green-500';
    if (price < 4000) return 'bg-yellow-500';
    if (price < 6000) return 'bg-orange-500';
    return 'bg-red-500';
  };

  // Handle map bounds change
  useEffect(() => {
    if (onLocationChange) {
      const bounds: MapBounds = {
        north: mapCenter.lat + 0.1,
        south: mapCenter.lat - 0.1,
        east: mapCenter.lng + 0.1,
        west: mapCenter.lng - 0.1
      };
      onLocationChange(bounds);
    }
  }, [mapCenter, onLocationChange]);

  return (
    <Card className={`relative overflow-hidden ${className} ${isFullscreen ? 'fixed inset-0 z-50' : ''}`}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center">
            <MapPin className="h-5 w-5 mr-2" />
            Property Map
            <Badge variant="secondary" className="ml-2">
              {properties.length} properties
            </Badge>
          </CardTitle>
          <div className="flex items-center space-x-2">
            {/* Map Style Toggle */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setMapStyle(mapStyle === 'standard' ? 'satellite' : mapStyle === 'satellite' ? 'terrain' : 'standard')}
            >
              <Layers className="h-4 w-4 mr-1" />
              {mapStyle}
            </Button>
            
            {/* Clustering Toggle */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowClusters(!showClusters)}
              className={showClusters ? 'bg-blue-50 text-blue-700' : ''}
            >
              <Building className="h-4 w-4 mr-1" />
              Cluster
            </Button>

            {/* Fullscreen Toggle */}
            {onToggleFullscreen && (
              <Button
                variant="outline"
                size="sm"
                onClick={onToggleFullscreen}
              >
                {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
              </Button>
            )}
          </div>
        </div>

        {/* Location Search */}
        <form onSubmit={handleLocationSearch} className="flex space-x-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search location..."
              value={searchLocation}
              onChange={(e) => setSearchLocation(e.target.value)}
              className="pl-10"
            />
          </div>
          <Button type="submit" variant="outline">
            <Navigation className="h-4 w-4" />
          </Button>
        </form>
      </CardHeader>

      <CardContent className="p-0 relative">
        {/* Map Container */}
        <div 
          ref={mapRef}
          className={`relative bg-gradient-to-br from-blue-50 to-green-50 ${
            isFullscreen ? 'h-[calc(100vh-120px)]' : 'h-96'
          }`}
          style={{
            backgroundImage: mapStyle === 'satellite' 
              ? 'url("data:image/svg+xml,%3Csvg width="60" height="60" viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg"%3E%3Cg fill="none" fill-rule="evenodd"%3E%3Cg fill="%239C92AC" fill-opacity="0.1"%3E%3Ccircle cx="30" cy="30" r="4"/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")'
              : mapStyle === 'terrain'
              ? 'url("data:image/svg+xml,%3Csvg width="40" height="40" viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg"%3E%3Cg fill="none" fill-rule="evenodd"%3E%3Cg fill="%23A0522D" fill-opacity="0.1"%3E%3Cpath d="M20 20c0-5.5-4.5-10-10-10s-10 4.5-10 10 4.5 10 10 10 10-4.5 10-10z"/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")'
              : undefined
          }}
        >
          {/* Property Markers */}
          {clusteredMarkers.map((marker, index) => {
            const isSelected = selectedProperty?.id === marker.id;
            const isHovered = hoveredProperty?.id === marker.id;
            
            // Calculate position (mock positioning for demo)
            const x = ((marker.lng - (mapCenter.lng - 0.1)) / 0.2) * 100;
            const y = ((mapCenter.lat + 0.1 - marker.lat) / 0.2) * 100;
            
            if (x < 0 || x > 100 || y < 0 || y > 100) return null; // Outside viewport

            return (
              <div
                key={`${marker.id}-${index}`}
                className="absolute transform -translate-x-1/2 -translate-y-1/2 cursor-pointer z-10"
                style={{ left: `${x}%`, top: `${y}%` }}
                onClick={() => handleMarkerClick(marker)}
                onMouseEnter={() => setHoveredProperty(marker)}
                onMouseLeave={() => setHoveredProperty(null)}
              >
                {marker.isCluster ? (
                  /* Cluster Marker */
                  <div className={`
                    w-12 h-12 rounded-full border-4 border-white shadow-lg flex items-center justify-center
                    bg-blue-600 text-white font-bold text-sm transform transition-all duration-200
                    ${isHovered ? 'scale-110' : 'scale-100'}
                  `}>
                    {marker.count}
                  </div>
                ) : (
                  /* Individual Property Marker */
                  <div className={`
                    relative transform transition-all duration-200
                    ${isSelected ? 'scale-125 z-20' : isHovered ? 'scale-110 z-15' : 'scale-100'}
                  `}>
                    {/* Price Badge */}
                    <div className={`
                      px-2 py-1 rounded-full text-xs font-semibold text-white shadow-lg
                      ${getPriceColor(marker.price)} mb-1
                    `}>
                      ${marker.price.toLocaleString()}
                    </div>
                    
                    {/* Property Icon */}
                    <div className={`
                      w-8 h-8 rounded-full border-3 shadow-lg flex items-center justify-center
                      ${isSelected ? 'border-purple-500 bg-purple-100' : 'border-white bg-blue-600'}
                    `}>
                      <Home className={`h-4 w-4 ${isSelected ? 'text-purple-600' : 'text-white'}`} />
                    </div>
                  </div>
                )}

                {/* Hover Tooltip */}
                {isHovered && !marker.isCluster && (
                  <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 z-30">
                    <div className="bg-white rounded-lg shadow-xl border p-3 w-64">
                      <div className="flex space-x-3">
                        <img
                          src={getFeaturedImage(marker.propertyType || 'apartment').src}
                          alt={marker.title}
                          className="w-16 h-16 rounded-lg object-cover"
                        />
                        <div className="flex-1 min-w-0">
                          <h4 className="font-semibold text-sm truncate">{marker.title}</h4>
                          <p className="text-xs text-gray-600 truncate">{marker.address}</p>
                          <div className="flex items-center justify-between mt-1">
                            <span className="text-sm font-bold text-purple-600">
                              ${marker.price.toLocaleString()}
                            </span>
                            <div className="flex items-center text-xs text-gray-500">
                              {marker.bedrooms > 0 && <span>{marker.bedrooms}bd</span>}
                              {marker.bathrooms > 0 && <span className="ml-1">{marker.bathrooms}ba</span>}
                            </div>
                          </div>
                        </div>
                      </div>
                      {/* Arrow */}
                      <div className="absolute top-full left-1/2 transform -translate-x-1/2">
                        <div className="w-3 h-3 bg-white border-r border-b transform rotate-45"></div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}

          {/* Map Controls */}
          <div className="absolute top-4 right-4 flex flex-col space-y-2">
            {/* Zoom Controls */}
            <div className="bg-white rounded-lg shadow-lg border">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setMapZoom(Math.min(mapZoom + 1, 18))}
                className="rounded-b-none border-b"
              >
                +
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setMapZoom(Math.max(mapZoom - 1, 3))}
                className="rounded-t-none"
              >
                -
              </Button>
            </div>
          </div>

          {/* Legend */}
          <div className="absolute bottom-4 left-4 bg-white rounded-lg shadow-lg border p-3">
            <h4 className="text-sm font-semibold mb-2">Price Range</h4>
            <div className="space-y-1">
              <div className="flex items-center text-xs">
                <div className="w-3 h-3 rounded-full bg-green-500 mr-2"></div>
                Under $2,000
              </div>
              <div className="flex items-center text-xs">
                <div className="w-3 h-3 rounded-full bg-yellow-500 mr-2"></div>
                $2,000 - $4,000
              </div>
              <div className="flex items-center text-xs">
                <div className="w-3 h-3 rounded-full bg-orange-500 mr-2"></div>
                $4,000 - $6,000
              </div>
              <div className="flex items-center text-xs">
                <div className="w-3 h-3 rounded-full bg-red-500 mr-2"></div>
                $6,000+
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}