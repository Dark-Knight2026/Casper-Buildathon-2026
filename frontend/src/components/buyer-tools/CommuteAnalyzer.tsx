import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { MapPin, Clock, Car, Train, Bike, Navigation } from 'lucide-react';

export default function CommuteAnalyzer() {
  const [workAddress, setWorkAddress] = useState('');
  const [propertyAddress, setPropertyAddress] = useState('123 Luxury Lane, Beverly Hills, CA 90210');
  const [commuteData, setCommuteData] = useState({
    driving: { time: 25, distance: 18.5, cost: 12.50 },
    transit: { time: 45, distance: 22.3, cost: 3.50 },
    biking: { time: 75, distance: 19.2, cost: 0 },
    walking: { time: 240, distance: 19.2, cost: 0 }
  });

  const trafficPatterns = [
    { time: '7:00 AM', duration: 35, traffic: 'Heavy' },
    { time: '8:00 AM', duration: 42, traffic: 'Heavy' },
    { time: '9:00 AM', duration: 28, traffic: 'Moderate' },
    { time: '10:00 AM', duration: 22, traffic: 'Light' },
    { time: '5:00 PM', duration: 48, traffic: 'Heavy' },
    { time: '6:00 PM', duration: 38, traffic: 'Heavy' },
    { time: '7:00 PM', duration: 25, traffic: 'Moderate' }
  ];

  const transitOptions = [
    {
      id: 1,
      name: 'Metro Red Line + Bus',
      duration: 45,
      cost: 3.50,
      transfers: 1,
      walkTime: 8,
      frequency: '10-15 min'
    },
    {
      id: 2,
      name: 'Express Bus Route',
      duration: 38,
      cost: 2.25,
      transfers: 0,
      walkTime: 5,
      frequency: '20-30 min'
    },
    {
      id: 3,
      name: 'Metro + Light Rail',
      duration: 52,
      cost: 3.50,
      transfers: 2,
      walkTime: 12,
      frequency: '15-20 min'
    }
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Navigation className="h-5 w-5" />
          <span>Commute Analyzer</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Address Inputs */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="property-address">Property Address</Label>
            <Input
              id="property-address"
              value={propertyAddress}
              onChange={(e) => setPropertyAddress(e.target.value)}
              placeholder="Enter property address"
            />
          </div>
          <div>
            <Label htmlFor="work-address">Work Address</Label>
            <Input
              id="work-address"
              value={workAddress}
              onChange={(e) => setWorkAddress(e.target.value)}
              placeholder="Enter work address"
            />
          </div>
        </div>

        <Button className="w-full">
          <MapPin className="h-4 w-4 mr-2" />
          Analyze Commute
        </Button>

        {/* Commute Options */}
        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="traffic">Traffic</TabsTrigger>
            <TabsTrigger value="transit">Transit</TabsTrigger>
            <TabsTrigger value="costs">Costs</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="p-4 bg-blue-50 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <Car className="h-6 w-6 text-blue-600" />
                  <Badge variant="outline">Fastest</Badge>
                </div>
                <div className="text-2xl font-bold text-blue-900">{commuteData.driving.time} min</div>
                <div className="text-sm text-blue-700">Driving</div>
                <div className="text-xs text-blue-600 mt-1">
                  {commuteData.driving.distance} miles • ${commuteData.driving.cost}/day
                </div>
              </div>

              <div className="p-4 bg-green-50 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <Train className="h-6 w-6 text-green-600" />
                  <Badge variant="outline">Eco-friendly</Badge>
                </div>
                <div className="text-2xl font-bold text-green-900">{commuteData.transit.time} min</div>
                <div className="text-sm text-green-700">Public Transit</div>
                <div className="text-xs text-green-600 mt-1">
                  {commuteData.transit.distance} miles • ${commuteData.transit.cost}/day
                </div>
              </div>

              <div className="p-4 bg-orange-50 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <Bike className="h-6 w-6 text-orange-600" />
                  <Badge variant="outline">Exercise</Badge>
                </div>
                <div className="text-2xl font-bold text-orange-900">{commuteData.biking.time} min</div>
                <div className="text-sm text-orange-700">Biking</div>
                <div className="text-xs text-orange-600 mt-1">
                  {commuteData.biking.distance} miles • Free
                </div>
              </div>

              <div className="p-4 bg-purple-50 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <MapPin className="h-6 w-6 text-purple-600" />
                  <Badge variant="outline">Healthy</Badge>
                </div>
                <div className="text-2xl font-bold text-purple-900">{Math.floor(commuteData.walking.time / 60)}h {commuteData.walking.time % 60}m</div>
                <div className="text-sm text-purple-700">Walking</div>
                <div className="text-xs text-purple-600 mt-1">
                  {commuteData.walking.distance} miles • Free
                </div>
              </div>
            </div>

            <div className="p-4 bg-gray-50 rounded-lg">
              <h4 className="font-semibold text-gray-900 mb-3">Commute Score: 8.5/10</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                <div>
                  <span className="text-gray-600">Multiple Options:</span>
                  <span className="font-semibold text-gray-900 ml-2">Excellent</span>
                </div>
                <div>
                  <span className="text-gray-600">Average Time:</span>
                  <span className="font-semibold text-gray-900 ml-2">32 minutes</span>
                </div>
                <div>
                  <span className="text-gray-600">Cost Efficiency:</span>
                  <span className="font-semibold text-gray-900 ml-2">Good</span>
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="traffic" className="space-y-4">
            <h4 className="font-semibold text-gray-900">Traffic Patterns (Weekdays)</h4>
            <div className="space-y-3">
              {trafficPatterns.map((pattern, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <Clock className="h-4 w-4 text-gray-500" />
                    <span className="font-medium">{pattern.time}</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <span className="text-sm text-gray-600">{pattern.duration} min</span>
                    <Badge className={
                      pattern.traffic === 'Heavy' ? 'bg-red-100 text-red-800' :
                      pattern.traffic === 'Moderate' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-green-100 text-green-800'
                    }>
                      {pattern.traffic}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
            
            <div className="p-4 bg-blue-50 rounded-lg">
              <h5 className="font-semibold text-blue-900 mb-2">Best Commute Times</h5>
              <div className="text-sm text-blue-700">
                <p>• Morning: 9:00 AM - 10:00 AM (22-28 minutes)</p>
                <p>• Evening: 7:00 PM - 8:00 PM (25-30 minutes)</p>
                <p>• Avoid: 7:00-9:00 AM and 5:00-6:30 PM</p>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="transit" className="space-y-4">
            <h4 className="font-semibold text-gray-900">Public Transit Options</h4>
            <div className="space-y-4">
              {transitOptions.map((option) => (
                <div key={option.id} className="p-4 border border-gray-200 rounded-lg">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h5 className="font-semibold text-gray-900">{option.name}</h5>
                      <p className="text-sm text-gray-600">
                        {option.transfers} transfer{option.transfers !== 1 ? 's' : ''} • 
                        {option.walkTime} min walk • Every {option.frequency}
                      </p>
                    </div>
                    <div className="text-right">
                      <div className="text-xl font-bold text-gray-900">{option.duration} min</div>
                      <div className="text-sm text-gray-600">${option.cost}</div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Train className="h-4 w-4 text-blue-600" />
                    <div className="flex-1 h-2 bg-blue-200 rounded-full">
                      <div className="h-2 bg-blue-600 rounded-full" style={{ width: '70%' }}></div>
                    </div>
                    <MapPin className="h-4 w-4 text-green-600" />
                  </div>
                </div>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="costs" className="space-y-4">
            <h4 className="font-semibold text-gray-900">Annual Commute Costs</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="p-4 bg-red-50 rounded-lg">
                  <h5 className="font-semibold text-red-900 mb-2">Driving Costs</h5>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-red-700">Gas (daily)</span>
                      <span className="font-semibold">${commuteData.driving.cost}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-red-700">Annual gas</span>
                      <span className="font-semibold">${(commuteData.driving.cost * 250).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-red-700">Parking (est.)</span>
                      <span className="font-semibold">$2,400</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-red-700">Maintenance</span>
                      <span className="font-semibold">$800</span>
                    </div>
                    <div className="border-t border-red-200 pt-2">
                      <div className="flex justify-between font-bold">
                        <span className="text-red-900">Total Annual</span>
                        <span className="text-red-900">${(commuteData.driving.cost * 250 + 2400 + 800).toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="p-4 bg-green-50 rounded-lg">
                  <h5 className="font-semibold text-green-900 mb-2">Transit Costs</h5>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-green-700">Daily fare</span>
                      <span className="font-semibold">${commuteData.transit.cost}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-green-700">Monthly pass</span>
                      <span className="font-semibold">$75</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-green-700">Annual pass</span>
                      <span className="font-semibold">$900</span>
                    </div>
                    <div className="border-t border-green-200 pt-2">
                      <div className="flex justify-between font-bold">
                        <span className="text-green-900">Total Annual</span>
                        <span className="text-green-900">$900</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="p-4 bg-blue-50 rounded-lg">
                  <h5 className="font-semibold text-blue-900 mb-2">Annual Savings</h5>
                  <div className="text-2xl font-bold text-blue-900">
                    ${((commuteData.driving.cost * 250 + 2400 + 800) - 900).toLocaleString()}
                  </div>
                  <p className="text-sm text-blue-700">by using public transit</p>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}