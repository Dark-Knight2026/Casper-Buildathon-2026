import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/hooks/useAuth';
import { useTenantDashboard } from '@/contexts/TenantDashboardContext';
import OnboardingWizard from '@/components/tenant/onboarding/OnboardingWizard';
import EnhancedMessenger from '@/components/tenant/communication/EnhancedMessenger';
import SmartPaymentFeatures from '@/components/tenant/payment/SmartPaymentFeatures';
import CalendarIntegration from '@/components/CalendarIntegration';
import MaintenanceRequestForm from '@/components/tenant/MaintenanceRequestForm';
import PaymentDashboard from '@/components/tenant/PaymentDashboard';
import DocumentLibrary from '@/components/tenant/DocumentLibrary';
import NotificationCenter from '@/components/tenant/NotificationCenter';
import CommunityAnnouncements from '@/components/tenant/CommunityAnnouncements';
import {
  Home,
  DollarSign,
  Calendar,
  Wrench,
  FileText,
  Bell,
  Megaphone,
  Phone,
  Mail,
  MapPin,
  User,
  TrendingUp,
  AlertCircle,
  MessageSquare,
  Sparkles
} from 'lucide-react';

export default function EnhancedTenantDashboardWithOnboarding() {
  const { user } = useAuth();
  const {
    lease,
    dashboardStats,
    maintenanceRequests,
    payments,
    documents,
    notifications,
    announcements
  } = useTenantDashboard();
  
  const [activeTab, setActiveTab] = useState('overview');
  const [showMaintenanceForm, setShowMaintenanceForm] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);

  // Check if user needs onboarding
  useEffect(() => {
    const onboardingComplete = localStorage.getItem('onboarding_complete');
    const isNewTenant = !onboardingComplete; // In production, check from user profile
    setShowOnboarding(isNewTenant);
  }, []);

  const handleOnboardingComplete = () => {
    localStorage.setItem('onboarding_complete', 'true');
    setShowOnboarding(false);
  };

  const unreadNotifications = notifications.filter(n => !n.read).length;
  const openMaintenanceRequests = maintenanceRequests.filter(r => r.status !== 'completed').length;
  const pendingDocuments = documents.filter(d => d.requires_signature && d.signature_status === 'pending').length;

  // Show onboarding wizard for new tenants
  if (showOnboarding) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <OnboardingWizard onComplete={handleOnboardingComplete} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 flex items-center">
                Tenant Dashboard
                <Badge className="ml-3 bg-gradient-to-r from-blue-600 to-purple-600">
                  <Sparkles className="h-3 w-3 mr-1" />
                  Enhanced
                </Badge>
              </h1>
              <p className="text-gray-600 mt-1">
                Welcome back, {user?.name || 'Tenant'}! Manage your rental account and requests.
              </p>
            </div>
            <div className="flex items-center space-x-3">
              <Button
                variant="outline"
                onClick={() => setShowOnboarding(true)}
                size="sm"
              >
                View Onboarding
              </Button>
              {unreadNotifications > 0 && (
                <Button
                  variant="outline"
                  onClick={() => setActiveTab('notifications')}
                  className="relative"
                >
                  <Bell className="h-4 w-4 mr-2" />
                  Notifications
                  <Badge className="ml-2 bg-red-600">{unreadNotifications}</Badge>
                </Button>
              )}
            </div>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-9">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="messages">
              <MessageSquare className="h-4 w-4 mr-2" />
              Messages
            </TabsTrigger>
            <TabsTrigger value="payments">Payments</TabsTrigger>
            <TabsTrigger value="smart-pay">
              <Sparkles className="h-4 w-4 mr-2" />
              Smart Pay
            </TabsTrigger>
            <TabsTrigger value="maintenance">Maintenance</TabsTrigger>
            <TabsTrigger value="documents">Documents</TabsTrigger>
            <TabsTrigger value="notifications">
              Notifications
              {unreadNotifications > 0 && (
                <Badge className="ml-1 bg-red-600 text-xs">{unreadNotifications}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="community">Community</TabsTrigger>
            <TabsTrigger value="lease">Lease Info</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6 mt-6">
            {/* Quick Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Monthly Rent</p>
                      <p className="text-2xl font-bold text-gray-900">
                        ${lease?.monthly_rent.toLocaleString() || '0'}
                      </p>
                    </div>
                    <div className="h-12 w-12 bg-green-100 rounded-full flex items-center justify-center">
                      <DollarSign className="h-6 w-6 text-green-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Next Payment</p>
                      <p className="text-2xl font-bold text-gray-900">
                        {dashboardStats.days_until_payment} days
                      </p>
                    </div>
                    <div className="h-12 w-12 bg-blue-100 rounded-full flex items-center justify-center">
                      <Calendar className="h-6 w-6 text-blue-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Open Requests</p>
                      <p className="text-2xl font-bold text-gray-900">
                        {openMaintenanceRequests}
                      </p>
                    </div>
                    <div className="h-12 w-12 bg-orange-100 rounded-full flex items-center justify-center">
                      <Wrench className="h-6 w-6 text-orange-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Pending Actions</p>
                      <p className="text-2xl font-bold text-gray-900">
                        {pendingDocuments + unreadNotifications}
                      </p>
                    </div>
                    <div className="h-12 w-12 bg-purple-100 rounded-full flex items-center justify-center">
                      <AlertCircle className="h-6 w-6 text-purple-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                  <Button
                    onClick={() => setActiveTab('payments')}
                    className="h-20 flex flex-col items-center justify-center"
                  >
                    <DollarSign className="h-6 w-6 mb-2" />
                    Pay Rent
                  </Button>
                  <Button
                    onClick={() => setActiveTab('messages')}
                    variant="outline"
                    className="h-20 flex flex-col items-center justify-center"
                  >
                    <MessageSquare className="h-6 w-6 mb-2" />
                    Send Message
                  </Button>
                  <Button
                    onClick={() => setShowMaintenanceForm(true)}
                    variant="outline"
                    className="h-20 flex flex-col items-center justify-center"
                  >
                    <Wrench className="h-6 w-6 mb-2" />
                    Request Maintenance
                  </Button>
                  <Button
                    onClick={() => setActiveTab('documents')}
                    variant="outline"
                    className="h-20 flex flex-col items-center justify-center"
                  >
                    <FileText className="h-6 w-6 mb-2" />
                    View Documents
                  </Button>
                  <Button
                    onClick={() => setActiveTab('lease')}
                    variant="outline"
                    className="h-20 flex flex-col items-center justify-center"
                  >
                    <Home className="h-6 w-6 mb-2" />
                    Lease Details
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Recent Activity Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Recent Payments */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>Recent Payments</CardTitle>
                    <Button
                      variant="link"
                      size="sm"
                      onClick={() => setActiveTab('payments')}
                    >
                      View All
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {payments.slice(0, 3).map((payment) => (
                      <div
                        key={payment.id}
                        className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                      >
                        <div>
                          <p className="font-medium">{payment.payment_type}</p>
                          <p className="text-sm text-gray-600">
                            {new Date(payment.due_date).toLocaleDateString()}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold">${payment.total_amount.toLocaleString()}</p>
                          <Badge
                            className={
                              payment.status === 'completed'
                                ? 'bg-green-100 text-green-800'
                                : 'bg-yellow-100 text-yellow-800'
                            }
                          >
                            {payment.status}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Recent Maintenance */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>Maintenance Requests</CardTitle>
                    <Button
                      variant="link"
                      size="sm"
                      onClick={() => setActiveTab('maintenance')}
                    >
                      View All
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {maintenanceRequests.slice(0, 3).map((request) => (
                      <div
                        key={request.id}
                        className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                      >
                        <div>
                          <p className="font-medium">{request.title}</p>
                          <p className="text-sm text-gray-600">{request.category}</p>
                        </div>
                        <Badge
                          className={
                            request.status === 'completed'
                              ? 'bg-green-100 text-green-800'
                              : request.status === 'in_progress'
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-yellow-100 text-yellow-800'
                          }
                        >
                          {request.status}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Community Announcements Preview */}
            {announcements.length > 0 && (
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center">
                      <Megaphone className="h-5 w-5 mr-2" />
                      Latest Announcements
                    </CardTitle>
                    <Button
                      variant="link"
                      size="sm"
                      onClick={() => setActiveTab('community')}
                    >
                      View All
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {announcements.slice(0, 2).map((announcement) => (
                    <div key={announcement.id} className="p-4 bg-gray-50 rounded-lg mb-3">
                      <h4 className="font-semibold mb-1">{announcement.title}</h4>
                      <p className="text-sm text-gray-600">{announcement.content}</p>
                      <p className="text-xs text-gray-500 mt-2">
                        {new Date(announcement.published_at).toLocaleDateString()}
                      </p>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Enhanced Messenger Tab */}
          <TabsContent value="messages" className="mt-6">
            <EnhancedMessenger />
          </TabsContent>

          {/* Payments Tab */}
          <TabsContent value="payments" className="mt-6">
            <PaymentDashboard />
          </TabsContent>

          {/* Smart Payment Features Tab */}
          <TabsContent value="smart-pay" className="mt-6">
            <SmartPaymentFeatures />
          </TabsContent>

          {/* Maintenance Tab */}
          <TabsContent value="maintenance" className="space-y-6 mt-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Maintenance Requests</CardTitle>
                  <Button onClick={() => setShowMaintenanceForm(true)}>
                    <Wrench className="h-4 w-4 mr-2" />
                    New Request
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {maintenanceRequests.map((request) => (
                    <Card key={request.id}>
                      <CardContent className="p-6">
                        <div className="flex items-center justify-between mb-4">
                          <div>
                            <h3 className="text-lg font-semibold">{request.title}</h3>
                            <p className="text-gray-600">{request.description}</p>
                          </div>
                          <div className="text-right space-y-2">
                            <Badge
                              className={
                                request.status === 'completed'
                                  ? 'bg-green-100 text-green-800'
                                  : request.status === 'in_progress'
                                  ? 'bg-blue-100 text-blue-800'
                                  : 'bg-yellow-100 text-yellow-800'
                              }
                            >
                              {request.status}
                            </Badge>
                            <Badge
                              variant="outline"
                              className={
                                request.priority === 'high'
                                  ? 'border-red-500 text-red-700'
                                  : request.priority === 'medium'
                                  ? 'border-yellow-500 text-yellow-700'
                                  : 'border-green-500 text-green-700'
                              }
                            >
                              {request.priority}
                            </Badge>
                          </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                          <div>
                            <p className="text-gray-600">Category</p>
                            <p className="font-medium capitalize">{request.category}</p>
                          </div>
                          <div>
                            <p className="text-gray-600">Submitted</p>
                            <p className="font-medium">
                              {new Date(request.created_at).toLocaleDateString()}
                            </p>
                          </div>
                          {request.assigned_to_name && (
                            <div>
                              <p className="text-gray-600">Assigned To</p>
                              <p className="font-medium">{request.assigned_to_name}</p>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Documents Tab */}
          <TabsContent value="documents" className="mt-6">
            <DocumentLibrary />
          </TabsContent>

          {/* Notifications Tab */}
          <TabsContent value="notifications" className="mt-6">
            <NotificationCenter />
          </TabsContent>

          {/* Community Tab */}
          <TabsContent value="community" className="mt-6">
            <CommunityAnnouncements />
          </TabsContent>

          {/* Lease Info Tab */}
          <TabsContent value="lease" className="space-y-6 mt-6">
            {lease && (
              <Card>
                <CardHeader>
                  <CardTitle>Lease Information</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <h3 className="text-lg font-semibold mb-4">Lease Terms</h3>
                      <div className="space-y-3">
                        <div>
                          <p className="text-sm text-gray-600">Monthly Rent</p>
                          <p className="font-medium text-green-600 text-xl">
                            ${lease.monthly_rent.toLocaleString()}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">Lease Period</p>
                          <p className="font-medium">
                            {new Date(lease.start_date).toLocaleDateString()} to{' '}
                            {new Date(lease.end_date).toLocaleDateString()}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">Security Deposit</p>
                          <p className="font-medium">${lease.security_deposit.toLocaleString()}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">Status</p>
                          <Badge className="bg-green-100 text-green-800 capitalize">
                            {lease.status}
                          </Badge>
                        </div>
                      </div>
                    </div>

                    <div>
                      <h3 className="text-lg font-semibold mb-4">Important Dates</h3>
                      <div className="space-y-3">
                        <div>
                          <p className="text-sm text-gray-600">Lease Expires In</p>
                          <p className="font-medium text-xl">
                            {dashboardStats.lease_expiry_days} days
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">Auto Renewal</p>
                          <p className="font-medium">
                            {lease.auto_renew ? 'Enabled' : 'Disabled'}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex space-x-2 mt-6">
                    <Button variant="outline" onClick={() => setActiveTab('documents')}>
                      <FileText className="h-4 w-4 mr-2" />
                      View Lease Document
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>

        {/* Maintenance Request Form Modal */}
        {showMaintenanceForm && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <MaintenanceRequestForm
                onSuccess={() => setShowMaintenanceForm(false)}
                onCancel={() => setShowMaintenanceForm(false)}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}