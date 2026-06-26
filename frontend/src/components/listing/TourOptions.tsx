import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar, Video, FileImage, Clock } from 'lucide-react';

interface TourOptionsProps {
  virtualTourUrl?: string;
  floorPlanUrl?: string;
}

export default function TourOptions({ virtualTourUrl, floorPlanUrl }: TourOptionsProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Tour This Home</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Schedule In-Person Tour */}
        <div className="p-4 border border-gray-200 rounded-lg">
          <div className="flex items-center space-x-3 mb-3">
            <div className="flex items-center justify-center w-10 h-10 bg-blue-100 rounded-full">
              <Calendar className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <h4 className="font-semibold text-gray-900">Schedule In-Person Tour</h4>
              <p className="text-sm text-gray-600">See this home with an agent</p>
            </div>
          </div>
          <Button className="w-full">
            Schedule Tour
          </Button>
        </div>

        {/* Virtual Tour */}
        {virtualTourUrl && (
          <div className="p-4 border border-gray-200 rounded-lg">
            <div className="flex items-center space-x-3 mb-3">
              <div className="flex items-center justify-center w-10 h-10 bg-green-100 rounded-full">
                <Video className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <h4 className="font-semibold text-gray-900">Virtual Tour</h4>
                <p className="text-sm text-gray-600">Explore from anywhere</p>
              </div>
              <Badge className="bg-green-100 text-green-800">Available</Badge>
            </div>
            <Button variant="outline" className="w-full">
              Start Virtual Tour
            </Button>
          </div>
        )}

        {/* Floor Plan */}
        {floorPlanUrl && (
          <div className="p-4 border border-gray-200 rounded-lg">
            <div className="flex items-center space-x-3 mb-3">
              <div className="flex items-center justify-center w-10 h-10 bg-purple-100 rounded-full">
                <FileImage className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <h4 className="font-semibold text-gray-900">Floor Plan</h4>
                <p className="text-sm text-gray-600">View layout and dimensions</p>
              </div>
            </div>
            <Button variant="outline" className="w-full">
              View Floor Plan
            </Button>
          </div>
        )}

        {/* Tour Guidelines */}
        <div className="p-4 bg-gray-50 rounded-lg">
          <div className="flex items-center space-x-2 mb-2">
            <Clock className="h-4 w-4 text-gray-600" />
            <h5 className="font-medium text-gray-900">Tour Guidelines</h5>
          </div>
          <ul className="text-sm text-gray-600 space-y-1">
            <li>• Tours typically last 30-45 minutes</li>
            <li>• Please arrive on time for scheduled appointments</li>
            <li>• Bring valid ID and pre-approval letter if interested</li>
            <li>• Feel free to ask questions about the property</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}