/**
 * Property Comparison Component
 * Side-by-side comparison of multiple properties
 */

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Download, X, Check, Minus } from 'lucide-react';
import { documentService } from '@/services/documentService';
import type { PropertyComparison as PropertyComparisonType } from '@/types/property';

interface PropertyComparisonProps {
  properties: PropertyComparisonType[];
  onRemove?: (propertyId: string) => void;
}

export function PropertyComparison({ properties, onRemove }: PropertyComparisonProps) {
  const [selectedProperties, setSelectedProperties] = useState<string[]>(properties.map((p) => p.id));

  const handleDownloadComparison = async () => {
    const selected = properties.filter((p) => selectedProperties.includes(p.id));
    await documentService.downloadComparisonReport(selected);
  };

  const toggleProperty = (propertyId: string) => {
    setSelectedProperties((prev) =>
      prev.includes(propertyId) ? prev.filter((id) => id !== propertyId) : [...prev, propertyId]
    );
  };

  const displayedProperties = properties.filter((p) => selectedProperties.includes(p.id));

  const getComparisonIcon = (value: number | boolean | string, allValues: (number | boolean | string)[]) => {
    if (typeof value === 'number') {
      const numericValues = allValues.filter((v): v is number => typeof v === 'number');
      const max = Math.max(...numericValues);
      const min = Math.min(...numericValues);
      if (value === max) return <Check className="h-4 w-4 text-green-600" />;
      if (value === min) return <Minus className="h-4 w-4 text-red-600" />;
    }
    return null;
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Property Comparison</CardTitle>
              <CardDescription>Compare up to 4 properties side by side</CardDescription>
            </div>
            <Button onClick={handleDownloadComparison} variant="outline">
              <Download className="mr-2 h-4 w-4" />
              Export PDF
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {/* Property Selection */}
          <div className="flex gap-4 mb-6 overflow-x-auto pb-2">
            {properties.map((property) => (
              <div key={property.id} className="flex items-center gap-2 whitespace-nowrap">
                <Checkbox
                  checked={selectedProperties.includes(property.id)}
                  onCheckedChange={() => toggleProperty(property.id)}
                />
                <span className="text-sm">{property.address}</span>
              </div>
            ))}
          </div>

          {/* Comparison Table */}
          <div className="overflow-x-auto">
            <div className="min-w-full">
              {/* Property Headers */}
              <div className="grid gap-4 mb-4" style={{ gridTemplateColumns: `200px repeat(${displayedProperties.length}, 1fr)` }}>
                <div className="font-semibold text-gray-700">Property</div>
                {displayedProperties.map((property) => (
                  <div key={property.id} className="relative">
                    <Card>
                      <CardContent className="pt-4">
                        <div className="flex items-start justify-between mb-2">
                          <p className="font-semibold text-sm">{property.address}</p>
                          {onRemove && (
                            <Button variant="ghost" size="sm" onClick={() => onRemove(property.id)}>
                              <X className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                        <Badge variant={property.available ? 'default' : 'secondary'}>
                          {property.available ? 'Available' : 'Unavailable'}
                        </Badge>
                      </CardContent>
                    </Card>
                  </div>
                ))}
              </div>

              {/* Monthly Rent */}
              <div className="grid gap-4 mb-3 items-center" style={{ gridTemplateColumns: `200px repeat(${displayedProperties.length}, 1fr)` }}>
                <div className="text-sm font-medium text-gray-700">Monthly Rent</div>
                {displayedProperties.map((property) => (
                  <div key={property.id} className="flex items-center gap-2">
                    <span className="font-semibold">${property.rent.toLocaleString()}</span>
                    {getComparisonIcon(
                      property.rent,
                      displayedProperties.map((p) => p.rent)
                    )}
                  </div>
                ))}
              </div>

              {/* Bedrooms */}
              <div className="grid gap-4 mb-3 items-center" style={{ gridTemplateColumns: `200px repeat(${displayedProperties.length}, 1fr)` }}>
                <div className="text-sm font-medium text-gray-700">Bedrooms</div>
                {displayedProperties.map((property) => (
                  <div key={property.id} className="flex items-center gap-2">
                    <span>{property.bedrooms}</span>
                    {getComparisonIcon(
                      property.bedrooms,
                      displayedProperties.map((p) => p.bedrooms)
                    )}
                  </div>
                ))}
              </div>

              {/* Bathrooms */}
              <div className="grid gap-4 mb-3 items-center" style={{ gridTemplateColumns: `200px repeat(${displayedProperties.length}, 1fr)` }}>
                <div className="text-sm font-medium text-gray-700">Bathrooms</div>
                {displayedProperties.map((property) => (
                  <div key={property.id} className="flex items-center gap-2">
                    <span>{property.bathrooms}</span>
                    {getComparisonIcon(
                      property.bathrooms,
                      displayedProperties.map((p) => p.bathrooms)
                    )}
                  </div>
                ))}
              </div>

              {/* Square Feet */}
              <div className="grid gap-4 mb-3 items-center" style={{ gridTemplateColumns: `200px repeat(${displayedProperties.length}, 1fr)` }}>
                <div className="text-sm font-medium text-gray-700">Square Feet</div>
                {displayedProperties.map((property) => (
                  <div key={property.id} className="flex items-center gap-2">
                    <span>{property.sqft.toLocaleString()} sqft</span>
                    {getComparisonIcon(
                      property.sqft,
                      displayedProperties.map((p) => p.sqft)
                    )}
                  </div>
                ))}
              </div>

              {/* Pet Friendly */}
              <div className="grid gap-4 mb-3 items-center" style={{ gridTemplateColumns: `200px repeat(${displayedProperties.length}, 1fr)` }}>
                <div className="text-sm font-medium text-gray-700">Pet Friendly</div>
                {displayedProperties.map((property) => (
                  <div key={property.id}>
                    {property.petFriendly ? (
                      <Badge variant="default">Yes</Badge>
                    ) : (
                      <Badge variant="secondary">No</Badge>
                    )}
                  </div>
                ))}
              </div>

              {/* Parking */}
              <div className="grid gap-4 mb-3 items-center" style={{ gridTemplateColumns: `200px repeat(${displayedProperties.length}, 1fr)` }}>
                <div className="text-sm font-medium text-gray-700">Parking</div>
                {displayedProperties.map((property) => (
                  <div key={property.id}>
                    <span className="text-sm">{property.parking}</span>
                  </div>
                ))}
              </div>

              {/* Utilities */}
              <div className="grid gap-4 mb-3 items-center" style={{ gridTemplateColumns: `200px repeat(${displayedProperties.length}, 1fr)` }}>
                <div className="text-sm font-medium text-gray-700">Utilities</div>
                {displayedProperties.map((property) => (
                  <div key={property.id}>
                    <span className="text-sm">{property.utilities}</span>
                  </div>
                ))}
              </div>

              {/* Amenities */}
              <div className="grid gap-4 mb-3" style={{ gridTemplateColumns: `200px repeat(${displayedProperties.length}, 1fr)` }}>
                <div className="text-sm font-medium text-gray-700">Amenities</div>
                {displayedProperties.map((property) => (
                  <div key={property.id}>
                    <div className="flex flex-wrap gap-1">
                      {property.amenities.slice(0, 3).map((amenity, index) => (
                        <Badge key={index} variant="outline" className="text-xs">
                          {amenity}
                        </Badge>
                      ))}
                      {property.amenities.length > 3 && (
                        <Badge variant="outline" className="text-xs">
                          +{property.amenities.length - 3}
                        </Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Lease Terms */}
              <div className="grid gap-4" style={{ gridTemplateColumns: `200px repeat(${displayedProperties.length}, 1fr)` }}>
                <div className="text-sm font-medium text-gray-700">Lease Terms</div>
                {displayedProperties.map((property) => (
                  <div key={property.id}>
                    <ul className="text-sm space-y-1">
                      {property.leaseTerms.slice(0, 2).map((term, index) => (
                        <li key={index} className="text-gray-600">
                          • {term}
                        </li>
                      ))}
                      {property.leaseTerms.length > 2 && (
                        <li className="text-gray-500 text-xs">+{property.leaseTerms.length - 2} more</li>
                      )}
                    </ul>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}