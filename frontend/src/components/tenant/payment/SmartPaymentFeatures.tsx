import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DollarSign,
  Users,
  TrendingUp,
  Calendar,
  Gift,
  Wallet,
  PieChart,
  AlertCircle,
  CheckCircle,
  Clock
} from 'lucide-react';
import {
  PaymentBudget,
  RoommatePayment,
  PaymentSplit,
  PartialPayment,
  PaymentInstallment,
  EarlyPayDiscount
} from '@/types/tenant-enhanced';
import { useToast } from '@/hooks/use-toast';

export default function SmartPaymentFeatures() {
  const { toast } = useToast();
  
  const [budget, setBudget] = useState<PaymentBudget>({
    tenant_id: 'tenant-1',
    monthly_rent: 2200,
    utilities_estimate: 150,
    other_expenses: 100,
    savings_goal: 500,
    current_savings: 350,
    budget_alerts: true
  });

  const [roommatePayment, setRoommatePayment] = useState<RoommatePayment>({
    payment_id: 'pay-1',
    total_amount: 2200,
    split_method: 'equal',
    status: 'partial',
    splits: [
      {
        tenant_id: 'tenant-1',
        tenant_name: 'You',
        amount: 1100,
        paid: true,
        paid_at: new Date()
      },
      {
        tenant_id: 'tenant-2',
        tenant_name: 'Roommate',
        amount: 1100,
        paid: false
      }
    ]
  });

  const [partialPayment, setPartialPayment] = useState<PartialPayment>({
    payment_id: 'pay-1',
    original_amount: 2200,
    paid_amount: 1100,
    remaining_amount: 1100,
    installments: [
      {
        id: 'inst-1',
        amount: 1100,
        due_date: new Date('2024-02-01'),
        status: 'completed',
        paid_at: new Date()
      },
      {
        id: 'inst-2',
        amount: 1100,
        due_date: new Date('2024-02-15'),
        status: 'pending'
      }
    ]
  });

  const [earlyPayDiscounts] = useState<EarlyPayDiscount[]>([
    {
      id: 'disc-1',
      discount_percentage: 2,
      days_before_due: 7,
      description: 'Pay 7 days early and save 2%',
      active: true
    },
    {
      id: 'disc-2',
      discount_percentage: 1,
      days_before_due: 3,
      description: 'Pay 3 days early and save 1%',
      active: true
    }
  ]);

  const savingsProgress = (budget.current_savings / budget.savings_goal) * 100;
  const totalMonthlyExpenses = budget.monthly_rent + budget.utilities_estimate + budget.other_expenses;

  const updateSplitMethod = (method: 'equal' | 'custom' | 'percentage') => {
    const totalAmount = roommatePayment.total_amount;
    const numTenants = roommatePayment.splits.length;

    let updatedSplits: PaymentSplit[];

    if (method === 'equal') {
      const equalAmount = totalAmount / numTenants;
      updatedSplits = roommatePayment.splits.map(split => ({
        ...split,
        amount: equalAmount,
        percentage: undefined
      }));
    } else {
      updatedSplits = roommatePayment.splits;
    }

    setRoommatePayment({
      ...roommatePayment,
      split_method: method,
      splits: updatedSplits
    });
  };

  const updateCustomSplit = (tenantId: string, amount: number) => {
    setRoommatePayment({
      ...roommatePayment,
      splits: roommatePayment.splits.map(split =>
        split.tenant_id === tenantId ? { ...split, amount } : split
      )
    });
  };

  const markSplitPaid = (tenantId: string) => {
    setRoommatePayment({
      ...roommatePayment,
      splits: roommatePayment.splits.map(split =>
        split.tenant_id === tenantId
          ? { ...split, paid: true, paid_at: new Date() }
          : split
      ),
      status: roommatePayment.splits.every(s => s.paid || s.tenant_id === tenantId)
        ? 'completed'
        : 'partial'
    });

    toast({
      title: 'Payment Recorded',
      description: `Payment from ${roommatePayment.splits.find(s => s.tenant_id === tenantId)?.tenant_name} has been recorded.`
    });
  };

  return (
    <div className="space-y-6">
      <Tabs defaultValue="budget" className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="budget">Budget</TabsTrigger>
          <TabsTrigger value="roommates">Split Payment</TabsTrigger>
          <TabsTrigger value="partial">Partial Payments</TabsTrigger>
          <TabsTrigger value="discounts">Early Pay</TabsTrigger>
          <TabsTrigger value="wallets">E-Wallets</TabsTrigger>
        </TabsList>

        {/* Budget Tab */}
        <TabsContent value="budget" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <PieChart className="h-5 w-5 mr-2" />
                Monthly Budget Overview
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Budget Summary */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                  <CardContent className="p-4">
                    <p className="text-sm text-gray-600 mb-1">Total Expenses</p>
                    <p className="text-2xl font-bold text-gray-900">
                      ${totalMonthlyExpenses.toLocaleString()}
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <p className="text-sm text-gray-600 mb-1">Savings Goal</p>
                    <p className="text-2xl font-bold text-green-600">
                      ${budget.savings_goal.toLocaleString()}
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <p className="text-sm text-gray-600 mb-1">Current Savings</p>
                    <p className="text-2xl font-bold text-blue-600">
                      ${budget.current_savings.toLocaleString()}
                    </p>
                  </CardContent>
                </Card>
              </div>

              {/* Savings Progress */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label>Savings Progress</Label>
                  <span className="text-sm font-semibold">{savingsProgress.toFixed(0)}%</span>
                </div>
                <Progress value={savingsProgress} className="h-3" />
                <p className="text-sm text-gray-600 mt-2">
                  ${(budget.savings_goal - budget.current_savings).toLocaleString()} to go
                </p>
              </div>

              {/* Expense Breakdown */}
              <div className="space-y-3">
                <h4 className="font-semibold">Monthly Expense Breakdown</h4>
                <div className="space-y-2">
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded">
                    <div className="flex items-center">
                      <DollarSign className="h-5 w-5 text-blue-600 mr-2" />
                      <span>Rent</span>
                    </div>
                    <span className="font-semibold">${budget.monthly_rent.toLocaleString()}</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded">
                    <div className="flex items-center">
                      <TrendingUp className="h-5 w-5 text-yellow-600 mr-2" />
                      <span>Utilities (Est.)</span>
                    </div>
                    <span className="font-semibold">${budget.utilities_estimate.toLocaleString()}</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded">
                    <div className="flex items-center">
                      <Wallet className="h-5 w-5 text-purple-600 mr-2" />
                      <span>Other Expenses</span>
                    </div>
                    <span className="font-semibold">${budget.other_expenses.toLocaleString()}</span>
                  </div>
                </div>
              </div>

              {/* Budget Alerts */}
              {budget.budget_alerts && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-start space-x-3">
                  <AlertCircle className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-blue-800">
                    <p className="font-medium mb-1">Budget Alerts Enabled</p>
                    <p>You'll receive notifications when you're close to exceeding your budget or savings goal.</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Roommate Split Tab */}
        <TabsContent value="roommates" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Users className="h-5 w-5 mr-2" />
                Split Rent with Roommates
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Split Method Selection */}
              <div>
                <Label>Split Method</Label>
                <Select
                  value={roommatePayment.split_method}
                  onValueChange={(value: 'equal' | 'custom' | 'percentage') => updateSplitMethod(value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="equal">Equal Split</SelectItem>
                    <SelectItem value="custom">Custom Amounts</SelectItem>
                    <SelectItem value="percentage">By Percentage</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Total Amount */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-sm text-gray-600 mb-1">Total Rent Amount</p>
                <p className="text-3xl font-bold">${roommatePayment.total_amount.toLocaleString()}</p>
              </div>

              {/* Split Details */}
              <div className="space-y-3">
                <h4 className="font-semibold">Payment Splits</h4>
                {roommatePayment.splits.map(split => (
                  <Card key={split.tenant_id}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <p className="font-semibold">{split.tenant_name}</p>
                          {roommatePayment.split_method === 'custom' ? (
                            <Input
                              type="number"
                              value={split.amount}
                              onChange={(e) => updateCustomSplit(split.tenant_id, parseFloat(e.target.value))}
                              className="w-32 mt-2"
                            />
                          ) : (
                            <p className="text-2xl font-bold text-blue-600 mt-1">
                              ${split.amount.toLocaleString()}
                            </p>
                          )}
                        </div>
                        <div className="text-right">
                          {split.paid ? (
                            <div className="flex items-center text-green-600">
                              <CheckCircle className="h-5 w-5 mr-2" />
                              <div>
                                <p className="font-semibold">Paid</p>
                                <p className="text-xs">
                                  {split.paid_at && new Date(split.paid_at).toLocaleDateString()}
                                </p>
                              </div>
                            </div>
                          ) : (
                            <div>
                              <Badge className="bg-yellow-100 text-yellow-800 mb-2">
                                <Clock className="h-3 w-3 mr-1" />
                                Pending
                              </Badge>
                              {split.tenant_id !== 'tenant-1' && (
                                <Button
                                  size="sm"
                                  onClick={() => markSplitPaid(split.tenant_id)}
                                >
                                  Mark as Paid
                                </Button>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* Payment Status */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold">Overall Payment Status</p>
                    <p className="text-sm text-gray-600">
                      {roommatePayment.splits.filter(s => s.paid).length} of {roommatePayment.splits.length} paid
                    </p>
                  </div>
                  <Badge
                    className={
                      roommatePayment.status === 'completed'
                        ? 'bg-green-100 text-green-800'
                        : roommatePayment.status === 'partial'
                        ? 'bg-yellow-100 text-yellow-800'
                        : 'bg-gray-100 text-gray-800'
                    }
                  >
                    {roommatePayment.status}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Partial Payments Tab */}
        <TabsContent value="partial" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Calendar className="h-5 w-5 mr-2" />
                Payment Installments
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Payment Summary */}
              <div className="grid grid-cols-3 gap-4">
                <Card>
                  <CardContent className="p-4">
                    <p className="text-sm text-gray-600 mb-1">Original Amount</p>
                    <p className="text-xl font-bold">${partialPayment.original_amount.toLocaleString()}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <p className="text-sm text-gray-600 mb-1">Paid</p>
                    <p className="text-xl font-bold text-green-600">${partialPayment.paid_amount.toLocaleString()}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <p className="text-sm text-gray-600 mb-1">Remaining</p>
                    <p className="text-xl font-bold text-orange-600">${partialPayment.remaining_amount.toLocaleString()}</p>
                  </CardContent>
                </Card>
              </div>

              {/* Installments */}
              <div className="space-y-3">
                <h4 className="font-semibold">Payment Schedule</h4>
                {partialPayment.installments.map((installment, index) => (
                  <Card key={installment.id}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-semibold">Installment {index + 1}</p>
                          <p className="text-sm text-gray-600">
                            Due: {new Date(installment.due_date).toLocaleDateString()}
                          </p>
                          <p className="text-xl font-bold mt-1">${installment.amount.toLocaleString()}</p>
                        </div>
                        <div className="text-right">
                          {installment.status === 'completed' ? (
                            <div className="flex items-center text-green-600">
                              <CheckCircle className="h-5 w-5 mr-2" />
                              <div>
                                <p className="font-semibold">Paid</p>
                                <p className="text-xs">
                                  {installment.paid_at && new Date(installment.paid_at).toLocaleDateString()}
                                </p>
                              </div>
                            </div>
                          ) : (
                            <div>
                              <Badge className="bg-yellow-100 text-yellow-800 mb-2">
                                <Clock className="h-3 w-3 mr-1" />
                                Pending
                              </Badge>
                              <Button size="sm">Pay Now</Button>
                            </div>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Early Pay Discounts Tab */}
        <TabsContent value="discounts" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Gift className="h-5 w-5 mr-2" />
                Early Payment Discounts
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-start space-x-3">
                <Gift className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-green-800">
                  <p className="font-medium mb-1">Save Money by Paying Early!</p>
                  <p>Take advantage of our early payment discounts and save on your rent.</p>
                </div>
              </div>

              {earlyPayDiscounts.map(discount => (
                <Card key={discount.id} className="border-2 border-green-200">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <p className="text-3xl font-bold text-green-600">
                          {discount.discount_percentage}% OFF
                        </p>
                        <p className="text-gray-600 mt-1">{discount.description}</p>
                      </div>
                      <Badge className="bg-green-100 text-green-800">
                        Active
                      </Badge>
                    </div>
                    <div className="bg-gray-50 rounded p-3">
                      <p className="text-sm text-gray-600 mb-1">Potential Savings</p>
                      <p className="text-2xl font-bold">
                        ${((budget.monthly_rent * discount.discount_percentage) / 100).toFixed(2)}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        {/* E-Wallets Tab */}
        <TabsContent value="wallets" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Wallet className="h-5 w-5 mr-2" />
                Digital Wallet Integration
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-gray-600">
                Connect your digital wallets for faster, more convenient payments.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card className="border-2 hover:border-blue-500 cursor-pointer transition-colors">
                  <CardContent className="p-6 text-center">
                    <div className="h-16 w-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
                      <Wallet className="h-8 w-8 text-blue-600" />
                    </div>
                    <h4 className="font-semibold mb-2">PayPal</h4>
                    <Button variant="outline" className="w-full">Connect</Button>
                  </CardContent>
                </Card>

                <Card className="border-2 hover:border-green-500 cursor-pointer transition-colors">
                  <CardContent className="p-6 text-center">
                    <div className="h-16 w-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                      <Wallet className="h-8 w-8 text-green-600" />
                    </div>
                    <h4 className="font-semibold mb-2">Venmo</h4>
                    <Button variant="outline" className="w-full">Connect</Button>
                  </CardContent>
                </Card>

                <Card className="border-2 hover:border-purple-500 cursor-pointer transition-colors">
                  <CardContent className="p-6 text-center">
                    <div className="h-16 w-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-3">
                      <Wallet className="h-8 w-8 text-purple-600" />
                    </div>
                    <h4 className="font-semibold mb-2">Apple Pay</h4>
                    <Button variant="outline" className="w-full">Connect</Button>
                  </CardContent>
                </Card>

                <Card className="border-2 hover:border-yellow-500 cursor-pointer transition-colors">
                  <CardContent className="p-6 text-center">
                    <div className="h-16 w-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-3">
                      <Wallet className="h-8 w-8 text-yellow-600" />
                    </div>
                    <h4 className="font-semibold mb-2">Google Pay</h4>
                    <Button variant="outline" className="w-full">Connect</Button>
                  </CardContent>
                </Card>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}