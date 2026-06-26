import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Users, Plus, BarChart3, Award } from 'lucide-react';

export default function TeamManagement() {
  const agents = [
    {
      id: 1,
      name: 'Emily Rodriguez',
      email: 'emily@brokerage.com',
      activeListings: 24,
      completedDeals: 156,
      revenue: 485000,
      status: 'active',
      performance: 'excellent'
    },
    {
      id: 2,
      name: 'Michael Smith',
      email: 'michael@brokerage.com',
      activeListings: 18,
      completedDeals: 98,
      revenue: 320000,
      status: 'active',
      performance: 'good'
    },
    {
      id: 3,
      name: 'Lisa Johnson',
      email: 'lisa@brokerage.com',
      activeListings: 15,
      completedDeals: 67,
      revenue: 245000,
      status: 'active',
      performance: 'good'
    }
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Team Management</h2>
        <Button className="bg-gradient-to-r from-red-600 to-pink-600 hover:from-red-700 hover:to-pink-700">
          <Plus className="h-4 w-4 mr-2" />
          Add Agent
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {agents.map((agent) => (
          <Card key={agent.id} className="hover:shadow-lg transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-gradient-to-r from-blue-400 to-purple-400 rounded-full flex items-center justify-center">
                    <span className="text-white font-medium">
                      {agent.name.split(' ').map(n => n[0]).join('')}
                    </span>
                  </div>
                  <div>
                    <CardTitle className="text-lg">{agent.name}</CardTitle>
                    <p className="text-sm text-gray-600">{agent.email}</p>
                  </div>
                </div>
                <Badge 
                  className={
                    agent.performance === 'excellent' 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-blue-100 text-blue-800'
                  }
                >
                  {agent.performance}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600 flex items-center">
                    <BarChart3 className="h-4 w-4 mr-1" />
                    Active Listings
                  </span>
                  <span className="font-medium">{agent.activeListings}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600 flex items-center">
                    <Award className="h-4 w-4 mr-1" />
                    Completed Deals
                  </span>
                  <span className="font-medium">{agent.completedDeals}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Revenue</span>
                  <span className="font-medium text-green-600">
                    ${(agent.revenue / 1000).toFixed(0)}K
                  </span>
                </div>
              </div>
              <div className="mt-4 pt-3 border-t">
                <Button variant="outline" className="w-full">
                  View Details
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}