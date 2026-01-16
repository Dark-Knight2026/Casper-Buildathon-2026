import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import {
  MapPin,
  DollarSign,
  Home,
  TrendingUp,
  AlertCircle,
  CheckCircle2,
  FileText,
  Calculator,
  Info,
  ExternalLink,
  Search,
  Download,
} from 'lucide-react';

interface StateTaxInfo {
  state: string;
  stateCode: string;
  incomeTaxRate: string;
  propertyTaxRate: string;
  salesTaxRate: string;
  mortgageInterestDeduction: boolean;
  propertyTaxDeduction: boolean;
  firstTimeHomebuyerCredit: boolean;
  energyCredits: boolean;
  specialPrograms: string[];
  filingDeadline: string;
  resources: {
    name: string;
    url: string;
  }[];
}

const stateData: Record<string, StateTaxInfo> = {
  CA: {
    state: 'California',
    stateCode: 'CA',
    incomeTaxRate: '1% - 13.3%',
    propertyTaxRate: '~1.0%',
    salesTaxRate: '7.25% - 10.75%',
    mortgageInterestDeduction: true,
    propertyTaxDeduction: true,
    firstTimeHomebuyerCredit: false,
    energyCredits: true,
    specialPrograms: [
      'California Competes Tax Credit',
      'Solar Energy System Tax Credit',
      'Mortgage Credit Certificate Program',
      'Property Tax Postponement Program',
    ],
    filingDeadline: 'April 15 (follows federal deadline)',
    resources: [
      { name: 'California Franchise Tax Board', url: 'https://www.ftb.ca.gov' },
      { name: 'CA Property Tax Information', url: 'https://www.boe.ca.gov' },
    ],
  },
  NY: {
    state: 'New York',
    stateCode: 'NY',
    incomeTaxRate: '4% - 10.9%',
    propertyTaxRate: '~1.7%',
    salesTaxRate: '4% - 8.875%',
    mortgageInterestDeduction: true,
    propertyTaxDeduction: true,
    firstTimeHomebuyerCredit: true,
    energyCredits: true,
    specialPrograms: [
      'STAR Property Tax Relief',
      'Enhanced STAR for Seniors',
      'Green Building Tax Credit',
      'Historic Home Tax Credit',
    ],
    filingDeadline: 'April 15 (follows federal deadline)',
    resources: [
      { name: 'NY Department of Taxation', url: 'https://www.tax.ny.gov' },
      { name: 'STAR Program Information', url: 'https://www.tax.ny.gov/star' },
    ],
  },
  TX: {
    state: 'Texas',
    stateCode: 'TX',
    incomeTaxRate: 'No state income tax',
    propertyTaxRate: '~1.8%',
    salesTaxRate: '6.25% - 8.25%',
    mortgageInterestDeduction: false,
    propertyTaxDeduction: false,
    firstTimeHomebuyerCredit: false,
    energyCredits: true,
    specialPrograms: [
      'Homestead Exemption',
      'Over-65 Property Tax Exemption',
      'Disabled Veteran Exemption',
      'Solar/Wind Energy Device Exemption',
    ],
    filingDeadline: 'N/A (no state income tax)',
    resources: [
      { name: 'Texas Comptroller', url: 'https://comptroller.texas.gov' },
      { name: 'Property Tax Information', url: 'https://comptroller.texas.gov/taxes/property-tax' },
    ],
  },
  FL: {
    state: 'Florida',
    stateCode: 'FL',
    incomeTaxRate: 'No state income tax',
    propertyTaxRate: '~1.0%',
    salesTaxRate: '6% - 8.5%',
    mortgageInterestDeduction: false,
    propertyTaxDeduction: false,
    firstTimeHomebuyerCredit: false,
    energyCredits: true,
    specialPrograms: [
      'Homestead Exemption (up to $50,000)',
      'Save Our Homes Assessment Cap',
      'Senior Citizen Exemption',
      'Renewable Energy Property Tax Exemption',
    ],
    filingDeadline: 'N/A (no state income tax)',
    resources: [
      { name: 'FL Department of Revenue', url: 'https://floridarevenue.com' },
      { name: 'Property Tax Overview', url: 'https://floridarevenue.com/property' },
    ],
  },
};

export function StateTaxGuidance() {
  const [selectedState, setSelectedState] = useState<string>('CA');
  const [searchQuery, setSearchQuery] = useState('');

  const stateInfo = stateData[selectedState];

  const filteredStates = Object.keys(stateData).filter((code) =>
    stateData[code].state.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="w-5 h-5" />
            State-Specific Tax Guidance
          </CardTitle>
          <CardDescription>
            Get tailored tax information and deductions for your state
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* State Selector */}
          <Card className="mb-6 bg-gradient-to-r from-blue-50 to-purple-50 border-2 border-blue-200">
            <CardContent className="p-6">
              <div className="space-y-4">
                <div>
                  <Label className="text-base font-semibold mb-2 block">Select Your State</Label>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <Input
                        placeholder="Search states..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2">
                  {filteredStates.map((code) => (
                    <Button
                      key={code}
                      variant={selectedState === code ? 'default' : 'outline'}
                      className={`h-auto p-3 ${
                        selectedState === code ? 'bg-blue-600' : ''
                      }`}
                      onClick={() => setSelectedState(code)}
                    >
                      <div className="text-center">
                        <p className="font-bold">{code}</p>
                        <p className="text-xs">{stateData[code].state}</p>
                      </div>
                    </Button>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {stateInfo && (
            <>
              {/* State Overview */}
              <Card className="mb-6">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <MapPin className="w-5 h-5" />
                    {stateInfo.state} Tax Overview
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid md:grid-cols-3 gap-4">
                    <Card className="bg-blue-50 border-blue-200">
                      <CardContent className="p-4">
                        <div className="flex items-center gap-2 mb-2">
                          <DollarSign className="w-5 h-5 text-blue-600" />
                          <p className="font-semibold text-sm">Income Tax Rate</p>
                        </div>
                        <p className="text-lg font-bold text-blue-900">
                          {stateInfo.incomeTaxRate}
                        </p>
                      </CardContent>
                    </Card>

                    <Card className="bg-green-50 border-green-200">
                      <CardContent className="p-4">
                        <div className="flex items-center gap-2 mb-2">
                          <Home className="w-5 h-5 text-green-600" />
                          <p className="font-semibold text-sm">Property Tax Rate</p>
                        </div>
                        <p className="text-lg font-bold text-green-900">
                          {stateInfo.propertyTaxRate}
                        </p>
                      </CardContent>
                    </Card>

                    <Card className="bg-purple-50 border-purple-200">
                      <CardContent className="p-4">
                        <div className="flex items-center gap-2 mb-2">
                          <TrendingUp className="w-5 h-5 text-purple-600" />
                          <p className="font-semibold text-sm">Sales Tax Rate</p>
                        </div>
                        <p className="text-lg font-bold text-purple-900">
                          {stateInfo.salesTaxRate}
                        </p>
                      </CardContent>
                    </Card>
                  </div>
                </CardContent>
              </Card>

              {/* Available Deductions */}
              <Card className="mb-6">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5" />
                    Available Homeowner Deductions
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div
                    className={`flex items-start gap-3 p-3 rounded-lg ${
                      stateInfo.mortgageInterestDeduction
                        ? 'bg-green-50 border border-green-200'
                        : 'bg-gray-50 border border-gray-200'
                    }`}
                  >
                    {stateInfo.mortgageInterestDeduction ? (
                      <CheckCircle2 className="w-5 h-5 text-green-600 mt-0.5" />
                    ) : (
                      <AlertCircle className="w-5 h-5 text-gray-400 mt-0.5" />
                    )}
                    <div>
                      <p className="font-semibold text-sm">Mortgage Interest Deduction</p>
                      <p className="text-xs text-gray-600">
                        {stateInfo.mortgageInterestDeduction
                          ? `${stateInfo.state} allows deduction of mortgage interest on state returns`
                          : `${stateInfo.state} does not have state income tax or does not allow this deduction`}
                      </p>
                    </div>
                  </div>

                  <div
                    className={`flex items-start gap-3 p-3 rounded-lg ${
                      stateInfo.propertyTaxDeduction
                        ? 'bg-green-50 border border-green-200'
                        : 'bg-gray-50 border border-gray-200'
                    }`}
                  >
                    {stateInfo.propertyTaxDeduction ? (
                      <CheckCircle2 className="w-5 h-5 text-green-600 mt-0.5" />
                    ) : (
                      <AlertCircle className="w-5 h-5 text-gray-400 mt-0.5" />
                    )}
                    <div>
                      <p className="font-semibold text-sm">Property Tax Deduction</p>
                      <p className="text-xs text-gray-600">
                        {stateInfo.propertyTaxDeduction
                          ? `${stateInfo.state} allows deduction of property taxes on state returns`
                          : `${stateInfo.state} does not have state income tax or does not allow this deduction`}
                      </p>
                    </div>
                  </div>

                  <div
                    className={`flex items-start gap-3 p-3 rounded-lg ${
                      stateInfo.firstTimeHomebuyerCredit
                        ? 'bg-green-50 border border-green-200'
                        : 'bg-gray-50 border border-gray-200'
                    }`}
                  >
                    {stateInfo.firstTimeHomebuyerCredit ? (
                      <CheckCircle2 className="w-5 h-5 text-green-600 mt-0.5" />
                    ) : (
                      <AlertCircle className="w-5 h-5 text-gray-400 mt-0.5" />
                    )}
                    <div>
                      <p className="font-semibold text-sm">First-Time Homebuyer Credit</p>
                      <p className="text-xs text-gray-600">
                        {stateInfo.firstTimeHomebuyerCredit
                          ? `${stateInfo.state} offers tax credits for first-time homebuyers`
                          : `${stateInfo.state} does not currently offer first-time homebuyer credits`}
                      </p>
                    </div>
                  </div>

                  <div
                    className={`flex items-start gap-3 p-3 rounded-lg ${
                      stateInfo.energyCredits
                        ? 'bg-green-50 border border-green-200'
                        : 'bg-gray-50 border border-gray-200'
                    }`}
                  >
                    {stateInfo.energyCredits ? (
                      <CheckCircle2 className="w-5 h-5 text-green-600 mt-0.5" />
                    ) : (
                      <AlertCircle className="w-5 h-5 text-gray-400 mt-0.5" />
                    )}
                    <div>
                      <p className="font-semibold text-sm">Energy Efficiency Credits</p>
                      <p className="text-xs text-gray-600">
                        {stateInfo.energyCredits
                          ? `${stateInfo.state} offers tax credits for energy-efficient home improvements`
                          : `${stateInfo.state} does not currently offer energy efficiency credits`}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Special Programs */}
              <Card className="mb-6">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <FileText className="w-5 h-5" />
                    State-Specific Tax Programs
                  </CardTitle>
                  <CardDescription>
                    Special programs and exemptions available in {stateInfo.state}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {stateInfo.specialPrograms.map((program, index) => (
                    <div
                      key={index}
                      className="flex items-start gap-3 p-3 bg-blue-50 rounded-lg border border-blue-200"
                    >
                      <Info className="w-5 h-5 text-blue-600 mt-0.5" />
                      <div className="flex-1">
                        <p className="font-semibold text-sm">{program}</p>
                      </div>
                      <Button size="sm" variant="outline">
                        <ExternalLink className="w-3 h-3 mr-1" />
                        Learn More
                      </Button>
                    </div>
                  ))}
                </CardContent>
              </Card>

              {/* Filing Information */}
              <Card className="mb-6">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Calculator className="w-5 h-5" />
                    Filing Information
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="p-4 bg-gray-50 rounded-lg">
                      <p className="text-sm text-gray-600 mb-1">State Filing Deadline</p>
                      <p className="font-semibold text-lg">{stateInfo.filingDeadline}</p>
                    </div>
                    <div className="p-4 bg-gray-50 rounded-lg">
                      <p className="text-sm text-gray-600 mb-1">State Tax Forms</p>
                      <Button size="sm" variant="outline" className="mt-1">
                        <Download className="w-3 h-3 mr-1" />
                        Download Forms
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Official Resources */}
              <Card className="mb-6">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <ExternalLink className="w-5 h-5" />
                    Official State Resources
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {stateInfo.resources.map((resource, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border"
                    >
                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4 text-gray-600" />
                        <span className="text-sm font-medium">{resource.name}</span>
                      </div>
                      <Button size="sm" variant="outline" asChild>
                        <a href={resource.url} target="_blank" rel="noopener noreferrer">
                          <ExternalLink className="w-3 h-3 mr-1" />
                          Visit
                        </a>
                      </Button>
                    </div>
                  ))}
                </CardContent>
              </Card>

              {/* Important Notice */}
              <Card className="bg-yellow-50 border-yellow-200">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5" />
                    <div>
                      <p className="font-semibold text-sm mb-1">Important Notice</p>
                      <p className="text-xs text-gray-700">
                        State tax laws change frequently. This information is current as of January
                        2024 but may not reflect the most recent updates. Always consult with a tax
                        professional or visit your state's official tax website for the most
                        up-to-date information. Some programs may have income limits, residency
                        requirements, or other eligibility criteria not shown here.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}