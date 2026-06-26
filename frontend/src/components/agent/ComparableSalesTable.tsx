import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MapPin, Calendar, Home, DollarSign } from 'lucide-react';
import type { ComparableSale } from '@/types/market';
import { format } from 'date-fns';

interface ComparableSalesTableProps {
  comparables: ComparableSale[];
}

export default function ComparableSalesTable({ comparables }: ComparableSalesTableProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Comparable Sales</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {comparables.map((comp) => (
            <div key={comp.id} className="p-4 border rounded-lg hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <h3 className="font-semibold text-lg mb-1">{comp.address}</h3>
                  <div className="flex items-center text-sm text-gray-600">
                    <MapPin className="h-4 w-4 mr-1" />
                    {comp.city}, {comp.state} {comp.zip_code}
                    {comp.distance_miles && (
                      <>
                        <span className="mx-2">•</span>
                        {comp.distance_miles.toFixed(1)} miles away
                      </>
                    )}
                  </div>
                </div>
                {comp.similarity_score && (
                  <Badge variant="outline" className="bg-green-50 text-green-700 border-green-300">
                    {comp.similarity_score}% match
                  </Badge>
                )}
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-3">
                <div>
                  <p className="text-xs text-gray-500">Sale Price</p>
                  <p className="font-semibold text-lg">${comp.sale_price.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Price/Sq Ft</p>
                  <p className="font-semibold">${comp.price_per_sqft}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Beds/Baths</p>
                  <p className="font-semibold">{comp.bedrooms} / {comp.bathrooms}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Square Feet</p>
                  <p className="font-semibold">{comp.square_feet.toLocaleString()}</p>
                </div>
              </div>

              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center space-x-4">
                  <div className="flex items-center text-gray-600">
                    <Calendar className="h-4 w-4 mr-1" />
                    Sold: {format(new Date(comp.sale_date), 'MMM d, yyyy')}
                  </div>
                  <div className="flex items-center text-gray-600">
                    <Home className="h-4 w-4 mr-1" />
                    {comp.property_type}
                  </div>
                </div>
                <Badge variant="outline">
                  {comp.days_on_market} days on market
                </Badge>
              </div>

              {comp.lot_size && (
                <div className="mt-2 text-xs text-gray-500">
                  Lot: {comp.lot_size} acres • Built: {comp.year_built}
                </div>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}