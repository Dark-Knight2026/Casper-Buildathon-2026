import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AgentAnalytics } from '@/types/agent';
import { 
  TrendingUp, 
  DollarSign, 
  Home, 
  Users,
  Calendar,
  Star,
  Clock,
  Target,
  Award
} from 'lucide-react';

export default function Analytics() {
  // Mock analytics data
  const analytics: AgentAnalytics = {
    rental: {
      totalProperties: 12,
      occupancyRate: 91.7,
      monthlyIncome: 28500,
      latePayments: 2,
      averageRent: 2375
    },
    sales: {
      activeListings: 8,
      closedDeals: 15,
      averageDaysOnMarket: 32,
      totalSalesVolume: 6750000,
      conversionRate: 68.2
    },
    aqi: {
      score: 87,
      clientSatisfaction: 4.8,
      responseTime: 2.3,
      dealClosureRate: 85.5
    }
  };

  const getAQIColor = (score: number) => {
    if (score >= 90) return 'bg-green-100 text-green-800 border-green-200';
    if (score >= 80) return 'bg-blue-100 text-blue-800 border-blue-200';
    if (score >= 70) return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    return 'bg-red-100 text-red-800 border-red-200';
  };

  const getAQILabel = (score: number) => {
    if (score >= 90) return 'Excellent';
    if (score >= 80) return 'Good';
    if (score >= 70) return 'Fair';
    return 'Needs Improvement';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Analytics & Reporting</h2>
        <p className="text-gray-600">Track your performance and business metrics</p>
      </div>

      {/* Agent Quality Index */}
      <Card className="bg-gradient-to-r from-purple-50 to-pink-50 border-purple-200">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Award className="h-5 w-5 text-purple-600" />
            <span>Agent Quality Index (AQI)</span>
            <Badge className={`${getAQIColor(analytics.aqi.score)} border ml-2`}>
              {analytics.aqi.score}/100 - {getAQILabel(analytics.aqi.score)}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-purple-600 mb-2">
                {analytics.aqi.clientSatisfaction}
              </div>
              <div className="flex items-center justify-center space-x-1 mb-1">
                {[...Array(5)].map((_, i) => (
                  <Star 
                    key={i} 
                    className={`h-4 w-4 ${i < Math.floor(analytics.aqi.clientSatisfaction) ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'}`} 
                  />
                ))}
              </div>
              <p className="text-sm text-gray-600">Client Satisfaction</p>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-blue-600 mb-2">
                {analytics.aqi.responseTime}h
              </div>
              <Clock className="h-6 w-6 text-blue-600 mx-auto mb-1" />
              <p className="text-sm text-gray-600">Avg Response Time</p>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-green-600 mb-2">
                {analytics.aqi.dealClosureRate}%
              </div>
              <Target className="h-6 w-6 text-green-600 mx-auto mb-1" />
              <p className="text-sm text-gray-600">Deal Closure Rate</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Rental Performance */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Home className="h-5 w-5 text-blue-600" />
            <span>Rental Property Performance</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600 mb-2">
                {analytics.rental.totalProperties}
              </div>
              <p className="text-sm text-gray-600">Total Properties</p>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600 mb-2">
                {analytics.rental.occupancyRate}%
              </div>
              <p className="text-sm text-gray-600">Occupancy Rate</p>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600 mb-2">
                ${analytics.rental.monthlyIncome.toLocaleString()}
              </div>
              <p className="text-sm text-gray-600">Monthly Income</p>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600 mb-2">
                {analytics.rental.latePayments}
              </div>
              <p className="text-sm text-gray-600">Late Payments</p>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-indigo-600 mb-2">
                ${analytics.rental.averageRent.toLocaleString()}
              </div>
              <p className="text-sm text-gray-600">Average Rent</p>
            </div>
          </div>

          <div className="mt-6 p-4 bg-blue-50 rounded-lg">
            <h4 className="font-semibold text-blue-900 mb-2">Rental Insights</h4>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• Occupancy rate is above market average (85%)</li>
              <li>• Monthly income increased 12% from last quarter</li>
              <li>• Consider rent adjustments for 3 properties due for renewal</li>
            </ul>
          </div>
        </CardContent>
      </Card>

      {/* Sales Performance */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <DollarSign className="h-5 w-5 text-green-600" />
            <span>Sales Performance</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600 mb-2">
                {analytics.sales.activeListings}
              </div>
              <p className="text-sm text-gray-600">Active Listings</p>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600 mb-2">
                {analytics.sales.closedDeals}
              </div>
              <p className="text-sm text-gray-600">Closed Deals</p>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600 mb-2">
                {analytics.sales.averageDaysOnMarket}
              </div>
              <p className="text-sm text-gray-600">Avg Days on Market</p>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600 mb-2">
                ${(analytics.sales.totalSalesVolume / 1000000).toFixed(1)}M
              </div>
              <p className="text-sm text-gray-600">Total Sales Volume</p>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-indigo-600 mb-2">
                {analytics.sales.conversionRate}%
              </div>
              <p className="text-sm text-gray-600">Conversion Rate</p>
            </div>
          </div>

          <div className="mt-6 p-4 bg-green-50 rounded-lg">
            <h4 className="font-semibold text-green-900 mb-2">Sales Insights</h4>
            <ul className="text-sm text-green-800 space-y-1">
              <li>• Average days on market is 8 days below market average</li>
              <li>• Conversion rate improved 15% compared to last quarter</li>
              <li>• 3 properties have been on market for over 45 days - consider price adjustment</li>
            </ul>
          </div>
        </CardContent>
      </Card>

      {/* Performance Trends */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <TrendingUp className="h-5 w-5 text-blue-600" />
              <span>Monthly Trends</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Rental Income</span>
                <div className="flex items-center space-x-2">
                  <span className="font-semibold">$28,500</span>
                  <Badge className="bg-green-100 text-green-800 border-green-200">
                    +12%
                  </Badge>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Sales Volume</span>
                <div className="flex items-center space-x-2">
                  <span className="font-semibold">$1.2M</span>
                  <Badge className="bg-blue-100 text-blue-800 border-blue-200">
                    +8%
                  </Badge>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">New Clients</span>
                <div className="flex items-center space-x-2">
                  <span className="font-semibold">7</span>
                  <Badge className="bg-purple-100 text-purple-800 border-purple-200">
                    +3
                  </Badge>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Deals Closed</span>
                <div className="flex items-center space-x-2">
                  <span className="font-semibold">4</span>
                  <Badge className="bg-orange-100 text-orange-800 border-orange-200">
                    +1
                  </Badge>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Users className="h-5 w-5 text-purple-600" />
              <span>Client Breakdown</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Active Buyers</span>
                <div className="flex items-center space-x-2">
                  <span className="font-semibold">12</span>
                  <div className="w-16 bg-gray-200 rounded-full h-2">
                    <div className="bg-blue-600 h-2 rounded-full" style={{ width: '60%' }}></div>
                  </div>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Active Sellers</span>
                <div className="flex items-center space-x-2">
                  <span className="font-semibold">8</span>
                  <div className="w-16 bg-gray-200 rounded-full h-2">
                    <div className="bg-green-600 h-2 rounded-full" style={{ width: '40%' }}></div>
                  </div>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Active Renters</span>
                <div className="flex items-center space-x-2">
                  <span className="font-semibold">4</span>
                  <div className="w-16 bg-gray-200 rounded-full h-2">
                    <div className="bg-purple-600 h-2 rounded-full" style={{ width: '20%' }}></div>
                  </div>
                </div>
              </div>
              <div className="pt-2 border-t">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-900">Total Active</span>
                  <span className="font-bold text-lg">24</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}