import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Badge } from '../ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import {
  Receipt,
  Plus,
  Edit2,
  Trash2,
  Camera,
  DollarSign,
  Calendar,
  TrendingUp,
  Download,
  FileText,
  CheckCircle2,
  AlertCircle,
  Sparkles,
} from 'lucide-react';

interface Expense {
  id: string;
  date: string;
  category: string;
  description: string;
  amount: number;
  deductible: boolean;
  propertyAddress: string;
  paymentMethod: string;
  receiptAttached: boolean;
  aiCategorized: boolean;
  notes?: string;
}

const mockExpenses: Expense[] = [
  {
    id: 'exp-1',
    date: '2024-01-15',
    category: 'Mortgage Interest',
    description: 'Monthly mortgage payment - interest portion',
    amount: 1542.50,
    deductible: true,
    propertyAddress: '123 Main St, Los Angeles, CA',
    paymentMethod: 'Bank Transfer',
    receiptAttached: true,
    aiCategorized: true,
  },
  {
    id: 'exp-2',
    date: '2024-03-20',
    category: 'Closing Costs',
    description: 'Loan origination points',
    amount: 4250.00,
    deductible: true,
    propertyAddress: '123 Main St, Los Angeles, CA',
    paymentMethod: 'Wire Transfer',
    receiptAttached: true,
    aiCategorized: false,
  },
  {
    id: 'exp-3',
    date: '2024-04-01',
    category: 'Property Tax',
    description: 'Q1 Property Tax Payment',
    amount: 1600.00,
    deductible: true,
    propertyAddress: '123 Main St, Los Angeles, CA',
    paymentMethod: 'Check',
    receiptAttached: true,
    aiCategorized: true,
  },
  {
    id: 'exp-4',
    date: '2024-05-15',
    category: 'Home Improvement',
    description: 'Kitchen renovation - contractor payment',
    amount: 25000.00,
    deductible: false,
    propertyAddress: '123 Main St, Los Angeles, CA',
    paymentMethod: 'Credit Card',
    receiptAttached: true,
    aiCategorized: true,
    notes: 'Capital improvement - increases cost basis',
  },
  {
    id: 'exp-5',
    date: '2024-06-01',
    category: 'PMI',
    description: 'Private Mortgage Insurance - June',
    amount: 125.00,
    deductible: true,
    propertyAddress: '123 Main St, Los Angeles, CA',
    paymentMethod: 'Bank Transfer',
    receiptAttached: true,
    aiCategorized: true,
  },
  {
    id: 'exp-6',
    date: '2024-08-10',
    category: 'Home Office',
    description: 'Office furniture and equipment',
    amount: 3500.00,
    deductible: true,
    propertyAddress: '123 Main St, Los Angeles, CA',
    paymentMethod: 'Credit Card',
    receiptAttached: true,
    aiCategorized: true,
    notes: 'Home office deduction - 15% of home',
  },
];

export function TaxExpenseTracker() {
  const [expenses, setExpenses] = useState<Expense[]>(mockExpenses);
  const [showAddForm, setShowAddForm] = useState(false);
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [filterDeductible, setFilterDeductible] = useState<string>('all');
  const [filterYear, setFilterYear] = useState<string>('2024');

  const filteredExpenses = expenses.filter((exp) => {
    const expYear = new Date(exp.date).getFullYear().toString();
    if (filterYear !== 'all' && expYear !== filterYear) return false;
    if (filterCategory !== 'all' && exp.category !== filterCategory) return false;
    if (filterDeductible === 'deductible' && !exp.deductible) return false;
    if (filterDeductible === 'non-deductible' && exp.deductible) return false;
    return true;
  });

  const handleDeleteExpense = (expId: string) => {
    if (confirm('Are you sure you want to delete this expense?')) {
      setExpenses((prev) => prev.filter((exp) => exp.id !== expId));
    }
  };

  const totalExpenses = filteredExpenses.reduce((sum, exp) => sum + exp.amount, 0);
  const totalDeductible = filteredExpenses
    .filter((exp) => exp.deductible)
    .reduce((sum, exp) => sum + exp.amount, 0);
  const deductibleCount = filteredExpenses.filter((exp) => exp.deductible).length;
  const aiCategorizedCount = filteredExpenses.filter((exp) => exp.aiCategorized).length;

  const categories = Array.from(new Set(expenses.map((exp) => exp.category)));

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Receipt className="w-5 h-5" />
                Tax Expense Tracker
              </CardTitle>
              <CardDescription>
                Track and categorize all property-related expenses for tax purposes
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button variant="outline">
                <Camera className="w-4 h-4 mr-2" />
                Scan Receipt
              </Button>
              <Button
                onClick={() => setShowAddForm(!showAddForm)}
                className="bg-blue-600 hover:bg-blue-700"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Expense
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Stats */}
          <div className="grid md:grid-cols-4 gap-4 mb-6">
            <Card className="bg-blue-50 border-blue-200">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-blue-600 mb-1">Total Expenses</p>
                    <p className="text-2xl font-bold text-blue-900">
                      ${(totalExpenses / 1000).toFixed(1)}K
                    </p>
                  </div>
                  <DollarSign className="w-8 h-8 text-blue-600" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-green-50 border-green-200">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-green-600 mb-1">Deductible</p>
                    <p className="text-2xl font-bold text-green-900">
                      ${(totalDeductible / 1000).toFixed(1)}K
                    </p>
                  </div>
                  <CheckCircle2 className="w-8 h-8 text-green-600" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-purple-50 border-purple-200">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-purple-600 mb-1">Deductible Items</p>
                    <p className="text-2xl font-bold text-purple-900">{deductibleCount}</p>
                  </div>
                  <Receipt className="w-8 h-8 text-purple-600" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-orange-50 border-orange-200">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-orange-600 mb-1">AI Categorized</p>
                    <p className="text-2xl font-bold text-orange-900">{aiCategorizedCount}</p>
                  </div>
                  <Sparkles className="w-8 h-8 text-orange-600" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Add Expense Form */}
          {showAddForm && (
            <Card className="mb-6 border-2 border-blue-200 bg-blue-50">
              <CardHeader>
                <CardTitle className="text-lg">Add New Expense</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <Label>Date</Label>
                    <Input type="date" />
                  </div>
                  <div>
                    <Label>Category</Label>
                    <Select>
                      <SelectTrigger>
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="mortgage-interest">Mortgage Interest</SelectItem>
                        <SelectItem value="property-tax">Property Tax</SelectItem>
                        <SelectItem value="pmi">PMI</SelectItem>
                        <SelectItem value="closing-costs">Closing Costs</SelectItem>
                        <SelectItem value="home-improvement">Home Improvement</SelectItem>
                        <SelectItem value="home-office">Home Office</SelectItem>
                        <SelectItem value="repairs">Repairs & Maintenance</SelectItem>
                        <SelectItem value="insurance">Insurance</SelectItem>
                        <SelectItem value="hoa">HOA Fees</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <Label>Description</Label>
                  <Input placeholder="e.g., Monthly mortgage payment - interest portion" />
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <Label>Amount</Label>
                    <div className="relative">
                      <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <Input type="number" placeholder="0.00" className="pl-10" />
                    </div>
                  </div>
                  <div>
                    <Label>Payment Method</Label>
                    <Select>
                      <SelectTrigger>
                        <SelectValue placeholder="Select method" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="bank-transfer">Bank Transfer</SelectItem>
                        <SelectItem value="credit-card">Credit Card</SelectItem>
                        <SelectItem value="check">Check</SelectItem>
                        <SelectItem value="wire">Wire Transfer</SelectItem>
                        <SelectItem value="cash">Cash</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <Label>Property Address</Label>
                  <Input placeholder="e.g., 123 Main St, Los Angeles, CA" />
                </div>

                <div>
                  <Label>Notes (optional)</Label>
                  <Input placeholder="Additional details about this expense" />
                </div>

                <div className="flex items-center gap-2">
                  <input type="checkbox" id="deductible-new" className="w-4 h-4" />
                  <Label htmlFor="deductible-new" className="cursor-pointer">
                    This is a tax-deductible expense
                  </Label>
                </div>

                <div className="flex items-center gap-2">
                  <input type="checkbox" id="receipt-new" className="w-4 h-4" />
                  <Label htmlFor="receipt-new" className="cursor-pointer">
                    Receipt attached
                  </Label>
                </div>

                <div className="flex gap-2">
                  <Button className="bg-blue-600 hover:bg-blue-700">
                    <Plus className="w-4 h-4 mr-2" />
                    Add Expense
                  </Button>
                  <Button variant="outline" onClick={() => setShowAddForm(false)}>
                    Cancel
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* AI Receipt Scanner */}
          <Card className="mb-6 bg-gradient-to-r from-purple-50 to-pink-50 border-2 border-purple-200">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="bg-purple-600 p-3 rounded-lg">
                  <Sparkles className="w-6 h-6 text-white" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-lg mb-1">AI-Powered Receipt Scanner</h3>
                  <p className="text-sm text-gray-600">
                    Snap a photo of your receipt and let AI automatically extract the amount,
                    date, vendor, and category. Save time on manual data entry!
                  </p>
                </div>
                <Button className="bg-purple-600 hover:bg-purple-700">
                  <Camera className="w-4 h-4 mr-2" />
                  Scan Receipt
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Filters */}
          <div className="grid md:grid-cols-3 gap-4 mb-6">
            <Select value={filterYear} onValueChange={setFilterYear}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Years</SelectItem>
                <SelectItem value="2024">2024</SelectItem>
                <SelectItem value="2023">2023</SelectItem>
                <SelectItem value="2022">2022</SelectItem>
              </SelectContent>
            </Select>

            <Select value={filterCategory} onValueChange={setFilterCategory}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {categories.map((cat) => (
                  <SelectItem key={cat} value={cat}>
                    {cat}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={filterDeductible} onValueChange={setFilterDeductible}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Expenses</SelectItem>
                <SelectItem value="deductible">Deductible Only</SelectItem>
                <SelectItem value="non-deductible">Non-Deductible</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Expenses List */}
          <div className="space-y-3">
            {filteredExpenses.length === 0 ? (
              <div className="text-center py-12">
                <Receipt className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-600 mb-2">No expenses found</p>
                <p className="text-sm text-gray-500">
                  Add your first expense or adjust your filters
                </p>
              </div>
            ) : (
              filteredExpenses.map((expense) => (
                <Card key={expense.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h4 className="font-semibold">{expense.description}</h4>
                          {expense.deductible && (
                            <Badge className="bg-green-600 text-white">Deductible</Badge>
                          )}
                          {expense.aiCategorized && (
                            <Badge variant="outline" className="flex items-center gap-1">
                              <Sparkles className="w-3 h-3" />
                              AI
                            </Badge>
                          )}
                          {expense.receiptAttached && (
                            <Badge variant="outline" className="flex items-center gap-1">
                              <FileText className="w-3 h-3" />
                              Receipt
                            </Badge>
                          )}
                        </div>

                        <div className="grid md:grid-cols-2 gap-x-6 gap-y-1 text-sm">
                          <div className="flex items-center gap-2 text-gray-600">
                            <Calendar className="w-4 h-4" />
                            <span>{new Date(expense.date).toLocaleDateString()}</span>
                          </div>
                          <div className="flex items-center gap-2 text-gray-600">
                            <DollarSign className="w-4 h-4" />
                            <span className="font-semibold text-blue-900">
                              ${expense.amount.toLocaleString()}
                            </span>
                          </div>
                          <div className="text-gray-600">
                            Category: <span className="font-semibold">{expense.category}</span>
                          </div>
                          <div className="text-gray-600">
                            Payment: <span className="font-semibold">{expense.paymentMethod}</span>
                          </div>
                          <div className="text-gray-600 col-span-2">
                            Property: {expense.propertyAddress}
                          </div>
                          {expense.notes && (
                            <div className="text-gray-600 col-span-2">
                              Notes: <span className="italic">{expense.notes}</span>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex gap-2">
                        <Button variant="outline" size="sm">
                          <Edit2 className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDeleteExpense(expense.id)}
                        >
                          <Trash2 className="w-4 h-4 text-red-600" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>

          {/* Export */}
          <Card className="mt-6 bg-gradient-to-r from-blue-50 to-green-50 border-2 border-blue-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-lg mb-1">Export Expense Report</h3>
                  <p className="text-sm text-gray-600">
                    Download a detailed report of all expenses for your tax preparation
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline">
                    <Download className="w-4 h-4 mr-2" />
                    Export CSV
                  </Button>
                  <Button className="bg-blue-600 hover:bg-blue-700">
                    <Download className="w-4 h-4 mr-2" />
                    Export PDF
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Tips */}
          <Card className="mt-4 bg-gray-50">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5" />
                <div>
                  <p className="font-semibold text-sm mb-1">Expense Tracking Tips</p>
                  <ul className="text-xs text-gray-600 space-y-1">
                    <li>• Keep all receipts for expenses over $75</li>
                    <li>• Track home improvements separately - they increase your cost basis</li>
                    <li>• Home office deductions require dedicated workspace</li>
                    <li>• PMI is deductible if your income is below certain thresholds</li>
                    <li>• Points paid on mortgage may be deductible in the year paid</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </CardContent>
      </Card>
    </div>
  );
}