/**
 * Property Comparison Page
 * Full page for comparing multiple properties
 */

import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { PropertyComparison } from '@/components/property/PropertyComparison';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import type { PropertyComparison as PropertyComparisonType } from '@/types/property';

export default function PropertyComparisonPage() {
  const [searchParams] = useSearchParams();
  const [properties, setProperties] = useState<PropertyComparisonType[]>([]);

  useEffect(() => {
    // Get property IDs from URL params
    const propertyIds = searchParams.get('properties')?.split(',') || [];
    loadProperties(propertyIds);
  }, [searchParams]);

  const loadProperties = async (propertyIds: string[]) => {
    // Mock data - replace with actual API call
    const mockProperties: PropertyComparisonType[] = [
      {
        id: '1',
        address: '123 Main St, Apt 4B',
        rent: 2500,
        bedrooms: 2,
        bathrooms: 2,
        sqft: 1200,
        available: true,
        amenities: ['Pool', 'Gym', 'Parking', 'Laundry'],
        petFriendly: true,
        parking: 'Covered parking included',
        utilities: 'Water and trash included',
        leaseTerms: ['12-month lease', 'Security deposit: $2,500', 'First and last month rent required'],
      },
      {
        id: '2',
        address: '456 Oak Ave, Unit 2',
        rent: 2200,
        bedrooms: 2,
        bathrooms: 1,
        sqft: 1000,
        available: true,
        amenities: ['Gym', 'Parking'],
        petFriendly: false,
        parking: 'Street parking',
        utilities: 'Tenant pays all utilities',
        leaseTerms: ['6 or 12-month lease', 'Security deposit: $2,200'],
      },
      {
        id: '3',
        address: '789 Pine Rd, Suite 5',
        rent: 2800,
        bedrooms: 3,
        bathrooms: 2,
        sqft: 1400,
        available: false,
        amenities: ['Pool', 'Gym', 'Parking', 'Laundry', 'Balcony'],
        petFriendly: true,
        parking: 'Garage parking included',
        utilities: 'Water included',
        leaseTerms: ['12-month lease', 'Security deposit: $2,800', 'Pet deposit: $500'],
      },
      {
        id: '4',
        address: '321 Elm St, Apt 1A',
        rent: 1900,
        bedrooms: 1,
        bathrooms: 1,
        sqft: 800,
        available: true,
        amenities: ['Laundry', 'Parking'],
        petFriendly: false,
        parking: 'One parking spot',
        utilities: 'All utilities included',
        leaseTerms: ['Month-to-month available', 'Security deposit: $1,900'],
      },
    ];

    const filtered = mockProperties.filter((p) => propertyIds.includes(p.id));
    setProperties(filtered.length > 0 ? filtered : mockProperties.slice(0, 3));
  };

  const handleRemoveProperty = (propertyId: string) => {
    setProperties(properties.filter((p) => p.id !== propertyId));
  };

  return (
    <div className="container mx-auto py-8 max-w-7xl">
      <div className="mb-6">
        <Button variant="ghost" onClick={() => window.history.back()}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Properties
        </Button>
      </div>

      <PropertyComparison properties={properties} onRemove={handleRemoveProperty} />
    </div>
  );
}