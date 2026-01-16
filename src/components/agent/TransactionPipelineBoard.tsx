import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { 
  TrendingUp, 
  DollarSign, 
  Calendar, 
  AlertTriangle,
  Clock,
  MoreVertical,
  Eye
} from 'lucide-react';
import { useTransactionPipeline } from '@/hooks/useTransactionPipeline';
import TransactionDetailModal from './TransactionDetailModal';
import StageChangeConfirmDialog from './StageChangeConfirmDialog';
import type { Transaction, PipelineStage } from '@/types/transaction';
import { format } from 'date-fns';

const PIPELINE_STAGES = [
  { id: 'lead' as PipelineStage, label: 'Lead', color: 'bg-gray-100 border-gray-300' },
  { id: 'showing' as PipelineStage, label: 'Showing', color: 'bg-blue-100 border-blue-300' },
  { id: 'offer' as PipelineStage, label: 'Offer', color: 'bg-yellow-100 border-yellow-300' },
  { id: 'under_contract' as PipelineStage, label: 'Under Contract', color: 'bg-orange-100 border-orange-300' },
  { id: 'closing' as PipelineStage, label: 'Closing', color: 'bg-purple-100 border-purple-300' },
  { id: 'closed' as PipelineStage, label: 'Closed', color: 'bg-green-100 border-green-300' }
];

export default function TransactionPipelineBoard() {
  const {
    transactions,
    summary,
    stalledDeals,
    closingSoon,
    loading,
    error,
    updateTransactionStage
  } = useTransactionPipeline();

  const [isDragging, setIsDragging] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [stageChangeDialog, setStageChangeDialog] = useState<{
    open: boolean;
    transaction: Transaction | null;
    newStage: PipelineStage | null;
  }>({
    open: false,
    transaction: null,
    newStage: null
  });

  const handleDragStart = () => {
    setIsDragging(true);
  };

  const handleDragEnd = async (result: DropResult) => {
    setIsDragging(false);

    const { destination, source, draggableId } = result;

    // Dropped outside a droppable area
    if (!destination) return;

    // Dropped in the same position
    if (
      destination.droppableId === source.droppableId &&
      destination.index === source.index
    ) {
      return;
    }

    // Find the transaction being moved
    const transaction = transactions[source.droppableId as PipelineStage]?.find(
      t => t.id === draggableId
    );

    if (!transaction) return;

    // Open confirmation dialog
    setStageChangeDialog({
      open: true,
      transaction,
      newStage: destination.droppableId as PipelineStage
    });
  };

  const handleStageChangeConfirm = async (data: {
    estimated_close_date?: string;
    stalled_reason?: string;
    notes?: string;
  }) => {
    if (!stageChangeDialog.transaction || !stageChangeDialog.newStage) return;

    try {
      await updateTransactionStage(stageChangeDialog.transaction.id, {
        new_stage: stageChangeDialog.newStage,
        estimated_close_date: data.estimated_close_date,
        stalled_reason: data.stalled_reason
      });
    } catch (err) {
      console.error('Failed to update transaction stage:', err);
      throw err;
    }
  };

  const handleViewDetails = (transaction: Transaction) => {
    setSelectedTransaction(transaction);
    setDetailModalOpen(true);
  };

  const getDaysInStage = (enteredAt: string): number => {
    const entered = new Date(enteredAt);
    const now = new Date();
    return Math.floor((now.getTime() - entered.getTime()) / (1000 * 60 * 60 * 24));
  };

  const isStalled = (transaction: Transaction): boolean => {
    const daysInStage = getDaysInStage(transaction.stage_entered_at);
    const thresholds: Record<PipelineStage, number> = {
      lead: 14,
      showing: 10,
      offer: 7,
      under_contract: 30,
      closing: 7,
      closed: 999,
      lost: 999
    };
    return daysInStage > thresholds[transaction.pipeline_stage];
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="animate-pulse space-y-3">
                  <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                  <div className="h-8 bg-gray-200 rounded w-1/2"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center text-red-600">
            <AlertTriangle className="h-12 w-12 mx-auto mb-2" />
            <p>Failed to load pipeline data</p>
            <p className="text-sm">{error}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <div className="space-y-6">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total Pipeline</p>
                  <p className="text-2xl font-bold">
                    ${(summary?.total_pipeline_value || 0).toLocaleString()}
                  </p>
                </div>
                <TrendingUp className="h-8 w-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Est. Commission</p>
                  <p className="text-2xl font-bold">
                    ${(summary?.total_pipeline_commission || 0).toLocaleString()}
                  </p>
                </div>
                <DollarSign className="h-8 w-8 text-green-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Closing Soon</p>
                  <p className="text-2xl font-bold">{closingSoon.length}</p>
                </div>
                <Calendar className="h-8 w-8 text-purple-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Stalled Deals</p>
                  <p className="text-2xl font-bold text-red-600">
                    {stalledDeals.length}
                  </p>
                </div>
                <AlertTriangle className="h-8 w-8 text-red-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Kanban Board */}
        <DragDropContext onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
          <div className="flex space-x-4 overflow-x-auto pb-4">
            {PIPELINE_STAGES.map((stage) => (
              <div key={stage.id} className="flex-shrink-0 w-80">
                <Card className={`${stage.color} border-2`}>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm font-semibold">
                        {stage.label}
                      </CardTitle>
                      <Badge variant="secondary" className="ml-2">
                        {transactions[stage.id]?.length || 0}
                      </Badge>
                    </div>
                    {summary?.by_stage[stage.id] && (
                      <p className="text-xs text-gray-600 mt-1">
                        ${(summary.by_stage[stage.id].total_value || 0).toLocaleString()}
                      </p>
                    )}
                  </CardHeader>

                  <Droppable droppableId={stage.id}>
                    {(provided, snapshot) => (
                      <CardContent
                        ref={provided.innerRef}
                        {...provided.droppableProps}
                        className={`space-y-2 min-h-[400px] transition-colors ${
                          snapshot.isDraggingOver ? 'bg-blue-50' : ''
                        }`}
                      >
                        {transactions[stage.id]?.map((transaction, index) => (
                          <Draggable
                            key={transaction.id}
                            draggableId={transaction.id}
                            index={index}
                          >
                            {(provided, snapshot) => (
                              <div
                                ref={provided.innerRef}
                                {...provided.draggableProps}
                                {...provided.dragHandleProps}
                                className={`bg-white rounded-lg p-3 border shadow-sm transition-shadow ${
                                  snapshot.isDragging ? 'shadow-lg ring-2 ring-blue-500' : ''
                                } ${
                                  isStalled(transaction)
                                    ? 'border-red-300 bg-red-50'
                                    : 'border-gray-200'
                                }`}
                              >
                                <div className="space-y-2">
                                  <div className="flex items-start justify-between">
                                    <h4 className="font-medium text-sm leading-tight">
                                      {transaction.property_address}
                                    </h4>
                                    {isStalled(transaction) && (
                                      <AlertTriangle className="h-4 w-4 text-red-500 flex-shrink-0 ml-1" />
                                    )}
                                  </div>

                                  <p className="text-xs text-gray-600">
                                    {transaction.client_name}
                                  </p>

                                  <div className="flex items-center justify-between text-xs">
                                    <span className="font-semibold">
                                      ${transaction.amount.toLocaleString()}
                                    </span>
                                    <Badge variant="outline" className="text-xs">
                                      {transaction.probability_percent}%
                                    </Badge>
                                  </div>

                                  <div className="flex items-center space-x-2 text-xs text-gray-500">
                                    <Clock className="h-3 w-3" />
                                    <span>
                                      {getDaysInStage(transaction.stage_entered_at)} days
                                    </span>
                                  </div>

                                  {transaction.estimated_close_date && (
                                    <div className="flex items-center space-x-2 text-xs text-gray-500">
                                      <Calendar className="h-3 w-3" />
                                      <span>
                                        Close: {format(new Date(transaction.estimated_close_date), 'MMM d')}
                                      </span>
                                    </div>
                                  )}

                                  {transaction.stalled_reason && (
                                    <div className="bg-red-100 rounded p-2 text-xs text-red-700">
                                      {transaction.stalled_reason}
                                    </div>
                                  )}

                                  <div className="flex items-center space-x-1 pt-1">
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      className="h-7 text-xs flex-1"
                                      onClick={() => handleViewDetails(transaction)}
                                    >
                                      <Eye className="h-3 w-3 mr-1" />
                                      View
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      className="h-7 w-7 p-0"
                                    >
                                      <MoreVertical className="h-3 w-3" />
                                    </Button>
                                  </div>
                                </div>
                              </div>
                            )}
                          </Draggable>
                        ))}
                        {provided.placeholder}

                        {transactions[stage.id]?.length === 0 && (
                          <div className="text-center py-8 text-gray-400">
                            <p className="text-sm">No transactions</p>
                          </div>
                        )}
                      </CardContent>
                    )}
                  </Droppable>
                </Card>
              </div>
            ))}
          </div>
        </DragDropContext>

        {/* Stalled Deals Alert */}
        {stalledDeals.length > 0 && (
          <Card className="border-red-200 bg-red-50">
            <CardHeader>
              <CardTitle className="text-red-900 flex items-center">
                <AlertTriangle className="h-5 w-5 mr-2" />
                Stalled Deals Requiring Attention
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {stalledDeals.slice(0, 3).map((deal) => (
                  <div
                    key={deal.transaction_id}
                    className="bg-white rounded p-3 flex items-center justify-between"
                  >
                    <div>
                      <p className="font-medium text-sm">{deal.property_address}</p>
                      <p className="text-xs text-gray-600">
                        {deal.client_name} • {deal.pipeline_stage}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-red-600">
                        {deal.days_in_stage} days
                      </p>
                      <Button size="sm" variant="outline" className="mt-1">
                        Take Action
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Closing Soon */}
        {closingSoon.length > 0 && (
          <Card className="border-purple-200 bg-purple-50">
            <CardHeader>
              <CardTitle className="text-purple-900 flex items-center">
                <Calendar className="h-5 w-5 mr-2" />
                Closing Soon (Next 14 Days)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {closingSoon.map((deal) => (
                  <div
                    key={deal.transaction_id}
                    className="bg-white rounded p-3 flex items-center justify-between"
                  >
                    <div>
                      <p className="font-medium text-sm">{deal.property_address}</p>
                      <p className="text-xs text-gray-600">{deal.client_name}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-purple-600">
                        {deal.days_until_close} days
                      </p>
                      <p className="text-xs text-gray-600">
                        ${deal.amount.toLocaleString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Transaction Detail Modal */}
      <TransactionDetailModal
        transaction={selectedTransaction}
        open={detailModalOpen}
        onOpenChange={setDetailModalOpen}
      />

      {/* Stage Change Confirmation Dialog */}
      <StageChangeConfirmDialog
        open={stageChangeDialog.open}
        onOpenChange={(open) => setStageChangeDialog({ ...stageChangeDialog, open })}
        currentStage={stageChangeDialog.transaction?.pipeline_stage || 'lead'}
        newStage={stageChangeDialog.newStage || 'lead'}
        propertyAddress={stageChangeDialog.transaction?.property_address || ''}
        onConfirm={handleStageChangeConfirm}
      />
    </>
  );
}