import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  CheckCircle,
  Clock,
  AlertCircle,
  RefreshCw,
  CreditCard,
  Building,
  Zap,
  Download,
  Mail
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface PaymentStatus {
  id: string;
  amount: number;
  status: 'initiated' | 'processing' | 'verifying' | 'completed' | 'failed';
  payment_method: string;
  started_at: Date;
  completed_at?: Date;
  estimated_completion: Date;
  transaction_id?: string;
  steps: PaymentStep[];
}

interface PaymentStep {
  id: string;
  name: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  started_at?: Date;
  completed_at?: Date;
  message?: string;
}

export default function RealTimePaymentStatus() {
  const { toast } = useToast();
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>({
    id: 'pay-12345',
    amount: 2200,
    status: 'processing',
    payment_method: 'Visa ****4242',
    started_at: new Date(Date.now() - 30000),
    estimated_completion: new Date(Date.now() + 30000),
    steps: [
      {
        id: 'step-1',
        name: 'Payment Initiated',
        status: 'completed',
        started_at: new Date(Date.now() - 30000),
        completed_at: new Date(Date.now() - 25000),
        message: 'Payment request received'
      },
      {
        id: 'step-2',
        name: 'Processing Payment',
        status: 'in_progress',
        started_at: new Date(Date.now() - 25000),
        message: 'Contacting payment processor...'
      },
      {
        id: 'step-3',
        name: 'Bank Verification',
        status: 'pending',
        message: 'Waiting for bank confirmation'
      },
      {
        id: 'step-4',
        name: 'Funds Transfer',
        status: 'pending',
        message: 'Transfer to landlord account'
      },
      {
        id: 'step-5',
        name: 'Receipt Generation',
        status: 'pending',
        message: 'Generating payment receipt'
      }
    ]
  });

  const [progress, setProgress] = useState(20);

  // Simulate real-time updates
  useEffect(() => {
    const interval = setInterval(() => {
      setPaymentStatus(prev => {
        const currentStepIndex = prev.steps.findIndex(s => s.status === 'in_progress');
        if (currentStepIndex === -1 || currentStepIndex >= prev.steps.length - 1) {
          clearInterval(interval);
          return prev;
        }

        const newSteps = [...prev.steps];
        newSteps[currentStepIndex] = {
          ...newSteps[currentStepIndex],
          status: 'completed',
          completed_at: new Date()
        };
        
        if (currentStepIndex < newSteps.length - 1) {
          newSteps[currentStepIndex + 1] = {
            ...newSteps[currentStepIndex + 1],
            status: 'in_progress',
            started_at: new Date()
          };
        }

        const completedSteps = newSteps.filter(s => s.status === 'completed').length;
        const newProgress = (completedSteps / newSteps.length) * 100;
        setProgress(newProgress);

        const newStatus = completedSteps === newSteps.length ? 'completed' : prev.status;

        if (newStatus === 'completed') {
          toast({
            title: 'Payment Successful!',
            description: `$${prev.amount.toLocaleString()} has been processed successfully.`
          });
        }

        return {
          ...prev,
          status: newStatus,
          steps: newSteps,
          completed_at: newStatus === 'completed' ? new Date() : undefined,
          transaction_id: newStatus === 'completed' ? `TXN-${Date.now()}` : undefined
        };
      });
    }, 5000);

    return () => clearInterval(interval);
  }, [toast]);

  const getStepIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-5 w-5 text-green-600" />;
      case 'in_progress':
        return <RefreshCw className="h-5 w-5 text-blue-600 animate-spin" />;
      case 'failed':
        return <AlertCircle className="h-5 w-5 text-red-600" />;
      default:
        return <Clock className="h-5 w-5 text-gray-400" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'processing':
      case 'verifying':
        return 'bg-blue-100 text-blue-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const downloadReceipt = () => {
    toast({
      title: 'Receipt Downloaded',
      description: 'Payment receipt has been saved to your downloads.'
    });
  };

  const emailReceipt = () => {
    toast({
      title: 'Receipt Sent',
      description: 'Payment receipt has been sent to your email.'
    });
  };

  return (
    <div className="space-y-6">
      {/* Payment Overview */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center">
              <CreditCard className="h-5 w-5 mr-2" />
              Payment Status
            </CardTitle>
            <Badge className={getStatusColor(paymentStatus.status)}>
              {paymentStatus.status.toUpperCase()}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Amount and Method */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
              <CardContent className="p-4">
                <p className="text-sm text-blue-700 mb-1">Payment Amount</p>
                <p className="text-3xl font-bold text-blue-900">
                  ${paymentStatus.amount.toLocaleString()}
                </p>
              </CardContent>
            </Card>

            <Card className="bg-gray-50">
              <CardContent className="p-4">
                <p className="text-sm text-gray-600 mb-1">Payment Method</p>
                <p className="text-lg font-semibold flex items-center">
                  <CreditCard className="h-4 w-4 mr-2" />
                  {paymentStatus.payment_method}
                </p>
              </CardContent>
            </Card>

            <Card className="bg-gray-50">
              <CardContent className="p-4">
                <p className="text-sm text-gray-600 mb-1">
                  {paymentStatus.status === 'completed' ? 'Completed At' : 'Est. Completion'}
                </p>
                <p className="text-lg font-semibold">
                  {paymentStatus.status === 'completed' && paymentStatus.completed_at
                    ? paymentStatus.completed_at.toLocaleTimeString()
                    : paymentStatus.estimated_completion.toLocaleTimeString()}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Progress Bar */}
          <div>
            <div className="flex justify-between mb-2">
              <span className="text-sm font-medium">Overall Progress</span>
              <span className="text-sm font-semibold">{progress.toFixed(0)}%</span>
            </div>
            <Progress value={progress} className="h-3" />
          </div>

          {/* Transaction ID */}
          {paymentStatus.transaction_id && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <p className="text-sm text-gray-600 mb-1">Transaction ID</p>
              <p className="font-mono font-semibold text-green-800">
                {paymentStatus.transaction_id}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Payment Steps */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Zap className="h-5 w-5 mr-2" />
            Real-Time Processing Steps
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {paymentStatus.steps.map((step, index) => (
              <div key={step.id} className="flex items-start space-x-4">
                {/* Step Icon */}
                <div className="flex-shrink-0 mt-1">
                  {getStepIcon(step.status)}
                </div>

                {/* Step Content */}
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <h4 className="font-semibold">{step.name}</h4>
                    <Badge
                      variant="outline"
                      className={
                        step.status === 'completed'
                          ? 'border-green-500 text-green-700'
                          : step.status === 'in_progress'
                          ? 'border-blue-500 text-blue-700'
                          : step.status === 'failed'
                          ? 'border-red-500 text-red-700'
                          : 'border-gray-300 text-gray-600'
                      }
                    >
                      {step.status.replace('_', ' ')}
                    </Badge>
                  </div>
                  <p className="text-sm text-gray-600">{step.message}</p>
                  {step.completed_at && (
                    <p className="text-xs text-gray-500 mt-1">
                      Completed at {step.completed_at.toLocaleTimeString()}
                    </p>
                  )}
                </div>

                {/* Connector Line */}
                {index < paymentStatus.steps.length - 1 && (
                  <div className="absolute left-[22px] mt-8 h-12 w-0.5 bg-gray-200" />
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      {paymentStatus.status === 'completed' && (
        <Card>
          <CardHeader>
            <CardTitle>Payment Complete</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-start space-x-3">
              <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-green-800">
                <p className="font-medium mb-1">Payment Successful!</p>
                <p>
                  Your payment of ${paymentStatus.amount.toLocaleString()} has been processed 
                  successfully. A receipt has been generated and sent to your email.
                </p>
              </div>
            </div>

            <div className="flex space-x-3">
              <Button onClick={downloadReceipt} className="flex-1">
                <Download className="h-4 w-4 mr-2" />
                Download Receipt
              </Button>
              <Button onClick={emailReceipt} variant="outline" className="flex-1">
                <Mail className="h-4 w-4 mr-2" />
                Email Receipt
              </Button>
            </div>

            <div className="grid grid-cols-2 gap-4 pt-4 border-t">
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <Building className="h-8 w-8 mx-auto mb-2 text-gray-600" />
                <p className="text-sm font-medium">Landlord Notified</p>
                <p className="text-xs text-gray-600">Payment confirmation sent</p>
              </div>
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <CheckCircle className="h-8 w-8 mx-auto mb-2 text-green-600" />
                <p className="text-sm font-medium">Account Updated</p>
                <p className="text-xs text-gray-600">Balance reflects payment</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Processing Info */}
      {paymentStatus.status === 'processing' && (
        <Card>
          <CardContent className="p-6">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-start space-x-3">
              <RefreshCw className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5 animate-spin" />
              <div className="text-sm text-blue-800">
                <p className="font-medium mb-1">Processing Your Payment</p>
                <p>
                  Please don't close this window. Your payment is being processed securely. 
                  This usually takes 30-60 seconds.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}