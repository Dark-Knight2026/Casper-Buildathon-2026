import { useState, useEffect, useRef, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { 
  MapPin, 
  Search, 
  Target, 
  Layers, 
  ZoomIn, 
  ZoomOut,
  Home,
  Filter
} from 'lucide-react';

interface Property {
  id: string;
  address: string;
  price: number;
  bedrooms: number;
  bathrooms: number;
  sqft: number;
  type: string;
  lat: number;
  lng: number;
  image: string;
}

interface MapInstance {
  center: { lat: number; lng: number };
  zoom: number;
  markers: MapMarker[];
  circle: MapCircle | null;
}

interface MapMarker {
  id: string;
  position: { lat: number; lng: number };
  property: Property;
}

interface MapCircle {
  center: { lat: number; lng: number };
  radius: number;
}

interface MapSearchInterfaceProps {
  onPropertiesFound: (properties: Property[]) => void;
}

// Mock property data for demonstration
const mockProperties: Property[] = [
  {
    id: '1',
    address: '123 Beverly Hills Dr, Beverly Hills, CA',
    price: 1250000,
    bedrooms: 3,
    bathrooms: 2,
    sqft: 2100,
    type: 'Single Family Home',
    lat: 34.0736,
    lng: -118.4004,
    image: '/api/placeholder/300/200'
  },
  {
    id: '2',
    address: '456 Santa Monica Blvd, Santa Monica, CA',
    price: 950000,
    bedrooms: 2,
    bathrooms: 2,
    sqft: 1800,
    type: 'Condo',
    lat: 34.0195,
    lng: -118.4912,
    image: '/api/placeholder/300/200'
  },
  {
    id: '3',
    address: '789 Hollywood Blvd, Hollywood, CA',
    price: 875000,
    bedrooms: 2,
    bathrooms: 1,
    sqft: 1600,
    type: 'Condo',
    lat: 34.1022,
    lng: -118.3267,
    image: '/api/placeholder/300/200'
  },
  {
    id: '4',
    address: '321 Venice Beach Walk, Venice, CA',
    price: 1100000,
    bedrooms: 3,
    bathrooms: 2,
    sqft: 1900,
    type: 'Townhouse',
    lat: 33.9850,
    lng: -118.4695,
    image: '/api/placeholder/300/200'
  },
  {
    id: '5',
    address: '654 Malibu Coast Hwy, Malibu, CA',
    price: 2500000,
    bedrooms: 4,
    bathrooms: 3,
    sqft: 3200,
    type: 'Single Family Home',
    lat: 34.0259,
    lng: -118.7798,
    image: '/api/placeholder/300/200'
  }
];

export default function MapSearchInterface({ onPropertiesFound }: MapSearchInterfaceProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const [map, setMap] = useState<MapInstance | null>(null);
  const [markers, setMarkers] = useState<MapMarker[]>([]);
  const [searchRadius, setSearchRadius] = useState([5]);
  const [centerLocation, setCenterLocation] = useState({ lat: 34.0522, lng: -118.2437 }); // LA default
  const [searchAddress, setSearchAddress] = useState('');
  const [isMapLoaded, setIsMapLoaded] = useState(false);
  const [propertyCount, setPropertyCount] = useState(0);
  const [mapStyle, setMapStyle] = useState('roadmap');

  const performRadiusSearch = useCallback((center: { lat: number; lng: number }, radius: number) => {
    // Calculate distance between two points (Haversine formula)
    const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
      const R = 3959; // Earth's radius in miles
      const dLat = (lat2 - lat1) * Math.PI / 180;
      const dLon = (lon2 - lon1) * Math.PI / 180;
      const a = 
        Math.sin(dLat/2) * Math.sin(dLat/2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
        Math.sin(dLon/2) * Math.sin(dLon/2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
      return R * c;
    };

    // Filter properties within radius
    const propertiesInRadius = mockProperties.filter(property => {
      const distance = calculateDistance(
        center.lat, center.lng,
        property.lat, property.lng
      );
      return distance <= radius;
    });

    setPropertyCount(propertiesInRadius.length);
    onPropertiesFound(propertiesInRadius);
    
    // Update markers (simulated)
    setMarkers(propertiesInRadius.map(property => ({
      id: property.id,
      position: { lat: property.lat, lng: property.lng },
      property
    })));
  }, [onPropertiesFound]);

  // Initialize map
  useEffect(() => {
    if (!mapRef.current) return;

    // Simulate Google Maps initialization
    const initMap = () => {
      const mapInstance: MapInstance = {
        center: centerLocation,
        zoom: 11,
        markers: [],
        circle: null
      };
      
      setMap(mapInstance);
      setIsMapLoaded(true);
      
      // Initial search
      performRadiusSearch(centerLocation, searchRadius[0]);
    };

    // Simulate loading delay
    setTimeout(initMap, 500);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Intentionally empty dependency array for initialization

  // Update search radius
  useEffect(() => {
    if (map) {
      performRadiusSearch(centerLocation, searchRadius[0]);
    }
  }, [searchRadius, map, centerLocation, performRadiusSearch]);

  const handleAddressSearch = async () => {
    if (!searchAddress.trim()) return;

    // Simulate geocoding
    const mockGeocodeResults = [
      { address: 'Beverly Hills, CA', lat: 34.0736, lng: -118.4004 },
      { address: 'Santa Monica, CA', lat: 34.0195, lng: -118.4912 },
      { address: 'Hollywood, CA', lat: 34.1022, lng: -118.3267 },
      { address: 'Venice, CA', lat: 33.9850, lng: -118.4695 },
      { address: 'Malibu, CA', lat: 34.0259, lng: -118.7798 }
    ];

    const result = mockGeocodeResults.find(r => 
      r.address.toLowerCase().includes(searchAddress.toLowerCase())
    ) || mockGeocodeResults[0];

    setCenterLocation({ lat: result.lat, lng: result.lng });
    performRadiusSearch({ lat: result.lat, lng: result.lng }, searchRadius[0]);
  };

  const getCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const newCenter = {
            lat: position.coords.latitude,
            lng: position.coords.longitude
          };
          setCenterLocation(newCenter);
          performRadiusSearch(newCenter, searchRadius[0]);
        },
        () => {
          alert('Unable to retrieve your location');
        }
      );
    } else {
      alert('Geolocation is not supported by this browser');
    }
  };

  const zoomIn = () => {
    if (map) {
      map.zoom = Math.min(map.zoom + 1, 20);
    }
  };

  const zoomOut = () => {
    if (map) {
      map.zoom = Math.max(map.zoom - 1, 1);
    }
  };

  const changeMapStyle = (style: string) => {
    setMapStyle(style);
  };

  return (
    <div className="space-y-6">
      {/* Search Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <MapPin className="h-5 w-5" />
            <span>Map Search Controls</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Address Search */}
          <div className="flex space-x-2">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Enter address, city, or neighborhood..."
                value={searchAddress}
                onChange={(e) => setSearchAddress(e.target.value)}
                className="pl-10"
                onKeyPress={(e) => e.key === 'Enter' && handleAddressSearch()}
              />
            </div>
            <Button onClick={handleAddressSearch}>
              Search
            </Button>
            <Button variant="outline" onClick={getCurrentLocation}>
              <Target className="h-4 w-4 mr-2" />
              My Location
            </Button>
          </div>

          {/* Search Radius */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">Search Radius</label>
              <Badge variant="secondary">
                {searchRadius[0]} mile{searchRadius[0] !== 1 ? 's' : ''}
              </Badge>
            </div>
            <Slider
              value={searchRadius}
              onValueChange={setSearchRadius}
              max={50}
              min={1}
              step={1}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-gray-500">
              <span>1 mile</span>
              <span>50 miles</span>
            </div>
          </div>

          {/* Results Summary */}
          <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
            <div className="flex items-center space-x-2">
              <Home className="h-4 w-4 text-blue-600" />
              <span className="text-sm font-medium text-blue-900">
                {propertyCount} properties found within {searchRadius[0]} mile{searchRadius[0] !== 1 ? 's' : ''}
              </span>
            </div>
            <Button variant="ghost" size="sm">
              <Filter className="h-4 w-4 mr-2" />
              Apply Filters
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Map Container */}
      <Card>
        <CardContent className="p-0">
          <div className="relative">
            {/* Map */}
            <div 
              ref={mapRef}
              className="w-full h-96 bg-gray-100 rounded-lg relative overflow-hidden"
            >
              {!isMapLoaded ? (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
                    <p className="text-gray-600">Loading interactive map...</p>
                  </div>
                </div>
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-green-100 to-blue-100 relative">
                  {/* Simulated Map Background */}
                  <div className="absolute inset-0 opacity-20">
                    <div className="grid grid-cols-8 grid-rows-6 h-full">
                      {Array.from({ length: 48 }).map((_, i) => (
                        <div key={i} className="border border-gray-300"></div>
                      ))}
                    </div>
                  </div>

                  {/* Center Marker */}
                  <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
                    <div className="w-4 h-4 bg-red-500 rounded-full border-2 border-white shadow-lg"></div>
                  </div>

                  {/* Search Radius Circle */}
                  <div 
                    className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 border-2 border-blue-500 border-dashed rounded-full bg-blue-100 bg-opacity-20"
                    style={{
                      width: `${Math.min(searchRadius[0] * 20, 300)}px`,
                      height: `${Math.min(searchRadius[0] * 20, 300)}px`
                    }}
                  ></div>

                  {/* Property Markers */}
                  {markers.map((marker, index) => (
                    <div
                      key={marker.id}
                      className="absolute transform -translate-x-1/2 -translate-y-1/2 cursor-pointer group"
                      style={{
                        top: `${30 + (index * 15) % 40}%`,
                        left: `${40 + (index * 20) % 30}%`
                      }}
                    >
                      <div className="w-8 h-8 bg-green-500 rounded-full border-2 border-white shadow-lg flex items-center justify-center">
                        <Home className="h-4 w-4 text-white" />
                      </div>
                      
                      {/* Property Popup */}
                      <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-10">
                        <div className="bg-white p-3 rounded-lg shadow-lg border min-w-48">
                          <div className="text-sm font-semibold">${marker.property.price.toLocaleString()}</div>
                          <div className="text-xs text-gray-600">{marker.property.bedrooms} bed, {marker.property.bathrooms} bath</div>
                          <div className="text-xs text-gray-500">{marker.property.address}</div>
                        </div>
                      </div>
                    </div>
                  ))}

                  {/* Map Controls */}
                  <div className="absolute top-4 right-4 space-y-2">
                    <div className="bg-white rounded-lg shadow-lg p-1">
                      <Button variant="ghost" size="sm" onClick={zoomIn}>
                        <ZoomIn className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={zoomOut}>
                        <ZoomOut className="h-4 w-4" />
                      </Button>
                    </div>
                    
                    <div className="bg-white rounded-lg shadow-lg p-1">
                      <Button 
                        variant={mapStyle === 'roadmap' ? 'default' : 'ghost'} 
                        size="sm"
                        onClick={() => changeMapStyle('roadmap')}
                      >
                        <Layers className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  {/* Map Legend */}
                  <div className="absolute bottom-4 left-4 bg-white rounded-lg shadow-lg p-3">
                    <div className="text-xs font-semibold mb-2">Legend</div>
                    <div className="space-y-1">
                      <div className="flex items-center space-x-2">
                        <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                        <span className="text-xs">Search Center</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                        <span className="text-xs">Available Properties</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <div className="w-3 h-3 border-2 border-blue-500 border-dashed rounded-full"></div>
                        <span className="text-xs">Search Radius</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Map Style Controls */}
            <div className="absolute top-4 left-4 bg-white rounded-lg shadow-lg p-2">
              <div className="flex space-x-1">
                <Button
                  variant={mapStyle === 'roadmap' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => changeMapStyle('roadmap')}
                >
                  Map
                </Button>
                <Button
                  variant={mapStyle === 'satellite' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => changeMapStyle('satellite')}
                >
                  Satellite
                </Button>
                <Button
                  variant={mapStyle === 'hybrid' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => changeMapStyle('hybrid')}
                >
                  Hybrid
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-blue-600">{propertyCount}</div>
            <div className="text-sm text-gray-600">Properties Found</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-green-600">
              ${markers.length > 0 ? Math.round(markers.reduce((sum, m) => sum + m.property.price, 0) / markers.length / 1000) : 0}K
            </div>
            <div className="text-sm text-gray-600">Avg. Price</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-purple-600">{searchRadius[0]}</div>
            <div className="text-sm text-gray-600">Mile Radius</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-orange-600">
              {markers.length > 0 ? Math.round(markers.reduce((sum, m) => sum + m.property.sqft, 0) / markers.length) : 0}
            </div>
            <div className="text-sm text-gray-600">Avg. Sq Ft</div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}