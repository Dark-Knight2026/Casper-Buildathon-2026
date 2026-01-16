/**
 * Clauses Step
 * AI-powered clause suggestions and compliance checking
 */

import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { LeaseFormData, LeaseClause } from '@/types/lease';
import { Sparkles, Trash2, Eye, Shield } from 'lucide-react';
import AIClauseSuggestionEngine from '../AIClauseSuggestionEngine';
import ComplianceChecker from '../ComplianceChecker';

interface ClausesStepProps {
  formData: Partial<LeaseFormData>;
  updateFormData: (data: Partial<LeaseFormData>) => void;
  errors: Record<string, string>;
  addClause: (clause: LeaseClause) => void;
  removeClause: (clauseId: string) => void;
  updateClause: (clauseId: string, updates: Partial<LeaseClause>) => void;
}

export default function ClausesStep({
  formData,
  errors,
  addClause,
  removeClause
}: ClausesStepProps) {
  const [selectedTab, setSelectedTab] = useState('suggestions');
  const [previewClause, setPreviewClause] = useState<LeaseClause | null>(null);

  const handleAddClause = (clause: LeaseClause) => {
    addClause(clause);
  };

  const handlePreviewClause = (clause: LeaseClause) => {
    setPreviewClause(clause);
  };

  const handleFixIssue = (issueId: string) => {
    // Issue fixing logic would go here
    // Implementation for auto-fixing compliance issues
  };

  const handleViewRule = (ruleId: string) => {
    // Rule viewing logic would go here
    // Open rule documentation
  };

  return (
    <div className="space-y-6">
      {/* Current Clauses */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Selected Clauses</h3>
            <Badge variant="outline">
              {formData.clauses?.length || 0} clauses
            </Badge>
          </div>

          {errors.clauses && (
            <p className="text-sm text-red-500 mb-4">{errors.clauses}</p>
          )}

          {formData.clauses && formData.clauses.length > 0 ? (
            <ScrollArea className="h-[200px]">
              <div className="space-y-2">
                {formData.clauses.map((clause) => (
                  <div
                    key={clause.id}
                    className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-medium">{clause.title}</p>
                        {clause.isMandatory && (
                          <Badge variant="destructive" className="text-xs">
                            Required
                          </Badge>
                        )}
                        {clause.isStateSpecific && (
                          <Badge variant="outline" className="text-xs">
                            State Law
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-gray-600 line-clamp-1">
                        {clause.content}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handlePreviewClause(clause)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeClause(clause.id)}
                      >
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <p>No clauses added yet</p>
              <p className="text-sm mt-1">
                Use AI suggestions below to add clauses
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* AI Suggestions and Compliance */}
      <Tabs value={selectedTab} onValueChange={setSelectedTab}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="suggestions">
            <Sparkles className="h-4 w-4 mr-2" />
            AI Suggestions
          </TabsTrigger>
          <TabsTrigger value="compliance">
            <Shield className="h-4 w-4 mr-2" />
            Compliance Check
          </TabsTrigger>
        </TabsList>

        <TabsContent value="suggestions" className="mt-6">
          <AIClauseSuggestionEngine
            propertyId={formData.propertyId || ''}
            propertyType={formData.type || 'residential-long-term'}
            propertyState={formData.state || 'CA'}
            leaseType={formData.type || 'residential-long-term'}
            existingClauses={formData.clauses || []}
            onAddClause={handleAddClause}
            onPreviewClause={handlePreviewClause}
          />
        </TabsContent>

        <TabsContent value="compliance" className="mt-6">
          <ComplianceChecker
            lease={{
              id: 'temp',
              propertyId: formData.propertyId || '',
              landlordId: formData.landlordId || '',
              tenantIds: formData.tenantIds || [],
              type: formData.type || 'residential-long-term',
              status: 'draft',
              startDate: formData.startDate || new Date(),
              endDate: formData.endDate || new Date(),
              monthlyRent: formData.monthlyRent || 0,
              securityDeposit: formData.securityDeposit || 0,
              clauses: formData.clauses || [],
              addendums: [],
              createdByRole: 'landlord',
              approvalStatus: 'not_required',
              approvalHistory: [],
              signatureStatus: 'pending',
              signatureProgress: {
                landlord: { signed: false, timestamp: null },
                tenant: { signed: false, timestamp: null },
                agent: { signed: false, timestamp: null }
              },
              signatureRequestId: null,
              documentLinks: {
                generatedPDF: null,
                signedPDF: null,
                attachments: []
              },
              complianceScore: 0,
              complianceIssues: [],
              stateSpecificRules: [],
              collaborationSessionId: undefined,
              versionHistory: [],
              currentVersion: 1,
              comments: [],
              signingWorkflow: {
                id: 'temp',
                leaseId: 'temp',
                workflowType: 'sequential',
                steps: [],
                currentStep: 0,
                status: 'pending',
                createdAt: new Date()
              },
              signatures: [],
              createdAt: new Date(),
              updatedAt: new Date(),
              createdBy: formData.landlordId || '',
              lastModifiedBy: formData.landlordId || ''
            }}
            onFixIssue={handleFixIssue}
            onViewRule={handleViewRule}
          />
        </TabsContent>
      </Tabs>

      {/* Preview Modal */}
      {previewClause && (
        <Card className="border-2 border-blue-200">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Clause Preview</h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setPreviewClause(null)}
              >
                Close
              </Button>
            </div>
            <div className="space-y-4">
              <div>
                <p className="font-medium text-gray-900">{previewClause.title}</p>
                <div className="flex items-center gap-2 mt-1">
                  {previewClause.isMandatory && (
                    <Badge variant="destructive" className="text-xs">
                      Required
                    </Badge>
                  )}
                  {previewClause.isStateSpecific && (
                    <Badge variant="outline" className="text-xs">
                      State Law
                    </Badge>
                  )}
                  <Badge variant="secondary" className="text-xs">
                    {previewClause.category}
                  </Badge>
                </div>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-sm text-gray-700 whitespace-pre-wrap">
                  {previewClause.content}
                </p>
              </div>
              {previewClause.suggestedByAI && (
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Sparkles className="h-4 w-4 text-purple-600" />
                  <span>AI Confidence: {((previewClause.aiConfidence || 0) * 100).toFixed(0)}%</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}