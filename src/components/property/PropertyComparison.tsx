/**
 * Property Comparison Component
 * Side-by-side comparison of multiple properties
 */

import { useState } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Download, X } from 'lucide-react';
import { documentService } from '@/services/documentService';
import type { PropertyComparison as PropertyComparisonType } from '@/types/property';

interface PropertyComparisonProps {
  properties: PropertyComparisonType[];
  onRemove?: (propertyId: string) => void;
}

export function PropertyComparison({
  properties,
  onRemove,
}: PropertyComparisonProps) {
  const [selectedProperties, setSelectedProperties] = useState<string[]>(
    properties.map((p) => p.id)
  );

  const handleDownloadComparison = async () => {
    const selected = properties.filter((p) =>
      selectedProperties.includes(p.id)
    );
    await documentService.downloadComparisonReport(selected);
  };

  const toggleProperty = (propertyId: string) => {
    setSelectedProperties((prev) =>
      prev.includes(propertyId)
        ? prev.filter((id) => id !== propertyId)
        : [...prev, propertyId]
    );
  };

  const displayedProperties = properties.filter((p) =>
    selectedProperties.includes(p.id)
  );

  // Fixed label column + a per-property min width so columns can't squish on
  // mobile (the table scrolls horizontally); `1fr` still lets them fill on
  // desktop. One source of truth for every row's grid.
  const gridStyle = {
    gridTemplateColumns: `150px repeat(${displayedProperties.length}, minmax(200px, 1fr))`,
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Property Comparison</CardTitle>
              <CardDescription>
                Compare up to 4 properties side by side
              </CardDescription>
            </div>
            <Button onClick={handleDownloadComparison} variant="outline">
              <Download className="mr-2 h-4 w-4" />
              Export PDF
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {/* Property Selection */}
          <div className="flex flex-col gap-2 mb-6 sm:flex-row sm:gap-4 sm:overflow-x-auto sm:pb-2">
            {properties.map((property) => (
              <div
                key={property.id}
                className="flex items-start gap-2 sm:items-center sm:whitespace-nowrap"
              >
                <Checkbox
                  checked={selectedProperties.includes(property.id)}
                  onCheckedChange={() => toggleProperty(property.id)}
                  className="mt-0.5 shrink-0 sm:mt-0"
                />
                <span className="text-sm wrap-break-word">
                  {property.address}
                </span>
              </div>
            ))}
          </div>

          {/* Comparison Table */}
          <div className="overflow-x-auto">
            <div className="min-w-full">
              {/* Property Headers */}
              <div className="grid gap-4 mb-4" style={gridStyle}>
                <div className="font-semibold text-gray-700">Property</div>
                {displayedProperties.map((property) => (
                  <div
                    key={property.id}
                    className="flex items-start justify-between gap-2"
                  >
                    <div>
                      <p className="font-semibold text-sm">
                        {property.address}
                      </p>
                      <Badge
                        variant={property.available ? 'default' : 'secondary'}
                        className="mt-1"
                      >
                        {property.available ? 'Available' : 'Unavailable'}
                      </Badge>
                    </div>
                    {onRemove && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onRemove(property.id)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>

              {/* Monthly Rent */}
              <div className="grid gap-4 mb-3 items-center" style={gridStyle}>
                <div className="text-sm font-medium text-gray-700">
                  Monthly Rent
                </div>
                {displayedProperties.map((property) => (
                  <div key={property.id}>
                    <span className="font-semibold">
                      ${property.rent.toLocaleString()}
                    </span>
                  </div>
                ))}
              </div>

              {/* Bedrooms */}
              <div className="grid gap-4 mb-3 items-center" style={gridStyle}>
                <div className="text-sm font-medium text-gray-700">
                  Bedrooms
                </div>
                {displayedProperties.map((property) => (
                  <div key={property.id}>
                    <span>{property.bedrooms}</span>
                  </div>
                ))}
              </div>

              {/* Bathrooms */}
              <div className="grid gap-4 mb-3 items-center" style={gridStyle}>
                <div className="text-sm font-medium text-gray-700">
                  Bathrooms
                </div>
                {displayedProperties.map((property) => (
                  <div key={property.id}>
                    <span>{property.bathrooms}</span>
                  </div>
                ))}
              </div>

              {/* Square Feet */}
              <div className="grid gap-4 mb-3 items-center" style={gridStyle}>
                <div className="text-sm font-medium text-gray-700">
                  Square Feet
                </div>
                {displayedProperties.map((property) => (
                  <div key={property.id}>
                    <span>{property.sqft.toLocaleString()} sqft</span>
                  </div>
                ))}
              </div>

              {/* Pet Friendly */}
              <div className="grid gap-4 mb-3 items-center" style={gridStyle}>
                <div className="text-sm font-medium text-gray-700">
                  Pet Friendly
                </div>
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
              <div className="grid gap-4 mb-3 items-center" style={gridStyle}>
                <div className="text-sm font-medium text-gray-700">Parking</div>
                {displayedProperties.map((property) => (
                  <div key={property.id}>
                    <span className="text-sm">{property.parking}</span>
                  </div>
                ))}
              </div>

              {/* Utilities */}
              <div className="grid gap-4 mb-3 items-center" style={gridStyle}>
                <div className="text-sm font-medium text-gray-700">
                  Utilities
                </div>
                {displayedProperties.map((property) => (
                  <div key={property.id}>
                    <span className="text-sm">{property.utilities}</span>
                  </div>
                ))}
              </div>

              {/* Amenities */}
              <div className="grid gap-4 mb-3" style={gridStyle}>
                <div className="text-sm font-medium text-gray-700">
                  Amenities
                </div>
                {displayedProperties.map((property) => (
                  <div key={property.id}>
                    <div className="flex flex-wrap gap-1">
                      {property.amenities.map((amenity, index) => (
                        <Badge
                          key={index}
                          variant="outline"
                          className="text-xs"
                        >
                          {amenity}
                        </Badge>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              {/* Lease Terms */}
              <div className="grid gap-4" style={gridStyle}>
                <div className="text-sm font-medium text-gray-700">
                  Lease Terms
                </div>
                {displayedProperties.map((property) => (
                  <div key={property.id}>
                    <ul className="text-sm space-y-1">
                      {property.leaseTerms.map((term, index) => (
                        <li key={index} className="text-gray-600">
                          • {term}
                        </li>
                      ))}
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
