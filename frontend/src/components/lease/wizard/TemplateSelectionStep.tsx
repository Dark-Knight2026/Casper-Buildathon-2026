import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Search, FileText, Star, Check, Eye } from 'lucide-react';
import type { LeaseTemplate, LeaseType } from '@/types/lease';

interface TemplateSelectionStepProps {
  selectedTemplate: LeaseTemplate | null;
  onSelectTemplate: (template: LeaseTemplate) => void;
}

// Mock templates - In production, these would come from the database
const MOCK_TEMPLATES: LeaseTemplate[] = [
  {
    id: 'template-1',
    name: 'Standard Residential Lease',
    description: 'Comprehensive residential lease agreement suitable for most properties',
    category: 'residential-long-term',
    clauses: [],
    defaultTerms: {
      leaseDuration: 12,
      rentPaymentDay: 1,
      lateFeeAmount: 50,
      lateFeeGracePeriod: 5,
      securityDepositAmount: 0,
      noticePeriod: 30,
    },
    isPublic: true,
    isVerified: true,
    applicableStates: ['CA', 'NY', 'TX', 'FL'],
    createdBy: 'system',
    createdByName: 'System',
    usageCount: 1250,
    rating: 4.8,
    reviews: [],
    complianceVerified: true,
    lastComplianceCheck: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: 'template-2',
    name: 'Month-to-Month Rental Agreement',
    description: 'Flexible month-to-month lease with 30-day notice period',
    category: 'month-to-month',
    clauses: [],
    defaultTerms: {
      leaseDuration: 1,
      rentPaymentDay: 1,
      lateFeeAmount: 50,
      lateFeeGracePeriod: 5,
      noticePeriod: 30,
    },
    isPublic: true,
    isVerified: true,
    applicableStates: ['CA', 'NY', 'TX'],
    createdBy: 'system',
    createdByName: 'System',
    usageCount: 850,
    rating: 4.6,
    reviews: [],
    complianceVerified: true,
    lastComplianceCheck: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: 'template-3',
    name: 'Student Housing Lease',
    description: 'Specialized lease for student housing with academic year terms',
    category: 'student-housing',
    clauses: [],
    defaultTerms: {
      leaseDuration: 9,
      rentPaymentDay: 1,
      lateFeeAmount: 40,
      lateFeeGracePeriod: 3,
      securityDepositAmount: 0,
      noticePeriod: 60,
    },
    isPublic: true,
    isVerified: true,
    applicableStates: ['CA', 'NY', 'MA', 'TX'],
    createdBy: 'system',
    createdByName: 'System',
    usageCount: 420,
    rating: 4.7,
    reviews: [],
    complianceVerified: true,
    lastComplianceCheck: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: 'template-4',
    name: 'Short-Term Rental Agreement',
    description: 'For vacation rentals and short-term stays (less than 6 months)',
    category: 'residential-short-term',
    clauses: [],
    defaultTerms: {
      leaseDuration: 3,
      rentPaymentDay: 1,
      lateFeeAmount: 75,
      lateFeeGracePeriod: 2,
      securityDepositAmount: 0,
      noticePeriod: 14,
    },
    isPublic: true,
    isVerified: true,
    applicableStates: ['CA', 'FL', 'HI'],
    createdBy: 'system',
    createdByName: 'System',
    usageCount: 680,
    rating: 4.5,
    reviews: [],
    complianceVerified: true,
    lastComplianceCheck: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
  },
];

export default function TemplateSelectionStep({
  selectedTemplate,
  onSelectTemplate,
}: TemplateSelectionStepProps) {
  const [templates, setTemplates] = useState<LeaseTemplate[]>(MOCK_TEMPLATES);
  const [filteredTemplates, setFilteredTemplates] = useState<LeaseTemplate[]>(MOCK_TEMPLATES);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<LeaseType | 'all'>('all');
  const [filterState, setFilterState] = useState<string>('all');
  const [previewTemplate, setPreviewTemplate] = useState<LeaseTemplate | null>(null);

  useEffect(() => {
    // Filter templates based on search and filters
    let filtered = templates;

    if (searchTerm) {
      filtered = filtered.filter(
        (t) =>
          t.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          t.description.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (filterType !== 'all') {
      filtered = filtered.filter((t) => t.category === filterType);
    }

    if (filterState !== 'all') {
      filtered = filtered.filter((t) => t.applicableStates.includes(filterState));
    }

    setFilteredTemplates(filtered);
  }, [searchTerm, filterType, filterState, templates]);

  const handleSelectTemplate = (template: LeaseTemplate) => {
    onSelectTemplate(template);
  };

  const handlePreview = (template: LeaseTemplate) => {
    setPreviewTemplate(template);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h3 className="text-lg font-semibold mb-2">Choose a Lease Template</h3>
        <p className="text-sm text-gray-600">
          Select a pre-built template or start from scratch. All templates are customizable and
          comply with state regulations.
        </p>
      </div>

      {/* Search and Filters */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="md:col-span-3">
          <Label htmlFor="search">Search Templates</Label>
          <div className="relative mt-1">
            <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
            <Input
              id="search"
              placeholder="Search by name or description..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        <div>
          <Label htmlFor="type">Lease Type</Label>
          <Select value={filterType} onValueChange={(value) => setFilterType(value as LeaseType | 'all')}>
            <SelectTrigger id="type">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="residential-long-term">Residential Long-Term</SelectItem>
              <SelectItem value="residential-short-term">Residential Short-Term</SelectItem>
              <SelectItem value="month-to-month">Month-to-Month</SelectItem>
              <SelectItem value="student-housing">Student Housing</SelectItem>
              <SelectItem value="commercial">Commercial</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label htmlFor="state">State</Label>
          <Select value={filterState} onValueChange={setFilterState}>
            <SelectTrigger id="state">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All States</SelectItem>
              <SelectItem value="CA">California</SelectItem>
              <SelectItem value="NY">New York</SelectItem>
              <SelectItem value="TX">Texas</SelectItem>
              <SelectItem value="FL">Florida</SelectItem>
              <SelectItem value="MA">Massachusetts</SelectItem>
              <SelectItem value="HI">Hawaii</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label htmlFor="sort">Sort By</Label>
          <Select defaultValue="popular">
            <SelectTrigger id="sort">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="popular">Most Popular</SelectItem>
              <SelectItem value="rating">Highest Rated</SelectItem>
              <SelectItem value="recent">Most Recent</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Templates Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredTemplates.map((template) => (
          <Card
            key={template.id}
            className={`cursor-pointer transition-all ${
              selectedTemplate?.id === template.id
                ? 'border-primary border-2 shadow-md'
                : 'hover:border-gray-400'
            }`}
            onClick={() => handleSelectTemplate(template)}
          >
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <CardTitle className="text-base flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    {template.name}
                    {selectedTemplate?.id === template.id && (
                      <Check className="h-4 w-4 text-primary" />
                    )}
                  </CardTitle>
                  <CardDescription className="mt-1 text-sm">
                    {template.description}
                  </CardDescription>
                </div>
              </div>

              <div className="flex flex-wrap gap-2 mt-3">
                {template.isVerified && (
                  <Badge variant="secondary" className="text-xs">
                    <Check className="h-3 w-3 mr-1" />
                    Verified
                  </Badge>
                )}
                {template.complianceVerified && (
                  <Badge variant="outline" className="text-xs">
                    Compliance Checked
                  </Badge>
                )}
                <Badge variant="outline" className="text-xs">
                  {template.applicableStates.length} States
                </Badge>
              </div>
            </CardHeader>

            <CardContent>
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-1">
                    <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                    <span className="font-medium">{template.rating}</span>
                  </div>
                  <div className="text-gray-600">{template.usageCount} uses</div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    handlePreview(template);
                  }}
                >
                  <Eye className="h-4 w-4 mr-1" />
                  Preview
                </Button>
              </div>

              {/* Default Terms Preview */}
              <div className="mt-4 pt-4 border-t text-xs text-gray-600 space-y-1">
                <div>Duration: {template.defaultTerms.leaseDuration} months</div>
                <div>Rent Due: Day {template.defaultTerms.rentPaymentDay} of month</div>
                <div>Late Fee: ${template.defaultTerms.lateFeeAmount} (after {template.defaultTerms.lateFeeGracePeriod} days)</div>
                <div>Notice Period: {template.defaultTerms.noticePeriod} days</div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Start from Scratch Option */}
      <Card className="border-dashed">
        <CardContent className="pt-6">
          <div className="text-center">
            <FileText className="h-12 w-12 mx-auto text-gray-400 mb-3" />
            <h4 className="font-semibold mb-2">Start from Scratch</h4>
            <p className="text-sm text-gray-600 mb-4">
              Create a custom lease agreement without using a template
            </p>
            <Button variant="outline" onClick={() => onSelectTemplate({} as LeaseTemplate)}>
              Create Custom Lease
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* No Results */}
      {filteredTemplates.length === 0 && (
        <div className="text-center py-12">
          <FileText className="h-16 w-16 mx-auto text-gray-300 mb-4" />
          <h4 className="text-lg font-semibold mb-2">No Templates Found</h4>
          <p className="text-gray-600 mb-4">
            Try adjusting your search or filters, or start from scratch
          </p>
          <Button variant="outline" onClick={() => {
            setSearchTerm('');
            setFilterType('all');
            setFilterState('all');
          }}>
            Clear Filters
          </Button>
        </div>
      )}
    </div>
  );
}