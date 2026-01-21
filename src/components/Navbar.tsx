import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useFavorites } from '@/hooks/useFavorites';
import { useMessaging } from '@/hooks/useMessaging';
import { useNotifications } from '@/contexts/NotificationContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
} from '@/components/ui/navigation-menu';
import UserMenu from './UserMenu';
import MessageCenter from './messaging/MessageCenter';
import { GlobalSearch } from './search/GlobalSearch';
import { NotificationCenter } from './notifications/NotificationCenter';
import { Search, Home, Building, Users, Calendar, TrendingUp, Settings, Heart, MessageSquare, Bell } from 'lucide-react';

export default function Navbar() {
  const { user } = useAuth();
  const { favoriteAgentIds } = useFavorites();
  const { unreadCount: messageUnreadCount } = useMessaging();
  const { unreadCount: notificationUnreadCount } = useNotifications();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [isMessageCenterOpen, setIsMessageCenterOpen] = useState(false);
  const [isGlobalSearchOpen, setIsGlobalSearchOpen] = useState(false);
  const [isNotificationCenterOpen, setIsNotificationCenterOpen] = useState(false);

  // Global search keyboard shortcut (Cmd/Ctrl + K)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsGlobalSearchOpen(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/listings?search=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  // Get dashboard route based on user role
  const getDashboardRoute = () => {
    if (!user) return '/';
    
    switch (user.role) {
      case 'buyer': return '/buyer-dashboard';
      case 'seller': return '/seller-dashboard';
      case 'agent': return '/agent-dashboard';
      case 'broker': return '/broker-dashboard';
      case 'landlord': return '/landlord-dashboard';
      case 'tenant': return '/tenant-dashboard';
      case 'service_professional': return '/service-professional-dashboard';
      // Pre-Offer Stage Professionals
      case 'mortgage_broker': return '/mortgage-broker-dashboard';
      case 'cpa': return '/cpa-dashboard';
      case 'real_estate_attorney': return '/real-estate-attorney-dashboard';
      case 'insurance_agent': return '/insurance-agent-dashboard';
      case 'stager': return '/stager-dashboard';
      case 'photographer': return '/photographer-dashboard';
      case 'contractor': return '/contractor-dashboard';
      case 'listing_attorney': return '/listing-attorney-dashboard';
      case 'hoa_manager': return '/hoa-manager-dashboard';
      // Post-Offer / Under Contract Professionals
      case 'appraiser': return '/appraiser-dashboard';
      case 'home_inspector': return '/home-inspector-dashboard';
      case 'pest_inspector': return '/pest-inspector-dashboard';
      case 'surveyor': return '/surveyor-dashboard';
      case 'environmental_specialist': return '/environmental-specialist-dashboard';
      case 'buyer_attorney': return '/buyer-attorney-dashboard';
      case 'seller_attorney': return '/seller-attorney-dashboard';
      case 'title_officer': return '/title-officer-dashboard';
      case 'escrow_officer': return '/escrow-officer-dashboard';
      case 'notary': return '/notary-dashboard';
      default: return '/agent-dashboard'; // Default fallback
    }
  };

  const getRoleDisplayName = () => {
    if (!user) return '';
    
    switch (user.role) {
      case 'buyer': return 'Buyer';
      case 'seller': return 'Seller';
      case 'agent': return 'Agent';
      case 'broker': return 'Broker';
      case 'landlord': return 'Landlord';
      case 'tenant': return 'Tenant';
      case 'service_professional': return 'Service Professional';
      case 'mortgage_broker': return 'Mortgage Broker';
      case 'cpa': return 'CPA';
      case 'real_estate_attorney': return 'Real Estate Attorney';
      case 'insurance_agent': return 'Insurance Agent';
      case 'stager': return 'Stager';
      case 'photographer': return 'Photographer';
      case 'contractor': return 'Contractor';
      case 'listing_attorney': return 'Listing Attorney';
      case 'hoa_manager': return 'HOA Manager';
      case 'appraiser': return 'Appraiser';
      case 'home_inspector': return 'Home Inspector';
      case 'pest_inspector': return 'Pest Inspector';
      case 'surveyor': return 'Surveyor';
      case 'environmental_specialist': return 'Environmental Specialist';
      case 'buyer_attorney': return 'Buyer Attorney';
      case 'seller_attorney': return 'Seller Attorney';
      case 'title_officer': return 'Title Officer';
      case 'escrow_officer': return 'Escrow Officer';
      case 'notary': return 'Notary';
      default: return user.role.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
    }
  };

  return (
    <nav className="bg-white shadow-sm border-b">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <Link to="/" className="flex-shrink-0 flex items-center">
              <Building className="h-8 w-8 text-blue-600" />
              <span className="ml-2 text-xl font-bold text-gray-900">KeyChain</span>
            </Link>

            <div className="hidden md:ml-6 md:flex md:space-x-8">
              <NavigationMenu>
                <NavigationMenuList>
                  <NavigationMenuItem>
                    <Link to="/listings">
                      <NavigationMenuLink className="group inline-flex h-10 w-max items-center justify-center rounded-md bg-background px-4 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground focus:outline-none disabled:pointer-events-none disabled:opacity-50 data-[active]:bg-accent/50 data-[state=open]:bg-accent/50">
                        <Home className="mr-2 h-4 w-4" />
                        Properties
                      </NavigationMenuLink>
                    </Link>
                  </NavigationMenuItem>

                  {user && (
                    <NavigationMenuItem>
                      <Link to={getDashboardRoute()}>
                        <NavigationMenuLink 
                          data-onboarding="dashboard-link"
                          className="group inline-flex h-10 w-max items-center justify-center rounded-md bg-background px-4 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground focus:outline-none disabled:pointer-events-none disabled:opacity-50 data-[active]:bg-accent/50 data-[state=open]:bg-accent/50"
                        >
                          <TrendingUp className="mr-2 h-4 w-4" />
                          Dashboard
                        </NavigationMenuLink>
                      </Link>
                    </NavigationMenuItem>
                  )}

                  <NavigationMenuItem>
                    <NavigationMenuTrigger>
                      <Users className="mr-2 h-4 w-4" />
                      Services
                    </NavigationMenuTrigger>
                    <NavigationMenuContent>
                      <div className="grid gap-3 p-6 md:w-[400px] lg:w-[500px]">
                        <div className="row-span-3">
                          <NavigationMenuLink asChild>
                            <Link
                              className="flex h-full w-full select-none flex-col justify-end rounded-md bg-gradient-to-b from-muted/50 to-muted p-6 no-underline outline-none focus:shadow-md"
                              to="/agent-marketplace"
                              data-onboarding="agent-marketplace"
                            >
                              <Users className="h-6 w-6" />
                              <div className="mb-2 mt-4 text-lg font-medium">
                                Agent Marketplace
                              </div>
                              <p className="text-sm leading-tight text-muted-foreground">
                                Find and connect with real estate professionals
                              </p>
                            </Link>
                          </NavigationMenuLink>
                        </div>
                        <NavigationMenuLink asChild>
                          <Link
                            className="block select-none space-y-1 rounded-md p-3 leading-none no-underline outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground"
                            to="/saved-agents"
                          >
                            <div className="flex items-center gap-2">
                              <Heart className="h-4 w-4" />
                              <div className="text-sm font-medium leading-none">Saved Agents</div>
                              {favoriteAgentIds.length > 0 && (
                                <Badge variant="secondary" className="ml-auto">
                                  {favoriteAgentIds.length}
                                </Badge>
                              )}
                            </div>
                            <p className="line-clamp-2 text-sm leading-snug text-muted-foreground">
                              View your favorite agents and shortlists
                            </p>
                          </Link>
                        </NavigationMenuLink>
                        <NavigationMenuLink asChild>
                          <Link
                            className="block select-none space-y-1 rounded-md p-3 leading-none no-underline outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground"
                            to="/maintenance-marketplace"
                          >
                            <div className="text-sm font-medium leading-none">Maintenance Services</div>
                            <p className="line-clamp-2 text-sm leading-snug text-muted-foreground">
                              Property maintenance and repair services
                            </p>
                          </Link>
                        </NavigationMenuLink>
                      </div>
                    </NavigationMenuContent>
                  </NavigationMenuItem>

                  {user && (
                    <NavigationMenuItem>
                      <Link to="/calendar">
                        <NavigationMenuLink 
                          data-onboarding="calendar"
                          className="group inline-flex h-10 w-max items-center justify-center rounded-md bg-background px-4 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground focus:outline-none disabled:pointer-events-none disabled:opacity-50 data-[active]:bg-accent/50 data-[state=open]:bg-accent/50"
                        >
                          <Calendar className="mr-2 h-4 w-4" />
                          Calendar
                        </NavigationMenuLink>
                      </Link>
                    </NavigationMenuItem>
                  )}
                </NavigationMenuList>
              </NavigationMenu>
            </div>
          </div>

          <div className="flex items-center space-x-4">
            {/* Enhanced Global Search Button */}
            <Button
              variant="outline"
              className="hidden md:flex items-center gap-2 w-64 justify-start text-muted-foreground"
              onClick={() => setIsGlobalSearchOpen(true)}
            >
              <Search className="h-4 w-4" />
              <span>Search everything...</span>
              <kbd className="ml-auto pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground opacity-100">
                <span className="text-xs">⌘</span>K
              </kbd>
            </Button>

            {/* Mobile Search Button */}
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden"
              onClick={() => setIsGlobalSearchOpen(true)}
            >
              <Search className="h-5 w-5" />
            </Button>

            {user ? (
              <div className="flex items-center space-x-3">
                {/* Notifications Button */}
                <Button
                  variant="ghost"
                  size="icon"
                  className="relative"
                  onClick={() => setIsNotificationCenterOpen(true)}
                >
                  <Bell className="h-5 w-5" />
                  {notificationUnreadCount > 0 && (
                    <Badge className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center text-xs">
                      {notificationUnreadCount}
                    </Badge>
                  )}
                </Button>

                {/* Messages Button */}
                <Button
                  variant="ghost"
                  size="icon"
                  className="relative"
                  onClick={() => setIsMessageCenterOpen(true)}
                  data-onboarding="messages"
                >
                  <MessageSquare className="h-5 w-5" />
                  {messageUnreadCount > 0 && (
                    <Badge className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center text-xs">
                      {messageUnreadCount}
                    </Badge>
                  )}
                </Button>

                <Badge variant="outline" className="hidden sm:inline-flex">
                  {getRoleDisplayName()}
                </Badge>
                <UserMenu />
              </div>
            ) : (
              <div className="flex items-center space-x-2">
                <Button variant="ghost" asChild>
                  <Link to="/login">Sign In</Link>
                </Button>
                <Button asChild>
                  <Link to="/signup">Sign Up</Link>
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      <div className="md:hidden">
        <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3">
          <Link
            to="/listings"
            className="block px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-50"
          >
            Properties
          </Link>
          {user && (
            <>
              <Link
                to={getDashboardRoute()}
                className="block px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-50"
              >
                Dashboard
              </Link>
              <button
                onClick={() => setIsNotificationCenterOpen(true)}
                className="flex items-center justify-between w-full px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-50"
              >
                <span>Notifications</span>
                {notificationUnreadCount > 0 && (
                  <Badge variant="secondary">
                    {notificationUnreadCount}
                  </Badge>
                )}
              </button>
              <button
                onClick={() => setIsMessageCenterOpen(true)}
                className="flex items-center justify-between w-full px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-50"
              >
                <span>Messages</span>
                {messageUnreadCount > 0 && (
                  <Badge variant="secondary">
                    {messageUnreadCount}
                  </Badge>
                )}
              </button>
              <Link
                to="/calendar"
                className="block px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-50"
              >
                Calendar
              </Link>
            </>
          )}
          <Link
            to="/agent-marketplace"
            className="block px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-50"
          >
            Agent Marketplace
          </Link>
          <Link
            to="/saved-agents"
            className="flex items-center justify-between px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-50"
          >
            <span>Saved Agents</span>
            {favoriteAgentIds.length > 0 && (
              <Badge variant="secondary">
                {favoriteAgentIds.length}
              </Badge>
            )}
          </Link>
        </div>
      </div>

      {/* Global Search Dialog */}
      <GlobalSearch
        isOpen={isGlobalSearchOpen}
        onClose={() => setIsGlobalSearchOpen(false)}
      />

      {/* Notification Center Dialog */}
      <Dialog open={isNotificationCenterOpen} onOpenChange={setIsNotificationCenterOpen}>
        <DialogContent className="max-w-4xl h-[80vh] p-0">
          <NotificationCenter onClose={() => setIsNotificationCenterOpen(false)} />
        </DialogContent>
      </Dialog>

      {/* Message Center Dialog */}
      <Dialog open={isMessageCenterOpen} onOpenChange={setIsMessageCenterOpen}>
        <DialogContent className="max-w-6xl h-[80vh] p-0">
          <MessageCenter onClose={() => setIsMessageCenterOpen(false)} />
        </DialogContent>
      </Dialog>
    </nav>
  );
}