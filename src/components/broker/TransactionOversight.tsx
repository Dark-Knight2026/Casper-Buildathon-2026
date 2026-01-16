import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { FileText, Clock, CheckCircle, AlertCircle } from 'lucide-react';

export default function TransactionOversight() {
  const transactions = [
    {
      id: 1,
      property: '123 Oak Street, Norfolk',
      agent: 'Emily Rodriguez',
      buyer: 'John & Sarah Smith',
      price: 850000,
      status: 'closing',
      stage: 'Final walkthrough',
      closingDate: '2024-01-15',
      progress: 90
    },
    {
      id: 2,
      property: '456 Pine Avenue, Virginia Beach',
      agent: 'Michael Smith',
      buyer: 'Robert Johnson',
      price: 720000,
      status: 'escrow',
      stage: 'Inspection period',
      closingDate: '2024-01-22',
      progress: 65
    },
    {
      id: 3,
      property: '789 Maple Drive, Chesapeake',
      agent: 'Lisa Johnson',
      buyer: 'David & Maria Garcia',
      price: 650000,
      status: 'pending',
      stage: 'Loan approval',
      closingDate: '2024-02-01',
      progress: 45
    },
    {
      id: 4,
      property: '321 Elm Street, Portsmouth',
      agent: 'Emily Rodriguez',
      buyer: 'Jennifer Wilson',
      price: 485000,
      status: 'contingent',
      stage: 'Appraisal ordered',
      closingDate: '2024-02-10',
      progress: 30
    }
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'closing': return 'bg-green-100 text-green-800';
      case 'escrow': return 'bg-blue-100 text-blue-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'contingent': return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'closing': return CheckCircle;
      case 'escrow': return Clock;
      case 'pending': return AlertCircle;
      case 'contingent': return FileText;
      default: return FileText;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Transaction Oversight</h2>
        <Button variant="outline">
          <FileText className="h-4 w-4 mr-2" />
          Export Report
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Active Transactions</p>
                <p className="text-2xl font-bold text-blue-600">34</p>
              </div>
              <FileText className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Closing This Week</p>
                <p className="text-2xl font-bold text-green-600">8</p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Pending Volume</p>
                <p className="text-2xl font-bold text-purple-600">$18.5M</p>
              </div>
              <Clock className="h-8 w-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">At Risk</p>
                <p className="text-2xl font-bold text-red-600">2</p>
              </div>
              <AlertCircle className="h-8 w-8 text-red-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Active Transactions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {transactions.map((transaction) => {
              const StatusIcon = getStatusIcon(transaction.status);
              return (
                <div key={transaction.id} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center space-x-3">
                      <StatusIcon className="h-5 w-5 text-gray-600" />
                      <div>
                        <h4 className="font-medium">{transaction.property}</h4>
                        <p className="text-sm text-gray-600">
                          Agent: {transaction.agent} | Buyer: {transaction.buyer}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-medium text-lg">${transaction.price.toLocaleString()}</p>
                      <Badge className={getStatusColor(transaction.status)}>
                        {transaction.status}
                      </Badge>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Current Stage:</span>
                      <span className="font-medium">{transaction.stage}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Expected Closing:</span>
                      <span className="font-medium">{transaction.closingDate}</span>
                    </div>
                    <div className="mt-3">
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-gray-600">Progress</span>
                        <span className="font-medium">{transaction.progress}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-blue-600 h-2 rounded-full transition-all duration-300" 
                          style={{ width: `${transaction.progress}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}