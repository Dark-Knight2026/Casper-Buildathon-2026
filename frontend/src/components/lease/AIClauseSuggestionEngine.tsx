/**
 * AI-Powered Lease Clause Suggestion Engine
 * Provides intelligent clause recommendations based on property type,
 * location, and lease requirements
 */

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Sparkles,
  CheckCircle,
  AlertTriangle,
  Info,
  Plus,
  Eye,
  ThumbsUp,
  ThumbsDown,
  Lightbulb
} from 'lucide-react';
import { AIClauseSuggestion, LeaseClause, ClauseCategory } from '@/types/lease';
import { useToast } from '@/hooks/use-toast';

interface AIClauseSuggestionEngineProps {
  propertyId: string;
  propertyType: string;
  propertyState: string;
  leaseType: string;
  existingClauses: LeaseClause[];
  onAddClause: (clause: LeaseClause) => void;
  onPreviewClause: (clause: LeaseClause) => void;
}

export default function AIClauseSuggestionEngine({
  propertyId,
  propertyType,
  propertyState,
  leaseType,
  existingClauses,
  onAddClause,
  onPreviewClause
}: AIClauseSuggestionEngineProps) {
  const { toast } = useToast();
  const [suggestions, setSuggestions] = useState<AIClauseSuggestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<ClauseCategory | 'all'>('all');
  const [feedbackGiven, setFeedbackGiven] = useState<Set<string>>(new Set());

  const generateSuggestions = useCallback(async () => {
    setIsLoading(true);
    
    // NOTE: In a real implementation, use propertyId, propertyType, and leaseType
    // to fetch contextual suggestions from the backend API.
    // Example: const response = await api.getSuggestions({ propertyId, propertyType, leaseType });
    // Currently these props are unused in this mock implementation.
    
    try {
      // In production, this would call an AI service
      // For now, we'll generate mock suggestions based on property details
      const mockSuggestions: AIClauseSuggestion[] = [
        {
          clause: {
            id: `clause_${Date.now()}_1`,
            title: 'Lead-Based Paint Disclosure',
            content: `For properties built before 1978, federal law requires disclosure of known lead-based paint hazards. Landlord certifies that they have: (a) disclosed all known lead-based paint and hazards in the property, (b) provided tenant with EPA pamphlet "Protect Your Family from Lead in Your Home", and (c) allowed tenant a 10-day period to conduct a risk assessment or inspection.`,
            category: 'disclosures',
            order: 1,
            isMandatory: true,
            isStateSpecific: false,
            applicableStates: ['ALL'],
            suggestedByAI: true,
            aiConfidence: 0.98,
            aiReasoning: 'Federal law requires this disclosure for all residential properties built before 1978',
            isCustom: false,
            isEditable: false,
            tags: ['federal-law', 'mandatory', 'health-safety'],
            lastUpdated: new Date()
          },
          confidence: 0.98,
          reasoning: 'Federal law requires this disclosure for all residential properties built before 1978',
          priority: 'high',
          category: 'disclosures',
          isRequired: true
        },
        {
          clause: {
            id: `clause_${Date.now()}_2`,
            title: `${propertyState} Security Deposit Limit`,
            content: `Security deposit shall not exceed two months' rent for unfurnished properties or three months' rent for furnished properties, as required by ${propertyState} state law. Deposit must be held in a separate, interest-bearing account and returned within 21 days of lease termination, less any lawful deductions.`,
            category: 'security-deposit',
            order: 2,
            isMandatory: true,
            isStateSpecific: true,
            applicableStates: [propertyState],
            suggestedByAI: true,
            aiConfidence: 0.95,
            aiReasoning: `${propertyState} state law mandates specific security deposit limits and handling procedures`,
            isCustom: false,
            isEditable: true,
            variables: [
              {
                name: 'depositAmount',
                type: 'currency',
                value: 0,
                placeholder: 'Enter deposit amount',
                required: true
              }
            ],
            tags: ['state-law', 'mandatory', 'financial'],
            lastUpdated: new Date()
          },
          confidence: 0.95,
          reasoning: `${propertyState} state law mandates specific security deposit limits and handling procedures`,
          priority: 'high',
          category: 'security-deposit',
          isRequired: true
        },
        {
          clause: {
            id: `clause_${Date.now()}_3`,
            title: 'Pet Policy',
            content: `Pets are [permitted/not permitted] on the premises. If permitted, tenant must pay a pet deposit of $[amount] and monthly pet rent of $[amount]. Tenant is responsible for all damages caused by pets and must maintain renter's insurance with liability coverage. Aggressive breeds as defined by insurance carrier are prohibited.`,
            category: 'pets',
            order: 3,
            isMandatory: false,
            isStateSpecific: false,
            suggestedByAI: true,
            aiConfidence: 0.85,
            aiReasoning: 'Pet policies are recommended for all residential leases to clarify expectations and liability',
            isCustom: false,
            isEditable: true,
            variables: [
              {
                name: 'petsAllowed',
                type: 'boolean',
                value: false,
                required: true
              },
              {
                name: 'petDeposit',
                type: 'currency',
                value: 0,
                placeholder: 'Pet deposit amount',
                required: false
              },
              {
                name: 'monthlyPetRent',
                type: 'currency',
                value: 0,
                placeholder: 'Monthly pet rent',
                required: false
              }
            ],
            tags: ['recommended', 'liability', 'pets'],
            lastUpdated: new Date()
          },
          confidence: 0.85,
          reasoning: 'Pet policies are recommended for all residential leases to clarify expectations and liability',
          priority: 'medium',
          category: 'pets',
          isRequired: false
        },
        {
          clause: {
            id: `clause_${Date.now()}_4`,
            title: 'Maintenance and Repairs',
            content: `Landlord shall maintain the property in habitable condition and make all necessary repairs to structural elements, plumbing, heating, and electrical systems. Tenant is responsible for minor repairs under $[amount] and must report maintenance issues within 24 hours of discovery. Emergency repairs may be made by tenant if landlord is unreachable, with reimbursement upon submission of receipts.`,
            category: 'maintenance',
            order: 4,
            isMandatory: true,
            isStateSpecific: false,
            suggestedByAI: true,
            aiConfidence: 0.92,
            aiReasoning: 'Clear maintenance responsibilities prevent disputes and ensure property upkeep',
            isCustom: false,
            isEditable: true,
            variables: [
              {
                name: 'minorRepairThreshold',
                type: 'currency',
                value: 100,
                placeholder: 'Minor repair threshold',
                required: true
              }
            ],
            tags: ['mandatory', 'maintenance', 'liability'],
            lastUpdated: new Date()
          },
          confidence: 0.92,
          reasoning: 'Clear maintenance responsibilities prevent disputes and ensure property upkeep',
          priority: 'high',
          category: 'maintenance',
          isRequired: true
        },
        {
          clause: {
            id: `clause_${Date.now()}_5`,
            title: 'Entry and Inspection',
            content: `Landlord may enter the premises for inspections, repairs, or showings with 24-hour advance notice, except in emergencies. Entry times shall be between 8:00 AM and 8:00 PM unless otherwise agreed. Tenant has the right to be present during all non-emergency entries.`,
            category: 'special-conditions',
            order: 5,
            isMandatory: true,
            isStateSpecific: true,
            applicableStates: [propertyState],
            suggestedByAI: true,
            aiConfidence: 0.90,
            aiReasoning: `${propertyState} law requires specific notice periods for landlord entry`,
            isCustom: false,
            isEditable: true,
            tags: ['state-law', 'privacy', 'access'],
            lastUpdated: new Date()
          },
          confidence: 0.90,
          reasoning: `${propertyState} law requires specific notice periods for landlord entry`,
          priority: 'high',
          category: 'special-conditions',
          isRequired: true
        }
      ];

      // Filter out clauses that already exist
      const existingTitles = new Set(existingClauses.map(c => c.title.toLowerCase()));
      const filteredSuggestions = mockSuggestions.filter(
        s => !existingTitles.has(s.clause.title.toLowerCase())
      );

      setSuggestions(filteredSuggestions);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to generate clause suggestions',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  }, [propertyState, existingClauses, toast]); // Removed propertyId, propertyType, leaseType from dependencies as they are not used in the mock implementation.

  // Generate AI suggestions
  useEffect(() => {
    generateSuggestions();
  }, [generateSuggestions]);

  const handleAddClause = (suggestion: AIClauseSuggestion) => {
    onAddClause(suggestion.clause);
    setSuggestions(prev => prev.filter(s => s.clause.id !== suggestion.clause.id));
    
    toast({
      title: 'Clause Added',
      description: `"${suggestion.clause.title}" has been added to your lease`
    });
  };

  const handleFeedback = (suggestionId: string, isPositive: boolean) => {
    setFeedbackGiven(prev => new Set(prev).add(suggestionId));
    
    // In production, this would send feedback to improve AI
    toast({
      title: 'Thank you for your feedback',
      description: 'Your input helps improve our suggestions'
    });
  };

  const filteredSuggestions = selectedCategory === 'all'
    ? suggestions
    : suggestions.filter(s => s.category === selectedCategory);

  const getPriorityIcon = (priority: AIClauseSuggestion['priority']) => {
    switch (priority) {
      case 'high':
        return <AlertTriangle className="h-4 w-4 text-red-500" />;
      case 'medium':
        return <Info className="h-4 w-4 text-yellow-500" />;
      case 'low':
        return <Lightbulb className="h-4 w-4 text-blue-500" />;
    }
  };

  const getPriorityColor = (priority: AIClauseSuggestion['priority']) => {
    switch (priority) {
      case 'high':
        return 'border-red-200 bg-red-50';
      case 'medium':
        return 'border-yellow-200 bg-yellow-50';
      case 'low':
        return 'border-blue-200 bg-blue-50';
    }
  };

  const requiredCount = suggestions.filter(s => s.isRequired).length;
  const recommendedCount = suggestions.filter(s => !s.isRequired).length;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
              <Sparkles className="h-5 w-5 text-purple-600" />
            </div>
            <div>
              <CardTitle>AI Clause Suggestions</CardTitle>
              <CardDescription>
                Intelligent recommendations based on your property and lease type
              </CardDescription>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={generateSuggestions}
            disabled={isLoading}
          >
            Refresh Suggestions
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Summary Stats */}
        <div className="grid grid-cols-2 gap-4">
          <Alert>
            <AlertTriangle className="h-4 w-4 text-red-500" />
            <AlertDescription>
              <span className="font-semibold">{requiredCount} Required</span>
              <p className="text-sm text-gray-600">Mandatory clauses for compliance</p>
            </AlertDescription>
          </Alert>
          <Alert>
            <Lightbulb className="h-4 w-4 text-blue-500" />
            <AlertDescription>
              <span className="font-semibold">{recommendedCount} Recommended</span>
              <p className="text-sm text-gray-600">Suggested for best practices</p>
            </AlertDescription>
          </Alert>
        </div>

        {/* Category Filter */}
        <Tabs value={selectedCategory} onValueChange={(v) => setSelectedCategory(v as ClauseCategory | 'all')}>
          <TabsList className="w-full justify-start overflow-x-auto">
            <TabsTrigger value="all">All ({suggestions.length})</TabsTrigger>
            <TabsTrigger value="disclosures">Disclosures</TabsTrigger>
            <TabsTrigger value="security-deposit">Security Deposit</TabsTrigger>
            <TabsTrigger value="pets">Pets</TabsTrigger>
            <TabsTrigger value="maintenance">Maintenance</TabsTrigger>
            <TabsTrigger value="rent-payment">Rent Payment</TabsTrigger>
          </TabsList>
        </Tabs>

        {/* Suggestions List - Responsive Height */}
        <ScrollArea className="h-[400px] md:h-[600px] pr-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <Sparkles className="h-12 w-12 text-purple-600 mx-auto mb-4 animate-pulse" />
                <p className="text-gray-600">Analyzing your lease requirements...</p>
              </div>
            </div>
          ) : filteredSuggestions.length === 0 ? (
            <div className="text-center py-12">
              <CheckCircle className="h-12 w-12 text-green-600 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                All Set!
              </h3>
              <p className="text-gray-600">
                No additional clauses recommended for this category
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredSuggestions.map((suggestion) => (
                <Card
                  key={suggestion.clause.id}
                  className={`border-2 ${getPriorityColor(suggestion.priority)}`}
                >
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          {getPriorityIcon(suggestion.priority)}
                          <CardTitle className="text-base">
                            {suggestion.clause.title}
                          </CardTitle>
                          {suggestion.isRequired && (
                            <Badge variant="destructive">Required</Badge>
                          )}
                          {suggestion.clause.isStateSpecific && (
                            <Badge variant="outline">{propertyState} Law</Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <span>AI Confidence:</span>
                          <div className="flex-1 max-w-[200px] bg-gray-200 rounded-full h-2">
                            <div
                              className="bg-purple-600 h-2 rounded-full"
                              style={{ width: `${suggestion.confidence * 100}%` }}
                            />
                          </div>
                          <span className="font-medium">{(suggestion.confidence * 100).toFixed(0)}%</span>
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <p className="text-sm font-medium text-gray-700 mb-2">AI Reasoning:</p>
                      <p className="text-sm text-gray-600 bg-white p-3 rounded-lg border">
                        {suggestion.reasoning}
                      </p>
                    </div>

                    <div>
                      <p className="text-sm font-medium text-gray-700 mb-2">Clause Content:</p>
                      <p className="text-sm text-gray-600 bg-white p-3 rounded-lg border max-h-[150px] overflow-y-auto">
                        {suggestion.clause.content}
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        onClick={() => handleAddClause(suggestion)}
                        className="flex-1"
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Add to Lease
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => onPreviewClause(suggestion.clause)}
                      >
                        <Eye className="h-4 w-4 mr-2" />
                        Preview
                      </Button>
                      {!feedbackGiven.has(suggestion.clause.id) && (
                        <>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleFeedback(suggestion.clause.id, true)}
                          >
                            <ThumbsUp className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleFeedback(suggestion.clause.id, false)}
                          >
                            <ThumbsDown className="h-4 w-4" />
                          </Button>
                        </>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}