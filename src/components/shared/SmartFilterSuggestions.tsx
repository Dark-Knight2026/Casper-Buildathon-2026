/**
 * Smart Filter Suggestions Component
 * AI-powered filter suggestions based on user behavior and data patterns
 */

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Sparkles,
  TrendingUp,
  AlertCircle,
  DollarSign,
  Calendar,
  Target,
  Zap,
  Clock,
  CheckCircle
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface FilterCondition {
  field: string;
  operator: string;
  value: string | number | Date;
}

interface FilterSuggestion {
  id: string;
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  category: 'performance' | 'attention' | 'opportunity' | 'maintenance' | 'financial';
  filters: FilterCondition[];
  expectedResults: number;
  priority: 'high' | 'medium' | 'low';
  reasoning: string;
}

interface DataItem {
  id: string;
  roi?: number;
  status?: string;
  monthlyIncome?: number;
  leaseEndDate?: Date | string;
  leaseStartDate?: Date | string;
  monthlyRent?: number;
  priority?: string;
  dueDate?: Date | string;
  completedDate?: Date | string;
  estimatedCost?: number;
}

interface SmartFilterSuggestionsProps {
  data: DataItem[];
  dataType: 'properties' | 'tenants' | 'maintenance';
  onApplySuggestion: (filters: FilterCondition[]) => void;
}

export default function SmartFilterSuggestions({
  data,
  dataType,
  onApplySuggestion
}: SmartFilterSuggestionsProps) {
  const { toast } = useToast();
  const [suggestions, setSuggestions] = useState<FilterSuggestion[]>([]);
  const [loading, setLoading] = useState(true);

  const generatePropertySuggestions = useCallback((): FilterSuggestion[] => {
    const suggestions: FilterSuggestion[] = [];

    // High ROI Properties
    const highROICount = data.filter(p => (p.roi || 0) > 8).length;
    if (highROICount > 0) {
      suggestions.push({
        id: 'high-roi',
        title: 'High ROI Properties',
        description: 'Properties with exceptional return on investment',
        icon: TrendingUp,
        category: 'performance',
        filters: [
          { field: 'roi', operator: 'greater_than', value: 8 }
        ],
        expectedResults: highROICount,
        priority: 'high',
        reasoning: 'These properties are performing exceptionally well and may be good candidates for expansion or similar investments.'
      });
    }

    // Properties Needing Attention
    const needsAttentionCount = data.filter(p => p.status === 'maintenance' || (p.roi || 0) < 3).length;
    if (needsAttentionCount > 0) {
      suggestions.push({
        id: 'needs-attention',
        title: 'Properties Needing Attention',
        description: 'Properties requiring maintenance or underperforming',
        icon: AlertCircle,
        category: 'attention',
        filters: [
          { field: 'status', operator: 'equals', value: 'maintenance' }
        ],
        expectedResults: needsAttentionCount,
        priority: 'high',
        reasoning: 'These properties require immediate attention to prevent further issues or improve performance.'
      });
    }

    // Available Properties
    const availableCount = data.filter(p => p.status === 'available').length;
    if (availableCount > 0) {
      suggestions.push({
        id: 'available',
        title: 'Available Properties',
        description: 'Properties ready for new tenants',
        icon: Target,
        category: 'opportunity',
        filters: [
          { field: 'status', operator: 'equals', value: 'available' }
        ],
        expectedResults: availableCount,
        priority: 'medium',
        reasoning: 'Focus on filling these vacancies to maximize rental income.'
      });
    }

    // High Value Properties
    const highValueCount = data.filter(p => (p.monthlyIncome || 0) > 3000).length;
    if (highValueCount > 0) {
      suggestions.push({
        id: 'high-value',
        title: 'High Value Properties',
        description: 'Properties with premium rental income',
        icon: DollarSign,
        category: 'financial',
        filters: [
          { field: 'monthlyIncome', operator: 'greater_than', value: 3000 }
        ],
        expectedResults: highValueCount,
        priority: 'medium',
        reasoning: 'These premium properties contribute significantly to your portfolio revenue.'
      });
    }

    return suggestions;
  }, [data]);

  const generateTenantSuggestions = useCallback((): FilterSuggestion[] => {
    const suggestions: FilterSuggestion[] = [];

    // Lease Expiring Soon
    const today = new Date();
    const threeMonthsFromNow = new Date(today.getTime() + 90 * 24 * 60 * 60 * 1000);
    const expiringCount = data.filter(t => {
      if (!t.leaseEndDate) return false;
      const leaseEnd = new Date(t.leaseEndDate);
      return leaseEnd <= threeMonthsFromNow && leaseEnd > today;
    }).length;

    if (expiringCount > 0) {
      suggestions.push({
        id: 'expiring-leases',
        title: 'Leases Expiring Soon',
        description: 'Tenants whose leases expire in the next 90 days',
        icon: Calendar,
        category: 'attention',
        filters: [
          { field: 'leaseEndDate', operator: 'within_days', value: 90 }
        ],
        expectedResults: expiringCount,
        priority: 'high',
        reasoning: 'Start renewal conversations early to retain good tenants and avoid vacancies.'
      });
    }

    // High Rent Tenants
    const highRentCount = data.filter(t => (t.monthlyRent || 0) > 2500).length;
    if (highRentCount > 0) {
      suggestions.push({
        id: 'high-rent',
        title: 'Premium Tenants',
        description: 'Tenants paying above-average rent',
        icon: DollarSign,
        category: 'financial',
        filters: [
          { field: 'monthlyRent', operator: 'greater_than', value: 2500 }
        ],
        expectedResults: highRentCount,
        priority: 'medium',
        reasoning: 'These tenants are valuable to your business. Ensure excellent service to maintain relationships.'
      });
    }

    // New Tenants
    const sixMonthsAgo = new Date(today.getTime() - 180 * 24 * 60 * 60 * 1000);
    const newTenantsCount = data.filter(t => {
      if (!t.leaseStartDate) return false;
      const leaseStart = new Date(t.leaseStartDate);
      return leaseStart >= sixMonthsAgo;
    }).length;

    if (newTenantsCount > 0) {
      suggestions.push({
        id: 'new-tenants',
        title: 'New Tenants',
        description: 'Tenants who moved in within the last 6 months',
        icon: Sparkles,
        category: 'opportunity',
        filters: [
          { field: 'leaseStartDate', operator: 'within_days', value: 180 }
        ],
        expectedResults: newTenantsCount,
        priority: 'low',
        reasoning: 'Check in with new tenants to ensure satisfaction and address any early concerns.'
      });
    }

    return suggestions;
  }, [data]);

  const generateMaintenanceSuggestions = useCallback((): FilterSuggestion[] => {
    const suggestions: FilterSuggestion[] = [];

    // Urgent Requests
    const urgentCount = data.filter(m => m.priority === 'urgent').length;
    if (urgentCount > 0) {
      suggestions.push({
        id: 'urgent',
        title: 'Urgent Requests',
        description: 'High-priority maintenance requiring immediate attention',
        icon: AlertCircle,
        category: 'attention',
        filters: [
          { field: 'priority', operator: 'equals', value: 'urgent' }
        ],
        expectedResults: urgentCount,
        priority: 'high',
        reasoning: 'These requests need immediate attention to prevent property damage or tenant dissatisfaction.'
      });
    }

    // Overdue Requests
    const overdueCount = data.filter(m => {
      if (!m.dueDate) return false;
      return new Date(m.dueDate) < new Date() && m.status !== 'completed';
    }).length;

    if (overdueCount > 0) {
      suggestions.push({
        id: 'overdue',
        title: 'Overdue Requests',
        description: 'Maintenance requests past their due date',
        icon: Clock,
        category: 'attention',
        filters: [
          { field: 'status', operator: 'not_equals', value: 'completed' },
          { field: 'dueDate', operator: 'less_than', value: new Date() }
        ],
        expectedResults: overdueCount,
        priority: 'high',
        reasoning: 'Address these overdue items to maintain tenant satisfaction and property condition.'
      });
    }

    // High Cost Requests
    const highCostCount = data.filter(m => (m.estimatedCost || 0) > 1000).length;
    if (highCostCount > 0) {
      suggestions.push({
        id: 'high-cost',
        title: 'High Cost Requests',
        description: 'Maintenance with significant financial impact',
        icon: DollarSign,
        category: 'financial',
        filters: [
          { field: 'estimatedCost', operator: 'greater_than', value: 1000 }
        ],
        expectedResults: highCostCount,
        priority: 'medium',
        reasoning: 'Review these high-cost items for budget planning and approval.'
      });
    }

    // Recently Completed
    const sevenDaysAgo = new Date(new Date().getTime() - 7 * 24 * 60 * 60 * 1000);
    const recentlyCompletedCount = data.filter(m => {
      if (!m.completedDate) return false;
      return new Date(m.completedDate) >= sevenDaysAgo;
    }).length;

    if (recentlyCompletedCount > 0) {
      suggestions.push({
        id: 'recently-completed',
        title: 'Recently Completed',
        description: 'Maintenance completed in the last 7 days',
        icon: CheckCircle,
        category: 'maintenance',
        filters: [
          { field: 'status', operator: 'equals', value: 'completed' },
          { field: 'completedDate', operator: 'within_days', value: 7 }
        ],
        expectedResults: recentlyCompletedCount,
        priority: 'low',
        reasoning: 'Follow up with tenants to ensure satisfaction with completed work.'
      });
    }

    return suggestions;
  }, [data]);

  const analyzeDataAndGenerateSuggestions = useCallback((): FilterSuggestion[] => {
    if (dataType === 'properties') {
      return generatePropertySuggestions();
    } else if (dataType === 'tenants') {
      return generateTenantSuggestions();
    } else {
      return generateMaintenanceSuggestions();
    }
  }, [dataType, generatePropertySuggestions, generateTenantSuggestions, generateMaintenanceSuggestions]);

  const generateSuggestions = useCallback(() => {
    setLoading(true);
    
    // Simulate AI analysis delay
    setTimeout(() => {
      const generatedSuggestions = analyzeDataAndGenerateSuggestions();
      setSuggestions(generatedSuggestions);
      setLoading(false);
    }, 1000);
  }, [analyzeDataAndGenerateSuggestions]);

  useEffect(() => {
    generateSuggestions();
  }, [generateSuggestions]);

  const handleApplySuggestion = (suggestion: FilterSuggestion) => {
    onApplySuggestion(suggestion.filters);
    toast({
      title: 'Filter Applied',
      description: `Applied "${suggestion.title}" filter with ${suggestion.expectedResults} expected results`
    });
  };

  const getPriorityBadge = (priority: FilterSuggestion['priority']) => {
    const config = {
      high: { variant: 'destructive' as const, label: 'High Priority' },
      medium: { variant: 'secondary' as const, label: 'Medium Priority' },
      low: { variant: 'outline' as const, label: 'Low Priority' }
    };
    const { variant, label } = config[priority];
    return <Badge variant={variant}>{label}</Badge>;
  };

  const getCategoryColor = (category: FilterSuggestion['category']) => {
    const colors = {
      performance: 'bg-green-100 text-green-800',
      attention: 'bg-red-100 text-red-800',
      opportunity: 'bg-blue-100 text-blue-800',
      maintenance: 'bg-orange-100 text-orange-800',
      financial: 'bg-purple-100 text-purple-800'
    };
    return colors[category];
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-center py-8">
            <div className="text-center">
              <Sparkles className="h-12 w-12 mx-auto text-blue-600 animate-pulse mb-4" />
              <p className="text-sm text-gray-600">Analyzing data and generating suggestions...</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (suggestions.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center py-8">
            <Sparkles className="h-12 w-12 mx-auto text-gray-400 mb-4" />
            <p className="text-sm text-gray-600">No suggestions available at this time</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-blue-600" />
          <CardTitle>Smart Filter Suggestions</CardTitle>
        </div>
        <CardDescription>
          AI-powered filter recommendations based on your data
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[400px] pr-4">
          <div className="space-y-4">
            {suggestions.map((suggestion) => {
              const Icon = suggestion.icon;
              return (
                <Card key={suggestion.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="pt-6">
                    <div className="space-y-4">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-3">
                          <div className={`p-2 rounded-lg ${getCategoryColor(suggestion.category)}`}>
                            <Icon className="h-5 w-5" />
                          </div>
                          <div className="flex-1">
                            <h4 className="font-medium">{suggestion.title}</h4>
                            <p className="text-sm text-gray-600 mt-1">{suggestion.description}</p>
                          </div>
                        </div>
                        {getPriorityBadge(suggestion.priority)}
                      </div>

                      <div className="flex items-center gap-2 text-sm">
                        <Badge variant="outline" className="font-normal">
                          {suggestion.expectedResults} results
                        </Badge>
                        <Badge variant="outline" className="font-normal capitalize">
                          {suggestion.category}
                        </Badge>
                      </div>

                      <div className="p-3 bg-gray-50 rounded-lg">
                        <p className="text-xs text-gray-600">
                          <span className="font-medium">Why this matters:</span> {suggestion.reasoning}
                        </p>
                      </div>

                      <Button
                        onClick={() => handleApplySuggestion(suggestion)}
                        className="w-full"
                        variant="outline"
                      >
                        <Zap className="h-4 w-4 mr-2" />
                        Apply This Filter
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}