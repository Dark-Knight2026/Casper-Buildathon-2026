import { useState, useEffect, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { getListingTemplates } from '@/lib/listingEnhancements';
import type { ListingTemplate } from '@/types/listing-enhanced';
import { Search, FileText, Star, Users, Loader2 } from 'lucide-react';

interface ListingTemplateSelectorProps {
  onSelectTemplate: (template: ListingTemplate) => void;
  propertyType?: string;
}

export default function ListingTemplateSelector({ 
  onSelectTemplate, 
  propertyType 
}: ListingTemplateSelectorProps) {
  const [open, setOpen] = useState(false);
  const [templates, setTemplates] = useState<ListingTemplate[]>([]);
  const [filteredTemplates, setFilteredTemplates] = useState<ListingTemplate[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const loadTemplates = useCallback(async () => {
    setIsLoading(true);
    const data = await getListingTemplates(propertyType);
    setTemplates(data);
    setFilteredTemplates(data);
    setIsLoading(false);
  }, [propertyType]);

  useEffect(() => {
    if (open) {
      loadTemplates();
    }
  }, [open, loadTemplates]);

  useEffect(() => {
    if (searchTerm) {
      setFilteredTemplates(
        templates.filter(t => 
          t.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          t.description?.toLowerCase().includes(searchTerm.toLowerCase())
        )
      );
    } else {
      setFilteredTemplates(templates);
    }
  }, [searchTerm, templates]);

  const handleSelectTemplate = (template: ListingTemplate) => {
    onSelectTemplate(template);
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <FileText className="h-4 w-4 mr-2" />
          Use Template
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Select a Listing Template</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Search templates..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Templates Grid */}
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
            </div>
          ) : filteredTemplates.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="h-12 w-12 mx-auto text-gray-400 mb-4" />
              <p className="text-gray-600">No templates found</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredTemplates.map((template) => (
                <Card 
                  key={template.id} 
                  className="cursor-pointer hover:shadow-lg transition-shadow"
                  onClick={() => handleSelectTemplate(template)}
                >
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <CardTitle className="text-lg">{template.name}</CardTitle>
                      {template.isPublic && (
                        <Badge variant="outline" className="ml-2">
                          <Users className="h-3 w-3 mr-1" />
                          Public
                        </Badge>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-gray-600 mb-3">
                      {template.description || 'No description'}
                    </p>
                    <div className="flex items-center justify-between text-sm">
                      <Badge variant="secondary" className="capitalize">
                        {template.propertyType.replace('_', ' ')}
                      </Badge>
                      <div className="flex items-center text-gray-500">
                        <Star className="h-4 w-4 mr-1 text-yellow-500" />
                        <span>Used {template.usageCount} times</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}