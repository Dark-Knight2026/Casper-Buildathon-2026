import { lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from '@/components/ui/toaster';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { AuthProvider } from '@/contexts/AuthContext';
import ProtectedRoute from '@/components/ProtectedRoute';
import SkipNavigation from '@/components/layout/SkipNavigation';
import { AuthWalletLayout } from '@/components/auth/AuthWalletLayout';
import { ComingSoon } from '@/components/common/ComingSoon';
import { MFA_ENABLED } from '@/lib/featureFlags';

// Eagerly load auth pages (critical for initial load)
import Login from '@/pages/auth/Login';
import Register from '@/pages/auth/Register';

// Eagerly load public landing page
import PropertyLanding from '@/pages/PropertyLanding';

// Lazy load auth pages
const MFASetup = lazy(() => import('@/pages/auth/MFASetup'));
const MFAVerify = lazy(() => import('@/pages/auth/MFAVerify'));
const HelpHub = lazy(() => import('@/pages/HelpHub'));

import TenantLayout from '@/components/layout/TenantLayout';
import PublicLayout from '@/components/layout/PublicLayout';

// Lazy load tenant pages
const TenantDashboard = lazy(() => import('@/pages/tenant/TenantDashboard').then(m => ({ default: m.TenantDashboard })));
const TenantLeases = lazy(() => import('@/pages/tenant/TenantLeases').then(m => ({ default: m.TenantLeases })));
const TenantLeaseDetail = lazy(() => import('@/pages/tenant/TenantLeaseDetail').then(m => ({ default: m.TenantLeaseDetail })));
const TenantPayments = lazy(() => import('@/pages/tenant/TenantPayments').then(m => ({ default: m.TenantPayments })));
const PaymentMethods = lazy(() => import('@/pages/tenant/PaymentMethods'));
const MakePayment = lazy(() => import('@/pages/tenant/MakePayment'));
const TenantMaintenance = lazy(() => import('@/pages/tenant/TenantMaintenance').then(m => ({ default: m.TenantMaintenance })));
const TenantMaintenanceDetail = lazy(() => import('@/pages/tenant/TenantMaintenanceDetail'));
const TenantRenewals = lazy(() => import('@/pages/tenant/TenantRenewals'));
const TenantRenewalDetail = lazy(() => import('@/pages/tenant/TenantRenewalDetail'));
const TenantProfile = lazy(() => import('@/pages/tenant/TenantProfile').then(m => ({ default: m.TenantProfile })));
const TenantRecommended = lazy(() => import('@/pages/tenant/TenantRecommended'));
const TenantScore = lazy(() => import('@/pages/tenant/TenantScore'));

// Lazy load tenant property search pages (PUBLIC ACCESS for browsing)
const PropertySearch = lazy(() => import('@/pages/tenant/PropertySearch'));
const TenantPropertyDetail = lazy(() => import('@/pages/tenant/PropertyDetail'));
const MyProperties = lazy(() => import('@/pages/tenant/MyProperties'));
const MyPropertyDetail = lazy(() => import('@/pages/tenant/MyPropertyDetail'));

// Lazy load tenant property interaction pages
const SavedProperties = lazy(() => import('@/pages/tenant/SavedProperties'));
const MyApplications = lazy(() => import('@/pages/tenant/MyApplications'));
const MyViewings = lazy(() => import('@/pages/tenant/MyViewings'));

// Lazy load tenant application pages
const TenantApplication = lazy(() => import('@/pages/tenant/application/TenantApplication'));

// Lazy load tenant maintenance pages
const MaintenanceRequestCreate = lazy(() => import('@/pages/tenant/maintenance/MaintenanceRequestCreate'));
const MaintenanceRequestList = lazy(() => import('@/pages/tenant/maintenance/MaintenanceRequestList'));
const MaintenanceRequestDetail = lazy(() => import('@/pages/tenant/maintenance/MaintenanceRequestDetail'));

// Lazy load tenant renewal pages
const TenantRenewalOfferList = lazy(() => import('@/pages/tenant/renewals/TenantRenewalOfferList'));
const TenantRenewalOfferView = lazy(() => import('@/pages/tenant/renewals/TenantRenewalOfferView'));
const TenantRenewalNegotiation = lazy(() => import('@/pages/tenant/renewals/TenantRenewalNegotiation'));

// Lazy load landlord pages
const LandlordDashboard = lazy(() => import('@/pages/landlord/LandlordDashboard'));
const LandlordTenants = lazy(() => import('@/pages/landlord/LandlordTenants'));
const LandlordLeases = lazy(() => import('@/pages/landlord/LandlordLeases'));
const LandlordPayments = lazy(() => import('@/pages/landlord/LandlordPayments'));
const LandlordMaintenance = lazy(() => import('@/pages/landlord/LandlordMaintenance'));
const LandlordRenewals = lazy(() => import('@/pages/landlord/LandlordRenewals'));
const LandlordRenewalDetail = lazy(() => import('@/pages/landlord/LandlordRenewalDetail'));

// Lazy load landlord application pages
const ApplicationList = lazy(() => import('@/pages/landlord/applications/ApplicationList'));
const ApplicationDetail = lazy(() => import('@/pages/landlord/applications/ApplicationDetail'));

// Lazy load landlord maintenance pages
const MaintenanceRequestDashboard = lazy(() => import('@/pages/landlord/maintenance/MaintenanceRequestDashboard'));
const LandlordMaintenanceRequestDetail = lazy(() => import('@/pages/landlord/maintenance/MaintenanceRequestDetail'));

// Lazy load landlord renewal pages
const RenewalOfferList = lazy(() => import('@/pages/landlord/renewals/RenewalOfferList'));
const RenewalOfferCreate = lazy(() => import('@/pages/landlord/renewals/RenewalOfferCreate'));
const LandlordRenewalDetailPage = lazy(() => import('@/pages/landlord/renewals/LandlordRenewalDetail'));
const LandlordRenewalNegotiation = lazy(() => import('@/pages/landlord/renewals/LandlordRenewalNegotiation'));

// Lazy load landlord lease pages
const LeaseCreationWizard = lazy(() => import('@/pages/landlord/lease/LeaseCreationWizard'));

// Lazy load communication pages
const CommunicationCenter = lazy(() => import('@/pages/communication/CommunicationCenter'));

// Lazy load notification pages
const NotificationHistory = lazy(() => import('@/pages/notifications/NotificationHistory'));
const NotificationPreferences = lazy(() => import('@/pages/notifications/NotificationPreferences'));

// Lazy load financial pages
const FinancialDashboard = lazy(() => import('@/pages/financial/FinancialDashboard'));

// Lazy load signature pages
const DocumentSigning = lazy(() => import('@/pages/signature/DocumentSigning'));

// Lazy load vendor pages
const VendorDirectory = lazy(() => import('@/pages/vendor/VendorDirectory'));

// Lazy load payment pages
const PaymentHistory = lazy(() => import('@/pages/payment/PaymentHistory'));

// Lazy load property pages
const PropertyList = lazy(() => import('@/pages/landlord/properties/PropertyList'));
const PropertyCreate = lazy(() => import('@/pages/landlord/properties/PropertyCreate'));
const PropertyDetail = lazy(() => import('@/pages/landlord/properties/PropertyDetail'));
const PropertyEdit = lazy(() => import('@/pages/landlord/properties/PropertyEdit'));
const PropertyComparisonPage = lazy(() => import('@/pages/property/PropertyComparisonPage'));

// Lazy load dashboard pages
const LeasePipeline = lazy(() => import('@/pages/dashboard/leasing/LeasePipeline').then(m => ({ default: m.LeasePipeline })));

// Lazy load report pages
const AnalyticsDashboard = lazy(() => import('@/pages/reports/AnalyticsDashboard'));
const PropertyReports = lazy(() => import('@/pages/reports/PropertyReports'));
const CustomDashboard = lazy(() => import('@/pages/reports/CustomDashboard'));
const CustomReportBuilder = lazy(() => import('@/pages/reports/CustomReportBuilder'));

// Lazy load automation pages
const AutomationDashboard = lazy(() => import('@/pages/automation/AutomationDashboard'));

// Lazy load performance pages
const PerformanceDashboard = lazy(() => import('@/pages/performance/PerformanceDashboard'));

// Lazy load accessibility pages
const AccessibilityTestPage = lazy(() => import('@/pages/accessibility/AccessibilityTestPage'));

// Lazy load ICO pages
const ICOPage = lazy(() => import('@/pages/ico/ICOPage'));
const ICOWhitepaperPage = lazy(() => import('@/pages/ico/ICOWhitepaperPage'));
const ICOLayout = lazy(() => import('@/pages/ico/ICOLayout'));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
      staleTime: 5 * 60 * 1000, // 5 minutes
      gcTime: 10 * 60 * 1000, // 10 minutes
    },
  },
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Router>
          <SkipNavigation />
          <Suspense fallback={<LoadingSpinner fullScreen />}>
            <Routes>
              {/* 
                PUBLIC ROUTES - No authentication required
                Users can browse properties and explore the platform before signing up
              */}
              
              {/* Landing Page - Default route for all visitors */}
              <Route path="/" element={<PropertyLanding />} />

              {/* Onboarding hub — public, role-agnostic entry point for new users. */}
              <Route path="/help" element={<HelpHub />} />

              {/* Property Browsing - Public access for exploration, wrapped with the
                  same landing header so navigation persists across browse/detail views. */}
              <Route element={<PublicLayout />}>
                <Route path="/listings" element={<PropertySearch />} />
                <Route path="/properties" element={<PropertySearch />} />
                <Route path="/properties/:id" element={<TenantPropertyDetail />} />
              </Route>

              {/* ICO Pages - Public access for token sale, wrapped with Casper wallet provider */}
              <Route path="/ico" element={<ICOLayout><ICOPage /></ICOLayout>} />
              <Route path="/ico/whitepaper" element={<ICOLayout><ICOWhitepaperPage /></ICOLayout>} />
              
              {/* 
                AUTHENTICATION ROUTES
                Sign up and login pages
              */}
              <Route path="/auth/login" element={<AuthWalletLayout><Login /></AuthWalletLayout>} />
              <Route path="/auth/register" element={<AuthWalletLayout><Register /></AuthWalletLayout>} />
              <Route
                path="/auth/mfa-setup"
                element={
                  MFA_ENABLED
                    ? <MFASetup />
                    : <ComingSoon title="MFA coming soon" description="Multi-factor authentication will be available once the backend enrollment flow is finalized." />
                }
              />
              <Route
                path="/auth/mfa-verify"
                element={
                  MFA_ENABLED
                    ? <MFAVerify />
                    : <ComingSoon title="MFA coming soon" description="Multi-factor authentication will be available once the backend enrollment flow is finalized." />
                }
              />
              
              {/*
                TENANT ROUTES - Protected
                Single ProtectedRoute on the parent — TenantLayout renders <Outlet />
              */}
              <Route
                path="/tenant"
                element={
                  <ProtectedRoute allowedRoles={['tenant']}>
                    <TenantLayout />
                  </ProtectedRoute>
                }
              >
                <Route index element={<Navigate to="/tenant/dashboard" replace />} />
                <Route path="dashboard"             element={<TenantDashboard />} />
                <Route path="property-search"       element={<PropertySearch />} />
                <Route path="properties"            element={<MyProperties />} />
                <Route path="properties/:id"        element={<MyPropertyDetail />} />
                <Route path="recommended"           element={<TenantRecommended />} />
                <Route path="score"                 element={<TenantScore />} />
                <Route path="saved-properties"      element={<SavedProperties />} />
                <Route path="my-applications"       element={<MyApplications />} />
                <Route path="my-viewings"           element={<MyViewings />} />
                <Route path="apply"                 element={<TenantApplication />} />
                <Route path="leases"                element={<TenantLeases />} />
                <Route path="leases/:leaseId"       element={<TenantLeaseDetail />} />
                <Route path="payments"              element={<TenantPayments />} />
                <Route path="payments/methods"      element={<PaymentMethods />} />
                <Route path="payments/make"         element={<MakePayment />} />
                <Route path="maintenance"           element={<MaintenanceRequestList />} />
                <Route path="maintenance/create"    element={<MaintenanceRequestCreate />} />
                <Route path="maintenance/:id"       element={<MaintenanceRequestDetail />} />
                <Route path="renewals"              element={<TenantRenewalOfferList />} />
                <Route path="renewals/:id"          element={<TenantRenewalOfferView />} />
                <Route path="renewals/:id/negotiate" element={<TenantRenewalNegotiation />} />
                <Route path="messages"             element={<CommunicationCenter />} />
                <Route path="profile"              element={<TenantProfile />} />
              </Route>
              
              {/*
                SHARED ROUTES - Both tenant and landlord can access
                Requires authentication but allows multiple roles
              */}
              {/* TODO: add /landlord/messages route inside landlord layout */}
              
              {/* Notification routes - Accessible by both roles */}
              <Route 
                path="/notifications" 
                element={
                  <ProtectedRoute allowedRoles={['both']}>
                    <NotificationHistory />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/notifications/preferences" 
                element={
                  <ProtectedRoute allowedRoles={['both']}>
                    <NotificationPreferences />
                  </ProtectedRoute>
                } 
              />
              
              {/* Financial Dashboard - Accessible by landlords only */}
              <Route 
                path="/financial/dashboard" 
                element={
                  <ProtectedRoute allowedRoles={['landlord']}>
                    <FinancialDashboard />
                  </ProtectedRoute>
                } 
              />
              
              {/* Payment History - Accessible by both roles */}
              <Route 
                path="/payments/history" 
                element={
                  <ProtectedRoute allowedRoles={['both']}>
                    <PaymentHistory />
                  </ProtectedRoute>
                } 
              />
              
              {/* Property Comparison - Accessible by both roles */}
              <Route 
                path="/properties/compare" 
                element={
                  <ProtectedRoute allowedRoles={['both']}>
                    <PropertyComparisonPage />
                  </ProtectedRoute>
                } 
              />
              
              {/* Accessibility Testing - Accessible by both roles */}
              <Route 
                path="/accessibility/test" 
                element={
                  <ProtectedRoute allowedRoles={['both']}>
                    <AccessibilityTestPage />
                  </ProtectedRoute>
                } 
              />
              
              {/* E-Signature - Accessible by both roles */}
              <Route 
                path="/signature/:signatureId" 
                element={
                  <ProtectedRoute allowedRoles={['both']}>
                    <DocumentSigning />
                  </ProtectedRoute>
                } 
              />
              
              {/* Vendor Management - Accessible by landlords only */}
              <Route 
                path="/landlord/vendors" 
                element={
                  <ProtectedRoute allowedRoles={['landlord']}>
                    <VendorDirectory />
                  </ProtectedRoute>
                } 
              />
              
              {/* 
                LANDLORD ROUTES - Protected
                Requires authentication and landlord role
              */}
              <Route path="/landlord">
                <Route index element={<Navigate to="/landlord/dashboard" replace />} />
                <Route 
                  path="dashboard" 
                  element={
                    <ProtectedRoute allowedRoles={['landlord']}>
                      <LandlordDashboard />
                    </ProtectedRoute>
                  } 
                />
                <Route 
                  path="properties" 
                  element={
                    <ProtectedRoute allowedRoles={['landlord']}>
                      <PropertyList />
                    </ProtectedRoute>
                  } 
                />
                <Route 
                  path="properties/create" 
                  element={
                    <ProtectedRoute allowedRoles={['landlord']}>
                      <PropertyCreate />
                    </ProtectedRoute>
                  } 
                />
                <Route 
                  path="properties/:id" 
                  element={
                    <ProtectedRoute allowedRoles={['landlord']}>
                      <PropertyDetail />
                    </ProtectedRoute>
                  } 
                />
                <Route 
                  path="properties/:id/edit" 
                  element={
                    <ProtectedRoute allowedRoles={['landlord']}>
                      <PropertyEdit />
                    </ProtectedRoute>
                  } 
                />
                
                {/* Landlord Application Routes */}
                <Route 
                  path="applications" 
                  element={
                    <ProtectedRoute allowedRoles={['landlord']}>
                      <ApplicationList />
                    </ProtectedRoute>
                  } 
                />
                <Route 
                  path="applications/:id" 
                  element={
                    <ProtectedRoute allowedRoles={['landlord']}>
                      <ApplicationDetail />
                    </ProtectedRoute>
                  } 
                />
                
                <Route 
                  path="tenants" 
                  element={
                    <ProtectedRoute allowedRoles={['landlord']}>
                      <LandlordTenants />
                    </ProtectedRoute>
                  } 
                />
                <Route 
                  path="tenants/:tenantId" 
                  element={
                    <ProtectedRoute allowedRoles={['landlord']}>
                      <LandlordTenants />
                    </ProtectedRoute>
                  } 
                />
                
                {/* Landlord Lease Routes */}
                <Route 
                  path="leases" 
                  element={
                    <ProtectedRoute allowedRoles={['landlord']}>
                      <LandlordLeases />
                    </ProtectedRoute>
                  } 
                />
                <Route 
                  path="leases/create" 
                  element={
                    <ProtectedRoute allowedRoles={['landlord']}>
                      <LeaseCreationWizard />
                    </ProtectedRoute>
                  } 
                />
                <Route 
                  path="leases/:leaseId" 
                  element={
                    <ProtectedRoute allowedRoles={['landlord']}>
                      <LandlordLeases />
                    </ProtectedRoute>
                  } 
                />
                
                <Route 
                  path="payments" 
                  element={
                    <ProtectedRoute allowedRoles={['landlord']}>
                      <LandlordPayments />
                    </ProtectedRoute>
                  } 
                />
                <Route 
                  path="maintenance" 
                  element={
                    <ProtectedRoute allowedRoles={['landlord']}>
                      <MaintenanceRequestDashboard />
                    </ProtectedRoute>
                  } 
                />
                <Route 
                  path="maintenance/:id" 
                  element={
                    <ProtectedRoute allowedRoles={['landlord']}>
                      <LandlordMaintenanceRequestDetail />
                    </ProtectedRoute>
                  } 
                />
                <Route 
                  path="renewals" 
                  element={
                    <ProtectedRoute allowedRoles={['landlord']}>
                      <RenewalOfferList />
                    </ProtectedRoute>
                  } 
                />
                <Route 
                  path="renewals/create" 
                  element={
                    <ProtectedRoute allowedRoles={['landlord']}>
                      <RenewalOfferCreate />
                    </ProtectedRoute>
                  } 
                />
                <Route 
                  path="renewals/:id" 
                  element={
                    <ProtectedRoute allowedRoles={['landlord']}>
                      <LandlordRenewalDetailPage />
                    </ProtectedRoute>
                  } 
                />
                <Route 
                  path="renewals/:id/negotiate" 
                  element={
                    <ProtectedRoute allowedRoles={['landlord']}>
                      <LandlordRenewalNegotiation />
                    </ProtectedRoute>
                  } 
                />
              </Route>
              
              {/* Dashboard routes - Protected (accessible by both roles) */}
              <Route 
                path="/dashboard/leasing/pipeline" 
                element={
                  <ProtectedRoute allowedRoles={['both']}>
                    <LeasePipeline />
                  </ProtectedRoute>
                } 
              />
              
              {/* Report routes - Protected (accessible by landlords and admins) */}
              <Route 
                path="/reports/analytics" 
                element={
                  <ProtectedRoute allowedRoles={['landlord', 'admin']}>
                    <AnalyticsDashboard />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/reports/properties" 
                element={
                  <ProtectedRoute allowedRoles={['landlord', 'admin']}>
                    <PropertyReports />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/reports/custom" 
                element={
                  <ProtectedRoute allowedRoles={['landlord', 'admin']}>
                    <CustomDashboard />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/reports/builder" 
                element={
                  <ProtectedRoute allowedRoles={['landlord', 'admin']}>
                    <CustomReportBuilder />
                  </ProtectedRoute>
                } 
              />
              
              {/* Automation routes - Protected (accessible by landlords and admins) */}
              <Route 
                path="/automation" 
                element={
                  <ProtectedRoute allowedRoles={['landlord', 'admin']}>
                    <AutomationDashboard />
                  </ProtectedRoute>
                } 
              />
              
              {/* Performance routes - Protected (accessible by landlords and admins) */}
              <Route 
                path="/performance" 
                element={
                  <ProtectedRoute allowedRoles={['landlord', 'admin']}>
                    <PerformanceDashboard />
                  </ProtectedRoute>
                } 
              />
              
              {/* 
                CATCH-ALL ROUTE
                Redirect unknown routes to landing page instead of login
                This allows users to explore even if they mistype a URL
              */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Suspense>
          <Toaster />
        </Router>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;