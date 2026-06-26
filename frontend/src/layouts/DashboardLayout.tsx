import React, { useState, useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Sidebar } from '@/components/dashboard/Sidebar';
import { Header } from '@/components/dashboard/Header';
import { BottomNav } from '@/components/common/BottomNav';
import { useMobileDetection } from '@/hooks/useMobileDetection';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import { Home, Building, Calendar, User, FileText, Settings, ListPlus } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

export const DashboardLayout: React.FC = () => {
  const { isMobile } = useMobileDetection();
  const { user } = useAuth();
  const location = useLocation();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  // Initialize global keyboard shortcuts
  useKeyboardShortcuts();

  // Close sidebar on route change for mobile
  useEffect(() => {
    if (isMobile) {
      setIsSidebarOpen(false);
    }
  }, [location.pathname, isMobile]);

  const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);
  const toggleCollapse = () => setIsSidebarCollapsed(!isSidebarCollapsed);

  // Determine bottom nav items based on user role
  const getBottomNavItems = () => {
    const basePath = location.pathname.split('/')[1]; // e.g., 'agent-dashboard', 'broker-dashboard'
    
    if (basePath === 'agent-dashboard') {
      return [
        { href: '/agent-dashboard', icon: Home, label: 'Overview', exact: true },
        { href: '/agent-dashboard/listings', icon: Building, label: 'Listings' },
        { href: '/agent-dashboard/calendar', icon: Calendar, label: 'Calendar' },
        { href: '/agent-dashboard/clients', icon: User, label: 'Clients' },
      ];
    } else if (basePath === 'broker-dashboard') {
      return [
        { href: '/broker-dashboard', icon: Home, label: 'Overview', exact: true },
        { href: '/broker-dashboard/agents', icon: User, label: 'Agents' },
        { href: '/broker-dashboard/transactions', icon: FileText, label: 'Deals' },
        { href: '/broker-dashboard/calendar', icon: Calendar, label: 'Calendar' },
      ];
    } else if (basePath === 'buyer-dashboard') {
      return [
        { href: '/buyer-dashboard', icon: Home, label: 'Overview', exact: true },
        { href: '/buyer-dashboard/search', icon: Building, label: 'Search' },
        { href: '/buyer-dashboard/listings', icon: ListPlus, label: 'Listings' },
        { href: '/buyer-dashboard/offers', icon: FileText, label: 'Offers' },
      ];
    } else if (basePath === 'tenant-dashboard') {
      return [
        { href: '/tenant-dashboard', icon: Home, label: 'Overview', exact: true },
        { href: '/tenant-dashboard/leases', icon: FileText, label: 'Leases' },
        { href: '/tenant-dashboard/payments', icon: Settings, label: 'Payments' },
        { href: '/tenant-dashboard/maintenance', icon: Settings, label: 'Requests' },
      ];
    } else if (basePath === 'seller-dashboard') {
      return [
        { href: '/seller-dashboard', icon: Home, label: 'Overview', exact: true },
        { href: '/seller-dashboard/properties', icon: Building, label: 'Properties' },
        { href: '/seller-dashboard/offers', icon: FileText, label: 'Offers' },
        { href: '/seller-dashboard/analytics', icon: Settings, label: 'Analytics' },
      ];
    }
    
    // Default landlord dashboard
    return [
      { href: '/dashboard', icon: Home, label: 'Overview', exact: true },
      { href: '/properties', icon: Building, label: 'Properties' },
      { href: '/tenants', icon: User, label: 'Tenants' },
      { href: '/leases', icon: FileText, label: 'Leases' },
    ];
  };

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      <Sidebar 
        isOpen={isSidebarOpen} 
        isCollapsed={isSidebarCollapsed} 
        toggleCollapse={toggleCollapse}
        isMobile={isMobile}
        closeMobileSidebar={() => setIsSidebarOpen(false)}
      />
      
      <div className="flex-1 flex flex-col overflow-hidden w-full">
        <Header onMenuClick={toggleSidebar} />
        
        <main className="flex-1 overflow-y-auto bg-gray-50/50 dark:bg-gray-900/50 p-3 sm:p-4 md:p-6 pb-20 md:pb-6">
          <Outlet />
        </main>

        {/* Bottom Navigation for Mobile */}
        {isMobile && <BottomNav items={getBottomNavItems()} />}
      </div>
    </div>
  );
};