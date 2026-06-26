import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { FloorPlan } from '@/types/listing';
import { Maximize2, Minimize2, Square, Info } from 'lucide-react';

interface InteractiveFloorPlanProps {
  floorPlans: FloorPlan[];
}

export default function InteractiveFloorPlan({ floorPlans }: InteractiveFloorPlanProps) {
  const [selectedPlan, setSelectedPlan] = useState(0);
  const [selectedRoom, setSelectedRoom] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  if (!floorPlans.length) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <Square className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">Floor plans coming soon</p>
        </CardContent>
      </Card>
    );
  }

  const currentPlan = floorPlans[selectedPlan];
  const currentRoom = selectedRoom ? currentPlan.rooms.find(r => r.id === selectedRoom) : null;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center space-x-2">
            <Square className="h-5 w-5" />
            <span>Interactive Floor Plan</span>
          </CardTitle>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsFullscreen(!isFullscreen)}
          >
            {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
          </Button>
        </div>
      </CardHeader>
      <CardContent className={isFullscreen ? 'fixed inset-0 z-50 bg-white p-6' : ''}>
        {/* Floor Plan Selector */}
        {floorPlans.length > 1 && (
          <div className="flex space-x-2 mb-4">
            {floorPlans.map((plan, index) => (
              <Button
                key={plan.id}
                variant={selectedPlan === index ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedPlan(index)}
              >
                {plan.name}
              </Button>
            ))}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Floor Plan Image */}
          <div className="lg:col-span-2">
            <div className="relative bg-gray-100 rounded-lg overflow-hidden">
              <img
                src={currentPlan.imageUrl}
                alt={currentPlan.name}
                className="w-full h-auto"
              />
              
              {/* Interactive Room Overlays */}
              <div className="absolute inset-0">
                {currentPlan.rooms.map((room) => (
                  <button
                    key={room.id}
                    className={`absolute border-2 transition-all duration-200 ${
                      selectedRoom === room.id
                        ? 'bg-blue-500/30 border-blue-500'
                        : 'bg-transparent border-transparent hover:bg-blue-500/20 hover:border-blue-300'
                    }`}
                    style={{
                      left: `${room.coordinates.x}%`,
                      top: `${room.coordinates.y}%`,
                      width: `${room.coordinates.width}%`,
                      height: `${room.coordinates.height}%`,
                    }}
                    onClick={() => setSelectedRoom(selectedRoom === room.id ? null : room.id)}
                  >
                    {selectedRoom === room.id && (
                      <div className="absolute top-1 left-1 bg-blue-600 text-white text-xs px-2 py-1 rounded">
                        {room.name}
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Floor Plan Info */}
            <div className="mt-4 p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-gray-900">{currentPlan.name}</h3>
                <Badge variant="outline">
                  {currentPlan.totalSqft.toLocaleString()} sq ft
                </Badge>
              </div>
              <p className="text-sm text-gray-600 mt-1">
                Click on rooms to view details
              </p>
            </div>
          </div>

          {/* Room Details */}
          <div className="space-y-4">
            <div>
              <h3 className="font-semibold text-gray-900 mb-3">Room Details</h3>
              {currentRoom ? (
                <Card>
                  <CardContent className="p-4">
                    <h4 className="font-semibold text-gray-900 mb-2">{currentRoom.name}</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Type:</span>
                        <span className="font-medium">{currentRoom.type}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Dimensions:</span>
                        <span className="font-medium">{currentRoom.dimensions}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Square Feet:</span>
                        <span className="font-medium">{currentRoom.sqft} sq ft</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <div className="text-center p-6 bg-gray-50 rounded-lg">
                  <Info className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                  <p className="text-gray-600">Select a room to view details</p>
                </div>
              )}
            </div>

            {/* Room List */}
            <div>
              <h3 className="font-semibold text-gray-900 mb-3">All Rooms</h3>
              <div className="space-y-2">
                {currentPlan.rooms.map((room) => (
                  <button
                    key={room.id}
                    onClick={() => setSelectedRoom(room.id)}
                    className={`w-full text-left p-3 rounded-lg border transition-colors ${
                      selectedRoom === room.id
                        ? 'bg-blue-50 border-blue-200'
                        : 'bg-white border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="font-medium text-gray-900">{room.name}</p>
                        <p className="text-sm text-gray-600">{room.type}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium">{room.sqft} sq ft</p>
                        <p className="text-xs text-gray-500">{room.dimensions}</p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Total Summary */}
            <div className="p-4 bg-blue-50 rounded-lg">
              <h4 className="font-semibold text-blue-900 mb-2">Floor Plan Summary</h4>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-blue-700">Total Rooms:</span>
                  <span className="font-medium text-blue-900">{currentPlan.rooms.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-blue-700">Total Square Feet:</span>
                  <span className="font-medium text-blue-900">{currentPlan.totalSqft.toLocaleString()}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}