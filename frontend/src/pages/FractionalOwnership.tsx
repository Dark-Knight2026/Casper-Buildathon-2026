import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { 
  PieChart, 
  TrendingUp, 
  DollarSign, 
  Users, 
  Building2,
  ArrowUpRight,
  ArrowDownRight,
  Plus,
  Minus,
  Eye,
  Calculator
} from 'lucide-react';

export default function FractionalOwnership() {
  const [investmentAmount, setInvestmentAmount] = useState('');

  const investments = [
    {
      id: 1,
      propertyName: 'Downtown Luxury Apartments',
      totalValue: 2400000,
      availableShares: 55,
      minInvestment: 1000,
      expectedReturn: 8.5,
      currentShares: 12,
      monthlyDividend: 245,
      investors: 34,
      status: 'Active',
      image: '/api/placeholder/300/200'
    },
    {
      id: 2,
      propertyName: 'Commercial Plaza',
      totalValue: 3600000,
      availableShares: 22,
      minInvestment: 2500,
      expectedReturn: 10.2,
      currentShares: 8,
      monthlyDividend: 420,
      investors: 67,
      status: 'Active',
      image: '/api/placeholder/300/200'
    },
    {
      id: 3,
      propertyName: 'Beachside Vacation Rentals',
      totalValue: 1200000,
      availableShares: 68,
      minInvestment: 500,
      expectedReturn: 12.1,
      currentShares: 15,
      monthlyDividend: 185,
      investors: 23,
      status: 'Active',
      image: '/api/placeholder/300/200'
    },
    {
      id: 4,
      propertyName: 'Student Housing Complex',
      totalValue: 1800000,
      availableShares: 72,
      minInvestment: 750,
      expectedReturn: 9.3,
      currentShares: 5,
      monthlyDividend: 125,
      investors: 18,
      status: 'Coming Soon',
      image: '/api/placeholder/300/200'
    }
  ];

  const portfolioStats = {
    totalInvested: 45000,
    totalValue: 52340,
    monthlyDividends: 975,
    totalReturn: 16.3,
    activeInvestments: 4
  };

  const calculateShares = (amount: string, propertyValue: number) => {
    const investment = parseFloat(amount) || 0;
    return ((investment / propertyValue) * 100).toFixed(2);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Fractional Ownership</h1>
        <p className="text-gray-600 mt-2">Invest in real estate with fractional ownership opportunities</p>
      </div>

      {/* Portfolio Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Total Invested</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">${portfolioStats.totalInvested.toLocaleString()}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Current Value</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">${portfolioStats.totalValue.toLocaleString()}</div>
            <div className="flex items-center text-sm text-green-600">
              <ArrowUpRight className="h-4 w-4 mr-1" />
              +{portfolioStats.totalReturn}%
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Monthly Dividends</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">${portfolioStats.monthlyDividends}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Active Investments</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{portfolioStats.activeInvestments}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Total Gain/Loss</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">+${(portfolioStats.totalValue - portfolioStats.totalInvested).toLocaleString()}</div>
            <div className="flex items-center text-sm text-green-600">
              <ArrowUpRight className="h-4 w-4 mr-1" />
              +{portfolioStats.totalReturn}%
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="marketplace" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="marketplace">Marketplace</TabsTrigger>
          <TabsTrigger value="portfolio">My Portfolio</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="marketplace">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {investments.map((investment) => (
              <Card key={investment.id} className="hover:shadow-lg transition-shadow">
                <div className="aspect-video bg-gray-200 rounded-t-lg"></div>
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <CardTitle className="text-lg">{investment.propertyName}</CardTitle>
                    <Badge variant={investment.status === 'Active' ? 'default' : 'secondary'}>
                      {investment.status}
                    </Badge>
                  </div>
                  <CardDescription>
                    Total Value: ${investment.totalValue.toLocaleString()}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-gray-600">Available Shares</p>
                      <p className="font-medium text-green-600">{investment.availableShares}%</p>
                    </div>
                    <div>
                      <p className="text-gray-600">Expected Return</p>
                      <p className="font-medium text-blue-600">{investment.expectedReturn}%</p>
                    </div>
                    <div>
                      <p className="text-gray-600">Min Investment</p>
                      <p className="font-medium">${investment.minInvestment}</p>
                    </div>
                    <div>
                      <p className="text-gray-600">Investors</p>
                      <p className="font-medium">{investment.investors}</p>
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-sm mb-2">
                      <span className="text-gray-600">Shares Sold</span>
                      <span className="font-medium">{100 - investment.availableShares}%</span>
                    </div>
                    <Progress value={100 - investment.availableShares} className="h-2" />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">Investment Amount ($)</label>
                    <Input
                      type="number"
                      placeholder="Enter amount"
                      value={investmentAmount}
                      onChange={(e) => setInvestmentAmount(e.target.value)}
                    />
                    {investmentAmount && (
                      <p className="text-xs text-gray-600">
                        This equals {calculateShares(investmentAmount, investment.totalValue)}% ownership
                      </p>
                    )}
                  </div>

                  <div className="flex space-x-2">
                    <Button className="flex-1" disabled={investment.status !== 'Active'}>
                      <Plus className="h-4 w-4 mr-1" />
                      Invest
                    </Button>
                    <Button variant="outline">
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button variant="outline">
                      <Calculator className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="portfolio">
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>My Investments</CardTitle>
                <CardDescription>Overview of your fractional ownership portfolio</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {investments.filter(inv => inv.currentShares > 0).map((investment) => (
                    <div key={investment.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                      <div className="flex-1">
                        <h3 className="font-medium text-gray-900">{investment.propertyName}</h3>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-2 text-sm">
                          <div>
                            <p className="text-gray-600">Ownership</p>
                            <p className="font-medium text-blue-600">{investment.currentShares}%</p>
                          </div>
                          <div>
                            <p className="text-gray-600">Monthly Dividend</p>
                            <p className="font-medium text-green-600">${investment.monthlyDividend}</p>
                          </div>
                          <div>
                            <p className="text-gray-600">Investment Value</p>
                            <p className="font-medium">${((investment.totalValue * investment.currentShares) / 100).toLocaleString()}</p>
                          </div>
                          <div>
                            <p className="text-gray-600">Return</p>
                            <p className="font-medium text-green-600">{investment.expectedReturn}%</p>
                          </div>
                        </div>
                      </div>
                      <div className="flex space-x-2">
                        <Button size="sm" variant="outline">
                          <Plus className="h-4 w-4 mr-1" />
                          Buy More
                        </Button>
                        <Button size="sm" variant="outline">
                          <Minus className="h-4 w-4 mr-1" />
                          Sell
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="analytics">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Investment Performance</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="text-center p-6 bg-gradient-to-r from-green-50 to-blue-50 rounded-lg">
                    <div className="text-3xl font-bold text-green-600 mb-2">+{portfolioStats.totalReturn}%</div>
                    <p className="text-gray-600">Total Portfolio Return</p>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center p-4 bg-gray-50 rounded-lg">
                      <div className="text-xl font-bold text-gray-900">${portfolioStats.monthlyDividends}</div>
                      <p className="text-sm text-gray-600">Monthly Income</p>
                    </div>
                    <div className="text-center p-4 bg-gray-50 rounded-lg">
                      <div className="text-xl font-bold text-gray-900">${(portfolioStats.monthlyDividends * 12).toLocaleString()}</div>
                      <p className="text-sm text-gray-600">Annual Income</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Investment Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {investments.filter(inv => inv.currentShares > 0).map((investment) => (
                    <div key={investment.id} className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">{investment.propertyName}</span>
                        <span className="font-medium">{investment.currentShares}%</span>
                      </div>
                      <Progress value={investment.currentShares * 5} className="h-2" />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}