/**
 * Automation Dashboard Page
 * Main page for managing all automation features
 */

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Calendar, DollarSign, FileText, Activity } from 'lucide-react';
import { RenewalScheduleSettings } from '@/components/automation/RenewalScheduleSettings';
import { RenewalOffersList } from '@/components/automation/RenewalOffersList';
import { PaymentReconciliation } from '@/components/automation/PaymentReconciliation';
import { LateFeeSettings } from '@/components/automation/LateFeeSettings';
import { LateFeesList } from '@/components/automation/LateFeesList';

export default function AutomationDashboard() {
  const [activeTab, setActiveTab] = useState('renewals');

  return (
    <div className="container mx-auto py-8 max-w-7xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Automation Dashboard</h1>
        <p className="text-gray-600">Manage automated lease renewals, payment reconciliation, and late fees</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-2">
              <Calendar className="h-8 w-8 text-blue-600" />
              <Badge>Active</Badge>
            </div>
            <h3 className="font-semibold text-lg mb-1">Lease Renewals</h3>
            <p className="text-sm text-gray-600">Automated renewal offers</p>
            <p className="text-2xl font-bold mt-2">2 Pending</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-2">
              <FileText className="h-8 w-8 text-green-600" />
              <Badge>Active</Badge>
            </div>
            <h3 className="font-semibold text-lg mb-1">Reconciliation</h3>
            <p className="text-sm text-gray-600">Payment matching</p>
            <p className="text-2xl font-bold mt-2">86.7% Match</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-2">
              <DollarSign className="h-8 w-8 text-red-600" />
              <Badge>Active</Badge>
            </div>
            <h3 className="font-semibold text-lg mb-1">Late Fees</h3>
            <p className="text-sm text-gray-600">Automated fee application</p>
            <p className="text-2xl font-bold mt-2">3 Applied</p>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="renewals">
            <Calendar className="mr-2 h-4 w-4" />
            Lease Renewals
          </TabsTrigger>
          <TabsTrigger value="reconciliation">
            <FileText className="mr-2 h-4 w-4" />
            Reconciliation
          </TabsTrigger>
          <TabsTrigger value="late-fees">
            <DollarSign className="mr-2 h-4 w-4" />
            Late Fees
          </TabsTrigger>
        </TabsList>

        <TabsContent value="renewals" className="mt-6 space-y-6">
          <RenewalScheduleSettings />
          <RenewalOffersList />
        </TabsContent>

        <TabsContent value="reconciliation" className="mt-6">
          <PaymentReconciliation />
        </TabsContent>

        <TabsContent value="late-fees" className="mt-6 space-y-6">
          <LateFeeSettings />
          <LateFeesList />
        </TabsContent>
      </Tabs>
    </div>
  );
}