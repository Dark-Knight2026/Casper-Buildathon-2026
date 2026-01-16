import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  X, 
  Star, 
  Bed, 
  Bath, 
  Square, 
  MapPin, 
  Calendar,
  DollarSign,
  TrendingUp,
  TrendingDown,
  Minus,
  Plus,
  Eye,
  Heart,
  Share2,
  Download,
  BarChart3
} from 'lucide-react';
import { Property } from '@/types/property';
import { getFeaturedImage, getPropertyImages } from '@/utils/propertyImages';
import PropertyImageGallery from '../PropertyImageGallery';

interface PropertyComparisonProps {
  properties: Property[];
  onRemoveProperty: (propertyId: number) => void;
  onAddProperty?: () => void;
  maxProperties?: number;
  className?: string;
}

interface ComparisonMetric {
  label: string;
  key: keyof Property | 'pricePerSqft' | 'valueScore';
  icon: React.ComponentType<{ className?: string }>;
  format?: (value: string | number | boolean | string[]) => string;
  type: 'number' | 'string' | 'boolean' | 'array' | 'calculated';
}

const comparisonMetrics: ComparisonMetric[] = [
  { label: 'Price', key: 'price', icon: DollarSign, format: (v) => `$${(v as number).toLocaleString()}`, type: 'number' },
  { label: 'Price per Sq Ft', key: 'pricePerSqft', icon: TrendingUp, format: (v) => `$${(v as number).toFixed(2)}/sq ft`, type: 'calculated' },
  { label: 'Bedrooms', key: 'bedrooms', icon: Bed, format: (v) => (v as number).toString(), type: 'number' },
  { label: 'Bathrooms', key: 'bathrooms', icon: Bath, format: (v) => (v as number).toString(), type: 'number' },
  { label: 'Square Footage', key: 'sqft', icon: Square, format: (v) => `${(v as number).toLocaleString()} sq ft`, type: 'number' },
  { label: 'Rating', key: 'rating', icon: Star, format: (v) => `${v}/5`, type: 'number' },
  { label: 'Views', key: 'views', icon: Eye, format: (v) => (v as number).toLocaleString(), type: 'number' },
  { label: 'Favorites', key: 'favorites', icon: Heart, format: (v) => (v as number).toLocaleString(), type: 'number' },
  { label: 'Availability', key: 'availability', icon: Calendar, type: 'string' },
  { label: 'Property Type', key: 'propertyType', icon: Square, type: 'string' },
  { label: 'Value Score', key: 'valueScore', icon: BarChart3, format: (v) => `${v}/100`, type: 'calculated' }
];

interface EnrichedProperty extends Property {
  pricePerSqft: number;
  valueScore: number;
}

export default function PropertyComparison({ 
  properties, 
  onRemoveProperty, 
  onAddProperty,
  maxProperties = 4,
  className = ''
}: PropertyComparisonProps) {
  const [selectedMetrics, setSelectedMetrics] = useState<string[]>(
    comparisonMetrics.slice(0, 6).map(m => m.key)
  );
  const [showAllMetrics, setShowAllMetrics] = useState(false);

  // Calculate additional metrics
  const enrichedProperties: EnrichedProperty[] = properties.map(property => {
    const pricePerSqft = property.price / property.sqft;
    const valueScore = Math.min(100, Math.max(0, 
      (property.rating * 15) + 
      (property.amenities.length * 2) + 
      (property.views / 100) + 
      (property.favorites / 10) - 
      (pricePerSqft / 10)
    ));

    return {
      ...property,
      pricePerSqft,
      valueScore: Math.round(valueScore)
    };
  });

  const toggleMetric = (metricKey: string) => {
    setSelectedMetrics(prev => 
      prev.includes(metricKey) 
        ? prev.filter(key => key !== metricKey)
        : [...prev, metricKey]
    );
  };

  const getComparisonIndicator = (values: number[], currentValue: number, isHigherBetter: boolean = false) => {
    if (values.length <= 1) return null;
    
    const max = Math.max(...values);
    const min = Math.min(...values);
    
    if (currentValue === max && currentValue === min) return null;
    
    if (isHigherBetter) {
      if (currentValue === max) return <TrendingUp className="h-4 w-4 text-green-500" />;
      if (currentValue === min) return <TrendingDown className="h-4 w-4 text-red-500" />;
    } else {
      if (currentValue === min) return <TrendingUp className="h-4 w-4 text-green-500" />;
      if (currentValue === max) return <TrendingDown className="h-4 w-4 text-red-500" />;
    }
    
    return <Minus className="h-4 w-4 text-gray-400" />;
  };

  const exportComparison = () => {
    const data = enrichedProperties.map(property => {
      const exportData: Record<string, string | number> = { 
        title: property.title, 
        address: property.address 
      };
      
      selectedMetrics.forEach(metricKey => {
        const metric = comparisonMetrics.find(m => m.key === metricKey);
        if (metric) {
          const value = property[metricKey as keyof EnrichedProperty];
          exportData[metric.label] = metric.format ? metric.format(value as string | number | boolean | string[]) : (value as string | number);
        }
      });
      return exportData;
    });

    const csvContent = [
      Object.keys(data[0]).join(','),
      ...data.map(row => Object.values(row).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'property-comparison.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  if (properties.length === 0) {
    return (
      <Card className={className}>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <BarChart3 className="h-12 w-12 text-gray-400 mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No Properties to Compare</h3>
          <p className="text-gray-600 text-center mb-4">
            Add properties to your comparison list to see side-by-side analysis
          </p>
          {onAddProperty && (
            <Button onClick={onAddProperty}>
              <Plus className="h-4 w-4 mr-2" />
              Add Properties
            </Button>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center">
            <BarChart3 className="h-5 w-5 mr-2" />
            Property Comparison
            <Badge variant="secondary" className="ml-2">
              {properties.length} of {maxProperties}
            </Badge>
          </CardTitle>
          <div className="flex items-center space-x-2">
            <Button variant="outline" size="sm" onClick={exportComparison}>
              <Download className="h-4 w-4 mr-1" />
              Export
            </Button>
            <Button variant="outline" size="sm" onClick={() => setShowAllMetrics(!showAllMetrics)}>
              {showAllMetrics ? 'Show Less' : 'Show More'}
            </Button>
          </div>
        </div>

        {/* Metric Selection */}
        <div className="space-y-2">
          <p className="text-sm text-gray-600">Select metrics to compare:</p>
          <div className="flex flex-wrap gap-2">
            {comparisonMetrics.slice(0, showAllMetrics ? undefined : 8).map((metric) => {
              const Icon = metric.icon;
              return (
                <Button
                  key={metric.key}
                  variant={selectedMetrics.includes(metric.key) ? "default" : "outline"}
                  size="sm"
                  onClick={() => toggleMetric(metric.key)}
                  className="text-xs"
                >
                  <Icon className="h-3 w-3 mr-1" />
                  {metric.label}
                </Button>
              );
            })}
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <ScrollArea className="w-full">
          <div className="min-w-full">
            {/* Property Headers */}
            <div className="grid gap-4 mb-6" style={{ gridTemplateColumns: `200px repeat(${properties.length}, 1fr)` }}>
              <div></div> {/* Empty cell for metric labels */}
              {enrichedProperties.map((property) => (
                <Card key={property.id} className="relative">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute top-2 right-2 z-10 h-6 w-6"
                    onClick={() => onRemoveProperty(property.id)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                  
                  <CardContent className="p-4">
                    {/* Property Image */}
                    <div className="mb-3">
                      <PropertyImageGallery
                        images={getPropertyImages(property.propertyType || 'apartment')}
                        className="h-32"
                        showThumbnails={false}
                      />
                    </div>

                    {/* Property Info */}
                    <div className="space-y-2">
                      <h4 className="font-semibold text-sm line-clamp-2">{property.title}</h4>
                      <div className="flex items-center text-xs text-gray-600">
                        <MapPin className="h-3 w-3 mr-1" />
                        <span className="line-clamp-1">{property.address}</span>
                      </div>
                      <div className="text-lg font-bold text-purple-600">
                        ${property.price.toLocaleString()}
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center">
                          <Star className="h-3 w-3 text-yellow-400 fill-yellow-400 mr-1" />
                          {property.rating}
                        </div>
                        <Badge variant="outline" className="text-xs">
                          {property.type}
                        </Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
              
              {/* Add Property Slot */}
              {properties.length < maxProperties && onAddProperty && (
                <Card className="border-2 border-dashed border-gray-300">
                  <CardContent className="p-4 flex flex-col items-center justify-center h-full min-h-[200px]">
                    <Button variant="ghost" onClick={onAddProperty} className="h-full w-full">
                      <div className="text-center">
                        <Plus className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                        <p className="text-sm text-gray-600">Add Property</p>
                      </div>
                    </Button>
                  </CardContent>
                </Card>
              )}
            </div>

            <Separator className="mb-6" />

            {/* Comparison Metrics */}
            <div className="space-y-4">
              {comparisonMetrics
                .filter(metric => selectedMetrics.includes(metric.key))
                .map((metric) => {
                  const Icon = metric.icon;
                  const values = enrichedProperties.map(p => {
                    const value = p[metric.key as keyof EnrichedProperty];
                    return typeof value === 'number' ? value : 0;
                  });
                  const isHigherBetter = ['rating', 'sqft', 'views', 'favorites', 'valueScore'].includes(metric.key);

                  return (
                    <div key={metric.key} className="grid gap-4" style={{ gridTemplateColumns: `200px repeat(${properties.length}, 1fr)` }}>
                      {/* Metric Label */}
                      <div className="flex items-center font-medium text-sm">
                        <Icon className="h-4 w-4 mr-2 text-gray-600" />
                        {metric.label}
                      </div>

                      {/* Metric Values */}
                      {enrichedProperties.map((property, index) => {
                        const value = property[metric.key as keyof EnrichedProperty];
                        const displayValue = metric.format ? metric.format(value as string | number | boolean | string[]) : value?.toString() || 'N/A';
                        const numericValue = typeof value === 'number' ? value : 0;
                        const indicator = getComparisonIndicator(values, numericValue, isHigherBetter);

                        return (
                          <div key={property.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                            <span className="text-sm font-medium">{displayValue}</span>
                            {indicator}
                          </div>
                        );
                      })}

                      {/* Empty slots for missing properties */}
                      {Array.from({ length: maxProperties - properties.length }).map((_, index) => (
                        <div key={`empty-${index}`} className="p-3 bg-gray-100 rounded-lg opacity-50">
                          <span className="text-sm text-gray-400">-</span>
                        </div>
                      ))}
                    </div>
                  );
                })}
            </div>

            {/* Summary Section */}
            <Separator className="my-6" />
            
            <div className="space-y-4">
              <h4 className="font-semibold">Summary & Recommendations</h4>
              
              <div className="grid gap-4" style={{ gridTemplateColumns: `200px repeat(${properties.length}, 1fr)` }}>
                <div className="font-medium text-sm">Best Value</div>
                {enrichedProperties.map((property) => {
                  const isHighestValue = enrichedProperties.every(p => property.valueScore >= p.valueScore);
                  return (
                    <div key={property.id} className={`p-3 rounded-lg ${isHighestValue ? 'bg-green-50 border border-green-200' : 'bg-gray-50'}`}>
                      {isHighestValue && (
                        <Badge className="bg-green-600 text-white mb-1">
                          Best Value
                        </Badge>
                      )}
                      <div className="text-sm">Score: {property.valueScore}/100</div>
                    </div>
                  );
                })}
              </div>

              <div className="grid gap-4" style={{ gridTemplateColumns: `200px repeat(${properties.length}, 1fr)` }}>
                <div className="font-medium text-sm">Most Affordable</div>
                {enrichedProperties.map((property) => {
                  const isLowestPrice = enrichedProperties.every(p => property.price <= p.price);
                  return (
                    <div key={property.id} className={`p-3 rounded-lg ${isLowestPrice ? 'bg-blue-50 border border-blue-200' : 'bg-gray-50'}`}>
                      {isLowestPrice && (
                        <Badge className="bg-blue-600 text-white mb-1">
                          Most Affordable
                        </Badge>
                      )}
                      <div className="text-sm">${property.pricePerSqft.toFixed(2)}/sq ft</div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}