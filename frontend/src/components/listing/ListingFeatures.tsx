import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { PropertyFeatures } from '@/types/listing';
import { 
  Home, 
  TreePine, 
  Thermometer, 
  Snowflake, 
  Car, 
  Layers, 
  ChefHat, 
  Zap 
} from 'lucide-react';

interface ListingFeaturesProps {
  features: PropertyFeatures;
}

export default function ListingFeatures({ features }: ListingFeaturesProps) {
  const featureCategories = [
    {
      title: 'Interior Features',
      icon: <Home className="h-5 w-5" />,
      items: features.interior,
      color: 'bg-blue-100 text-blue-800'
    },
    {
      title: 'Exterior Features',
      icon: <TreePine className="h-5 w-5" />,
      items: features.exterior,
      color: 'bg-green-100 text-green-800'
    },
    {
      title: 'Heating',
      icon: <Thermometer className="h-5 w-5" />,
      items: features.heating,
      color: 'bg-red-100 text-red-800'
    },
    {
      title: 'Cooling',
      icon: <Snowflake className="h-5 w-5" />,
      items: features.cooling,
      color: 'bg-cyan-100 text-cyan-800'
    },
    {
      title: 'Parking & Garage',
      icon: <Car className="h-5 w-5" />,
      items: features.parking,
      color: 'bg-gray-100 text-gray-800'
    },
    {
      title: 'Flooring',
      icon: <Layers className="h-5 w-5" />,
      items: features.flooring,
      color: 'bg-amber-100 text-amber-800'
    },
    {
      title: 'Appliances',
      icon: <ChefHat className="h-5 w-5" />,
      items: features.appliances,
      color: 'bg-purple-100 text-purple-800'
    },
    {
      title: 'Energy Features',
      icon: <Zap className="h-5 w-5" />,
      items: features.energy,
      color: 'bg-yellow-100 text-yellow-800'
    }
  ];

  return (
    <div className="space-y-6">
      {featureCategories.map((category, index) => (
        <div key={index}>
          <div className="flex items-center space-x-2 mb-3">
            <div className="flex items-center justify-center w-8 h-8 bg-gray-100 rounded-full">
              {category.icon}
            </div>
            <h3 className="text-lg font-semibold text-gray-900">{category.title}</h3>
          </div>
          
          <div className="flex flex-wrap gap-2">
            {category.items.map((item, itemIndex) => (
              <Badge
                key={itemIndex}
                variant="outline"
                className={`${category.color} border-current`}
              >
                {item}
              </Badge>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}