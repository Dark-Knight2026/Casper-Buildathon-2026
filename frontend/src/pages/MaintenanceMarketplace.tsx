import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/hooks/useAuth';
import { 
  Wrench, 
  Search, 
  Star, 
  MapPin, 
  Phone, 
  Mail, 
  Calendar, 
  Award, 
  Users, 
  TrendingUp,
  Filter,
  Grid,
  List,
  Thermometer,
  Zap,
  Droplets,
  Scissors,
  Sparkles,
  Building,
  Shield,
  CheckCircle
} from 'lucide-react';

interface ServiceProfessional {
  id: string;
  name: string;
  companyName: string;
  serviceType: 'contractor' | 'hvac' | 'electrician' | 'plumber' | 'lawn_care' | 'home_cleaning';
  businessLicense: string;
  yearsExperience: number;
  serviceArea: string[];
  rating: number;
  totalReviews: number;
  completedJobs: number;
  hourlyRate?: number;
  description: string;
  specialties: string[];
  availability: 'available' | 'busy' | 'unavailable';
  phone: string;
  email: string;
  profileImage?: string;
  certifications: string[];
  insuranceVerified: boolean;
  backgroundChecked: boolean;
}

const mockServiceProfessionals: ServiceProfessional[] = [
  {
    id: '1',
    name: 'Michael Thompson',
    companyName: 'Thompson Construction LLC',
    serviceType: 'contractor',
    businessLicense: 'CON123456',
    yearsExperience: 15,
    serviceArea: ['Virginia Beach', 'Norfolk', 'Chesapeake'],
    rating: 4.8,
    totalReviews: 89,
    completedJobs: 247,
    hourlyRate: 85,
    description: 'Licensed general contractor specializing in home renovations, kitchen and bathroom remodeling, and custom carpentry work.',
    specialties: ['Kitchen Remodeling', 'Bathroom Renovation', 'Custom Carpentry', 'Home Additions'],
    availability: 'available',
    phone: '(757) 555-0123',
    email: 'michael@thompsonconstruction.com',
    certifications: ['Licensed General Contractor', 'OSHA 30-Hour Certified'],
    insuranceVerified: true,
    backgroundChecked: true
  },
  {
    id: '2',
    name: 'Lisa Rodriguez',
    companyName: 'Cool Air HVAC Services',
    serviceType: 'hvac',
    businessLicense: 'HVAC789012',
    yearsExperience: 12,
    serviceArea: ['Virginia Beach', 'Norfolk'],
    rating: 4.9,
    totalReviews: 67,
    completedJobs: 156,
    hourlyRate: 95,
    description: 'Certified HVAC technician providing installation, repair, and maintenance services for residential and commercial properties.',
    specialties: ['AC Installation', 'Heating Repair', 'Duct Cleaning', 'Energy Efficiency Upgrades'],
    availability: 'available',
    phone: '(757) 555-0456',
    email: 'lisa@coolairhvac.com',
    certifications: ['EPA 608 Certified', 'NATE Certified', 'HVAC Excellence Certified'],
    insuranceVerified: true,
    backgroundChecked: true
  },
  {
    id: '3',
    name: 'James Wilson',
    companyName: 'Wilson Electric Co.',
    serviceType: 'electrician',
    businessLicense: 'ELE345678',
    yearsExperience: 18,
    serviceArea: ['Virginia Beach', 'Norfolk', 'Portsmouth'],
    rating: 4.7,
    totalReviews: 124,
    completedJobs: 312,
    hourlyRate: 75,
    description: 'Master electrician offering comprehensive electrical services including wiring, panel upgrades, and smart home installations.',
    specialties: ['Panel Upgrades', 'Smart Home Wiring', 'Electrical Troubleshooting', 'Outdoor Lighting'],
    availability: 'busy',
    phone: '(757) 555-0789',
    email: 'james@wilsonelectric.com',
    certifications: ['Master Electrician License', 'Smart Home Certified'],
    insuranceVerified: true,
    backgroundChecked: true
  },
  {
    id: '4',
    name: 'Maria Garcia',
    companyName: 'Garcia Plumbing Solutions',
    serviceType: 'plumber',
    businessLicense: 'PLB901234',
    yearsExperience: 10,
    serviceArea: ['Virginia Beach', 'Chesapeake'],
    rating: 4.6,
    totalReviews: 78,
    completedJobs: 189,
    hourlyRate: 80,
    description: 'Licensed plumber specializing in residential plumbing repairs, installations, and emergency services available 24/7.',
    specialties: ['Emergency Repairs', 'Pipe Installation', 'Water Heater Service', 'Drain Cleaning'],
    availability: 'available',
    phone: '(757) 555-0321',
    email: 'maria@garciaplumbing.com',
    certifications: ['Licensed Plumber', 'Backflow Prevention Certified'],
    insuranceVerified: true,
    backgroundChecked: true
  },
  {
    id: '5',
    name: 'David Brown',
    companyName: 'Green Thumb Landscaping',
    serviceType: 'lawn_care',
    businessLicense: 'LAWN567890',
    yearsExperience: 8,
    serviceArea: ['Virginia Beach', 'Norfolk', 'Chesapeake', 'Portsmouth'],
    rating: 4.5,
    totalReviews: 156,
    completedJobs: 423,
    hourlyRate: 45,
    description: 'Professional landscaping and lawn care services including design, maintenance, and seasonal cleanup.',
    specialties: ['Landscape Design', 'Lawn Maintenance', 'Tree Trimming', 'Seasonal Cleanup'],
    availability: 'available',
    phone: '(757) 555-0654',
    email: 'david@greenthumblandscaping.com',
    certifications: ['Certified Arborist', 'Pesticide Applicator License'],
    insuranceVerified: true,
    backgroundChecked: true
  },
  {
    id: '6',
    name: 'Amanda Johnson',
    companyName: 'Sparkle Clean Services',
    serviceType: 'home_cleaning',
    businessLicense: 'CLN123789',
    yearsExperience: 6,
    serviceArea: ['Virginia Beach', 'Norfolk'],
    rating: 4.9,
    totalReviews: 203,
    completedJobs: 567,
    hourlyRate: 35,
    description: 'Professional home cleaning services with eco-friendly products and flexible scheduling options.',
    specialties: ['Deep Cleaning', 'Move-in/Move-out', 'Post-Construction Cleanup', 'Eco-Friendly Products'],
    availability: 'available',
    phone: '(757) 555-0987',
    email: 'amanda@sparklecleanservices.com',
    certifications: ['Bonded and Insured', 'Green Cleaning Certified'],
    insuranceVerified: true,
    backgroundChecked: true
  }
];

export default function MaintenanceMarketplace() {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedServiceType, setSelectedServiceType] = useState<string>('all');
  const [selectedLocation, setSelectedLocation] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [showFilters, setShowFilters] = useState(false);

  const serviceTypeIcons = {
    contractor: Building,
    hvac: Thermometer,
    electrician: Zap,
    plumber: Droplets,
    lawn_care: Scissors,
    home_cleaning: Sparkles
  };

  const serviceTypeLabels = {
    contractor: 'Licensed Contractor',
    hvac: 'HVAC Specialist',
    electrician: 'Electrician',
    plumber: 'Plumber',
    lawn_care: 'Lawn Care',
    home_cleaning: 'Home Cleaning'
  };

  const filteredProfessionals = mockServiceProfessionals.filter(professional => {
    const matchesSearch = searchQuery === '' || 
      professional.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      professional.companyName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      professional.specialties.some(specialty => specialty.toLowerCase().includes(searchQuery.toLowerCase()));
    
    const matchesServiceType = selectedServiceType === 'all' || professional.serviceType === selectedServiceType;
    
    const matchesLocation = selectedLocation === 'all' || 
      professional.serviceArea.includes(selectedLocation);
    
    return matchesSearch && matchesServiceType && matchesLocation;
  });

  const getAvailabilityColor = (availability: string) => {
    switch (availability) {
      case 'available': return 'bg-green-100 text-green-800';
      case 'busy': return 'bg-yellow-100 text-yellow-800';
      case 'unavailable': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getAvailabilityText = (availability: string) => {
    switch (availability) {
      case 'available': return 'Available';
      case 'busy': return 'Busy';
      case 'unavailable': return 'Unavailable';
      default: return 'Unknown';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center mb-4">
            <Wrench className="h-8 w-8 text-blue-600 mr-3" />
            <h1 className="text-3xl font-bold text-gray-900">Maintenance Market Place</h1>
          </div>
          <p className="text-gray-600">
            Connect with licensed contractors, HVAC specialists, electricians, plumbers, lawn care professionals, and home cleaning services.
          </p>
        </div>

        {/* Search and Filters */}
        <Card className="mb-8">
          <CardContent className="p-6">
            <div className="flex flex-col space-y-4">
              <div className="flex flex-col md:flex-row md:items-center md:space-x-4 space-y-4 md:space-y-0">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search by name, company, or specialty..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
                
                <Select value={selectedServiceType} onValueChange={setSelectedServiceType}>
                  <SelectTrigger className="w-full md:w-48">
                    <SelectValue placeholder="Service Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Services</SelectItem>
                    <SelectItem value="contractor">Licensed Contractor</SelectItem>
                    <SelectItem value="hvac">HVAC Specialist</SelectItem>
                    <SelectItem value="electrician">Electrician</SelectItem>
                    <SelectItem value="plumber">Plumber</SelectItem>
                    <SelectItem value="lawn_care">Lawn Care</SelectItem>
                    <SelectItem value="home_cleaning">Home Cleaning</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={selectedLocation} onValueChange={setSelectedLocation}>
                  <SelectTrigger className="w-full md:w-48">
                    <SelectValue placeholder="Location" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Areas</SelectItem>
                    <SelectItem value="Virginia Beach">Virginia Beach</SelectItem>
                    <SelectItem value="Norfolk">Norfolk</SelectItem>
                    <SelectItem value="Chesapeake">Chesapeake</SelectItem>
                    <SelectItem value="Portsmouth">Portsmouth</SelectItem>
                  </SelectContent>
                </Select>

                <div className="flex items-center space-x-2">
                  <Button
                    variant={viewMode === 'grid' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setViewMode('grid')}
                  >
                    <Grid className="h-4 w-4" />
                  </Button>
                  <Button
                    variant={viewMode === 'list' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setViewMode('list')}
                  >
                    <List className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Results Summary */}
        <div className="mb-6">
          <p className="text-gray-600">
            Found {filteredProfessionals.length} service professional{filteredProfessionals.length !== 1 ? 's' : ''}
            {selectedServiceType !== 'all' && ` in ${serviceTypeLabels[selectedServiceType as keyof typeof serviceTypeLabels]}`}
            {selectedLocation !== 'all' && ` in ${selectedLocation}`}
          </p>
        </div>

        {/* Service Professionals Grid/List */}
        <div className={viewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6' : 'space-y-6'}>
          {filteredProfessionals.map((professional) => {
            const ServiceIcon = serviceTypeIcons[professional.serviceType];
            
            return (
              <Card key={professional.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="p-2 bg-blue-100 rounded-lg">
                        <ServiceIcon className="h-6 w-6 text-blue-600" />
                      </div>
                      <div>
                        <CardTitle className="text-lg">{professional.name}</CardTitle>
                        <CardDescription>{professional.companyName}</CardDescription>
                      </div>
                    </div>
                    <Badge className={getAvailabilityColor(professional.availability)}>
                      {getAvailabilityText(professional.availability)}
                    </Badge>
                  </div>
                </CardHeader>
                
                <CardContent>
                  <div className="space-y-4">
                    {/* Rating and Experience */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <div className="flex items-center">
                          <Star className="h-4 w-4 text-yellow-400 fill-current" />
                          <span className="ml-1 font-medium">{professional.rating}</span>
                          <span className="text-gray-500 text-sm ml-1">({professional.totalReviews})</span>
                        </div>
                      </div>
                      <div className="text-sm text-gray-600">
                        {professional.yearsExperience} years exp.
                      </div>
                    </div>

                    {/* Description */}
                    <p className="text-gray-600 text-sm line-clamp-3">
                      {professional.description}
                    </p>

                    {/* Specialties */}
                    <div>
                      <div className="flex flex-wrap gap-1">
                        {professional.specialties.slice(0, 3).map((specialty, index) => (
                          <Badge key={index} variant="outline" className="text-xs">
                            {specialty}
                          </Badge>
                        ))}
                        {professional.specialties.length > 3 && (
                          <Badge variant="outline" className="text-xs">
                            +{professional.specialties.length - 3} more
                          </Badge>
                        )}
                      </div>
                    </div>

                    {/* Service Area */}
                    <div className="flex items-center text-sm text-gray-600">
                      <MapPin className="h-4 w-4 mr-1" />
                      <span>{professional.serviceArea.join(', ')}</span>
                    </div>

                    {/* Verification Badges */}
                    <div className="flex items-center space-x-3">
                      {professional.insuranceVerified && (
                        <div className="flex items-center text-green-600 text-xs">
                          <Shield className="h-3 w-3 mr-1" />
                          <span>Insured</span>
                        </div>
                      )}
                      {professional.backgroundChecked && (
                        <div className="flex items-center text-green-600 text-xs">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          <span>Background Checked</span>
                        </div>
                      )}
                    </div>

                    {/* Stats */}
                    <div className="grid grid-cols-2 gap-4 pt-3 border-t">
                      <div className="text-center">
                        <div className="font-semibold text-blue-600">{professional.completedJobs}</div>
                        <div className="text-xs text-gray-500">Jobs Completed</div>
                      </div>
                      <div className="text-center">
                        <div className="font-semibold text-green-600">${professional.hourlyRate}/hr</div>
                        <div className="text-xs text-gray-500">Starting Rate</div>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex space-x-2 pt-3">
                      <Button className="flex-1" size="sm">
                        <Calendar className="h-4 w-4 mr-2" />
                        Book Service
                      </Button>
                      <Button variant="outline" size="sm">
                        <Phone className="h-4 w-4" />
                      </Button>
                      <Button variant="outline" size="sm">
                        <Mail className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* No Results */}
        {filteredProfessionals.length === 0 && (
          <div className="text-center py-12">
            <Wrench className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No service professionals found</h3>
            <p className="text-gray-500 mb-4">
              Try adjusting your search criteria or browse all available services.
            </p>
            <Button 
              onClick={() => {
                setSearchQuery('');
                setSelectedServiceType('all');
                setSelectedLocation('all');
              }}
            >
              Clear Filters
            </Button>
          </div>
        )}

        {/* Service Professional CTA */}
        <Card className="mt-12 bg-gradient-to-r from-blue-50 to-purple-50 border-blue-200">
          <CardContent className="p-8 text-center">
            <Wrench className="h-12 w-12 text-blue-600 mx-auto mb-4" />
            <h3 className="text-2xl font-bold text-gray-900 mb-2">
              Are you a service professional?
            </h3>
            <p className="text-gray-600 mb-6 max-w-2xl mx-auto">
              Join our marketplace and connect with property owners, real estate agents, and homeowners 
              who need your services. Create your professional profile today.
            </p>
            <Button size="lg" className="bg-blue-600 hover:bg-blue-700">
              Join as Service Professional
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}