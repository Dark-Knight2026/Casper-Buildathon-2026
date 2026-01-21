/**
 * Lease Template Library Component
 * Browse and manage lease templates
 */

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Search,
  FileText,
  Star,
  Download,
  Eye,
  Copy,
  Plus
} from 'lucide-react';
import { LeaseType } from '@/types/lease';

interface Template {
  id: string;
  name: string;
  description: string;
  type: LeaseType;
  category: string;
  rating: number;
  downloads: number;
  isPremium: boolean;
  isFavorite: boolean;
}

interface LeaseTemplateLibraryProps {
  onSelectTemplate: (templateId: string) => void;
  onCreateCustom?: () => void;
}

export default function LeaseTemplateLibrary({
  onSelectTemplate,
  onCreateCustom
}: LeaseTemplateLibraryProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const templates: Template[] = [
    {
      id: 'template-1',
      name: 'Standard Residential Lease',
      description: 'Comprehensive residential lease agreement for long-term rentals',
      type: 'residential-long-term',
      category: 'Residential',
      rating: 4.8,
      downloads: 1234,
      isPremium: false,
      isFavorite: true
    },
    {
      id: 'template-2',
      name: 'Month-to-Month Agreement',
      description: 'Flexible month-to-month rental agreement',
      type: 'month-to-month',
      category: 'Residential',
      rating: 4.5,
      downloads: 856,
      isPremium: false,
      isFavorite: false
    },
    {
      id: 'template-3',
      name: 'Commercial Lease Agreement',
      description: 'Professional commercial property lease template',
      type: 'commercial',
      category: 'Commercial',
      rating: 4.9,
      downloads: 432,
      isPremium: true,
      isFavorite: false
    },
    {
      id: 'template-4',
      name: 'Student Housing Lease',
      description: 'Specialized lease for student accommodations',
      type: 'student-housing',
      category: 'Residential',
      rating: 4.6,
      downloads: 678,
      isPremium: false,
      isFavorite: true
    }
  ];

  const categories = ['all', 'Residential', 'Commercial', 'Student', 'Vacation'];

  const filteredTemplates = templates.filter(template => {
    const matchesSearch = searchTerm === '' ||
      template.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      template.description.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesCategory = selectedCategory === 'all' || template.category === selectedCategory;

    return matchesSearch && matchesCategory;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Template Library</CardTitle>
              <CardDescription>
                Choose from professionally crafted lease templates
              </CardDescription>
            </div>
            {onCreateCustom && (
              <Button onClick={onCreateCustom}>
                <Plus className="h-4 w-4 mr-2" />
                Create Custom
              </Button>
            )}
          </div>
        </CardHeader>
      </Card>

      {/* Search and Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search templates..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            <div className="flex flex-wrap gap-2">
              {categories.map(category => (
                <Button
                  key={category}
                  variant={selectedCategory === category ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedCategory(category)}
                >
                  {category.charAt(0).toUpperCase() + category.slice(1)}
                </Button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Templates Grid */}
      <ScrollArea className="h-[600px]">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredTemplates.map(template => (
            <Card key={template.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-base flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      {template.name}
                      {template.isFavorite && (
                        <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                      )}
                    </CardTitle>
                    <CardDescription className="mt-2">
                      {template.description}
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <Badge variant="outline">{template.category}</Badge>
                  {template.isPremium && (
                    <Badge className="bg-gradient-to-r from-purple-600 to-blue-600">
                      Premium
                    </Badge>
                  )}
                </div>

                <div className="flex items-center justify-between text-sm text-gray-600">
                  <div className="flex items-center gap-1">
                    <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                    <span>{template.rating}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Download className="h-4 w-4" />
                    <span>{template.downloads.toLocaleString()}</span>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button
                    size="sm"
                    className="flex-1"
                    onClick={() => onSelectTemplate(template.id)}
                  >
                    <Copy className="h-4 w-4 mr-2" />
                    Use Template
                  </Button>
                  <Button size="sm" variant="outline">
                    <Eye className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </ScrollArea>

      {filteredTemplates.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <FileText className="h-12 w-12 mx-auto mb-4 text-gray-400" />
            <p className="text-gray-600">No templates found matching your criteria</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}