/**
 * Buyer Financing Page
 * Pre-qualification and mortgage tracking
 */

import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  DollarSign,
  TrendingUp,
  Calendar,
  FileText,
  CheckCircle,
  AlertCircle,
  RefreshCw,
  Save,
  Calculator
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase/client';
import { ErrorBoundary } from '@/components/ui/error-boundary';
import { buyerService, BuyerFinancing as BuyerFinancingType } from '@/services/buyerService';

export default function BuyerFinancing() {
  const [financing, setFinancing] = useState<BuyerFinancingType | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const { toast } = useToast();
  const navigate = useNavigate();

  // Calculator state
  const [homePrice, setHomePrice] = useState<number>(0);
  const [downPayment, setDownPayment] = useState<number>(0);
  const [interestRate, setInterestRate] = useState<number>(0);
  const [loanTerm, setLoanTerm] = useState<number>(30);
  const [monthlyPayment, setMonthlyPayment] = useState<number>(0);

  const loadFinancing = useCallback(async () => {
    if (!userId) return;

    setLoading(true);
    setError(null);

    try {
      const data = await buyerService.getFinancing(userId);
      if (data) {
        setFinancing(data);
        // Pre-fill calculator with existing data
        if (data.preApprovalAmount) setHomePrice(data.preApprovalAmount);
        if (data.downPaymentAmount) setDownPayment(data.downPaymentAmount);
        if (data.interestRate) setInterestRate(data.interestRate);
      }
    } catch (err) {
      console.error('Error loading financing:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to load financing';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    const initializeUser = async () => {
      const {
        data: { user }
      } = await supabase.auth.getUser();

      if (!user) {
        navigate('/auth/login');
        return;
      }

      setUserId(user.id);
    };

    initializeUser();
  }, [navigate]);

  useEffect(() => {
    if (userId) {
      loadFinancing();
    }
  }, [userId, loadFinancing]);

  const handleSave = async () => {
    if (!userId) return;

    setSaving(true);
    setError(null);

    try {
      const updated = await buyerService.upsertFinancing(userId, financing || {});
      setFinancing(updated);
      toast({
        title: 'Success',
        description: 'Financing information saved successfully'
      });
    } catch (err) {
      console.error('Error saving financing:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to save financing';
      setError(errorMessage);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: errorMessage
      });
    } finally {
      setSaving(false);
    }
  };

  const calculateMonthlyPayment = useCallback(() => {
    const principal = homePrice - downPayment;
    const monthlyRate = interestRate / 100 / 12;
    const numberOfPayments = loanTerm * 12;

    if (monthlyRate === 0) {
      setMonthlyPayment(principal / numberOfPayments);
      return;
    }

    const payment =
      (principal * (monthlyRate * Math.pow(1 + monthlyRate, numberOfPayments))) /
      (Math.pow(1 + monthlyRate, numberOfPayments) - 1);

    setMonthlyPayment(Math.round(payment));
  }, [homePrice, downPayment, interestRate, loanTerm]);

  useEffect(() => {
    if (homePrice > 0 && downPayment >= 0 && interestRate > 0) {
      calculateMonthlyPayment();
    }
  }, [homePrice, downPayment, interestRate, loanTerm, calculateMonthlyPayment]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved':
      case 'pre_approved':
        return 'bg-green-100 text-green-800';
      case 'in_progress':
        return 'bg-blue-100 text-blue-800';
      case 'denied':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0
    }).format(amount);
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Financing</h1>
            <p className="text-gray-500 mt-1">Manage your pre-qualification and mortgage</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={loadFinancing} disabled={loading}>
              <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              <Save className="mr-2 h-4 w-4" />
              {saving ? 'Saving...' : 'Save'}
            </Button>
          </div>
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pre-Approval Amount</CardTitle>
              <DollarSign className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {financing?.preApprovalAmount
                  ? formatCurrency(financing.preApprovalAmount)
                  : 'Not set'}
              </div>
              {financing?.preApprovalExpiry && (
                <p className="text-xs text-gray-500 mt-1">
                  Expires {new Date(financing.preApprovalExpiry).toLocaleDateString()}
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Status</CardTitle>
              <CheckCircle className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <Badge className={getStatusColor(financing?.status || 'not_started')}>
                {financing?.status?.replace('_', ' ') || 'Not Started'}
              </Badge>
              <p className="text-xs text-gray-500 mt-2">Current financing status</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Monthly Payment</CardTitle>
              <TrendingUp className="h-4 w-4 text-purple-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {financing?.monthlyPaymentEstimate
                  ? formatCurrency(financing.monthlyPaymentEstimate)
                  : 'Not calculated'}
              </div>
              <p className="text-xs text-gray-500 mt-1">Estimated payment</p>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="details" className="space-y-6">
          <TabsList>
            <TabsTrigger value="details">
              <FileText className="mr-2 h-4 w-4" />
              Details
            </TabsTrigger>
            <TabsTrigger value="calculator">
              <Calculator className="mr-2 h-4 w-4" />
              Calculator
            </TabsTrigger>
          </TabsList>

          <TabsContent value="details">
            <Card>
              <CardHeader>
                <CardTitle>Financing Details</CardTitle>
                <CardDescription>Your pre-qualification and loan information</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="lenderName">Lender Name</Label>
                    <Input
                      id="lenderName"
                      value={financing?.lenderName || ''}
                      onChange={(e) =>
                        setFinancing((prev) => ({ ...prev!, lenderName: e.target.value }))
                      }
                      placeholder="Bank or Lender Name"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="lenderContact">Lender Contact</Label>
                    <Input
                      id="lenderContact"
                      value={financing?.lenderContact || ''}
                      onChange={(e) =>
                        setFinancing((prev) => ({ ...prev!, lenderContact: e.target.value }))
                      }
                      placeholder="Phone or Email"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="preApprovalAmount">Pre-Approval Amount</Label>
                    <Input
                      id="preApprovalAmount"
                      type="number"
                      value={financing?.preApprovalAmount || ''}
                      onChange={(e) =>
                        setFinancing((prev) => ({
                          ...prev!,
                          preApprovalAmount: Number(e.target.value)
                        }))
                      }
                      placeholder="$500,000"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="loanType">Loan Type</Label>
                    <Select
                      value={financing?.loanType || 'conventional'}
                      onValueChange={(value) =>
                        setFinancing((prev) => ({
                          ...prev!,
                          loanType: value as BuyerFinancingType['loanType']
                        }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="conventional">Conventional</SelectItem>
                        <SelectItem value="fha">FHA</SelectItem>
                        <SelectItem value="va">VA</SelectItem>
                        <SelectItem value="usda">USDA</SelectItem>
                        <SelectItem value="jumbo">Jumbo</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="interestRate">Interest Rate (%)</Label>
                    <Input
                      id="interestRate"
                      type="number"
                      step="0.01"
                      value={financing?.interestRate || ''}
                      onChange={(e) =>
                        setFinancing((prev) => ({
                          ...prev!,
                          interestRate: Number(e.target.value)
                        }))
                      }
                      placeholder="6.5"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="downPaymentPercent">Down Payment (%)</Label>
                    <Input
                      id="downPaymentPercent"
                      type="number"
                      value={financing?.downPaymentPercent || ''}
                      onChange={(e) =>
                        setFinancing((prev) => ({
                          ...prev!,
                          downPaymentPercent: Number(e.target.value)
                        }))
                      }
                      placeholder="20"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="preApprovalDate">Pre-Approval Date</Label>
                    <Input
                      id="preApprovalDate"
                      type="date"
                      value={
                        financing?.preApprovalDate
                          ? new Date(financing.preApprovalDate).toISOString().split('T')[0]
                          : ''
                      }
                      onChange={(e) =>
                        setFinancing((prev) => ({
                          ...prev!,
                          preApprovalDate: new Date(e.target.value)
                        }))
                      }
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="preApprovalExpiry">Pre-Approval Expiry</Label>
                    <Input
                      id="preApprovalExpiry"
                      type="date"
                      value={
                        financing?.preApprovalExpiry
                          ? new Date(financing.preApprovalExpiry).toISOString().split('T')[0]
                          : ''
                      }
                      onChange={(e) =>
                        setFinancing((prev) => ({
                          ...prev!,
                          preApprovalExpiry: new Date(e.target.value)
                        }))
                      }
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="calculator">
            <Card>
              <CardHeader>
                <CardTitle>Mortgage Calculator</CardTitle>
                <CardDescription>Calculate your estimated monthly payment</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="homePrice">Home Price</Label>
                    <Input
                      id="homePrice"
                      type="number"
                      value={homePrice || ''}
                      onChange={(e) => setHomePrice(Number(e.target.value))}
                      placeholder="$500,000"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="downPaymentCalc">Down Payment</Label>
                    <Input
                      id="downPaymentCalc"
                      type="number"
                      value={downPayment || ''}
                      onChange={(e) => setDownPayment(Number(e.target.value))}
                      placeholder="$100,000"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="interestRateCalc">Interest Rate (%)</Label>
                    <Input
                      id="interestRateCalc"
                      type="number"
                      step="0.01"
                      value={interestRate || ''}
                      onChange={(e) => setInterestRate(Number(e.target.value))}
                      placeholder="6.5"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="loanTerm">Loan Term (years)</Label>
                    <Select
                      value={loanTerm.toString()}
                      onValueChange={(value) => setLoanTerm(Number(value))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="15">15 years</SelectItem>
                        <SelectItem value="20">20 years</SelectItem>
                        <SelectItem value="30">30 years</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="p-6 bg-primary-50 rounded-lg border-2 border-primary-200">
                  <div className="text-center">
                    <p className="text-sm text-gray-600 mb-2">Estimated Monthly Payment</p>
                    <p className="text-4xl font-bold text-primary-600">
                      {formatCurrency(monthlyPayment)}
                    </p>
                    <p className="text-xs text-gray-500 mt-2">
                      Principal & Interest only (excludes taxes, insurance, HOA)
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <p className="text-gray-600">Loan Amount</p>
                    <p className="font-semibold text-lg">{formatCurrency(homePrice - downPayment)}</p>
                  </div>
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <p className="text-gray-600">Down Payment %</p>
                    <p className="font-semibold text-lg">
                      {homePrice > 0 ? ((downPayment / homePrice) * 100).toFixed(1) : 0}%
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </ErrorBoundary>
  );
}