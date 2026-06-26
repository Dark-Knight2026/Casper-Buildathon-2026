/**
 * State-Specific Compliance Checker
 * Real-time validation of lease agreements against state and local regulations
 */

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Shield,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Info,
  ExternalLink,
  RefreshCw,
  FileText,
  Wrench
} from 'lucide-react';
import { ComplianceReport, ComplianceIssue, LeaseAgreement } from '@/types/lease';
import { useToast } from '@/hooks/use-toast';

interface ComplianceCheckerProps {
  lease: LeaseAgreement;
  onFixIssue: (issueId: string) => void;
  onViewRule: (ruleId: string) => void;
}

export default function ComplianceChecker({
  lease,
  onFixIssue,
  onViewRule
}: ComplianceCheckerProps) {
  const { toast } = useToast();
  const [report, setReport] = useState<ComplianceReport | null>(null);
  const [isChecking, setIsChecking] = useState(false);
  const [selectedSeverity, setSelectedSeverity] = useState<'all' | 'critical' | 'warning' | 'info'>('all');

  const runComplianceCheck = useCallback(async () => {
    setIsChecking(true);
    
    try {
      // In production, this would call a compliance checking service
      // For now, we'll generate a mock report
      const mockReport: ComplianceReport = {
        leaseId: lease.id,
        overallScore: 85,
        state: 'CA', // Would be extracted from property address
        checkDate: new Date(),
        issues: [
          {
            id: 'issue_1',
            severity: 'critical',
            ruleId: 'ca_security_deposit_001',
            ruleTitle: 'Security Deposit Limit Exceeded',
            description: 'California law limits security deposits to 2 months rent for unfurnished properties. Current deposit of $4,500 exceeds the limit of $4,000 (2 × $2,000 monthly rent).',
            clauseId: 'clause_security_deposit',
            recommendation: 'Reduce security deposit to $4,000 or less to comply with California Civil Code § 1950.5',
            autoFixAvailable: true
          },
          {
            id: 'issue_2',
            severity: 'critical',
            ruleId: 'ca_lead_disclosure_001',
            ruleTitle: 'Missing Lead-Based Paint Disclosure',
            description: 'Federal law requires disclosure of lead-based paint hazards for properties built before 1978. This property was built in 1975 and is missing the required disclosure.',
            recommendation: 'Add the EPA-mandated lead-based paint disclosure clause and provide the "Protect Your Family from Lead in Your Home" pamphlet',
            autoFixAvailable: true
          },
          {
            id: 'issue_3',
            severity: 'warning',
            ruleId: 'ca_entry_notice_001',
            ruleTitle: 'Insufficient Entry Notice Period',
            description: 'Lease specifies 12-hour notice for landlord entry, but California law requires 24-hour notice except in emergencies.',
            clauseId: 'clause_entry',
            recommendation: 'Update entry notice clause to require 24-hour advance notice as per California Civil Code § 1954',
            autoFixAvailable: true
          },
          {
            id: 'issue_4',
            severity: 'warning',
            ruleId: 'ca_late_fee_001',
            ruleTitle: 'Late Fee May Be Excessive',
            description: 'Late fee of $150 may be considered unreasonable for a $2,000 monthly rent. California courts have found late fees exceeding 6% of rent to be unenforceable.',
            clauseId: 'clause_rent_payment',
            recommendation: 'Consider reducing late fee to $120 (6% of monthly rent) or less',
            autoFixAvailable: true
          },
          {
            id: 'issue_5',
            severity: 'info',
            ruleId: 'ca_bed_bug_001',
            ruleTitle: 'Recommended: Bed Bug Disclosure',
            description: 'While not mandatory for all properties, California recommends disclosing any known bed bug infestations in the past two years.',
            recommendation: 'Add a bed bug disclosure clause to protect against future liability',
            autoFixAvailable: true
          },
          {
            id: 'issue_6',
            severity: 'info',
            ruleId: 'ca_smoke_detector_001',
            ruleTitle: 'Smoke Detector Maintenance Clause Recommended',
            description: 'Consider adding a clause specifying tenant and landlord responsibilities for smoke detector maintenance and testing.',
            recommendation: 'Add smoke detector maintenance clause specifying monthly testing by tenant and annual inspection by landlord',
            autoFixAvailable: false
          }
        ],
        passedRules: [
          'Rent payment terms clearly defined',
          'Proper termination notice periods specified',
          'Maintenance responsibilities clearly outlined',
          'Insurance requirements specified',
          'Utilities responsibility defined',
          'Pet policy clearly stated',
          'Parking provisions included',
          'Subletting restrictions defined'
        ],
        summary: 'Your lease has 2 critical compliance issues that must be addressed before execution, 2 warnings that should be reviewed, and 2 informational recommendations for best practices.'
      };

      setReport(mockReport);
      
      if (mockReport.issues.filter(i => i.severity === 'critical').length > 0) {
        toast({
          title: 'Compliance Issues Found',
          description: `${mockReport.issues.filter(i => i.severity === 'critical').length} critical issues require attention`,
          variant: 'destructive'
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to run compliance check',
        variant: 'destructive'
      });
    } finally {
      setIsChecking(false);
    }
  }, [lease.id, toast]);

  useEffect(() => {
    runComplianceCheck();
  }, [runComplianceCheck]);

  const handleAutoFix = (issue: ComplianceIssue) => {
    onFixIssue(issue.id);
    
    toast({
      title: 'Issue Fixed',
      description: `"${issue.ruleTitle}" has been automatically corrected`
    });
    
    // Re-run compliance check
    runComplianceCheck();
  };

  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-green-600';
    if (score >= 70) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getSeverityIcon = (severity: ComplianceIssue['severity']) => {
    switch (severity) {
      case 'critical':
        return <XCircle className="h-5 w-5 text-red-500" />;
      case 'warning':
        return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
      case 'info':
        return <Info className="h-5 w-5 text-blue-500" />;
    }
  };

  const getSeverityColor = (severity: ComplianceIssue['severity']) => {
    switch (severity) {
      case 'critical':
        return 'border-red-200 bg-red-50';
      case 'warning':
        return 'border-yellow-200 bg-yellow-50';
      case 'info':
        return 'border-blue-200 bg-blue-50';
    }
  };

  const filteredIssues = report?.issues.filter(issue =>
    selectedSeverity === 'all' || issue.severity === selectedSeverity
  ) || [];

  const criticalCount = report?.issues.filter(i => i.severity === 'critical').length || 0;
  const warningCount = report?.issues.filter(i => i.severity === 'warning').length || 0;
  const infoCount = report?.issues.filter(i => i.severity === 'info').length || 0;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
              <Shield className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <CardTitle>Compliance Checker</CardTitle>
              <CardDescription>
                Real-time validation against {report?.state || 'state'} regulations
              </CardDescription>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={runComplianceCheck}
            disabled={isChecking}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isChecking ? 'animate-spin' : ''}`} />
            Re-check
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {isChecking ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <Shield className="h-12 w-12 text-blue-600 mx-auto mb-4 animate-pulse" />
              <p className="text-gray-600">Checking compliance...</p>
            </div>
          </div>
        ) : report ? (
          <>
            {/* Compliance Score */}
            <div className="text-center">
              <div className="relative inline-block">
                <div className={`text-6xl font-bold ${getScoreColor(report.overallScore)}`}>
                  {report.overallScore}
                </div>
                <div className="text-sm text-gray-500 mt-1">Compliance Score</div>
              </div>
              <Progress 
                value={report.overallScore} 
                className="mt-4"
              />
              <p className="text-sm text-gray-600 mt-2">
                Last checked: {report.checkDate.toLocaleString()}
              </p>
            </div>

            {/* Summary */}
            <Alert>
              <Info className="h-4 w-4" />
              <AlertTitle>Summary</AlertTitle>
              <AlertDescription>{report.summary}</AlertDescription>
            </Alert>

            {/* Issue Counts */}
            <div className="grid grid-cols-3 gap-4">
              <Card className="border-red-200 bg-red-50">
                <CardContent className="pt-6">
                  <div className="text-center">
                    <XCircle className="h-8 w-8 text-red-500 mx-auto mb-2" />
                    <div className="text-2xl font-bold text-red-600">{criticalCount}</div>
                    <div className="text-sm text-gray-600">Critical</div>
                  </div>
                </CardContent>
              </Card>
              <Card className="border-yellow-200 bg-yellow-50">
                <CardContent className="pt-6">
                  <div className="text-center">
                    <AlertTriangle className="h-8 w-8 text-yellow-500 mx-auto mb-2" />
                    <div className="text-2xl font-bold text-yellow-600">{warningCount}</div>
                    <div className="text-sm text-gray-600">Warnings</div>
                  </div>
                </CardContent>
              </Card>
              <Card className="border-blue-200 bg-blue-50">
                <CardContent className="pt-6">
                  <div className="text-center">
                    <Info className="h-8 w-8 text-blue-500 mx-auto mb-2" />
                    <div className="text-2xl font-bold text-blue-600">{infoCount}</div>
                    <div className="text-sm text-gray-600">Info</div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Issues List - Responsive Height */}
            <Tabs value={selectedSeverity} onValueChange={(v) => setSelectedSeverity(v as 'all' | 'critical' | 'warning' | 'info')}>
              <TabsList className="w-full">
                <TabsTrigger value="all">All ({report.issues.length})</TabsTrigger>
                <TabsTrigger value="critical">Critical ({criticalCount})</TabsTrigger>
                <TabsTrigger value="warning">Warnings ({warningCount})</TabsTrigger>
                <TabsTrigger value="info">Info ({infoCount})</TabsTrigger>
              </TabsList>

              <TabsContent value={selectedSeverity} className="mt-4">
                <ScrollArea className="h-[400px] md:h-[500px] pr-4">
                  {filteredIssues.length === 0 ? (
                    <div className="text-center py-12">
                      <CheckCircle className="h-12 w-12 text-green-600 mx-auto mb-4" />
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">
                        No Issues Found
                      </h3>
                      <p className="text-gray-600">
                        All compliance checks passed for this category
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {filteredIssues.map((issue) => (
                        <Card
                          key={issue.id}
                          className={`border-2 ${getSeverityColor(issue.severity)}`}
                        >
                          <CardHeader>
                            <div className="flex items-start gap-3">
                              {getSeverityIcon(issue.severity)}
                              <div className="flex-1">
                                <div className="flex items-center justify-between mb-2">
                                  <CardTitle className="text-base">{issue.ruleTitle}</CardTitle>
                                  <Badge variant={issue.severity === 'critical' ? 'destructive' : 'secondary'}>
                                    {issue.severity}
                                  </Badge>
                                </div>
                                <CardDescription>{issue.description}</CardDescription>
                              </div>
                            </div>
                          </CardHeader>
                          <CardContent className="space-y-4">
                            <div className="bg-white p-3 rounded-lg border">
                              <p className="text-sm font-medium text-gray-700 mb-1">
                                Recommendation:
                              </p>
                              <p className="text-sm text-gray-600">{issue.recommendation}</p>
                            </div>

                            <div className="flex items-center gap-2">
                              {issue.autoFixAvailable ? (
                                <Button
                                  onClick={() => handleAutoFix(issue)}
                                  className="flex-1"
                                >
                                  <Wrench className="h-4 w-4 mr-2" />
                                  Auto-Fix
                                </Button>
                              ) : (
                                <Button
                                  variant="outline"
                                  onClick={() => onFixIssue(issue.id)}
                                  className="flex-1"
                                >
                                  <FileText className="h-4 w-4 mr-2" />
                                  Manual Fix Required
                                </Button>
                              )}
                              <Button
                                variant="outline"
                                onClick={() => onViewRule(issue.ruleId)}
                              >
                                <ExternalLink className="h-4 w-4 mr-2" />
                                View Rule
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </TabsContent>
            </Tabs>

            {/* Passed Rules */}
            {report.passedRules.length > 0 && (
              <Card className="border-green-200 bg-green-50">
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <CheckCircle className="h-5 w-5 text-green-600" />
                    Passed Compliance Checks ({report.passedRules.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {report.passedRules.map((rule, index) => (
                      <li key={index} className="flex items-center gap-2 text-sm text-gray-700">
                        <CheckCircle className="h-4 w-4 text-green-600 flex-shrink-0" />
                        {rule}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}
          </>
        ) : (
          <div className="text-center py-12">
            <Shield className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">Click "Re-check" to run compliance validation</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}