import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { School } from '@/types/listing';
import { GraduationCap, MapPin, Star } from 'lucide-react';

interface SchoolsSectionProps {
  schools: School[];
}

export default function SchoolsSection({ schools }: SchoolsSectionProps) {
  const getSchoolTypeColor = (type: string) => {
    switch (type) {
      case 'elementary':
        return 'bg-green-100 text-green-800';
      case 'middle':
        return 'bg-blue-100 text-blue-800';
      case 'high':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getRatingColor = (rating: number) => {
    if (rating >= 9) return 'text-green-600';
    if (rating >= 7) return 'text-blue-600';
    if (rating >= 5) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center space-x-2 mb-4">
        <GraduationCap className="h-5 w-5 text-blue-600" />
        <h3 className="text-lg font-semibold text-gray-900">Nearby Schools</h3>
      </div>

      {schools.map((school) => (
        <Card key={school.id} className="hover:shadow-md transition-shadow">
          <CardContent className="p-4">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center space-x-2 mb-2">
                  <h4 className="font-semibold text-gray-900">{school.name}</h4>
                  <Badge className={getSchoolTypeColor(school.type)}>
                    {school.type}
                  </Badge>
                </div>
                
                <div className="flex items-center space-x-4 text-sm text-gray-600">
                  <div className="flex items-center space-x-1">
                    <Star className="h-4 w-4" />
                    <span className={`font-semibold ${getRatingColor(school.rating)}`}>
                      {school.rating}/10
                    </span>
                  </div>
                  
                  <div className="flex items-center space-x-1">
                    <MapPin className="h-4 w-4" />
                    <span>{school.distance} mi</span>
                  </div>
                  
                  <span>Grades {school.grades}</span>
                </div>
              </div>
              
              <div className="text-right">
                <div className={`text-2xl font-bold ${getRatingColor(school.rating)}`}>
                  {school.rating}
                </div>
                <div className="text-xs text-gray-500">Rating</div>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}

      <div className="mt-6 p-4 bg-blue-50 rounded-lg">
        <h4 className="font-semibold text-blue-900 mb-2">School Rating Guide</h4>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-green-500 rounded-full"></div>
            <span className="text-gray-700">9-10: Excellent</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
            <span className="text-gray-700">7-8: Very Good</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
            <span className="text-gray-700">5-6: Good</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-red-500 rounded-full"></div>
            <span className="text-gray-700">1-4: Below Average</span>
          </div>
        </div>
      </div>
    </div>
  );
}