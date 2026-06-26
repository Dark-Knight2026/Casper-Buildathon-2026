/**
 * Lease Compliance Checker Component
 * Validates lease agreements against legal requirements
 */

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  Shield,
  CheckCircle,
  XCircle,
  AlertTriangle,
  FileText,
  Info,
  ExternalLink
} from 'lucide-react';
import { LeaseAgreement } from '@/types/lease';

interface ComplianceIssue {
  id: string;
  severity: 'critical' | 'warning' | 'info';
  category: string;
  title: string;
  description: string;
  recommendation: string;
  regulation?: string;
  link?: string;
}

interface LeaseComplianceCheckerProps {
  lease: LeaseAgreement;
  onFixIssue?: (issueId: string) => void;
}

export default function LeaseComplianceChecker({
  lease,
  onFixIssue
}: LeaseComplianceCheckerProps) {
  const [isChecking, setIsChecking] = useState(false);
  const [issues, setIssues] = useState<ComplianceIssue[]>([]);
  const [hasChecked, setHasChecked] = useState(false);

  const runComplianceCheck = async () => {
    setIsChecking(true);
    
    // Simulate compliance check
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    const foundIssues: ComplianceIssue[] = [];

    // Check for required clauses
    if (!lease.clauses || lease.clauses.length === 0) {
      foundIssues.push({
        id: 'missing-clauses',
        severity: 'critical',
        category: 'Required Clauses',
        title: 'Missing Lease Clauses',
        description: 'The lease agreement does not contain any clauses.',
        recommendation: 'Add standard lease clauses including rent payment terms, maintenance responsibilities, and termination conditions.',
        regulation: 'State Landlord-Tenant Law'
      });
    }

    // Check security deposit
    if (lease.securityDeposit > lease.monthlyRent * 2) {
      foundIssues.push({
        id: 'excessive-deposit',
        severity: 'warning',
        category: 'Financial Terms',
        title: 'Excessive Security Deposit',
        description: 'Security deposit exceeds 2 months rent, which may violate local regulations.',
        recommendation: 'Review local laws regarding maximum security deposit amounts.',
        regulation: 'Local Housing Code',
        link: 'https://example.com/security-deposit-laws'
      });
    }

    // Check lease duration
    const duration = Math.ceil(
      (new Date(lease.endDate).getTime() - new Date(lease.startDate).getTime()) /
      (1000 * 60 * 60 * 24)
    );
    
    if (duration < 30) {
      foundIssues.push({
        id: 'short-duration',
        severity: 'info',
        category: 'Lease Terms',
        title: 'Short Lease Duration',
        description: 'Lease duration is less than 30 days.',
        recommendation: 'Ensure this complies with short-term rental regulations in your jurisdiction.',
        regulation: 'Short-term Rental Ordinance'
      });
    }

    setIssues(foundIssues);
    setHasChecked(true);
    setIsChecking(false);
  };

  const getSeverityIcon = (severity: ComplianceIssue['severity']) => {
    switch (severity) {
      case 'critical':
        return <XCircle className="h-5 w-5 text-red-600" />;
      case 'warning':
        return <AlertTriangle className="h-5 w-5 text-yellow-600" />;
      case 'info':
        return <Info className="h-5 w-5 text-blue-600" />;
    }
  };

  const getSeverityColor = (severity: ComplianceIssue['severity']) => {
    switch (severity) {
      case 'critical':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'warning':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'info':
        return 'bg-blue-100 text-blue-800 border-blue-200';
    }
  };

  const criticalCount = issues.filter(i => i.severity === 'critical').length;
  const warningCount = issues.filter(i => i.severity === 'warning').length;
  const infoCount = issues.filter(i => i.severity === 'info').length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Compliance Checker
              </CardTitle>
              <CardDescription>
                Validate lease agreement against legal requirements
              </CardDescription>
            </div>
            <Button onClick={runComplianceCheck} disabled={isChecking}>
              {isChecking ? 'Checking...' : 'Run Compliance Check'}
            </Button>
          </div>
        </CardHeader>
      </Card>

      {/* Results Summary */}
      {hasChecked && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-sm text-gray-600 mb-2">Total Issues</p>
                <p className="text-3xl font-bold">{issues.length}</p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-red-200 bg-red-50">
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-sm text-red-800 mb-2">Critical</p>
                <p className="text-3xl font-bold text-red-900">{criticalCount}</p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-yellow-200 bg-yellow-50">
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-sm text-yellow-800 mb-2">Warnings</p>
                <p className="text-3xl font-bold text-yellow-900">{warningCount}</p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-blue-200 bg-blue-50">
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-sm text-blue-800 mb-2">Info</p>
                <p className="text-3xl font-bold text-blue-900">{infoCount}</p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Issues List */}
      {hasChecked && (
        <Card>
          <CardHeader>
            <CardTitle>
              {issues.length === 0 ? 'No Issues Found' : 'Compliance Issues'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {issues.length === 0 ? (
              <div className="text-center py-12">
                <CheckCircle className="h-16 w-16 mx-auto mb-4 text-green-600" />
                <p className="text-lg font-semibold text-green-900 mb-2">
                  All Checks Passed
                </p>
                <p className="text-gray-600">
                  This lease agreement meets all compliance requirements.
                </p>
              </div>
            ) : (
              <ScrollArea className="h-[500px] pr-4">
                <div className="space-y-4">
                  {issues.map((issue) => (
                    <Alert key={issue.id} className={getSeverityColor(issue.severity)}>
                      <div className="flex items-start gap-4">
                        {getSeverityIcon(issue.severity)}
                        <div className="flex-1 space-y-2">
                          <div className="flex items-start justify-between">
                            <div>
                              <AlertTitle className="flex items-center gap-2">
                                {issue.title}
                                <Badge variant="outline" className="text-xs">
                                  {issue.category}
                                </Badge>
                              </AlertTitle>
                              <AlertDescription className="mt-2">
                                {issue.description}
                              </AlertDescription>
                            </div>
                          </div>

                          <div className="bg-white p-3 rounded border">
                            <p className="text-sm font-medium mb-1">Recommendation:</p>
                            <p className="text-sm text-gray-700">{issue.recommendation}</p>
                          </div>

                          {issue.regulation && (
                            <div className="flex items-center gap-2 text-sm text-gray-600">
                              <FileText className="h-4 w-4" />
                              <span>Regulation: {issue.regulation}</span>
                            </div>
                          )}

                          <div className="flex gap-2">
                            {onFixIssue && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => onFixIssue(issue.id)}
                              >
                                Fix Issue
                              </Button>
                            )}
                            {issue.link && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => window.open(issue.link, '_blank')}
                              >
                                <ExternalLink className="h-4 w-4 mr-2" />
                                Learn More
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    </Alert>
                  ))}
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}