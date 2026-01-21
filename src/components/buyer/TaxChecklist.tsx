import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Progress } from '../ui/progress';
import {
  CheckCircle2,
  Circle,
  Calendar,
  Bell,
  FileText,
  AlertCircle,
  BookOpen,
  ExternalLink,
} from 'lucide-react';

interface ChecklistItem {
  id: string;
  title: string;
  description: string;
  category: 'documents' | 'deadlines' | 'actions';
  completed: boolean;
  dueDate?: string;
  priority: 'high' | 'medium' | 'low';
  resources?: { title: string; url: string }[];
}

const mockChecklistItems: ChecklistItem[] = [
  {
    id: 'item-1',
    title: 'Obtain Form 1098 (Mortgage Interest Statement)',
    description: 'Request from your lender showing mortgage interest paid during the tax year',
    category: 'documents',
    completed: true,
    dueDate: '2025-01-31',
    priority: 'high',
    resources: [
      { title: 'IRS Form 1098 Guide', url: 'https://www.irs.gov/forms-pubs/about-form-1098' },
    ],
  },
  {
    id: 'item-2',
    title: 'Gather Property Tax Statements',
    description: 'Collect all property tax payment receipts and statements from your county',
    category: 'documents',
    completed: true,
    dueDate: '2025-02-15',
    priority: 'high',
  },
  {
    id: 'item-3',
    title: 'Collect Closing Disclosure',
    description: 'Keep your closing disclosure showing points paid and other deductible closing costs',
    category: 'documents',
    completed: false,
    priority: 'high',
  },
  {
    id: 'item-4',
    title: 'Organize Home Improvement Receipts',
    description: 'Compile receipts for capital improvements that increase your home\'s cost basis',
    category: 'documents',
    completed: false,
    priority: 'medium',
  },
  {
    id: 'item-5',
    title: 'Calculate Home Office Deduction',
    description: 'Measure your home office space and calculate eligible percentage if applicable',
    category: 'actions',
    completed: false,
    priority: 'medium',
    resources: [
      { title: 'Home Office Deduction Guide', url: 'https://www.irs.gov/businesses/small-businesses-self-employed/home-office-deduction' },
    ],
  },
  {
    id: 'item-6',
    title: 'Review PMI Deduction Eligibility',
    description: 'Check if your income qualifies for PMI deduction (AGI under $100K)',
    category: 'actions',
    completed: false,
    priority: 'low',
  },
  {
    id: 'item-7',
    title: 'File Federal Tax Return',
    description: 'Submit your federal tax return including Schedule A for itemized deductions',
    category: 'deadlines',
    completed: false,
    dueDate: '2025-04-15',
    priority: 'high',
    resources: [
      { title: 'IRS Filing Information', url: 'https://www.irs.gov/filing' },
    ],
  },
  {
    id: 'item-8',
    title: 'File State Tax Return',
    description: 'Submit your state tax return if applicable in your state',
    category: 'deadlines',
    completed: false,
    dueDate: '2025-04-15',
    priority: 'high',
  },
  {
    id: 'item-9',
    title: 'Pay Q1 Estimated Taxes',
    description: 'If self-employed or have rental income, pay first quarter estimated taxes',
    category: 'deadlines',
    completed: false,
    dueDate: '2025-04-15',
    priority: 'medium',
  },
  {
    id: 'item-10',
    title: 'Review First-Time Homebuyer Credits',
    description: 'Check eligibility for state or local first-time homebuyer tax credits',
    category: 'actions',
    completed: false,
    priority: 'low',
    resources: [
      { title: 'Homebuyer Tax Credits', url: 'https://www.irs.gov/credits-deductions-for-individuals' },
    ],
  },
];

export function TaxChecklist() {
  const [items, setItems] = useState<ChecklistItem[]>(mockChecklistItems);
  const [filterCategory, setFilterCategory] = useState<string>('all');

  const handleToggleItem = (itemId: string) => {
    setItems((prev) =>
      prev.map((item) =>
        item.id === itemId ? { ...item, completed: !item.completed } : item
      )
    );
  };

  const filteredItems = items.filter((item) => {
    if (filterCategory === 'all') return true;
    return item.category === filterCategory;
  });

  const completedCount = items.filter((item) => item.completed).length;
  const totalCount = items.length;
  const progressPercentage = (completedCount / totalCount) * 100;

  const upcomingDeadlines = items
    .filter((item) => item.dueDate && !item.completed)
    .sort((a, b) => new Date(a.dueDate!).getTime() - new Date(b.dueDate!).getTime())
    .slice(0, 3);

  const highPriorityIncomplete = items.filter(
    (item) => item.priority === 'high' && !item.completed
  ).length;

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'documents':
        return <FileText className="w-4 h-4" />;
      case 'deadlines':
        return <Calendar className="w-4 h-4" />;
      case 'actions':
        return <CheckCircle2 className="w-4 h-4" />;
      default:
        return <Circle className="w-4 h-4" />;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'bg-red-100 text-red-700 border-red-300';
      case 'medium':
        return 'bg-yellow-100 text-yellow-700 border-yellow-300';
      case 'low':
        return 'bg-blue-100 text-blue-700 border-blue-300';
      default:
        return 'bg-gray-100 text-gray-700 border-gray-300';
    }
  };

  const getDaysUntilDue = (dueDate: string) => {
    const days = Math.ceil(
      (new Date(dueDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
    );
    return days;
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5" />
            Tax Preparation Checklist
          </CardTitle>
          <CardDescription>
            Stay organized with guided steps for your homeowner tax filing
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Progress Overview */}
          <Card className="mb-6 bg-gradient-to-r from-blue-50 to-green-50 border-2 border-blue-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="font-semibold text-lg mb-1">Overall Progress</h3>
                  <p className="text-sm text-gray-600">
                    {completedCount} of {totalCount} tasks completed
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-3xl font-bold text-blue-900">{Math.round(progressPercentage)}%</p>
                  {highPriorityIncomplete > 0 && (
                    <Badge className="bg-red-600 text-white mt-1">
                      {highPriorityIncomplete} High Priority
                    </Badge>
                  )}
                </div>
              </div>
              <Progress value={progressPercentage} className="h-3" />
            </CardContent>
          </Card>

          {/* Upcoming Deadlines */}
          {upcomingDeadlines.length > 0 && (
            <Card className="mb-6 bg-yellow-50 border-yellow-200">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Bell className="w-5 h-5 text-yellow-600" />
                  Upcoming Deadlines
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {upcomingDeadlines.map((item) => {
                  const daysUntil = getDaysUntilDue(item.dueDate!);
                  return (
                    <div key={item.id} className="flex items-center justify-between p-3 bg-white rounded-lg border">
                      <div className="flex-1">
                        <p className="font-semibold text-sm">{item.title}</p>
                        <p className="text-xs text-gray-600 mt-1">
                          Due: {new Date(item.dueDate!).toLocaleDateString()}
                        </p>
                      </div>
                      <Badge
                        className={
                          daysUntil <= 7
                            ? 'bg-red-600 text-white'
                            : daysUntil <= 30
                            ? 'bg-yellow-600 text-white'
                            : 'bg-blue-600 text-white'
                        }
                      >
                        {daysUntil} days
                      </Badge>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          )}

          {/* Category Filters */}
          <div className="flex gap-2 mb-6">
            <Button
              variant={filterCategory === 'all' ? 'default' : 'outline'}
              onClick={() => setFilterCategory('all')}
              className={filterCategory === 'all' ? 'bg-blue-600' : ''}
            >
              All Tasks ({items.length})
            </Button>
            <Button
              variant={filterCategory === 'documents' ? 'default' : 'outline'}
              onClick={() => setFilterCategory('documents')}
              className={filterCategory === 'documents' ? 'bg-blue-600' : ''}
            >
              <FileText className="w-4 h-4 mr-2" />
              Documents ({items.filter((i) => i.category === 'documents').length})
            </Button>
            <Button
              variant={filterCategory === 'deadlines' ? 'default' : 'outline'}
              onClick={() => setFilterCategory('deadlines')}
              className={filterCategory === 'deadlines' ? 'bg-blue-600' : ''}
            >
              <Calendar className="w-4 h-4 mr-2" />
              Deadlines ({items.filter((i) => i.category === 'deadlines').length})
            </Button>
            <Button
              variant={filterCategory === 'actions' ? 'default' : 'outline'}
              onClick={() => setFilterCategory('actions')}
              className={filterCategory === 'actions' ? 'bg-blue-600' : ''}
            >
              <CheckCircle2 className="w-4 h-4 mr-2" />
              Actions ({items.filter((i) => i.category === 'actions').length})
            </Button>
          </div>

          {/* Checklist Items */}
          <div className="space-y-3">
            {filteredItems.map((item) => (
              <Card
                key={item.id}
                className={`hover:shadow-md transition-shadow ${
                  item.completed ? 'bg-gray-50' : ''
                }`}
              >
                <CardContent className="p-4">
                  <div className="flex items-start gap-4">
                    <button
                      onClick={() => handleToggleItem(item.id)}
                      className="mt-1 flex-shrink-0"
                    >
                      {item.completed ? (
                        <CheckCircle2 className="w-6 h-6 text-green-600" />
                      ) : (
                        <Circle className="w-6 h-6 text-gray-400 hover:text-blue-600" />
                      )}
                    </button>

                    <div className="flex-1">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <h4
                            className={`font-semibold ${
                              item.completed ? 'line-through text-gray-500' : ''
                            }`}
                          >
                            {item.title}
                          </h4>
                          <p className="text-sm text-gray-600 mt-1">{item.description}</p>
                        </div>
                        <div className="flex gap-2 ml-4">
                          <Badge variant="outline" className="flex items-center gap-1">
                            {getCategoryIcon(item.category)}
                            {item.category}
                          </Badge>
                          <Badge className={getPriorityColor(item.priority)}>
                            {item.priority}
                          </Badge>
                        </div>
                      </div>

                      {item.dueDate && (
                        <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
                          <Calendar className="w-4 h-4" />
                          <span>Due: {new Date(item.dueDate).toLocaleDateString()}</span>
                          {!item.completed && (
                            <span className="text-xs">
                              ({getDaysUntilDue(item.dueDate)} days remaining)
                            </span>
                          )}
                        </div>
                      )}

                      {item.resources && item.resources.length > 0 && (
                        <div className="flex flex-wrap gap-2 mt-2">
                          {item.resources.map((resource, index) => (
                            <a
                              key={index}
                              href={resource.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-1 text-xs text-blue-600 hover:underline"
                            >
                              <BookOpen className="w-3 h-3" />
                              {resource.title}
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Educational Resources */}
          <Card className="mt-6 bg-gradient-to-r from-purple-50 to-pink-50 border-2 border-purple-200">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <BookOpen className="w-5 h-5" />
                Homeowner Tax Resources
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <a
                href="https://www.irs.gov/publications/p530"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between p-3 bg-white rounded-lg border hover:shadow-md transition-shadow"
              >
                <div>
                  <p className="font-semibold text-sm">IRS Publication 530</p>
                  <p className="text-xs text-gray-600">Tax Information for Homeowners</p>
                </div>
                <ExternalLink className="w-5 h-5 text-blue-600" />
              </a>

              <a
                href="https://www.irs.gov/credits-deductions/individuals/energy-incentives-individuals"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between p-3 bg-white rounded-lg border hover:shadow-md transition-shadow"
              >
                <div>
                  <p className="font-semibold text-sm">Energy Tax Credits</p>
                  <p className="text-xs text-gray-600">Residential Energy Credits Guide</p>
                </div>
                <ExternalLink className="w-5 h-5 text-blue-600" />
              </a>

              <a
                href="https://www.irs.gov/businesses/small-businesses-self-employed/home-office-deduction"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between p-3 bg-white rounded-lg border hover:shadow-md transition-shadow"
              >
                <div>
                  <p className="font-semibold text-sm">Home Office Deduction</p>
                  <p className="text-xs text-gray-600">Simplified and Regular Method</p>
                </div>
                <ExternalLink className="w-5 h-5 text-blue-600" />
              </a>
            </CardContent>
          </Card>

          {/* Tips */}
          <Card className="mt-4 bg-gray-50">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5" />
                <div>
                  <p className="font-semibold text-sm mb-1">Tax Preparation Tips</p>
                  <ul className="text-xs text-gray-600 space-y-1">
                    <li>• Start gathering documents early - don't wait until the deadline</li>
                    <li>• Keep digital and physical copies of all tax-related documents</li>
                    <li>• Consider using tax preparation software or consulting a CPA</li>
                    <li>• Track home improvements separately - they increase your cost basis when you sell</li>
                    <li>• Set calendar reminders for quarterly estimated tax payments if applicable</li>
                    <li>• Review your withholdings if you had a large refund or owed a lot last year</li>
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