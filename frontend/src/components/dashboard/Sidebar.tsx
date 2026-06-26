import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  ChevronLeft
} from 'lucide-react';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { useAuth } from '@/hooks/useAuth';
import { 
  landlordNavItems, 
  tenantNavItems, 
  agentNavItems,
  brokerNavItems,
  buyerNavItems,
  sellerNavItems
} from '@/config/dashboardNav';

interface SidebarProps {
  isOpen: boolean;
  isCollapsed: boolean;
  toggleCollapse: () => void;
  isMobile: boolean;
  closeMobileSidebar: () => void;
}

export const SidebarContent: React.FC<{ isCollapsed: boolean }> = ({ isCollapsed }) => {
  const { user } = useAuth();
  const location = useLocation();
  const path = location.pathname;
  
  let navItems = landlordNavItems;
  let title = "Landlord";
  
  // Determine nav items based on user role OR current path
  // Path-based fallback ensures the sidebar matches the dashboard context
  if (user?.role === 'tenant' || path.startsWith('/tenant-dashboard')) {
    navItems = tenantNavItems;
    title = "Tenant";
  } else if (user?.role === 'agent' || path.startsWith('/agent-dashboard')) {
    navItems = agentNavItems;
    title = "Agent";
  } else if (user?.role === 'broker' || path.startsWith('/broker-dashboard')) {
    navItems = brokerNavItems;
    title = "Broker";
  } else if (user?.role === 'buyer' || path.startsWith('/buyer-dashboard')) {
    navItems = buyerNavItems;
    title = "Buyer";
  } else if (user?.role === 'seller' || path.startsWith('/seller-dashboard')) {
    navItems = sellerNavItems;
    title = "Seller";
  }

  return (
    <div className="flex flex-col h-full py-4">
      <div className={cn("px-4 mb-6 flex items-center", isCollapsed ? "justify-center" : "justify-between")}>
        {!isCollapsed && <span className="text-xl font-bold">{title}<span className="text-blue-600">Pro</span></span>}
      </div>
      
      <ScrollArea className="flex-1 px-2">
        <div className="space-y-6">
          {navItems.map((group, i) => (
            <div key={i} className="px-2">
              {!isCollapsed && (
                <h4 className="mb-2 text-xs font-semibold text-muted-foreground tracking-wider uppercase">
                  {group.group}
                </h4>
              )}
              <div className="space-y-1">
                {group.items.map((item) => (
                  <NavLink
                    key={item.href}
                    to={item.href}
                    end={item.exact}
                    className={({ isActive }) => cn(
                      "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-all hover:bg-accent hover:text-accent-foreground",
                      isActive ? "bg-accent text-accent-foreground font-medium" : "text-muted-foreground",
                      isCollapsed && "justify-center px-2"
                    )}
                  >
                    <item.icon className="h-4 w-4" />
                    {!isCollapsed && <span>{item.label}</span>}
                  </NavLink>
                ))}
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
};

export const Sidebar: React.FC<SidebarProps> = ({ 
  isOpen, 
  isCollapsed, 
  toggleCollapse, 
  isMobile,
  closeMobileSidebar 
}) => {
  if (isMobile) {
    return (
      <Sheet open={isOpen} onOpenChange={(open) => !open && closeMobileSidebar()}>
        <SheetContent side="left" className="p-0 w-64">
          <SidebarContent isCollapsed={false} />
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <div 
      className={cn(
        "relative border-r bg-background transition-all duration-300 ease-in-out h-screen hidden md:flex flex-col",
        isCollapsed ? "w-16" : "w-64"
      )}
    >
      <SidebarContent isCollapsed={isCollapsed} />
      
      <div className="p-4 border-t mt-auto">
        <Button 
          variant="ghost" 
          size="sm" 
          className="w-full" 
          onClick={toggleCollapse}
        >
          <ChevronLeft className={cn("h-4 w-4 transition-transform", isCollapsed && "rotate-180")} />
          {!isCollapsed && <span className="ml-2">Collapse</span>}
        </Button>
      </div>
    </div>
  );
};