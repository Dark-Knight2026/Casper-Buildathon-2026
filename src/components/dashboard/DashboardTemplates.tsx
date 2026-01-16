import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useDashboardPreferences, DashboardPreferences, WidgetConfig } from '@/contexts/DashboardPreferencesContext';
import { Check, Sparkles, TrendingUp, Shield, Zap } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface DashboardTemplate {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  category: string;
  preferences: Partial<DashboardPreferences>;
  popular?: boolean;
}

const TEMPLATES: DashboardTemplate[] = [
  {
    id: 'beginner',
    name: 'Beginner Landlord',
    description: 'Simple, focused layout for new landlords. Shows essential metrics and guides you through key tasks.',
    icon: <Sparkles className="h-6 w-6" />,
    category: 'Getting Started',
    popular: true,
    preferences: {
      theme: 'light',
      compactMode: false,
      animationsEnabled: true,
      layout: {
        columns: 2,
        widgets: [
          { id: 'quick-stats', enabled: true, order: 0, size: 'large' },
          { id: 'properties-attention', enabled: true, order: 1, size: 'large' },
          { id: 'notifications', enabled: true, order: 2, size: 'medium' },
          { id: 'top-properties', enabled: false, order: 3, size: 'medium' },
          { id: 'financial-summary', enabled: false, order: 4, size: 'medium' },
          { id: 'maintenance-requests', enabled: false, order: 5, size: 'small' },
          { id: 'lease-expiring', enabled: false, order: 6, size: 'small' },
          { id: 'tax-reminders', enabled: false, order: 7, size: 'small' }
        ]
      }
    }
  },
  {
    id: 'investor',
    name: 'Real Estate Investor',
    description: 'Performance-focused dashboard with ROI metrics, financial analytics, and portfolio insights.',
    icon: <TrendingUp className="h-6 w-6" />,
    category: 'Professional',
    popular: true,
    preferences: {
      theme: 'dark',
      compactMode: true,
      animationsEnabled: true,
      layout: {
        columns: 3,
        widgets: [
          { id: 'quick-stats', enabled: true, order: 0, size: 'large' },
          { id: 'top-properties', enabled: true, order: 1, size: 'medium' },
          { id: 'financial-summary', enabled: true, order: 2, size: 'medium' },
          { id: 'properties-attention', enabled: true, order: 3, size: 'large' },
          { id: 'tax-reminders', enabled: true, order: 4, size: 'small' },
          { id: 'notifications', enabled: false, order: 5, size: 'medium' },
          { id: 'maintenance-requests', enabled: false, order: 6, size: 'small' },
          { id: 'lease-expiring', enabled: false, order: 7, size: 'small' }
        ]
      }
    }
  },
  {
    id: 'property-manager',
    name: 'Property Manager',
    description: 'Operations-focused layout for managing multiple properties, tenants, and maintenance requests.',
    icon: <Shield className="h-6 w-6" />,
    category: 'Professional',
    preferences: {
      theme: 'system',
      compactMode: true,
      animationsEnabled: true,
      layout: {
        columns: 2,
        widgets: [
          { id: 'properties-attention', enabled: true, order: 0, size: 'large' },
          { id: 'maintenance-requests', enabled: true, order: 1, size: 'small' },
          { id: 'lease-expiring', enabled: true, order: 2, size: 'small' },
          { id: 'notifications', enabled: true, order: 3, size: 'medium' },
          { id: 'quick-stats', enabled: true, order: 4, size: 'large' },
          { id: 'top-properties', enabled: false, order: 5, size: 'medium' },
          { id: 'financial-summary', enabled: false, order: 6, size: 'medium' },
          { id: 'tax-reminders', enabled: false, order: 7, size: 'small' }
        ]
      }
    }
  },
  {
    id: 'minimalist',
    name: 'Minimalist',
    description: 'Clean, distraction-free interface showing only the most critical information.',
    icon: <Zap className="h-6 w-6" />,
    category: 'Simplified',
    preferences: {
      theme: 'light',
      compactMode: true,
      animationsEnabled: false,
      layout: {
        columns: 1,
        widgets: [
          { id: 'quick-stats', enabled: true, order: 0, size: 'large' },
          { id: 'properties-attention', enabled: true, order: 1, size: 'large' },
          { id: 'top-properties', enabled: false, order: 2, size: 'medium' },
          { id: 'notifications', enabled: false, order: 3, size: 'medium' },
          { id: 'financial-summary', enabled: false, order: 4, size: 'medium' },
          { id: 'maintenance-requests', enabled: false, order: 5, size: 'small' },
          { id: 'lease-expiring', enabled: false, order: 6, size: 'small' },
          { id: 'tax-reminders', enabled: false, order: 7, size: 'small' }
        ]
      }
    }
  },
  {
    id: 'comprehensive',
    name: 'Comprehensive View',
    description: 'All widgets enabled for maximum visibility. Perfect for large screens and detailed monitoring.',
    icon: <TrendingUp className="h-6 w-6" />,
    category: 'Advanced',
    preferences: {
      theme: 'system',
      compactMode: false,
      animationsEnabled: true,
      layout: {
        columns: 3,
        widgets: [
          { id: 'quick-stats', enabled: true, order: 0, size: 'large' },
          { id: 'properties-attention', enabled: true, order: 1, size: 'large' },
          { id: 'top-properties', enabled: true, order: 2, size: 'medium' },
          { id: 'notifications', enabled: true, order: 3, size: 'medium' },
          { id: 'financial-summary', enabled: true, order: 4, size: 'medium' },
          { id: 'maintenance-requests', enabled: true, order: 5, size: 'small' },
          { id: 'lease-expiring', enabled: true, order: 6, size: 'small' },
          { id: 'tax-reminders', enabled: true, order: 7, size: 'small' }
        ]
      }
    }
  }
];

interface DashboardTemplatesProps {
  onApplyTemplate?: () => void;
}

export default function DashboardTemplates({ onApplyTemplate }: DashboardTemplatesProps) {
  const { preferences, updateTheme, updateLayout, toggleCompactMode, toggleAnimations } = useDashboardPreferences();
  const { toast } = useToast();

  const applyTemplate = (template: DashboardTemplate) => {
    const prefs = template.preferences;
    
    if (prefs.theme) {
      updateTheme(prefs.theme);
    }
    
    if (prefs.layout) {
      updateLayout(prefs.layout);
    }
    
    if (prefs.compactMode !== undefined && prefs.compactMode !== preferences.compactMode) {
      toggleCompactMode();
    }
    
    if (prefs.animationsEnabled !== undefined && prefs.animationsEnabled !== preferences.animationsEnabled) {
      toggleAnimations();
    }

    toast({
      title: 'Template Applied',
      description: `Your dashboard has been configured with the "${template.name}" template.`
    });

    onApplyTemplate?.();
  };

  const isCurrentTemplate = (template: DashboardTemplate): boolean => {
    const prefs = template.preferences;
    
    // Check theme match
    if (prefs.theme && prefs.theme !== preferences.theme) return false;
    
    // Check compact mode match
    if (prefs.compactMode !== undefined && prefs.compactMode !== preferences.compactMode) return false;
    
    // Check animations match
    if (prefs.animationsEnabled !== undefined && prefs.animationsEnabled !== preferences.animationsEnabled) return false;
    
    // Check layout match (simplified - just check enabled widgets)
    if (prefs.layout) {
      const templateEnabledWidgets = prefs.layout.widgets.filter(w => w.enabled).map(w => w.id).sort();
      const currentEnabledWidgets = preferences.layout.widgets.filter(w => w.enabled).map(w => w.id).sort();
      
      if (templateEnabledWidgets.length !== currentEnabledWidgets.length) return false;
      if (!templateEnabledWidgets.every((id, i) => id === currentEnabledWidgets[i])) return false;
    }
    
    return true;
  };

  // Group templates by category
  const templatesByCategory = TEMPLATES.reduce((acc, template) => {
    if (!acc[template.category]) {
      acc[template.category] = [];
    }
    acc[template.category].push(template);
    return acc;
  }, {} as Record<string, DashboardTemplate[]>);

  return (
    <div className="space-y-8">
      <div>
        <h3 className="text-lg font-semibold mb-2">Dashboard Templates</h3>
        <p className="text-sm text-gray-600 dark:text-gray-300">
          Choose a pre-configured layout optimized for your role and workflow. You can customize it further after applying.
        </p>
      </div>

      {Object.entries(templatesByCategory).map(([category, templates]) => (
        <div key={category}>
          <h4 className="text-md font-semibold mb-4 text-gray-700 dark:text-gray-300">{category}</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {templates.map((template) => {
              const isCurrent = isCurrentTemplate(template);
              
              return (
                <Card
                  key={template.id}
                  className={`relative ${isCurrent ? 'ring-2 ring-blue-500' : ''} hover:shadow-lg transition-shadow`}
                >
                  {template.popular && (
                    <Badge className="absolute top-3 right-3 bg-orange-500">
                      Popular
                    </Badge>
                  )}
                  
                  <CardHeader>
                    <div className="flex items-start gap-3">
                      <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center text-blue-600 dark:text-blue-300">
                        {template.icon}
                      </div>
                      <div className="flex-1">
                        <CardTitle className="text-lg flex items-center gap-2">
                          {template.name}
                          {isCurrent && (
                            <Badge variant="outline" className="text-xs">
                              <Check className="h-3 w-3 mr-1" />
                              Active
                            </Badge>
                          )}
                        </CardTitle>
                      </div>
                    </div>
                  </CardHeader>
                  
                  <CardContent>
                    <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
                      {template.description}
                    </p>
                    
                    <div className="flex flex-wrap gap-2 mb-4">
                      <Badge variant="secondary" className="text-xs">
                        {template.preferences.theme === 'light' ? '☀️ Light' : 
                         template.preferences.theme === 'dark' ? '🌙 Dark' : 
                         '🔄 System'}
                      </Badge>
                      <Badge variant="secondary" className="text-xs">
                        {template.preferences.layout?.widgets.filter(w => w.enabled).length || 0} widgets
                      </Badge>
                      {template.preferences.compactMode && (
                        <Badge variant="secondary" className="text-xs">
                          Compact
                        </Badge>
                      )}
                    </div>
                    
                    <Button
                      className="w-full"
                      variant={isCurrent ? "outline" : "default"}
                      onClick={() => applyTemplate(template)}
                      disabled={isCurrent}
                    >
                      {isCurrent ? 'Currently Active' : 'Apply Template'}
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}