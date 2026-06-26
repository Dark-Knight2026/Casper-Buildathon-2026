'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { ErrorBoundary } from '@/components/ui/error-boundary';
import GenericOnboardingTour from '@/components/dashboard/GenericOnboardingTour';
import { TENANT_TOUR_STEPS } from '@/config/tourSteps';
import { 
  Home, 
  DollarSign, 
  FileText, 
  MessageSquare, 
  Settings,
  Calendar,
  Bell,
  Wallet,
  Receipt
} from 'lucide-react';
import BudgetDashboard from '@/components/tenant/BudgetDashboard';
import PaymentDashboard from '@/components/tenant/PaymentDashboard';
import { TaxDocumentVault } from '@/components/buyer/TaxDocumentVault';
import { TaxExpenseTracker } from '@/components/buyer/TaxExpenseTracker';
import { TaxDeductionCalculator } from '@/components/buyer/TaxDeductionCalculator';
import { TaxYearEndSummary } from '@/components/buyer/TaxYearEndSummary';
import { TaxChecklist } from '@/components/buyer/TaxChecklist';
import { TaxDocumentOCR } from '@/components/buyer/TaxDocumentOCR';
import { CPACollaboration } from '@/components/buyer/CPACollaboration';
import { StateTaxGuidance } from '@/components/buyer/StateTaxGuidance';

const EnhancedTenantDashboard = () => {
  const tenantId = 'tenant-123'; // In production, get from auth context
  const [activeTab, setActiveTab] = useState('overview');

  return (
    <ErrorBoundary>
      {/* Onboarding Tour */}
      <GenericOnboardingTour steps={TENANT_TOUR_STEPS} storageKey="tenant-dashboard-tour-completed" />

      <div className="min-h-screen bg-background">
        <div className="container mx-auto p-6">
          <div className="mb-6 flex items-center justify-between" data-tour="overview">
            <div>
              <h1 className="text-3xl font-bold">Tenant Dashboard</h1>
              <p className="text-muted-foreground">
                Manage your rental property, payments, and budget
              </p>
            </div>
            <Button variant="outline" size="icon" data-tour="settings" aria-label="Settings">
              <Settings className="h-5 w-5" />
            </Button>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <TabsList className="grid w-full grid-cols-4 lg:grid-cols-8">
              <TabsTrigger value="overview" className="flex items-center gap-2">
                <Home className="h-4 w-4" />
                <span className="hidden sm:inline">Overview</span>
              </TabsTrigger>
              <TabsTrigger value="budget" className="flex items-center gap-2">
                <Wallet className="h-4 w-4" />
                <span className="hidden sm:inline">Budget</span>
              </TabsTrigger>
              <TabsTrigger value="payments" className="flex items-center gap-2" data-tour="rent-payment">
                <DollarSign className="h-4 w-4" />
                <span className="hidden sm:inline">Payments</span>
              </TabsTrigger>
              <TabsTrigger value="documents" className="flex items-center gap-2" data-tour="lease">
                <FileText className="h-4 w-4" />
                <span className="hidden sm:inline">Documents</span>
              </TabsTrigger>
              <TabsTrigger value="messages" className="flex items-center gap-2" data-tour="messages">
                <MessageSquare className="h-4 w-4" />
                <span className="hidden sm:inline">Messages</span>
              </TabsTrigger>
              <TabsTrigger value="maintenance" className="flex items-center gap-2" data-tour="maintenance">
                <Calendar className="h-4 w-4" />
                <span className="hidden sm:inline">Maintenance</span>
              </TabsTrigger>
              <TabsTrigger value="taxes" className="flex items-center gap-2">
                <Receipt className="h-4 w-4" />
                <span className="hidden sm:inline">Tax Center</span>
              </TabsTrigger>
              <TabsTrigger value="settings" className="flex items-center gap-2">
                <Settings className="h-4 w-4" />
                <span className="hidden sm:inline">Settings</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card className="cursor-pointer hover:bg-accent/50 transition-colors" onClick={() => setActiveTab('payments')}>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Rent Due</CardTitle>
                    <DollarSign className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">$1,500</div>
                    <p className="text-xs text-muted-foreground">Due in 5 days</p>
                  </CardContent>
                </Card>

                <Card className="cursor-pointer hover:bg-accent/50 transition-colors" onClick={() => setActiveTab('budget')}>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Monthly Budget</CardTitle>
                    <Wallet className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">$2,900</div>
                    <p className="text-xs text-muted-foreground">$2,100 remaining</p>
                  </CardContent>
                </Card>

                <Card className="cursor-pointer hover:bg-accent/50 transition-colors" onClick={() => setActiveTab('maintenance')}>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Maintenance</CardTitle>
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">2</div>
                    <p className="text-xs text-muted-foreground">Active requests</p>
                  </CardContent>
                </Card>

                <Card className="cursor-pointer hover:bg-accent/50 transition-colors" onClick={() => setActiveTab('messages')}>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Messages</CardTitle>
                    <Bell className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">3</div>
                    <p className="text-xs text-muted-foreground">Unread messages</p>
                  </CardContent>
                </Card>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Property Information</CardTitle>
                    <CardDescription>Your current rental property details</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Address:</span>
                      <span className="font-medium">123 Main St, Apt 4B</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Lease Start:</span>
                      <span className="font-medium">Jan 1, 2024</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Lease End:</span>
                      <span className="font-medium">Dec 31, 2024</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Monthly Rent:</span>
                      <span className="font-medium">$1,500</span>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Recent Activity</CardTitle>
                    <CardDescription>Your latest transactions and updates</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-start gap-3">
                      <div className="p-2 bg-green-100 text-green-600 rounded-full">
                        <DollarSign className="h-4 w-4" />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium">Rent Payment Received</p>
                        <p className="text-xs text-muted-foreground">2 days ago</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="p-2 bg-blue-100 text-blue-600 rounded-full">
                        <MessageSquare className="h-4 w-4" />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium">New Message from Landlord</p>
                        <p className="text-xs text-muted-foreground">3 days ago</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="p-2 bg-orange-100 text-orange-600 rounded-full">
                        <Calendar className="h-4 w-4" />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium">Maintenance Request Updated</p>
                        <p className="text-xs text-muted-foreground">5 days ago</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="budget">
              <BudgetDashboard tenantId={tenantId} />
            </TabsContent>

            <TabsContent value="payments">
              <PaymentDashboard />
            </TabsContent>

            <TabsContent value="documents">
              <Card>
                <CardHeader>
                  <CardTitle>Documents</CardTitle>
                  <CardDescription>View and manage your rental documents</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">Document management coming soon...</p>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="messages">
              <Card>
                <CardHeader>
                  <CardTitle>Messages</CardTitle>
                  <CardDescription>Communicate with your landlord and property manager</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">Messaging system coming soon...</p>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="maintenance">
              <Card>
                <CardHeader>
                  <CardTitle>Maintenance Requests</CardTitle>
                  <CardDescription>Submit and track maintenance requests</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">Maintenance request system coming soon...</p>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="taxes" className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-6">
                  <TaxYearEndSummary />
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <TaxDeductionCalculator />
                    <TaxExpenseTracker />
                  </div>
                  <StateTaxGuidance />
                </div>
                <div className="space-y-6">
                  <TaxChecklist />
                  <TaxDocumentVault />
                  <TaxDocumentOCR />
                  <CPACollaboration />
                </div>
              </div>
            </TabsContent>

            <TabsContent value="settings">
              <Card>
                <CardHeader>
                  <CardTitle>Settings</CardTitle>
                  <CardDescription>Manage your account preferences</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">Settings panel coming soon...</p>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </ErrorBoundary>
  );
};

export default EnhancedTenantDashboard;