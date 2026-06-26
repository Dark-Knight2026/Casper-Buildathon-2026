import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import InteractiveRevenueChart from '@/components/analytics/InteractiveRevenueChart';
import InteractiveExpenseChart from '@/components/analytics/InteractiveExpenseChart';
import { TrendingUp, Receipt, BarChart3, Download } from 'lucide-react';

export default function AnalyticsDashboard() {
  const [activeTab, setActiveTab] = useState('revenue');

  const handleExportData = () => {
    // Mock export functionality
    alert('Export functionality would download data as CSV/Excel');
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Analytics Dashboard</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Interactive financial analysis with drill-down capabilities
          </p>
        </div>
        <Button onClick={handleExportData}>
          <Download className="h-4 w-4 mr-2" />
          Export Data
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="revenue" className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Revenue Analysis
          </TabsTrigger>
          <TabsTrigger value="expenses" className="flex items-center gap-2">
            <Receipt className="h-4 w-4" />
            Expense Analysis
          </TabsTrigger>
        </TabsList>

        <TabsContent value="revenue" className="space-y-6">
          <InteractiveRevenueChart />
        </TabsContent>

        <TabsContent value="expenses" className="space-y-6">
          <InteractiveExpenseChart />
        </TabsContent>
      </Tabs>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-8">
        <div className="p-6 bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 rounded-lg">
          <div className="flex items-center gap-3 mb-3">
            <BarChart3 className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            <h3 className="font-semibold text-blue-900 dark:text-blue-100">Interactive Charts</h3>
          </div>
          <p className="text-sm text-blue-800 dark:text-blue-200">
            Click on any data point to drill down into detailed breakdowns and property-level analysis.
          </p>
        </div>

        <div className="p-6 bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 rounded-lg">
          <div className="flex items-center gap-3 mb-3">
            <TrendingUp className="h-6 w-6 text-green-600 dark:text-green-400" />
            <h3 className="font-semibold text-green-900 dark:text-green-100">Trend Analysis</h3>
          </div>
          <p className="text-sm text-green-800 dark:text-green-200">
            View historical trends and identify patterns in revenue and expenses over time.
          </p>
        </div>

        <div className="p-6 bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 rounded-lg">
          <div className="flex items-center gap-3 mb-3">
            <Receipt className="h-6 w-6 text-purple-600 dark:text-purple-400" />
            <h3 className="font-semibold text-purple-900 dark:text-purple-100">Category Breakdown</h3>
          </div>
          <p className="text-sm text-purple-800 dark:text-purple-200">
            Explore expense categories and subcategories to identify cost-saving opportunities.
          </p>
        </div>
      </div>
    </div>
  );
}