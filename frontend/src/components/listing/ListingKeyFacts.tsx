import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DetailedListing } from '@/types/listing';
import { Bed, Bath, Square, Calendar, TrendingUp, MapPin } from 'lucide-react';

interface ListingKeyFactsProps {
  listing: DetailedListing;
}

export default function ListingKeyFacts({ listing }: ListingKeyFactsProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Property Details</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6">
          <div className="text-center">
            <div className="flex items-center justify-center w-12 h-12 bg-blue-100 rounded-full mx-auto mb-2">
              <Bed className="h-6 w-6 text-blue-600" />
            </div>
            <div className="text-2xl font-bold text-gray-900">{listing.beds}</div>
            <div className="text-sm text-gray-600">Bedrooms</div>
          </div>

          <div className="text-center">
            <div className="flex items-center justify-center w-12 h-12 bg-purple-100 rounded-full mx-auto mb-2">
              <Bath className="h-6 w-6 text-purple-600" />
            </div>
            <div className="text-2xl font-bold text-gray-900">{listing.baths}</div>
            <div className="text-sm text-gray-600">Bathrooms</div>
          </div>

          <div className="text-center">
            <div className="flex items-center justify-center w-12 h-12 bg-green-100 rounded-full mx-auto mb-2">
              <Square className="h-6 w-6 text-green-600" />
            </div>
            <div className="text-2xl font-bold text-gray-900">{listing.sqft.toLocaleString()}</div>
            <div className="text-sm text-gray-600">Sq Ft</div>
          </div>

          <div className="text-center">
            <div className="flex items-center justify-center w-12 h-12 bg-orange-100 rounded-full mx-auto mb-2">
              <MapPin className="h-6 w-6 text-orange-600" />
            </div>
            <div className="text-2xl font-bold text-gray-900">{(listing.lotSize / 1000).toFixed(1)}K</div>
            <div className="text-sm text-gray-600">Lot Size</div>
          </div>

          <div className="text-center">
            <div className="flex items-center justify-center w-12 h-12 bg-red-100 rounded-full mx-auto mb-2">
              <Calendar className="h-6 w-6 text-red-600" />
            </div>
            <div className="text-2xl font-bold text-gray-900">{listing.yearBuilt}</div>
            <div className="text-sm text-gray-600">Year Built</div>
          </div>

          <div className="text-center">
            <div className="flex items-center justify-center w-12 h-12 bg-indigo-100 rounded-full mx-auto mb-2">
              <TrendingUp className="h-6 w-6 text-indigo-600" />
            </div>
            <div className="text-2xl font-bold text-gray-900">{listing.daysOnMLS}</div>
            <div className="text-sm text-gray-600">Days on MLS</div>
          </div>
        </div>

        <div className="mt-6 pt-6 border-t border-gray-200">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center">
              <div className="text-lg font-semibold text-gray-900">
                ${listing.pricePerSqft}
              </div>
              <div className="text-sm text-gray-600">Price per Sq Ft</div>
            </div>
            
            <div className="text-center">
              <div className="text-lg font-semibold text-gray-900">
                {listing.propertyType}
              </div>
              <div className="text-sm text-gray-600">Property Type</div>
            </div>
            
            <div className="text-center">
              <div className="text-lg font-semibold text-gray-900">
                MLS# {listing.mlsNumber}
              </div>
              <div className="text-sm text-gray-600">MLS Number</div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}