import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Progress } from '../ui/progress';
import {
  Shield,
  AlertTriangle,
  CheckCircle2,
  FileText,
  Search,
  TrendingUp,
  AlertCircle,
  Download,
  Eye,
  Clock,
  Target,
  BookOpen,
  Phone,
} from 'lucide-react';

interface AuditRiskFactor {
  category: string;
  risk: 'low' | 'medium' | 'high';
  description: string;
  recommendation: string;
}

interface AuditChecklist {
  category: string;
  items: {
    id: string;
    description: string;
    completed: boolean;
    priority: 'high' | 'medium' | 'low';
  }[];
}

const mockRiskFactors: AuditRiskFactor[] = [
  {
    category: 'Home Office Deduction',
    risk: 'medium',
    description: 'Claiming $8,500 in home office expenses',
    recommendation:
      'Ensure you have detailed records of square footage, exclusive use, and business expenses',
  },
  {
    category: 'Mortgage Interest',
    risk: 'low',
    description: 'Deducting $18,450 in mortgage interest',
    recommendation: 'Form 1098 on file - well documented',
  },
  {
    category: 'Property Tax Deduction',
    risk: 'low',
    description: 'Claiming $8,200 in property taxes (within SALT cap)',
    recommendation: 'Property tax statements on file - compliant',
  },
  {
    category: 'Energy Credits',
    risk: 'medium',
    description: 'Claiming $4,500 in energy efficiency credits',
    recommendation:
      'Verify all receipts show manufacturer certification numbers and installation dates',
  },
];

const mockChecklists: AuditChecklist[] = [
  {
    category: 'Documentation',
    items: [
      {
        id: 'doc-1',
        description: 'Form 1098 - Mortgage Interest Statement',
        completed: true,
        priority: 'high',
      },
      {
        id: 'doc-2',
        description: 'Property tax payment receipts',
        completed: true,
        priority: 'high',
      },
      {
        id: 'doc-3',
        description: 'Home improvement receipts with dates',
        completed: true,
        priority: 'high',
      },
      {
        id: 'doc-4',
        description: 'Energy efficiency certification documents',
        completed: false,
        priority: 'medium',
      },
      {
        id: 'doc-5',
        description: 'Closing statement from home purchase',
        completed: true,
        priority: 'high',
      },
    ],
  },
  {
    category: 'Home Office (if applicable)',
    items: [
      {
        id: 'ho-1',
        description: 'Floor plan showing dedicated office space',
        completed: false,
        priority: 'high',
      },
      {
        id: 'ho-2',
        description: 'Photos of home office setup',
        completed: false,
        priority: 'medium',
      },
      {
        id: 'ho-3',
        description: 'Utility bills for the tax year',
        completed: true,
        priority: 'medium',
      },
      {
        id: 'ho-4',
        description: 'Home insurance statements',
        completed: true,
        priority: 'low',
      },
    ],
  },
  {
    category: 'Rental Property (if applicable)',
    items: [
      {
        id: 'rp-1',
        description: 'Rental income records',
        completed: true,
        priority: 'high',
      },
      {
        id: 'rp-2',
        description: 'Repair and maintenance receipts',
        completed: true,
        priority: 'high',
      },
      {
        id: 'rp-3',
        description: 'Depreciation schedule',
        completed: false,
        priority: 'high',
      },
      {
        id: 'rp-4',
        description: 'Tenant lease agreements',
        completed: true,
        priority: 'medium',
      },
    ],
  },
];

export function TaxAuditProtection() {
  const [riskFactors] = useState<AuditRiskFactor[]>(mockRiskFactors);
  const [checklists, setChecklists] = useState<AuditChecklist[]>(mockChecklists);

  const handleToggleItem = (categoryIndex: number, itemId: string) => {
    setChecklists((prev) =>
      prev.map((category, idx) =>
        idx === categoryIndex
          ? {
              ...category,
              items: category.items.map((item) =>
                item.id === itemId ? { ...item, completed: !item.completed } : item
              ),
            }
          : category
      )
    );
  };

  const totalItems = checklists.reduce((sum, cat) => sum + cat.items.length, 0);
  const completedItems = checklists.reduce(
    (sum, cat) => sum + cat.items.filter((item) => item.completed).length,
    0
  );
  const completionPercentage = Math.round((completedItems / totalItems) * 100);

  const highRiskCount = riskFactors.filter((f) => f.risk === 'high').length;
  const mediumRiskCount = riskFactors.filter((f) => f.risk === 'medium').length;
  const lowRiskCount = riskFactors.filter((f) => f.risk === 'low').length;

  const overallRisk =
    highRiskCount > 0 ? 'high' : mediumRiskCount > 2 ? 'medium' : 'low';

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5" />
            Tax Audit Protection & Readiness
          </CardTitle>
          <CardDescription>
            Assess your audit risk and prepare comprehensive documentation
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Overall Risk Assessment */}
          <Card
            className={`mb-6 ${
              overallRisk === 'high'
                ? 'bg-red-50 border-red-200'
                : overallRisk === 'medium'
                ? 'bg-yellow-50 border-yellow-200'
                : 'bg-green-50 border-green-200'
            }`}
          >
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="font-semibold text-lg mb-1">Overall Audit Risk Assessment</h3>
                  <p className="text-sm text-gray-600">
                    Based on your deductions and documentation
                  </p>
                </div>
                <div className="text-center">
                  {overallRisk === 'high' && (
                    <AlertTriangle className="w-12 h-12 text-red-600 mx-auto mb-2" />
                  )}
                  {overallRisk === 'medium' && (
                    <AlertCircle className="w-12 h-12 text-yellow-600 mx-auto mb-2" />
                  )}
                  {overallRisk === 'low' && (
                    <CheckCircle2 className="w-12 h-12 text-green-600 mx-auto mb-2" />
                  )}
                  <Badge
                    className={
                      overallRisk === 'high'
                        ? 'bg-red-600'
                        : overallRisk === 'medium'
                        ? 'bg-yellow-600'
                        : 'bg-green-600'
                    }
                  >
                    {overallRisk.toUpperCase()} RISK
                  </Badge>
                </div>
              </div>

              <div className="grid md:grid-cols-3 gap-4">
                <div className="text-center p-3 bg-white rounded-lg">
                  <p className="text-2xl font-bold text-red-900">{highRiskCount}</p>
                  <p className="text-xs text-gray-600">High Risk Factors</p>
                </div>
                <div className="text-center p-3 bg-white rounded-lg">
                  <p className="text-2xl font-bold text-yellow-900">{mediumRiskCount}</p>
                  <p className="text-xs text-gray-600">Medium Risk Factors</p>
                </div>
                <div className="text-center p-3 bg-white rounded-lg">
                  <p className="text-2xl font-bold text-green-900">{lowRiskCount}</p>
                  <p className="text-xs text-gray-600">Low Risk Factors</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Risk Factors */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Search className="w-5 h-5" />
                Risk Factor Analysis
              </CardTitle>
              <CardDescription>
                Potential audit triggers based on your tax return
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {riskFactors.map((factor, index) => (
                <Card
                  key={index}
                  className={`${
                    factor.risk === 'high'
                      ? 'border-red-200 bg-red-50'
                      : factor.risk === 'medium'
                      ? 'border-yellow-200 bg-yellow-50'
                      : 'border-green-200 bg-green-50'
                  }`}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-semibold text-sm">{factor.category}</h4>
                          <Badge
                            variant="outline"
                            className={
                              factor.risk === 'high'
                                ? 'border-red-600 text-red-600'
                                : factor.risk === 'medium'
                                ? 'border-yellow-600 text-yellow-600'
                                : 'border-green-600 text-green-600'
                            }
                          >
                            {factor.risk.toUpperCase()} RISK
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-700 mb-2">{factor.description}</p>
                        <div className="flex items-start gap-2 p-2 bg-white rounded">
                          <Target className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                          <p className="text-xs text-gray-600">{factor.recommendation}</p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </CardContent>
          </Card>

          {/* Audit Readiness Score */}
          <Card className="mb-6 bg-gradient-to-r from-blue-50 to-purple-50 border-2 border-blue-200">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <TrendingUp className="w-5 h-5" />
                Audit Readiness Score
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="mb-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-semibold">Documentation Completeness</span>
                  <span className="text-2xl font-bold text-blue-900">
                    {completionPercentage}%
                  </span>
                </div>
                <Progress value={completionPercentage} className="h-3" />
                <p className="text-xs text-gray-600 mt-2">
                  {completedItems} of {totalItems} required documents ready
                </p>
              </div>

              <div className="grid md:grid-cols-3 gap-3">
                <div className="text-center p-3 bg-white rounded-lg">
                  <CheckCircle2 className="w-8 h-8 text-green-600 mx-auto mb-2" />
                  <p className="text-lg font-bold text-green-900">{completedItems}</p>
                  <p className="text-xs text-gray-600">Completed</p>
                </div>
                <div className="text-center p-3 bg-white rounded-lg">
                  <Clock className="w-8 h-8 text-orange-600 mx-auto mb-2" />
                  <p className="text-lg font-bold text-orange-900">
                    {totalItems - completedItems}
                  </p>
                  <p className="text-xs text-gray-600">Pending</p>
                </div>
                <div className="text-center p-3 bg-white rounded-lg">
                  <FileText className="w-8 h-8 text-blue-600 mx-auto mb-2" />
                  <p className="text-lg font-bold text-blue-900">{totalItems}</p>
                  <p className="text-xs text-gray-600">Total Items</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Audit Preparation Checklists */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Audit Preparation Checklist
              </CardTitle>
              <CardDescription>
                Ensure you have all required documentation ready
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {checklists.map((checklist, categoryIndex) => (
                <Card key={categoryIndex}>
                  <CardHeader>
                    <CardTitle className="text-base">{checklist.category}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {checklist.items.map((item) => (
                      <div
                        key={item.id}
                        className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
                        onClick={() => handleToggleItem(categoryIndex, item.id)}
                      >
                        <input
                          type="checkbox"
                          checked={item.completed}
                          onChange={() => handleToggleItem(categoryIndex, item.id)}
                          className="w-5 h-5 mt-0.5"
                        />
                        <div className="flex-1">
                          <p
                            className={`text-sm ${
                              item.completed ? 'line-through text-gray-500' : 'text-gray-900'
                            }`}
                          >
                            {item.description}
                          </p>
                        </div>
                        <Badge
                          variant="outline"
                          className={
                            item.priority === 'high'
                              ? 'border-red-600 text-red-600'
                              : item.priority === 'medium'
                              ? 'border-yellow-600 text-yellow-600'
                              : 'border-gray-600 text-gray-600'
                          }
                        >
                          {item.priority}
                        </Badge>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              ))}
            </CardContent>
          </Card>

          {/* Audit Defense Resources */}
          <Card className="mb-6 bg-gradient-to-r from-purple-50 to-pink-50 border-2 border-purple-200">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <BookOpen className="w-5 h-5" />
                Audit Defense Resources
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-start gap-3 p-3 bg-white rounded-lg">
                <Shield className="w-5 h-5 text-blue-600 mt-0.5" />
                <div>
                  <p className="font-semibold text-sm">IRS Audit Guide</p>
                  <p className="text-xs text-gray-600 mb-2">
                    Comprehensive guide on what to expect during an IRS audit
                  </p>
                  <Button size="sm" variant="outline">
                    <Download className="w-3 h-3 mr-1" />
                    Download PDF
                  </Button>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 bg-white rounded-lg">
                <FileText className="w-5 h-5 text-green-600 mt-0.5" />
                <div>
                  <p className="font-semibold text-sm">Taxpayer Rights</p>
                  <p className="text-xs text-gray-600 mb-2">
                    Know your rights when dealing with the IRS
                  </p>
                  <Button size="sm" variant="outline">
                    <Eye className="w-3 h-3 mr-1" />
                    View Rights
                  </Button>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 bg-white rounded-lg">
                <Phone className="w-5 h-5 text-purple-600 mt-0.5" />
                <div>
                  <p className="font-semibold text-sm">Tax Professional Network</p>
                  <p className="text-xs text-gray-600 mb-2">
                    Connect with CPAs and Enrolled Agents who specialize in audit defense
                  </p>
                  <Button size="sm" variant="outline">
                    <Search className="w-3 h-3 mr-1" />
                    Find Expert
                  </Button>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 bg-white rounded-lg">
                <AlertCircle className="w-5 h-5 text-orange-600 mt-0.5" />
                <div>
                  <p className="font-semibold text-sm">Audit Response Templates</p>
                  <p className="text-xs text-gray-600 mb-2">
                    Pre-written templates for responding to IRS audit notices
                  </p>
                  <Button size="sm" variant="outline">
                    <Download className="w-3 h-3 mr-1" />
                    Get Templates
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Action Items */}
          <Card className="bg-yellow-50 border-yellow-200">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-yellow-600 mt-0.5" />
                <div>
                  <p className="font-semibold text-sm mb-1">Recommended Actions</p>
                  <ul className="text-xs text-gray-700 space-y-1">
                    <li>
                      • Complete all high-priority checklist items before filing your tax return
                    </li>
                    <li>
                      • Review medium-risk factors and gather additional supporting documentation
                    </li>
                    <li>
                      • Consider consulting with a tax professional for high-risk deductions
                    </li>
                    <li>
                      • Keep all documents organized and easily accessible for at least 7 years
                    </li>
                    <li>• Set up automatic backups of digital tax documents to secure cloud storage</li>
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