import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Mail, MessageSquare, Phone, TrendingUp, Edit, Trash2 } from 'lucide-react';
import type { CommunicationTemplate } from '@/types/communication';

interface TemplateLibraryProps {
  templates: CommunicationTemplate[];
}

export default function TemplateLibrary({ templates }: TemplateLibraryProps) {
  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'email':
        return <Mail className="h-4 w-4 text-blue-600" />;
      case 'sms':
        return <MessageSquare className="h-4 w-4 text-green-600" />;
      case 'call':
        return <Phone className="h-4 w-4 text-purple-600" />;
      default:
        return <Mail className="h-4 w-4 text-gray-600" />;
    }
  };

  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      introduction: 'bg-blue-100 text-blue-800',
      follow_up: 'bg-green-100 text-green-800',
      listing_alert: 'bg-purple-100 text-purple-800',
      showing_reminder: 'bg-orange-100 text-orange-800',
      offer_update: 'bg-red-100 text-red-800',
      closing_update: 'bg-indigo-100 text-indigo-800',
      thank_you: 'bg-pink-100 text-pink-800',
      market_update: 'bg-cyan-100 text-cyan-800',
      birthday: 'bg-yellow-100 text-yellow-800',
      anniversary: 'bg-teal-100 text-teal-800'
    };
    return colors[category] || 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Template Library</h3>
        <Button>
          <Mail className="h-4 w-4 mr-2" />
          Create Template
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {templates.map((template) => (
          <Card key={template.id} className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-2 mb-2">
                    {getTypeIcon(template.type)}
                    <CardTitle className="text-lg">{template.name}</CardTitle>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Badge className={getCategoryColor(template.category)}>
                      {template.category.replace('_', ' ')}
                    </Badge>
                    {!template.is_active && (
                      <Badge variant="outline" className="bg-gray-100">
                        Inactive
                      </Badge>
                    )}
                  </div>
                </div>
                <div className="flex space-x-2">
                  <Button variant="ghost" size="sm">
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="sm">
                    <Trash2 className="h-4 w-4 text-red-600" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {template.subject && (
                <div>
                  <p className="text-xs text-gray-500 mb-1">Subject:</p>
                  <p className="text-sm font-medium">{template.subject}</p>
                </div>
              )}

              <div>
                <p className="text-xs text-gray-500 mb-1">Body:</p>
                <p className="text-sm text-gray-700 line-clamp-4">{template.body}</p>
              </div>

              {template.variables.length > 0 && (
                <div>
                  <p className="text-xs text-gray-500 mb-1">Variables:</p>
                  <div className="flex flex-wrap gap-1">
                    {template.variables.map((variable) => (
                      <Badge key={variable} variant="outline" className="text-xs">
                        {`{{${variable}}}`}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between pt-3 border-t">
                <div className="flex items-center space-x-4 text-sm text-gray-600">
                  <span>Used: {template.usage_count} times</span>
                  {template.avg_response_rate && (
                    <div className="flex items-center">
                      <TrendingUp className="h-4 w-4 mr-1 text-green-600" />
                      <span className="text-green-600">{template.avg_response_rate}% response</span>
                    </div>
                  )}
                </div>
                <Button size="sm">
                  Use Template
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}