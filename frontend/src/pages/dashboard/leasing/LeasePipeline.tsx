import React, { useMemo, useState, lazy, Suspense, useCallback } from 'react';
import {
  DndContext,
  DragOverlay,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragEndEvent,
  defaultDropAnimationSideEffects,
  DropAnimation,
} from '@dnd-kit/core';
import { arrayMove, sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import { KanbanColumn } from '@/components/lease/kanban/KanbanColumn';
import { KanbanCard } from '@/components/lease/kanban/KanbanCard';
import { useLeases, useUpdateLease, useCreateLease } from '@/hooks/useLeases';
import { LeaseAgreement, LeaseStatus, LeaseTemplate, LeaseClause, LeaseFormData } from '@/types/lease';
import { Button } from '@/components/ui/button';
import { 
  Plus, 
  Loader2, 
  RefreshCw, 
  FileText, 
  Sparkles, 
  Shield, 
  MoreHorizontal 
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ErrorBoundary } from '@/components/ui/error-boundary';

// Lazy load heavy components
const AIClauseSuggestionEngine = lazy(() => import('@/components/lease/AIClauseSuggestionEngine'));
const ComplianceChecker = lazy(() => import('@/components/lease/ComplianceChecker'));
const LeaseTemplateMarketplace = lazy(() => import('@/components/lease/LeaseTemplateMarketplace'));
const LeaseAgreementGenerator = lazy(() => import('@/components/lease/LeaseAgreementGenerator'));

const COLUMNS: { id: LeaseStatus; title: string; color: string }[] = [
  { id: 'draft', title: 'Draft', color: 'bg-slate-100 dark:bg-slate-800' },
  { id: 'pending_approval', title: 'Pending Approval', color: 'bg-orange-100 dark:bg-orange-900/30' },
  { id: 'pending_signature', title: 'Out for Signature', color: 'bg-blue-100 dark:bg-blue-900/30' },
  { id: 'active', title: 'Active', color: 'bg-green-100 dark:bg-green-900/30' },
];

// Mock templates for now (replace with API call later)
const MOCK_TEMPLATES: LeaseTemplate[] = [
  {
    id: 'template_1',
    name: 'Standard Residential Lease',
    description: 'Comprehensive lease for long-term residential rentals.',
    type: 'residential-long-term',
    state: 'CA',
    clauses: [],
    isPublic: true,
    createdBy: 'system',
    createdAt: new Date(),
    updatedAt: new Date(),
    defaultTerms: {
      leaseDuration: 12,
      rentPaymentDay: 1
    },
    isVerified: true,
    applicableStates: ['CA'],
    createdByName: 'System',
    usageCount: 100,
    rating: 4.5,
    reviews: [],
    complianceVerified: true,
    lastComplianceCheck: new Date(),
    category: 'residential-long-term'
  },
  {
    id: 'template_2',
    name: 'Commercial Retail Lease',
    description: 'Standard lease for retail store locations.',
    type: 'commercial',
    state: 'NY',
    clauses: [],
    isPublic: true,
    createdBy: 'system',
    createdAt: new Date(),
    updatedAt: new Date(),
    defaultTerms: {
      leaseDuration: 36,
      rentPaymentDay: 1
    },
    isVerified: true,
    applicableStates: ['NY'],
    createdByName: 'System',
    usageCount: 50,
    rating: 4.2,
    reviews: [],
    complianceVerified: true,
    lastComplianceCheck: new Date(),
    category: 'commercial'
  },
  {
    id: 'template_3',
    name: 'Short-Term Rental Agreement',
    description: 'Flexible lease for short-term residential rentals.',
    type: 'residential-short-term',
    state: 'CA',
    clauses: [],
    isPublic: true,
    createdBy: 'system',
    createdAt: new Date(),
    updatedAt: new Date(),
    defaultTerms: {
      leaseDuration: 6,
      rentPaymentDay: 1
    },
    isVerified: true,
    applicableStates: ['CA', 'NY', 'TX'],
    createdByName: 'System',
    usageCount: 75,
    rating: 4.7,
    reviews: [],
    complianceVerified: true,
    lastComplianceCheck: new Date(),
    category: 'residential-short-term'
  },
  {
    id: 'template_4',
    name: 'Student Housing Lease',
    description: 'Specialized lease for student accommodations.',
    type: 'student-housing',
    state: 'MA',
    clauses: [],
    isPublic: true,
    createdBy: 'system',
    createdAt: new Date(),
    updatedAt: new Date(),
    defaultTerms: {
      leaseDuration: 9,
      rentPaymentDay: 1
    },
    isVerified: true,
    applicableStates: ['MA', 'CA', 'NY'],
    createdByName: 'System',
    usageCount: 60,
    rating: 4.4,
    reviews: [],
    complianceVerified: true,
    lastComplianceCheck: new Date(),
    category: 'student-housing'
  }
];

export const LeasePipeline = () => {
  const { data: leases = [], isLoading, isError, refetch } = useLeases();
  const updateLeaseMutation = useUpdateLease();
  const createLeaseMutation = useCreateLease();
  const { toast } = useToast();
  
  const [activeId, setActiveId] = useState<string | null>(null);
  
  // Modal State
  const [showLeaseGenerator, setShowLeaseGenerator] = useState(false);
  const [showAISuggestions, setShowAISuggestions] = useState(false);
  const [showComplianceChecker, setShowComplianceChecker] = useState(false);
  const [showTemplateMarketplace, setShowTemplateMarketplace] = useState(false);
  
  const [selectedLeaseForEdit, setSelectedLeaseForEdit] = useState<LeaseAgreement | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<LeaseTemplate | undefined>(undefined);

  // Sensors for drag and drop
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Group leases by status
  const columns = useMemo(() => {
    const grouped: Record<string, LeaseAgreement[]> = {
      draft: [],
      pending_approval: [],
      pending_signature: [],
      active: [],
    };

    COLUMNS.forEach(col => {
      grouped[col.id] = [];
    });

    leases.forEach(lease => {
      let statusKey = lease.status;
      if (statusKey === 'partially-signed') statusKey = 'pending_signature';
      if (statusKey === 'fully-executed') statusKey = 'active';
      if (statusKey === 'renewed') statusKey = 'active';
      if (statusKey === 'changes_requested') statusKey = 'pending_approval';
      
      if (grouped[statusKey]) {
        grouped[statusKey].push(lease);
      }
    });

    return grouped;
  }, [leases]);

  const activeLease = useMemo(() => {
    return leases.find(l => l.id === activeId);
  }, [leases, activeId]);

  // Handlers
  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    const activeLeaseId = active.id as string;
    
    setActiveId(null);

    if (!over) return;

    const activeLease = leases.find(l => l.id === activeLeaseId);
    if (!activeLease) return;

    let targetContainerId = over.id as string;
    
    // Logic to find target column if dropped on an item
    const overLease = leases.find(l => l.id === targetContainerId);
    if (overLease) {
      let targetStatus = overLease.status;
      if (targetStatus === 'partially-signed') targetStatus = 'pending_signature';
      if (targetStatus === 'fully-executed') targetStatus = 'active';
      if (targetStatus === 'renewed') targetStatus = 'active';
      if (targetStatus === 'changes_requested') targetStatus = 'pending_approval';
      targetContainerId = targetStatus;
    }

    const validColumns = COLUMNS.map(c => c.id);
    if (!validColumns.includes(targetContainerId as LeaseStatus)) {
      if (!validColumns.includes(over.id as LeaseStatus)) {
        return;
      }
      targetContainerId = over.id as string;
    }

    let currentStatus = activeLease.status;
    if (currentStatus === 'partially-signed') currentStatus = 'pending_signature';
    if (currentStatus === 'fully-executed') currentStatus = 'active';
    if (currentStatus === 'renewed') currentStatus = 'active';
    if (currentStatus === 'changes_requested') currentStatus = 'pending_approval';

    if (currentStatus !== targetContainerId) {
      updateLeaseMutation.mutate({
        id: activeLeaseId,
        updates: { status: targetContainerId as LeaseStatus },
        userId: 'current-user-id', 
      }, {
        onSuccess: () => {
          toast({
            title: "Lease Updated",
            description: `Lease moved to ${COLUMNS.find(c => c.id === targetContainerId)?.title}`,
          });
        },
        onError: () => {
          toast({
            title: "Update Failed",
            description: "Could not update lease status.",
            variant: "destructive",
          });
        }
      });
    }
  };

  const handleCreateNewLease = () => {
    setSelectedTemplate(undefined);
    setSelectedLeaseForEdit(null);
    setShowLeaseGenerator(true);
  };

  // Refactored to prevent race conditions and unmounting issues
  const handleUseTemplate = useCallback((templateId: string) => {
    // 1. Find the template first
    const template = MOCK_TEMPLATES.find(t => t.id === templateId);
    
    if (!template) {
      toast({
        title: "Error",
        description: "Template not found",
        variant: "destructive"
      });
      return;
    }

    // 2. Set the selected template state
    setSelectedTemplate(template);
    
    // 3. Close the marketplace dialog
    // Using a small timeout ensures the state update for closing the dialog happens cleanly
    // before opening the new one, preventing potential conflicts
    setShowTemplateMarketplace(false);
    
    // 4. Open the generator dialog after a brief delay to allow the UI to settle
    setTimeout(() => {
      setShowLeaseGenerator(true);
    }, 100);
  }, [toast]);

  const handleSaveLease = async (leaseData: Partial<LeaseAgreement>) => {
    try {
      if (selectedLeaseForEdit) {
        updateLeaseMutation.mutate({
          id: selectedLeaseForEdit.id,
          updates: leaseData,
          userId: 'current-user-id'
        }, {
          onSuccess: () => {
            toast({ title: 'Lease Updated', description: 'Lease agreement has been updated successfully' });
            setShowLeaseGenerator(false);
            setSelectedTemplate(undefined);
          }
        });
      } else {
        createLeaseMutation.mutate({
          data: leaseData as unknown as LeaseFormData, 
          userId: 'current-user-id'
        }, {
          onSuccess: () => {
            toast({ title: 'Lease Created', description: 'New lease agreement has been created successfully' });
            setShowLeaseGenerator(false);
            setSelectedTemplate(undefined);
          }
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to save lease agreement',
        variant: 'destructive'
      });
    }
  };

  const handleEditLease = (lease: LeaseAgreement) => {
    setSelectedLeaseForEdit(lease);
    setSelectedTemplate(undefined);
    setShowLeaseGenerator(true);
  };

  const handleAIAssist = (lease: LeaseAgreement) => {
    setSelectedLeaseForEdit(lease);
    setShowAISuggestions(true);
  };

  const handleCheckCompliance = (lease: LeaseAgreement) => {
    setSelectedLeaseForEdit(lease);
    setShowComplianceChecker(true);
  };

  const handleAddClause = (clause: LeaseClause) => {
    if (selectedLeaseForEdit) {
      const updatedClauses = [...selectedLeaseForEdit.clauses, clause];
      updateLeaseMutation.mutate({
        id: selectedLeaseForEdit.id,
        updates: { clauses: updatedClauses },
        userId: 'current-user-id'
      }, {
        onSuccess: () => {
          toast({ title: 'Clause Added', description: `"${clause.title}" has been added to the lease` });
        }
      });
    }
  };

  const handleFixComplianceIssue = async (issueId: string) => {
     toast({ title: 'Issue Fixed', description: 'Compliance issue has been resolved (simulated).' });
  };

  const dropAnimation: DropAnimation = {
    sideEffects: defaultDropAnimationSideEffects({
      styles: {
        active: { opacity: '0.5' },
      },
    }),
  };

  if (isLoading) {
    return (
      <div className="flex h-[calc(100vh-200px)] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex h-[calc(100vh-200px)] flex-col items-center justify-center gap-4">
        <p className="text-destructive">Failed to load lease pipeline.</p>
        <Button onClick={() => refetch()} variant="outline">
          <RefreshCw className="mr-2 h-4 w-4" /> Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between shrink-0">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Lease Pipeline</h2>
          <p className="text-muted-foreground">
            Manage lease applications and agreements across stages.
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Button onClick={() => refetch()} variant="ghost" size="icon">
            <RefreshCw className="h-4 w-4" />
          </Button>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" /> New Lease
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={handleCreateNewLease}>
                <FileText className="mr-2 h-4 w-4" /> Start from Scratch
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setShowTemplateMarketplace(true)}>
                <Sparkles className="mr-2 h-4 w-4" /> Browse Templates
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="flex h-full gap-4 overflow-x-auto pb-4 min-h-0">
          {COLUMNS.map((col) => (
            <KanbanColumn
              key={col.id}
              id={col.id}
              title={col.title}
              leases={columns[col.id] || []}
              color={col.color}
              onEdit={handleEditLease}
              onAIAssist={handleAIAssist}
              onCheckCompliance={handleCheckCompliance}
            />
          ))}
        </div>

        <DragOverlay dropAnimation={dropAnimation}>
          {activeLease ? <KanbanCard lease={activeLease} /> : null}
        </DragOverlay>
      </DndContext>

      {/* Lease Generator Dialog */}
      <Dialog open={showLeaseGenerator} onOpenChange={setShowLeaseGenerator}>
        <DialogContent className="max-w-[95vw] max-h-[95vh] overflow-hidden flex flex-col">
          <DialogHeader className="shrink-0">
            <DialogTitle>
              {selectedLeaseForEdit ? 'Edit Lease Agreement' : 'Create New Lease Agreement'}
            </DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-hidden relative">
            <ErrorBoundary>
              <Suspense fallback={
                <div className="flex justify-center items-center p-12 h-full">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              }>
                <ScrollArea className="h-full pr-4">
                  <LeaseAgreementGenerator
                    template={selectedTemplate}
                    existingLease={selectedLeaseForEdit || undefined}
                    onSave={handleSaveLease}
                    onCancel={() => {
                      setShowLeaseGenerator(false);
                      setSelectedTemplate(undefined);
                    }}
                  />
                </ScrollArea>
              </Suspense>
            </ErrorBoundary>
          </div>
        </DialogContent>
      </Dialog>

      {/* Template Marketplace Dialog */}
      <Dialog open={showTemplateMarketplace} onOpenChange={setShowTemplateMarketplace}>
        <DialogContent className="max-w-[98vw] w-[98vw] max-h-[98vh] h-[98vh] overflow-hidden flex flex-col p-0">
          <DialogHeader className="px-6 pt-6 pb-4 shrink-0 border-b">
            <DialogTitle className="text-2xl">Lease Template Marketplace</DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-hidden relative">
            <ErrorBoundary>
              <Suspense fallback={
                <div className="flex justify-center items-center h-full">
                  <div className="text-center space-y-4">
                    <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto" />
                    <p className="text-muted-foreground">Loading templates...</p>
                  </div>
                </div>
              }>
                <ScrollArea className="h-full px-6 pb-6">
                  <LeaseTemplateMarketplace
                    templates={MOCK_TEMPLATES}
                    onUseTemplate={handleUseTemplate}
                    onPreviewTemplate={(template) => {
                      toast({
                        title: 'Template Preview',
                        description: `Viewing: ${template.name}`
                      });
                    }}
                  />
                </ScrollArea>
              </Suspense>
            </ErrorBoundary>
          </div>
        </DialogContent>
      </Dialog>

      {/* AI Suggestions Dialog */}
      <Dialog open={showAISuggestions} onOpenChange={setShowAISuggestions}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader className="shrink-0">
            <DialogTitle>AI Clause Suggestions</DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-hidden relative">
            <ErrorBoundary>
              <Suspense fallback={
                <div className="flex justify-center items-center p-12 h-full">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              }>
                <ScrollArea className="h-full pr-4">
                  {selectedLeaseForEdit && (
                    <AIClauseSuggestionEngine
                      propertyId={selectedLeaseForEdit.propertyId}
                      propertyType="residential"
                      propertyState="CA"
                      leaseType={selectedLeaseForEdit.type}
                      existingClauses={selectedLeaseForEdit.clauses}
                      onAddClause={handleAddClause}
                      onPreviewClause={(c) => toast({ title: c.title, description: c.content.substring(0, 100) })}
                    />
                  )}
                </ScrollArea>
              </Suspense>
            </ErrorBoundary>
          </div>
        </DialogContent>
      </Dialog>

      {/* Compliance Checker Dialog */}
      <Dialog open={showComplianceChecker} onOpenChange={setShowComplianceChecker}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader className="shrink-0">
            <DialogTitle>Compliance Checker</DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-hidden relative">
            <ErrorBoundary>
              <Suspense fallback={
                <div className="flex justify-center items-center p-12 h-full">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              }>
                <ScrollArea className="h-full pr-4">
                  {selectedLeaseForEdit && (
                    <ComplianceChecker
                      lease={selectedLeaseForEdit}
                      onFixIssue={handleFixComplianceIssue}
                      onViewRule={() => {}}
                    />
                  )}
                </ScrollArea>
              </Suspense>
            </ErrorBoundary>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default LeasePipeline;