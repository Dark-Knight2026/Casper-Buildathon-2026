/**
 * Payment Reconciliation Component
 * Upload and reconcile bank statements with payments
 */

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Upload, FileText, CheckCircle, XCircle, AlertTriangle, Download } from 'lucide-react';
import { automationService } from '@/services/automationService';
import type { BankStatement, BankTransaction, ReconciliationReport } from '@/types/automation';

export function PaymentReconciliation() {
  const [statements, setStatements] = useState<BankStatement[]>([]);
  const [selectedStatement, setSelectedStatement] = useState<BankStatement | null>(null);
  const [transactions, setTransactions] = useState<BankTransaction[]>([]);
  const [report, setReport] = useState<ReconciliationReport | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isReconciling, setIsReconciling] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadStatements();
  }, []);

  const loadStatements = async () => {
    setIsLoading(true);
    try {
      const data = await automationService.getBankStatements();
      setStatements(data);
    } catch (error) {
      console.error('Error loading bank statements:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const statement = await automationService.uploadBankStatement(file);
      setStatements([statement, ...statements]);
      alert('Bank statement uploaded successfully!');
    } catch (error) {
      console.error('Error uploading bank statement:', error);
      alert('Failed to upload bank statement');
    } finally {
      setIsUploading(false);
    }
  };

  const handleSelectStatement = async (statement: BankStatement) => {
    setSelectedStatement(statement);
    try {
      const txns = await automationService.getTransactions(statement.id);
      setTransactions(txns);
      const rpt = await automationService.generateReconciliationReport(statement.id);
      setReport(rpt);
    } catch (error) {
      console.error('Error loading statement details:', error);
    }
  };

  const handleReconcile = async () => {
    if (!selectedStatement) return;

    setIsReconciling(true);
    try {
      await automationService.reconcileTransactions(selectedStatement.id);
      const txns = await automationService.getTransactions(selectedStatement.id);
      setTransactions(txns);
      const rpt = await automationService.generateReconciliationReport(selectedStatement.id);
      setReport(rpt);
      alert('Reconciliation completed successfully!');
    } catch (error) {
      console.error('Error reconciling transactions:', error);
      alert('Failed to reconcile transactions');
    } finally {
      setIsReconciling(false);
    }
  };

  const getMatchStatusIcon = (status: BankTransaction['matchStatus']) => {
    switch (status) {
      case 'matched':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'unmatched':
        return <XCircle className="h-4 w-4 text-red-600" />;
      case 'partial':
        return <AlertTriangle className="h-4 w-4 text-yellow-600" />;
      case 'review':
        return <AlertTriangle className="h-4 w-4 text-orange-600" />;
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Payment Reconciliation</CardTitle>
              <CardDescription>Upload and reconcile bank statements with payments</CardDescription>
            </div>
            <div>
              <Input
                id="file-upload"
                type="file"
                accept=".csv,.ofx,.qbo"
                onChange={handleFileUpload}
                disabled={isUploading}
                className="hidden"
              />
              <Label htmlFor="file-upload">
                <Button asChild disabled={isUploading}>
                  <span>
                    <Upload className="mr-2 h-4 w-4" />
                    {isUploading ? 'Uploading...' : 'Upload Statement'}
                  </span>
                </Button>
              </Label>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : statements.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">No bank statements uploaded</p>
              <p className="text-sm text-gray-500 mt-2">Upload a CSV, OFX, or QBO file to get started</p>
            </div>
          ) : (
            <div className="space-y-4">
              {statements.map((statement) => (
                <Card
                  key={statement.id}
                  className={`cursor-pointer hover:shadow-md transition-shadow ${
                    selectedStatement?.id === statement.id ? 'ring-2 ring-blue-500' : ''
                  }`}
                  onClick={() => handleSelectStatement(statement)}
                >
                  <CardContent className="pt-6">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="font-semibold">{statement.fileName}</h3>
                        <p className="text-sm text-gray-600">
                          Account: {statement.accountNumber} • {statement.transactionCount} transactions
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          Uploaded: {new Date(statement.uploadedAt).toLocaleDateString()}
                        </p>
                      </div>
                      <Badge variant={statement.status === 'completed' ? 'default' : 'secondary'}>
                        {statement.status}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {selectedStatement && (
        <>
          {report && (
            <Card>
              <CardHeader>
                <CardTitle>Reconciliation Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <p className="text-sm text-gray-600">Total Transactions</p>
                    <p className="text-2xl font-bold">{report.totalTransactions}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Matched</p>
                    <p className="text-2xl font-bold text-green-600">{report.matchedTransactions}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Unmatched</p>
                    <p className="text-2xl font-bold text-red-600">{report.unmatchedTransactions}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Match Rate</p>
                    <p className="text-2xl font-bold">{report.matchRate.toFixed(1)}%</p>
                  </div>
                </div>
                <div className="mt-4 flex gap-2">
                  <Button onClick={handleReconcile} disabled={isReconciling}>
                    {isReconciling ? 'Reconciling...' : 'Auto-Reconcile'}
                  </Button>
                  <Button variant="outline">
                    <Download className="mr-2 h-4 w-4" />
                    Export Report
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle>Transactions</CardTitle>
              <CardDescription>Review and match transactions</CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="all">
                <TabsList>
                  <TabsTrigger value="all">All</TabsTrigger>
                  <TabsTrigger value="matched">Matched</TabsTrigger>
                  <TabsTrigger value="unmatched">Unmatched</TabsTrigger>
                </TabsList>

                <TabsContent value="all" className="mt-4">
                  <div className="space-y-2">
                    {transactions.map((txn) => (
                      <Card key={txn.id}>
                        <CardContent className="pt-4">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              {getMatchStatusIcon(txn.matchStatus)}
                              <div>
                                <p className="font-medium">{txn.description}</p>
                                <p className="text-sm text-gray-600">
                                  {new Date(txn.date).toLocaleDateString()} • Ref: {txn.reference}
                                </p>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="font-semibold text-lg">${txn.amount.toLocaleString()}</p>
                              {txn.matchConfidence !== undefined && (
                                <p className="text-xs text-gray-600">{txn.matchConfidence}% confidence</p>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </TabsContent>

                <TabsContent value="matched" className="mt-4">
                  <div className="space-y-2">
                    {transactions
                      .filter((txn) => txn.matchStatus === 'matched')
                      .map((txn) => (
                        <Card key={txn.id}>
                          <CardContent className="pt-4">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                {getMatchStatusIcon(txn.matchStatus)}
                                <div>
                                  <p className="font-medium">{txn.description}</p>
                                  <p className="text-sm text-gray-600">
                                    {new Date(txn.date).toLocaleDateString()} • Payment #{txn.matchedPaymentId}
                                  </p>
                                </div>
                              </div>
                              <p className="font-semibold text-lg">${txn.amount.toLocaleString()}</p>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                  </div>
                </TabsContent>

                <TabsContent value="unmatched" className="mt-4">
                  <div className="space-y-2">
                    {transactions
                      .filter((txn) => txn.matchStatus === 'unmatched')
                      .map((txn) => (
                        <Card key={txn.id}>
                          <CardContent className="pt-4">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                {getMatchStatusIcon(txn.matchStatus)}
                                <div>
                                  <p className="font-medium">{txn.description}</p>
                                  <p className="text-sm text-gray-600">{new Date(txn.date).toLocaleDateString()}</p>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <p className="font-semibold text-lg">${txn.amount.toLocaleString()}</p>
                                <Button size="sm" variant="outline">
                                  Match Manually
                                </Button>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}