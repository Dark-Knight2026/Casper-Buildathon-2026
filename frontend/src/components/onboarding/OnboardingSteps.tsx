import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useOnboarding } from '@/contexts/OnboardingContext';
import { useAuth } from '@/hooks/useAuth';
import { 
  Camera, 
  DollarSign, 
  TrendingUp, 
  Users, 
  FileText,
  Shield,
  Calendar,
  BarChart3,
  Home,
  Settings,
  CheckCircle,
  ArrowRight
} from 'lucide-react';

// Individual step components for custom onboarding experiences

export const WelcomeStep: React.FC = () => {
  const { nextStep } = useOnboarding();
  const { user } = useAuth();

  return (
    <Card className="max-w-2xl mx-auto">
      <CardHeader className="text-center">
        <CardTitle className="text-2xl">Welcome to KeyChain, {user?.firstName}!</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="text-center space-y-4">
          <div className="w-24 h-24 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center mx-auto">
            <Home className="h-12 w-12 text-white" />
          </div>
          <p className="text-gray-600 max-w-md mx-auto">
            Let's get you set up for success. This quick tour will show you the most important features 
            to help you achieve your real estate goals.
          </p>
        </div>
        <div className="flex justify-center">
          <Button onClick={nextStep} className="px-8">
            Let's Get Started
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export const PreferencesSetup: React.FC = () => {
  const { nextStep } = useOnboarding();

  return (
    <Card className="max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center">
          <Settings className="h-5 w-5 mr-2" />
          Set Your Preferences
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Preferred Property Type</Label>
            <select className="w-full p-2 border rounded-md">
              <option>Apartment</option>
              <option>House</option>
              <option>Condo</option>
              <option>Townhouse</option>
            </select>
          </div>
          <div className="space-y-2">
            <Label>Budget Range</Label>
            <select className="w-full p-2 border rounded-md">
              <option>$0 - $1,000</option>
              <option>$1,000 - $3,000</option>
              <option>$3,000 - $5,000</option>
              <option>$5,000+</option>
            </select>
          </div>
          <div className="space-y-2">
            <Label>Preferred Location</Label>
            <Input placeholder="Enter city or neighborhood" />
          </div>
          <div className="space-y-2">
            <Label>Bedrooms</Label>
            <select className="w-full p-2 border rounded-md">
              <option>Any</option>
              <option>1+</option>
              <option>2+</option>
              <option>3+</option>
              <option>4+</option>
            </select>
          </div>
        </div>
        <div className="space-y-2">
          <Label>Special Requirements</Label>
          <Textarea placeholder="Pet-friendly, parking, gym, etc." rows={3} />
        </div>
        <div className="flex justify-end">
          <Button onClick={nextStep}>
            Save Preferences
            <CheckCircle className="h-4 w-4 ml-2" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export const PhotoUploadGuide: React.FC = () => {
  const { nextStep } = useOnboarding();

  return (
    <Card className="max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center">
          <Camera className="h-5 w-5 mr-2" />
          Photo Upload Best Practices
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <h3 className="font-semibold text-green-600">✓ Do This</h3>
            <ul className="space-y-2 text-sm">
              <li>• Use natural lighting when possible</li>
              <li>• Take photos from multiple angles</li>
              <li>• Include exterior and interior shots</li>
              <li>• Highlight unique features</li>
              <li>• Keep rooms clean and decluttered</li>
            </ul>
          </div>
          <div className="space-y-4">
            <h3 className="font-semibold text-red-600">✗ Avoid This</h3>
            <ul className="space-y-2 text-sm">
              <li>• Blurry or dark photos</li>
              <li>• Personal items in frame</li>
              <li>• Only one angle per room</li>
              <li>• Flash photography indoors</li>
              <li>• Photos with people in them</li>
            </ul>
          </div>
        </div>
        <div className="p-4 bg-blue-50 rounded-lg">
          <p className="text-sm text-blue-800">
            <strong>Pro Tip:</strong> Properties with 5+ high-quality photos get 40% more views 
            and sell 32% faster than those with fewer photos.
          </p>
        </div>
        <div className="flex justify-end">
          <Button onClick={nextStep}>
            Got It!
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export const PricingGuide: React.FC = () => {
  const { nextStep } = useOnboarding();

  return (
    <Card className="max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center">
          <DollarSign className="h-5 w-5 mr-2" />
          Smart Pricing Strategy
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div>
              <h4 className="font-medium">Market Analysis</h4>
              <p className="text-sm text-gray-600">Compare with similar properties</p>
            </div>
            <Badge variant="outline">Recommended</Badge>
          </div>
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div>
              <h4 className="font-medium">Competitive Pricing</h4>
              <p className="text-sm text-gray-600">Price within 5% of market value</p>
            </div>
            <Badge variant="outline">Best Practice</Badge>
          </div>
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div>
              <h4 className="font-medium">Regular Updates</h4>
              <p className="text-sm text-gray-600">Adjust based on market feedback</p>
            </div>
            <Badge variant="outline">Ongoing</Badge>
          </div>
        </div>
        <div className="p-4 bg-green-50 rounded-lg">
          <p className="text-sm text-green-800">
            <strong>Success Tip:</strong> Properties priced correctly from the start receive 
            more inquiries and sell 25% faster than overpriced listings.
          </p>
        </div>
        <div className="flex justify-end">
          <Button onClick={nextStep}>
            Understand Pricing
            <TrendingUp className="h-4 w-4 ml-2" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export const AgentProfileSetup: React.FC = () => {
  const { nextStep } = useOnboarding();

  return (
    <Card className="max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center">
          <Users className="h-5 w-5 mr-2" />
          Complete Your Professional Profile
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>License Number</Label>
            <Input placeholder="Enter your license number" />
          </div>
          <div className="space-y-2">
            <Label>Years of Experience</Label>
            <Input type="number" placeholder="5" />
          </div>
          <div className="space-y-2">
            <Label>Brokerage</Label>
            <Input placeholder="Your brokerage name" />
          </div>
          <div className="space-y-2">
            <Label>Phone Number</Label>
            <Input placeholder="(555) 123-4567" />
          </div>
        </div>
        <div className="space-y-2">
          <Label>Specializations</Label>
          <div className="flex flex-wrap gap-2">
            {['Residential Sales', 'Commercial', 'Luxury Homes', 'First-Time Buyers', 'Investment Properties'].map((spec) => (
              <Badge key={spec} variant="outline" className="cursor-pointer hover:bg-blue-50">
                {spec}
              </Badge>
            ))}
          </div>
        </div>
        <div className="space-y-2">
          <Label>Professional Bio</Label>
          <Textarea placeholder="Tell potential clients about your experience and approach..." rows={4} />
        </div>
        <div className="flex justify-end">
          <Button onClick={nextStep}>
            Save Profile
            <CheckCircle className="h-4 w-4 ml-2" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export const AnalyticsIntro: React.FC = () => {
  const { nextStep } = useOnboarding();

  return (
    <Card className="max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center">
          <BarChart3 className="h-5 w-5 mr-2" />
          Business Analytics Dashboard
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="text-center p-4 bg-blue-50 rounded-lg">
            <div className="text-2xl font-bold text-blue-600">47</div>
            <div className="text-sm text-blue-800">Active Listings</div>
          </div>
          <div className="text-center p-4 bg-green-50 rounded-lg">
            <div className="text-2xl font-bold text-green-600">23</div>
            <div className="text-sm text-green-800">Closed Deals</div>
          </div>
          <div className="text-center p-4 bg-purple-50 rounded-lg">
            <div className="text-2xl font-bold text-purple-600">$2.1M</div>
            <div className="text-sm text-purple-800">Total Volume</div>
          </div>
        </div>
        <Separator />
        <div className="space-y-4">
          <h4 className="font-medium">Key Metrics You Can Track:</h4>
          <ul className="space-y-2 text-sm">
            <li>• Lead conversion rates</li>
            <li>• Average days on market</li>
            <li>• Client satisfaction scores</li>
            <li>• Revenue trends and forecasts</li>
            <li>• Marketing campaign performance</li>
          </ul>
        </div>
        <div className="p-4 bg-yellow-50 rounded-lg">
          <p className="text-sm text-yellow-800">
            <strong>Growth Insight:</strong> Agents who regularly review their analytics 
            increase their conversion rates by an average of 35%.
          </p>
        </div>
        <div className="flex justify-end">
          <Button onClick={nextStep}>
            Explore Analytics
            <BarChart3 className="h-4 w-4 ml-2" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

// Additional step components for landlord onboarding
export const PropertyPortfolioSetup: React.FC = () => {
  const { nextStep } = useOnboarding();

  return (
    <Card className="max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center">
          <Home className="h-5 w-5 mr-2" />
          Add Your Property Portfolio
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <p className="text-gray-600">
          Start by adding your rental properties to create a centralized management system.
        </p>
        <div className="space-y-4">
          <div className="p-4 border-2 border-dashed border-gray-300 rounded-lg text-center">
            <Home className="h-8 w-8 text-gray-400 mx-auto mb-2" />
            <p className="text-sm text-gray-600">Click to add your first property</p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="space-y-2">
            <h4 className="font-medium">Property Details</h4>
            <ul className="text-gray-600 space-y-1">
              <li>• Address & unit numbers</li>
              <li>• Property type & size</li>
              <li>• Rental rates & deposits</li>
            </ul>
          </div>
          <div className="space-y-2">
            <h4 className="font-medium">Tenant Information</h4>
            <ul className="text-gray-600 space-y-1">
              <li>• Current tenant details</li>
              <li>• Lease start & end dates</li>
              <li>• Payment preferences</li>
            </ul>
          </div>
        </div>
        <div className="flex justify-end">
          <Button onClick={nextStep}>
            Continue Setup
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export const TenantScreeningGuide: React.FC = () => {
  const { nextStep } = useOnboarding();

  return (
    <Card className="max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center">
          <Shield className="h-5 w-5 mr-2" />
          Tenant Screening Tools
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 bg-blue-50 rounded-lg">
            <h4 className="font-medium text-blue-900 mb-2">Credit Check</h4>
            <p className="text-sm text-blue-800">Verify financial stability and payment history</p>
          </div>
          <div className="p-4 bg-green-50 rounded-lg">
            <h4 className="font-medium text-green-900 mb-2">Background Check</h4>
            <p className="text-sm text-green-800">Criminal history and eviction records</p>
          </div>
          <div className="p-4 bg-purple-50 rounded-lg">
            <h4 className="font-medium text-purple-900 mb-2">Income Verification</h4>
            <p className="text-sm text-purple-800">Ensure rent is within 30% of income</p>
          </div>
          <div className="p-4 bg-orange-50 rounded-lg">
            <h4 className="font-medium text-orange-900 mb-2">References</h4>
            <p className="text-sm text-orange-800">Previous landlord and employer contacts</p>
          </div>
        </div>
        <div className="p-4 bg-gray-50 rounded-lg">
          <p className="text-sm text-gray-700">
            <strong>Legal Compliance:</strong> All screening processes follow Fair Housing Act 
            guidelines and local regulations to ensure fair and legal tenant selection.
          </p>
        </div>
        <div className="flex justify-end">
          <Button onClick={nextStep}>
            Learn More
            <Shield className="h-4 w-4 ml-2" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export const MaintenanceSetup: React.FC = () => {
  const { nextStep } = useOnboarding();

  return (
    <Card className="max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center">
          <Settings className="h-5 w-5 mr-2" />
          Maintenance Request Workflow
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
          <div className="flex items-center space-x-4 p-4 bg-gray-50 rounded-lg">
            <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
              <span className="text-sm font-medium text-blue-600">1</span>
            </div>
            <div>
              <h4 className="font-medium">Tenant Submits Request</h4>
              <p className="text-sm text-gray-600">Online portal or mobile app</p>
            </div>
          </div>
          <div className="flex items-center space-x-4 p-4 bg-gray-50 rounded-lg">
            <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
              <span className="text-sm font-medium text-blue-600">2</span>
            </div>
            <div>
              <h4 className="font-medium">Automatic Categorization</h4>
              <p className="text-sm text-gray-600">Urgent, routine, or cosmetic</p>
            </div>
          </div>
          <div className="flex items-center space-x-4 p-4 bg-gray-50 rounded-lg">
            <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
              <span className="text-sm font-medium text-blue-600">3</span>
            </div>
            <div>
              <h4 className="font-medium">Service Professional Assignment</h4>
              <p className="text-sm text-gray-600">Matched based on location and expertise</p>
            </div>
          </div>
        </div>
        <div className="p-4 bg-green-50 rounded-lg">
          <p className="text-sm text-green-800">
            <strong>Time Savings:</strong> Automated workflows reduce response time by 60% 
            and increase tenant satisfaction significantly.
          </p>
        </div>
        <div className="flex justify-end">
          <Button onClick={nextStep}>
            Set Up Workflow
            <CheckCircle className="h-4 w-4 ml-2" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export const RentCollectionSetup: React.FC = () => {
  const { nextStep } = useOnboarding();

  return (
    <Card className="max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center">
          <DollarSign className="h-5 w-5 mr-2" />
          Automated Rent Collection
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-3">
            <h4 className="font-medium">Payment Methods</h4>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>• ACH bank transfers</li>
              <li>• Credit/debit cards</li>
              <li>• Online banking</li>
              <li>• Mobile payments</li>
            </ul>
          </div>
          <div className="space-y-3">
            <h4 className="font-medium">Automation Features</h4>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>• Automatic recurring payments</li>
              <li>• Late fee calculations</li>
              <li>• Payment reminders</li>
              <li>• Receipt generation</li>
            </ul>
          </div>
        </div>
        <div className="p-4 bg-blue-50 rounded-lg">
          <h4 className="font-medium text-blue-900 mb-2">Benefits for Landlords</h4>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>• Guaranteed on-time payments</li>
            <li>• Reduced administrative work</li>
            <li>• Better cash flow management</li>
            <li>• Automatic record keeping</li>
          </ul>
        </div>
        <div className="flex justify-end">
          <Button onClick={nextStep}>
            Enable Auto-Collection
            <DollarSign className="h-4 w-4 ml-2" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};