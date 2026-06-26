import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { PropertyValuation, ROIScenario, Comparable } from '@/types/seller';
import { 
  BarChart3, 
  TrendingUp, 
  Calculator, 
  Home,
  DollarSign,
  Calendar,
  Target,
  Plus,
  Eye,
  Download
} from 'lucide-react';

export default function AnalyticsROI() {
  const [selectedProperty, setSelectedProperty] = useState('prop-1');
  const [isCreateScenarioOpen, setIsCreateScenarioOpen] = useState(false);

  // Mock property valuation data
  const valuation: PropertyValuation = {
    propertyId: 'prop-1',
    estimatedValue: 875000,
    confidenceRange: [825000, 925000],
    comparables: [
      {
        id: 'comp-1',
        address: '125 Main St',
        soldPrice: 860000,
        soldDate: new Date('2024-08-15'),
        bedrooms: 4,
        bathrooms: 3,
        squareFeet: 2350,
        daysOnMarket: 22,
        distance: 0.1
      },
      {
        id: 'comp-2',
        address: '789 Oak Drive',
        soldPrice: 890000,
        soldDate: new Date('2024-07-28'),
        bedrooms: 4,
        bathrooms: 3,
        squareFeet: 2480,
        daysOnMarket: 31,
        distance: 0.3
      },
      {
        id: 'comp-3',
        address: '456 Pine Avenue',
        soldPrice: 835000,
        soldDate: new Date('2024-08-02'),
        bedrooms: 3,
        bathrooms: 2.5,
        squareFeet: 2200,
        daysOnMarket: 18,
        distance: 0.2
      }
    ],
    marketTrends: [
      {
        period: 'Q3 2024',
        averagePrice: 865000,
        medianDaysOnMarket: 25,
        priceChange: 3.2,
        inventoryLevel: 'low'
      },
      {
        period: 'Q2 2024',
        averagePrice: 838000,
        medianDaysOnMarket: 32,
        priceChange: 1.8,
        inventoryLevel: 'normal'
      }
    ],
    lastUpdated: new Date('2024-09-02')
  };

  // Mock ROI scenarios
  const roiScenarios: ROIScenario[] = [
    {
      id: 'scenario-1',
      propertyId: 'prop-1',
      scenarioName: 'Sell Now',
      type: 'sale_now',
      assumptions: {
        salePrice: 875000
      },
      projectedROI: 15.2,
      projectedCashFlow: [875000],
      projectedValue: 875000,
      createdAt: new Date('2024-09-01')
    },
    {
      id: 'scenario-2',
      propertyId: 'prop-1',
      scenarioName: 'Rent 3 Years Then Sell',
      type: 'rent_then_sell',
      assumptions: {
        monthlyRent: 4200,
        rentGrowthRate: 3.5,
        appreciationRate: 4.2,
        holdingPeriod: 3,
        maintenanceCosts: 8000,
        propertyTaxes: 12000,
        insurance: 2400
      },
      projectedROI: 22.8,
      projectedCashFlow: [38400, 39744, 41135, 985000],
      projectedValue: 985000,
      createdAt: new Date('2024-09-01')
    },
    {
      id: 'scenario-3',
      propertyId: 'prop-1',
      scenarioName: 'Lease-to-Own Program',
      type: 'lease_to_own',
      assumptions: {
        monthlyRent: 4800,
        holdingPeriod: 2,
        salePrice: 950000
      },
      projectedROI: 28.5,
      projectedCashFlow: [57600, 57600, 950000],
      projectedValue: 950000,
      createdAt: new Date('2024-09-01')
    }
  ];

  const getInventoryColor = (level: string) => {
    switch (level) {
      case 'low': return 'text-green-600 bg-green-50 border-green-200';
      case 'normal': return 'text-blue-600 bg-blue-50 border-blue-200';
      case 'high': return 'text-red-600 bg-red-50 border-red-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getROIColor = (roi: number) => {
    if (roi >= 25) return 'text-green-600';
    if (roi >= 15) return 'text-blue-600';
    if (roi >= 10) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Analytics & ROI Tools</h2>
          <p className="text-gray-600">Property valuation, market analysis, and ROI scenarios</p>
        </div>
        <div className="flex items-center space-x-3">
          <Select value={selectedProperty} onValueChange={setSelectedProperty}>
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="prop-1">123 Main St, Downtown</SelectItem>
              <SelectItem value="prop-2">456 Oak Ave, North District</SelectItem>
            </SelectContent>
          </Select>
          
          <Dialog open={isCreateScenarioOpen} onOpenChange={setIsCreateScenarioOpen}>
            <DialogTrigger asChild>
              <Button className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700">
                <Plus className="h-4 w-4 mr-2" />
                New Scenario
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Create ROI Scenario</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Scenario Name</Label>
                  <Input placeholder="e.g., Hold 5 Years" />
                </div>
                
                <div className="space-y-2">
                  <Label>Scenario Type</Label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Select scenario type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="sale_now">Sell Now</SelectItem>
                      <SelectItem value="rent_then_sell">Rent Then Sell</SelectItem>
                      <SelectItem value="lease_to_own">Lease-to-Own</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Monthly Rent</Label>
                    <Input type="number" placeholder="4200" />
                  </div>
                  <div className="space-y-2">
                    <Label>Holding Period (Years)</Label>
                    <Input type="number" placeholder="3" />
                  </div>
                  <div className="space-y-2">
                    <Label>Appreciation Rate (%)</Label>
                    <Input type="number" step="0.1" placeholder="4.2" />
                  </div>
                  <div className="space-y-2">
                    <Label>Rent Growth Rate (%)</Label>
                    <Input type="number" step="0.1" placeholder="3.5" />
                  </div>
                </div>

                <div className="flex justify-end space-x-2">
                  <Button variant="outline" onClick={() => setIsCreateScenarioOpen(false)}>
                    Cancel
                  </Button>
                  <Button className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700">
                    Create Scenario
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Property Valuation */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Property Valuation Dashboard</span>
            <Badge variant="outline">
              Updated {valuation.lastUpdated.toLocaleDateString()}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-green-600 mb-2">
                ${valuation.estimatedValue.toLocaleString()}
              </div>
              <p className="text-sm text-gray-600">Estimated Market Value</p>
              <p className="text-xs text-gray-500 mt-1">
                Range: ${valuation.confidenceRange[0].toLocaleString()} - ${valuation.confidenceRange[1].toLocaleString()}
              </p>
            </div>
            
            <div className="text-center">
              <div className="text-3xl font-bold text-blue-600 mb-2">
                {valuation.marketTrends[0].priceChange}%
              </div>
              <p className="text-sm text-gray-600">Price Change (Q3)</p>
              <Badge className={`${getInventoryColor(valuation.marketTrends[0].inventoryLevel)} border text-xs mt-1`}>
                {valuation.marketTrends[0].inventoryLevel} inventory
              </Badge>
            </div>
            
            <div className="text-center">
              <div className="text-3xl font-bold text-purple-600 mb-2">
                {valuation.marketTrends[0].medianDaysOnMarket}
              </div>
              <p className="text-sm text-gray-600">Median Days on Market</p>
              <p className="text-xs text-gray-500 mt-1">Current market conditions</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Market Comparables */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Comparable Sales</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {valuation.comparables.map((comp) => (
              <div key={comp.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-4">
                  <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                    <Home className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">{comp.address}</p>
                    <div className="flex items-center space-x-4 text-sm text-gray-600">
                      <span>{comp.bedrooms} bed • {comp.bathrooms} bath</span>
                      <span>{comp.squareFeet.toLocaleString()} sq ft</span>
                      <span>{comp.distance} mi away</span>
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-lg font-bold text-green-600">
                    ${comp.soldPrice.toLocaleString()}
                  </div>
                  <div className="text-sm text-gray-600">
                    Sold {comp.soldDate.toLocaleDateString()}
                  </div>
                  <div className="text-xs text-gray-500">
                    {comp.daysOnMarket} days on market
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* ROI Scenarios */}
      <Card>
        <CardHeader>
          <CardTitle>ROI Scenario Analysis</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {roiScenarios.map((scenario) => (
              <div key={scenario.id} className="p-4 border rounded-lg hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-semibold text-gray-900">{scenario.scenarioName}</h4>
                  <Badge variant="outline" className="text-xs">
                    {scenario.type.replace('_', ' ')}
                  </Badge>
                </div>
                
                <div className="space-y-3">
                  <div className="text-center">
                    <div className={`text-2xl font-bold ${getROIColor(scenario.projectedROI)} mb-1`}>
                      {scenario.projectedROI}%
                    </div>
                    <p className="text-sm text-gray-600">Projected ROI</p>
                  </div>
                  
                  <div className="space-y-2 text-sm">
                    {scenario.assumptions.salePrice && (
                      <div className="flex justify-between">
                        <span>Sale Price:</span>
                        <span className="font-medium">${scenario.assumptions.salePrice.toLocaleString()}</span>
                      </div>
                    )}
                    {scenario.assumptions.monthlyRent && (
                      <div className="flex justify-between">
                        <span>Monthly Rent:</span>
                        <span className="font-medium">${scenario.assumptions.monthlyRent.toLocaleString()}</span>
                      </div>
                    )}
                    {scenario.assumptions.holdingPeriod && (
                      <div className="flex justify-between">
                        <span>Holding Period:</span>
                        <span className="font-medium">{scenario.assumptions.holdingPeriod} years</span>
                      </div>
                    )}
                    <div className="flex justify-between border-t pt-2">
                      <span>Final Value:</span>
                      <span className="font-bold text-green-600">${scenario.projectedValue.toLocaleString()}</span>
                    </div>
                  </div>
                  
                  <Button variant="outline" size="sm" className="w-full">
                    <Eye className="h-4 w-4 mr-1" />
                    View Details
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* What-If Calculator */}
      <Card>
        <CardHeader>
          <CardTitle>What-If Calculator</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <h4 className="font-medium text-gray-900">Scenario Parameters</h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Current Value</Label>
                  <Input type="number" defaultValue="875000" />
                </div>
                <div className="space-y-2">
                  <Label>Monthly Rent</Label>
                  <Input type="number" defaultValue="4200" />
                </div>
                <div className="space-y-2">
                  <Label>Appreciation Rate (%)</Label>
                  <Input type="number" step="0.1" defaultValue="4.2" />
                </div>
                <div className="space-y-2">
                  <Label>Holding Period (Years)</Label>
                  <Input type="number" defaultValue="5" />
                </div>
              </div>
              <Button className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700">
                <Calculator className="h-4 w-4 mr-2" />
                Calculate ROI
              </Button>
            </div>
            
            <div className="space-y-4">
              <h4 className="font-medium text-gray-900">Results</h4>
              <div className="p-4 bg-gray-50 rounded-lg">
                <div className="text-center py-8">
                  <Calculator className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600">Adjust parameters and click Calculate to see results</p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Market Outlook */}
      <Card>
        <CardHeader>
          <CardTitle>Long-Term Market Outlook</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <h4 className="font-medium text-gray-900">5-Year Projections</h4>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Property Value Growth:</span>
                  <span className="font-medium text-green-600">+18.2%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Rental Yield:</span>
                  <span className="font-medium text-blue-600">5.8% annually</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Market Demand:</span>
                  <span className="font-medium text-purple-600">High</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Tax Benefits:</span>
                  <span className="font-medium text-orange-600">$12K annually</span>
                </div>
              </div>
            </div>
            
            <div className="space-y-4">
              <h4 className="font-medium text-gray-900">Risk Factors</h4>
              <div className="space-y-2">
                <div className="flex items-center justify-between p-2 bg-green-50 rounded">
                  <span className="text-sm">Interest Rate Risk</span>
                  <Badge className="bg-green-100 text-green-800 text-xs">Low</Badge>
                </div>
                <div className="flex items-center justify-between p-2 bg-yellow-50 rounded">
                  <span className="text-sm">Market Volatility</span>
                  <Badge className="bg-yellow-100 text-yellow-800 text-xs">Medium</Badge>
                </div>
                <div className="flex items-center justify-between p-2 bg-green-50 rounded">
                  <span className="text-sm">Liquidity Risk</span>
                  <Badge className="bg-green-100 text-green-800 text-xs">Low</Badge>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}