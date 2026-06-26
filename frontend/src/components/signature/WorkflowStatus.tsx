import { format } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { CheckCircle2, Clock, XCircle, AlertCircle } from 'lucide-react';
import type { SignatureWorkflow } from '@/types/signature';

interface WorkflowStatusProps {
  workflow: SignatureWorkflow;
}

export default function WorkflowStatus({ workflow }: WorkflowStatusProps) {
  const getStatusIcon = () => {
    switch (workflow.status) {
      case 'completed':
        return <CheckCircle2 className="h-6 w-6 text-green-600" />;
      case 'in_progress':
        return <Clock className="h-6 w-6 text-blue-600" />;
      case 'declined':
        return <XCircle className="h-6 w-6 text-red-600" />;
      case 'expired':
        return <AlertCircle className="h-6 w-6 text-orange-600" />;
      default:
        return <Clock className="h-6 w-6 text-gray-600" />;
    }
  };

  const getStatusText = () => {
    switch (workflow.status) {
      case 'completed':
        return 'All signatures completed';
      case 'in_progress':
        return 'Waiting for signatures';
      case 'declined':
        return 'Signature declined';
      case 'expired':
        return 'Workflow expired';
      default:
        return 'Pending';
    }
  };

  const getStatusColor = () => {
    switch (workflow.status) {
      case 'completed':
        return 'text-green-600';
      case 'in_progress':
        return 'text-blue-600';
      case 'declined':
        return 'text-red-600';
      case 'expired':
        return 'text-orange-600';
      default:
        return 'text-gray-600';
    }
  };

  const progress = workflow.total_signers > 0
    ? (workflow.signed_count / workflow.total_signers) * 100
    : 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {getStatusIcon()}
          <span>Signature Workflow</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <div className="flex justify-between items-center mb-2">
            <span className={`font-semibold ${getStatusColor()}`}>
              {getStatusText()}
            </span>
            <span className="text-sm text-gray-600">
              {workflow.signed_count} of {workflow.total_signers} signed
            </span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>

        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-600">Workflow Type:</span>
            <span className="font-medium capitalize">{workflow.workflow_type}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Initiated:</span>
            <span className="font-medium">
              {format(new Date(workflow.initiated_at), 'MMM dd, yyyy HH:mm')}
            </span>
          </div>
          {workflow.completed_at && (
            <div className="flex justify-between">
              <span className="text-gray-600">Completed:</span>
              <span className="font-medium">
                {format(new Date(workflow.completed_at), 'MMM dd, yyyy HH:mm')}
              </span>
            </div>
          )}
          {workflow.expires_at && (
            <div className="flex justify-between">
              <span className="text-gray-600">Expires:</span>
              <span className="font-medium">
                {format(new Date(workflow.expires_at), 'MMM dd, yyyy HH:mm')}
              </span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}