/**
 * Enhanced Lease Template Marketplace
 * Comprehensive marketplace with advanced filtering, comparison, favorites, and rich interactions
 */

import { useState, useMemo, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { Checkbox } from '@/components/ui/checkbox';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import {
  Search,
  Star,
  Download,
  Eye,
  CheckCircle,
  TrendingUp,
  Clock,
  FileText,
  Shield,
  Heart,
  X,
  Filter,
  ChevronRight,
  Home,
  Building2,
  GraduationCap,
  Plane,
  Share2,
  GitCompare,
  History,
  Award,
  Sparkles,
  Flame,
  Tag,
  BarChart3,
  SlidersHorizontal,
  type LucideIcon
} from 'lucide-react';
import { LeaseTemplate, LeaseType } from '@/types/lease';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface LeaseTemplateMarketplaceProps {
  templates: LeaseTemplate[];
  onUseTemplate: (templateId: string) => void;
  onPreviewTemplate: (template: LeaseTemplate) => void;
}

type ComplexityLevel = 'beginner' | 'intermediate' | 'advanced';
type PreviewTab = 'overview' | 'clauses' | 'reviews' | 'details' | 'history';

interface FilterState {
  states: string[];
  industries: string[];
  features: string[];
  complexity: ComplexityLevel[];
  priceRange: [number, number];
  complianceRequired: boolean;
}

const categoryIcons: Record<string, LucideIcon> = {
  'residential-long-term': Home,
  'residential-short-term': Clock,
  'commercial': Building2,
  'student-housing': GraduationCap,
  'vacation-rental': Plane,
  'month-to-month': Clock
};

const categoryColors: Record<string, string> = {
  'residential-long-term': 'bg-blue-100 text-blue-700 border-blue-300',
  'residential-short-term': 'bg-purple-100 text-purple-700 border-purple-300',
  'commercial': 'bg-green-100 text-green-700 border-green-300',
  'student-housing': 'bg-orange-100 text-orange-700 border-orange-300',
  'vacation-rental': 'bg-pink-100 text-pink-700 border-pink-300',
  'month-to-month': 'bg-indigo-100 text-indigo-700 border-indigo-300'
};

export default function LeaseTemplateMarketplace({
  templates = [],
  onUseTemplate,
  onPreviewTemplate
}: LeaseTemplateMarketplaceProps) {
  const { toast } = useToast();
  
  // Defensive check for templates prop
  const safeTemplates = useMemo(() => Array.isArray(templates) ? templates : [], [templates]);
  
  // Search and filter state
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'rating' | 'usage' | 'recent'>('rating');
  const [showVerifiedOnly, setShowVerifiedOnly] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  
  // Advanced filters
  const [filters, setFilters] = useState<FilterState>({
    states: [],
    industries: [],
    features: [],
    complexity: [],
    priceRange: [0, 1000],
    complianceRequired: false
  });
  
  // Interactive features state
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [compareList, setCompareList] = useState<string[]>([]);
  const [recentlyViewed, setRecentlyViewed] = useState<string[]>([]);
  const [hoveredTemplate, setHoveredTemplate] = useState<string | null>(null);
  
  // Dialog state
  const [selectedTemplate, setSelectedTemplate] = useState<LeaseTemplate | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [previewTab, setPreviewTab] = useState<PreviewTab>('overview');
  const [showComparison, setShowComparison] = useState(false);
  const [fullScreenPreview, setFullScreenPreview] = useState(false);
  const [showShareDialog, setShowShareDialog] = useState(false);
  
  // Loading state
  const [isLoading, setIsLoading] = useState(false);

  // Available filter options (derived from templates)
  const availableStates = useMemo(() => {
    const states = new Set<string>();
    safeTemplates.forEach(t => {
      if (t.applicableStates && Array.isArray(t.applicableStates)) {
        t.applicableStates.forEach(s => states.add(s));
      }
    });
    return Array.from(states).sort();
  }, [safeTemplates]);

  const availableFeatures = useMemo(() => {
    return ['Pet-Friendly', 'Month-to-Month', 'Utilities Included', 'Parking', 'Furnished', 'Subletting Allowed'];
  }, []);

  const availableIndustries = useMemo(() => {
    return ['Real Estate', 'Property Management', 'Legal Services', 'Hospitality'];
  }, []);

  // Filter and sort templates
  const filteredTemplates = useMemo(() => {
    return safeTemplates
      .filter(template => {
        if (!template) return false;

        // Category filter
        if (selectedCategory !== 'all' && template.category !== selectedCategory) return false;
        
        // Verified filter
        if (showVerifiedOnly && !template.isVerified) return false;
        
        // Search filter
        if (searchTerm) {
          const search = searchTerm.toLowerCase();
          const name = (template.name || '').toLowerCase();
          const desc = (template.description || '').toLowerCase();
          const creator = (template.createdByName || '').toLowerCase();
          
          if (
            !name.includes(search) &&
            !desc.includes(search) &&
            !creator.includes(search)
          ) return false;
        }
        
        // States filter
        if (filters.states.length > 0) {
          const states = template.applicableStates || [];
          if (!filters.states.some(s => states.includes(s))) return false;
        }
        
        // Compliance filter
        if (filters.complianceRequired && !template.complianceVerified) return false;
        
        return true;
      })
      .sort((a, b) => {
        switch (sortBy) {
          case 'rating':
            return (b.rating || 0) - (a.rating || 0);
          case 'usage':
            return (b.usageCount || 0) - (a.usageCount || 0);
          case 'recent': {
            const dateA = a.createdAt instanceof Date ? a.createdAt.getTime() : 0;
            const dateB = b.createdAt instanceof Date ? b.createdAt.getTime() : 0;
            return dateB - dateA;
          }
          default:
            return 0;
        }
      });
  }, [safeTemplates, selectedCategory, showVerifiedOnly, searchTerm, filters, sortBy]);

  const featuredTemplates = useMemo(() => 
    safeTemplates.filter(t => t.isVerified && (t.rating || 0) >= 4.5).slice(0, 3),
    [safeTemplates]
  );

  const trendingTemplates = useMemo(() => 
    safeTemplates.filter(t => (t.usageCount || 0) > 50).slice(0, 6),
    [safeTemplates]
  );

  const recentlyViewedTemplates = useMemo(() => 
    recentlyViewed.map(id => safeTemplates.find(t => t.id === id)).filter(Boolean) as LeaseTemplate[],
    [recentlyViewed, safeTemplates]
  );

  // Handlers
  const handleUseTemplate = (template: LeaseTemplate) => {
    if (!template?.id) return;
    onUseTemplate(template.id);
    toast({
      title: 'Template Selected',
      description: `"${template.name || 'Template'}" is now being used for your lease`
    });
  };

  const handlePreview = (template: LeaseTemplate) => {
    if (!template) return;
    setSelectedTemplate(template);
    setShowPreview(true);
    setPreviewTab('overview');
    onPreviewTemplate(template);
    
    // Add to recently viewed
    setRecentlyViewed(prev => {
      const filtered = prev.filter(id => id !== template.id);
      return [template.id, ...filtered].slice(0, 6);
    });
  };

  const toggleFavorite = (templateId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setFavorites(prev => {
      const newFavorites = new Set(prev);
      if (newFavorites.has(templateId)) {
        newFavorites.delete(templateId);
        toast({ description: 'Removed from favorites' });
      } else {
        newFavorites.add(templateId);
        toast({ description: 'Added to favorites' });
      }
      return newFavorites;
    });
  };

  const toggleCompare = (templateId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setCompareList(prev => {
      if (prev.includes(templateId)) {
        return prev.filter(id => id !== templateId);
      } else if (prev.length < 3) {
        toast({ description: 'Added to comparison' });
        return [...prev, templateId];
      } else {
        toast({ 
          title: 'Maximum reached',
          description: 'You can compare up to 3 templates',
          variant: 'destructive'
        });
        return prev;
      }
    });
  };

  const clearFilters = () => {
    setFilters({
      states: [],
      industries: [],
      features: [],
      complexity: [],
      priceRange: [0, 1000],
      complianceRequired: false
    });
    setShowVerifiedOnly(false);
    toast({ description: 'All filters cleared' });
  };

  const removeFilter = (type: keyof FilterState, value: string) => {
    setFilters(prev => ({
      ...prev,
      [type]: Array.isArray(prev[type]) 
        ? (prev[type] as string[]).filter(v => v !== value)
        : prev[type]
    }));
  };

  const handleShare = (template: LeaseTemplate) => {
    setSelectedTemplate(template);
    setShowShareDialog(true);
  };

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filters.states.length > 0) count += filters.states.length;
    if (filters.industries.length > 0) count += filters.industries.length;
    if (filters.features.length > 0) count += filters.features.length;
    if (filters.complexity.length > 0) count += filters.complexity.length;
    if (filters.complianceRequired) count += 1;
    if (showVerifiedOnly) count += 1;
    return count;
  }, [filters, showVerifiedOnly]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && showPreview) {
        setShowPreview(false);
      }
      if (e.key === '/' && !showPreview) {
        e.preventDefault();
        document.getElementById('template-search')?.focus();
      }
    };
    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [showPreview]);

  // Template Card Component
  const TemplateCard = ({ template, featured = false }: { template: LeaseTemplate; featured?: boolean }) => {
    if (!template) return null;

    const category = template.category || 'residential-long-term';
    const Icon = categoryIcons[category] || FileText;
    const isFavorited = favorites.has(template.id);
    const isComparing = compareList.includes(template.id);
    
    const createdAt = template.createdAt instanceof Date ? template.createdAt : new Date();
    const isNew = (Date.now() - createdAt.getTime()) < 7 * 24 * 60 * 60 * 1000;
    
    const usageCount = template.usageCount || 0;
    const isTrending = usageCount > 50;
    const rating = typeof template.rating === 'number' ? template.rating : 0;
    const reviewsCount = template.reviews?.length || 0;
    const clausesCount = template.clauses?.length || 0;
    const applicableStates = template.applicableStates || [];
    const createdByName = template.createdByName || 'System';

    return (
      <Card 
        className={cn(
          "group relative overflow-hidden transition-all duration-300 hover:shadow-2xl hover:-translate-y-1",
          featured && "border-2 border-yellow-400 bg-gradient-to-br from-yellow-50 to-orange-50",
          isComparing && "ring-2 ring-blue-500"
        )}
        onMouseEnter={() => setHoveredTemplate(template.id)}
        onMouseLeave={() => setHoveredTemplate(null)}
      >
        {/* Gradient overlay on hover */}
        <div className="absolute inset-0 bg-gradient-to-br from-blue-500/0 to-purple-500/0 group-hover:from-blue-500/5 group-hover:to-purple-500/5 transition-all duration-300" />
        
        {/* Badges overlay */}
        <div className="absolute top-3 right-3 flex flex-col gap-2 z-10">
          {isNew && (
            <Badge className="bg-green-500 text-white animate-pulse">
              <Sparkles className="h-3 w-3 mr-1" />
              New
            </Badge>
          )}
          {isTrending && (
            <Badge className="bg-red-500 text-white">
              <Flame className="h-3 w-3 mr-1" />
              Trending
            </Badge>
          )}
        </div>

        <CardHeader className="relative">
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className={cn(
                "p-2 rounded-lg transition-transform group-hover:scale-110",
                categoryColors[category] || 'bg-gray-100 text-gray-700 border-gray-300'
              )}>
                <Icon className="h-5 w-5" />
              </div>
              <div className="flex-1">
                <CardTitle className="text-lg line-clamp-1 group-hover:text-blue-600 transition-colors">
                  {template.name || 'Untitled Template'}
                </CardTitle>
              </div>
            </div>
          </div>
          
          <CardDescription className="line-clamp-2 text-sm">
            {template.description || 'No description available'}
          </CardDescription>

          <div className="flex flex-wrap items-center gap-2 mt-3">
            <Badge variant="outline" className={cn("text-xs", categoryColors[category] || 'bg-gray-100 text-gray-700')}>
              {category}
            </Badge>
            {template.isVerified && (
              <Badge variant="default" className="text-xs bg-blue-600">
                <CheckCircle className="h-3 w-3 mr-1" />
                Verified
              </Badge>
            )}
            {template.complianceVerified && (
              <Badge variant="outline" className="text-xs text-green-600 border-green-300">
                <Shield className="h-3 w-3 mr-1" />
                Compliant
              </Badge>
            )}
          </div>
        </CardHeader>

        <CardContent className="space-y-4 relative">
          {/* Stats Grid */}
          <div className="grid grid-cols-3 gap-3">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="text-center p-2 rounded-lg bg-yellow-50 hover:bg-yellow-100 transition-colors cursor-help">
                    <div className="flex items-center justify-center gap-1 text-yellow-600 mb-1">
                      <Star className="h-4 w-4 fill-current" />
                      <span className="font-bold text-sm">{rating.toFixed(1)}</span>
                    </div>
                    <p className="text-xs text-gray-600">{reviewsCount} reviews</p>
                  </div>
                </TooltipTrigger>
                <TooltipContent>Average rating from {reviewsCount} users</TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="text-center p-2 rounded-lg bg-blue-50 hover:bg-blue-100 transition-colors cursor-help">
                    <div className="flex items-center justify-center gap-1 text-blue-600 mb-1">
                      <Download className="h-4 w-4" />
                      <span className="font-bold text-sm">{usageCount}</span>
                    </div>
                    <p className="text-xs text-gray-600">uses</p>
                  </div>
                </TooltipTrigger>
                <TooltipContent>Used by {usageCount} landlords</TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="text-center p-2 rounded-lg bg-purple-50 hover:bg-purple-100 transition-colors cursor-help">
                    <div className="flex items-center justify-center gap-1 text-purple-600 mb-1">
                      <FileText className="h-4 w-4" />
                      <span className="font-bold text-sm">{clausesCount}</span>
                    </div>
                    <p className="text-xs text-gray-600">clauses</p>
                  </div>
                </TooltipTrigger>
                <TooltipContent>{clausesCount} legal clauses included</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>

          {/* Creator Info */}
          <div className="flex items-center gap-2 p-2 rounded-lg bg-gray-50 group-hover:bg-gray-100 transition-colors">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white font-bold text-sm">
              {createdByName.charAt(0)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">
                {createdByName}
              </p>
              <p className="text-xs text-gray-500">Template Author</p>
            </div>
            <Award className="h-4 w-4 text-yellow-500" />
          </div>

          {/* Feature Tags */}
          <div className="flex flex-wrap gap-1.5">
            {['Pet-Friendly', 'Utilities Included'].map((feature, idx) => (
              <Badge key={idx} variant="secondary" className="text-xs">
                <Tag className="h-3 w-3 mr-1" />
                {feature}
              </Badge>
            ))}
          </div>

          {/* States */}
          {applicableStates.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {applicableStates.slice(0, 4).map(state => (
                <Badge key={state} variant="outline" className="text-xs">
                  {state}
                </Badge>
              ))}
              {applicableStates.length > 4 && (
                <Badge variant="outline" className="text-xs font-semibold">
                  +{applicableStates.length - 4}
                </Badge>
              )}
            </div>
          )}

          <Separator />

          {/* Action Buttons */}
          <div className="flex gap-2">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={(e) => toggleFavorite(template.id, e)}
                    className={cn(
                      "transition-all",
                      isFavorited && "text-red-500 hover:text-red-600"
                    )}
                  >
                    <Heart className={cn("h-4 w-4", isFavorited && "fill-current")} />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>{isFavorited ? 'Remove from favorites' : 'Add to favorites'}</TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={(e) => toggleCompare(template.id, e)}
                    className={cn(
                      "transition-all",
                      isComparing && "text-blue-500 hover:text-blue-600"
                    )}
                  >
                    <GitCompare className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  {isComparing ? 'Remove from comparison' : 'Add to comparison'}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleShare(template);
                    }}
                  >
                    <Share2 className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Share template</TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <Button
              onClick={() => handlePreview(template)}
              variant="outline"
              size="sm"
              className="flex-1"
            >
              <Eye className="h-4 w-4 mr-2" />
              Preview
            </Button>
            
            <Button
              onClick={() => handleUseTemplate(template)}
              size="sm"
              className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
            >
              <Download className="h-4 w-4 mr-2" />
              Use
            </Button>
          </div>
        </CardContent>

        {/* Quick preview tooltip on hover */}
        {hoveredTemplate === template.id && (
          <div className="absolute inset-x-0 bottom-0 p-4 bg-gradient-to-t from-black/80 to-transparent text-white opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none">
            <p className="text-xs line-clamp-2">{template.description}</p>
          </div>
        )}
      </Card>
    );
  };

  return (
    <div className="space-y-6">
      {/* Breadcrumb Navigation */}
      <div className="flex items-center gap-2 text-sm text-gray-600">
        <Home className="h-4 w-4" />
        <ChevronRight className="h-4 w-4" />
        <span>Marketplace</span>
        <ChevronRight className="h-4 w-4" />
        <span className="text-gray-900 font-medium">Lease Templates</span>
      </div>

      {/* Header with Search and Filters */}
      <Card className="sticky top-0 z-20 shadow-lg">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-2xl">Lease Template Marketplace</CardTitle>
              <CardDescription className="mt-1">
                Browse and use professionally crafted lease templates
              </CardDescription>
            </div>
            <Badge variant="outline" className="text-lg px-4 py-2">
              {filteredTemplates.length} templates
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Search Bar */}
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <Input
              id="template-search"
              placeholder="Search templates... (Press / to focus)"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-12 h-12 text-base"
            />
            {searchTerm && (
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-2 top-1/2 -translate-y-1/2"
                onClick={() => setSearchTerm('')}
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>

          {/* Filter Controls */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <Select value={selectedCategory} onValueChange={(v) => setSelectedCategory(v)}>
              <SelectTrigger>
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                <SelectItem value="residential-long-term">Residential Long-term</SelectItem>
                <SelectItem value="residential-short-term">Residential Short-term</SelectItem>
                <SelectItem value="commercial">Commercial</SelectItem>
                <SelectItem value="student-housing">Student Housing</SelectItem>
                <SelectItem value="vacation-rental">Vacation Rental</SelectItem>
                <SelectItem value="month-to-month">Month-to-Month</SelectItem>
              </SelectContent>
            </Select>

            <Select value={sortBy} onValueChange={(v) => setSortBy(v as 'rating' | 'usage' | 'recent')}>
              <SelectTrigger>
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="rating">Highest Rated</SelectItem>
                <SelectItem value="usage">Most Used</SelectItem>
                <SelectItem value="recent">Most Recent</SelectItem>
              </SelectContent>
            </Select>

            <Button
              variant={showVerifiedOnly ? 'default' : 'outline'}
              onClick={() => setShowVerifiedOnly(!showVerifiedOnly)}
              className="w-full"
            >
              <Shield className="h-4 w-4 mr-2" />
              Verified Only
            </Button>

            <Button
              variant="outline"
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className="w-full"
            >
              <SlidersHorizontal className="h-4 w-4 mr-2" />
              Advanced Filters
              {activeFilterCount > 0 && (
                <Badge className="ml-2" variant="secondary">{activeFilterCount}</Badge>
              )}
            </Button>
          </div>

          {/* Active Filter Chips */}
          {activeFilterCount > 0 && (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm text-gray-600">Active filters:</span>
              {filters.states.map(state => (
                <Badge key={state} variant="secondary" className="gap-1">
                  {state}
                  <X 
                    className="h-3 w-3 cursor-pointer hover:text-red-500" 
                    onClick={() => removeFilter('states', state)}
                  />
                </Badge>
              ))}
              {showVerifiedOnly && (
                <Badge variant="secondary" className="gap-1">
                  Verified
                  <X 
                    className="h-3 w-3 cursor-pointer hover:text-red-500" 
                    onClick={() => setShowVerifiedOnly(false)}
                  />
                </Badge>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={clearFilters}
                className="text-red-600 hover:text-red-700"
              >
                Clear all
              </Button>
            </div>
          )}

          {/* Comparison Bar */}
          {compareList.length > 0 && (
            <div className="flex items-center gap-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <GitCompare className="h-5 w-5 text-blue-600" />
              <span className="text-sm font-medium text-blue-900">
                {compareList.length} template{compareList.length > 1 ? 's' : ''} selected for comparison
              </span>
              <Button
                size="sm"
                onClick={() => setShowComparison(true)}
                disabled={compareList.length < 2}
                className="ml-auto"
              >
                Compare Now
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setCompareList([])}
              >
                Clear
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Main Content with Sidebar */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Collapsible Sidebar */}
        {!sidebarCollapsed && (
          <Card className="lg:col-span-1 h-fit sticky top-32">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Filters</CardTitle>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setSidebarCollapsed(true)}
                  className="lg:hidden"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* States Filter */}
              <div>
                <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
                  <Filter className="h-4 w-4" />
                  Applicable States
                </h4>
                <ScrollArea className="h-40">
                  <div className="space-y-2">
                    {availableStates.map(state => (
                      <div key={state} className="flex items-center gap-2">
                        <Checkbox
                          id={`state-${state}`}
                          checked={filters.states.includes(state)}
                          onCheckedChange={(checked) => {
                            setFilters(prev => ({
                              ...prev,
                              states: checked
                                ? [...prev.states, state]
                                : prev.states.filter(s => s !== state)
                            }));
                          }}
                        />
                        <label
                          htmlFor={`state-${state}`}
                          className="text-sm cursor-pointer"
                        >
                          {state}
                        </label>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </div>

              <Separator />

              {/* Features Filter */}
              <div>
                <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
                  <Tag className="h-4 w-4" />
                  Features
                </h4>
                <div className="space-y-2">
                  {availableFeatures.map(feature => (
                    <div key={feature} className="flex items-center gap-2">
                      <Checkbox
                        id={`feature-${feature}`}
                        checked={filters.features.includes(feature)}
                        onCheckedChange={(checked) => {
                          setFilters(prev => ({
                            ...prev,
                            features: checked
                              ? [...prev.features, feature]
                              : prev.features.filter(f => f !== feature)
                          }));
                        }}
                      />
                      <label
                        htmlFor={`feature-${feature}`}
                        className="text-sm cursor-pointer"
                      >
                        {feature}
                      </label>
                    </div>
                  ))}
                </div>
              </div>

              <Separator />

              {/* Compliance Filter */}
              <div>
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="compliance"
                    checked={filters.complianceRequired}
                    onCheckedChange={(checked) => {
                      setFilters(prev => ({
                        ...prev,
                        complianceRequired: checked as boolean
                      }));
                    }}
                  />
                  <label
                    htmlFor="compliance"
                    className="text-sm font-medium cursor-pointer flex items-center gap-2"
                  >
                    <Shield className="h-4 w-4 text-green-600" />
                    Compliance Verified Only
                  </label>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Main Content Area */}
        <div className={cn("space-y-6", sidebarCollapsed ? "lg:col-span-4" : "lg:col-span-3")}>
          <Tabs defaultValue="all" className="space-y-6">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="all" className="flex items-center gap-2">
                <BarChart3 className="h-4 w-4" />
                All ({filteredTemplates.length})
              </TabsTrigger>
              <TabsTrigger value="featured" className="flex items-center gap-2">
                <Star className="h-4 w-4" />
                Featured ({featuredTemplates.length})
              </TabsTrigger>
              <TabsTrigger value="trending" className="flex items-center gap-2">
                <Flame className="h-4 w-4" />
                Trending ({trendingTemplates.length})
              </TabsTrigger>
              <TabsTrigger value="favorites" className="flex items-center gap-2">
                <Heart className="h-4 w-4" />
                Favorites ({favorites.size})
              </TabsTrigger>
            </TabsList>

            {/* All Templates Tab */}
            <TabsContent value="all">
              {isLoading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                  {[...Array(6)].map((_, i) => (
                    <Card key={i} className="animate-pulse">
                      <CardHeader>
                        <div className="h-6 bg-gray-200 rounded w-3/4 mb-2" />
                        <div className="h-4 bg-gray-200 rounded w-full" />
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          <div className="h-20 bg-gray-200 rounded" />
                          <div className="h-10 bg-gray-200 rounded" />
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : filteredTemplates.length === 0 ? (
                <Card className="p-12">
                  <div className="text-center space-y-4">
                    <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto">
                      <Search className="h-10 w-10 text-gray-400" />
                    </div>
                    <h3 className="text-xl font-semibold text-gray-900">No templates found</h3>
                    <p className="text-gray-600 max-w-md mx-auto">
                      We couldn't find any templates matching your criteria. Try adjusting your filters or search terms.
                    </p>
                    <Button onClick={clearFilters} variant="outline">
                      Clear all filters
                    </Button>
                  </div>
                </Card>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                  {filteredTemplates.map((template) => (
                    <TemplateCard key={template.id} template={template} />
                  ))}
                </div>
              )}
            </TabsContent>

            {/* Featured Templates Tab */}
            <TabsContent value="featured">
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {featuredTemplates.map((template) => (
                  <TemplateCard key={template.id} template={template} featured />
                ))}
              </div>
            </TabsContent>

            {/* Trending Templates Tab */}
            <TabsContent value="trending">
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {trendingTemplates.map((template) => (
                  <TemplateCard key={template.id} template={template} />
                ))}
              </div>
            </TabsContent>

            {/* Favorites Tab */}
            <TabsContent value="favorites">
              {favorites.size === 0 ? (
                <Card className="p-12">
                  <div className="text-center space-y-4">
                    <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto">
                      <Heart className="h-10 w-10 text-red-400" />
                    </div>
                    <h3 className="text-xl font-semibold text-gray-900">No favorites yet</h3>
                    <p className="text-gray-600 max-w-md mx-auto">
                      Start adding templates to your favorites by clicking the heart icon on any template card.
                    </p>
                  </div>
                </Card>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                  {Array.from(favorites).map(id => {
                    const template = safeTemplates.find(t => t.id === id);
                    return template ? <TemplateCard key={id} template={template} /> : null;
                  })}
                </div>
              )}
            </TabsContent>
          </Tabs>

          {/* Recently Viewed Section */}
          {recentlyViewedTemplates.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <History className="h-5 w-5" />
                  Recently Viewed
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                  {recentlyViewedTemplates.map((template) => (
                    <Card key={template.id} className="hover:shadow-lg transition-shadow">
                      <CardHeader className="pb-3">
                        <CardTitle className="text-sm line-clamp-1">{template.name}</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="flex gap-2">
                          <Button
                            onClick={() => handlePreview(template)}
                            variant="outline"
                            size="sm"
                            className="flex-1"
                          >
                            <Eye className="h-3 w-3 mr-1" />
                            View
                          </Button>
                          <Button
                            onClick={() => handleUseTemplate(template)}
                            size="sm"
                            className="flex-1"
                          >
                            Use
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Enhanced Preview Dialog */}
      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent className={cn(
          "max-w-6xl transition-all duration-300",
          fullScreenPreview ? "w-screen h-screen max-w-none" : "max-h-[90vh]"
        )}>
          <DialogHeader>
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <DialogTitle className="text-2xl">{selectedTemplate?.name}</DialogTitle>
                <DialogDescription className="mt-1">
                  {selectedTemplate?.description}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPreview(false)}>Close</Button>
            <Button onClick={() => selectedTemplate && handleUseTemplate(selectedTemplate)}>
              Use This Template
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}