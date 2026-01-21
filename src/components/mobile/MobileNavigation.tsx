import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import {
  Home,
  Search,
  Heart,
  MessageSquare,
  User,
  Menu,
  X,
  Building,
  TrendingUp,
  Calendar,
  Settings,
  LogOut,
  Bell,
  BarChart3,
  MapPin
} from 'lucide-react';

interface MobileNavigationProps {
  unreadMessages?: number;
  unreadNotifications?: number;
  favoriteCount?: number;
}

export default function MobileNavigation({ 
  unreadMessages = 0, 
  unreadNotifications = 0,
  favoriteCount = 0 
}: MobileNavigationProps) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('home');

  const handleNavigation = (path: string, tab: string) => {
    navigate(path);
    setActiveTab(tab);
    setIsMenuOpen(false);
  };

  const getDashboardRoute = () => {
    if (!user) return '/';
    switch (user.role) {
      case 'buyer': return '/buyer-dashboard';
      case 'seller': return '/seller-dashboard';
      case 'agent': return '/agent-dashboard';
      case 'landlord': return '/landlord-dashboard';
      default: return '/agent-dashboard';
    }
  };

  return (
    <>
      {/* Top Mobile Header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-40 bg-white border-b shadow-sm">
        <div className="flex items-center justify-between px-4 h-14">
          <Link to="/" className="flex items-center">
            <Building className="h-6 w-6 text-blue-600" />
            <span className="ml-2 text-lg font-bold text-gray-900">KeyChain</span>
          </Link>

          <div className="flex items-center space-x-2">
            {/* Notifications */}
            {user && (
              <Button
                variant="ghost"
                size="icon"
                className="relative"
                onClick={() => navigate('/notifications')}
              >
                <Bell className="h-5 w-5" />
                {unreadNotifications > 0 && (
                  <Badge className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center text-xs">
                    {unreadNotifications}
                  </Badge>
                )}
              </Button>
            )}

            {/* Hamburger Menu */}
            <Sheet open={isMenuOpen} onOpenChange={setIsMenuOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon">
                  <Menu className="h-6 w-6" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-80">
                <SheetHeader>
                  <SheetTitle>Menu</SheetTitle>
                </SheetHeader>

                <div className="mt-6 space-y-1">
                  {user ? (
                    <>
                      {/* User Info */}
                      <div className="px-4 py-3 bg-gray-50 rounded-lg mb-4">
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                            <User className="h-5 w-5 text-white" />
                          </div>
                          <div>
                            <p className="font-semibold text-gray-900">{user.firstName} {user.lastName}</p>
                            <p className="text-sm text-gray-600 capitalize">{user.role}</p>
                          </div>
                        </div>
                      </div>

                      {/* Navigation Links */}
                      <Button
                        variant="ghost"
                        className="w-full justify-start"
                        onClick={() => handleNavigation('/', 'home')}
                      >
                        <Home className="h-5 w-5 mr-3" />
                        Home
                      </Button>

                      <Button
                        variant="ghost"
                        className="w-full justify-start"
                        onClick={() => handleNavigation('/listings', 'search')}
                      >
                        <Search className="h-5 w-5 mr-3" />
                        Search Properties
                      </Button>

                      <Button
                        variant="ghost"
                        className="w-full justify-start"
                        onClick={() => handleNavigation(getDashboardRoute(), 'dashboard')}
                      >
                        <TrendingUp className="h-5 w-5 mr-3" />
                        Dashboard
                      </Button>

                      <Button
                        variant="ghost"
                        className="w-full justify-start"
                        onClick={() => handleNavigation('/favorites', 'favorites')}
                      >
                        <Heart className="h-5 w-5 mr-3" />
                        Favorites
                        {favoriteCount > 0 && (
                          <Badge variant="secondary" className="ml-auto">
                            {favoriteCount}
                          </Badge>
                        )}
                      </Button>

                      <Button
                        variant="ghost"
                        className="w-full justify-start"
                        onClick={() => handleNavigation('/messages', 'messages')}
                      >
                        <MessageSquare className="h-5 w-5 mr-3" />
                        Messages
                        {unreadMessages > 0 && (
                          <Badge variant="secondary" className="ml-auto">
                            {unreadMessages}
                          </Badge>
                        )}
                      </Button>

                      <Button
                        variant="ghost"
                        className="w-full justify-start"
                        onClick={() => handleNavigation('/calendar', 'calendar')}
                      >
                        <Calendar className="h-5 w-5 mr-3" />
                        Calendar
                      </Button>

                      <Button
                        variant="ghost"
                        className="w-full justify-start"
                        onClick={() => handleNavigation('/agent-marketplace', 'agents')}
                      >
                        <User className="h-5 w-5 mr-3" />
                        Find Agents
                      </Button>

                      <div className="my-4 border-t" />

                      <Button
                        variant="ghost"
                        className="w-full justify-start"
                        onClick={() => handleNavigation('/settings', 'settings')}
                      >
                        <Settings className="h-5 w-5 mr-3" />
                        Settings
                      </Button>

                      <Button
                        variant="ghost"
                        className="w-full justify-start text-red-600 hover:text-red-700 hover:bg-red-50"
                        onClick={() => {
                          logout();
                          setIsMenuOpen(false);
                          navigate('/');
                        }}
                      >
                        <LogOut className="h-5 w-5 mr-3" />
                        Sign Out
                      </Button>
                    </>
                  ) : (
                    <>
                      <Button
                        variant="ghost"
                        className="w-full justify-start"
                        onClick={() => handleNavigation('/', 'home')}
                      >
                        <Home className="h-5 w-5 mr-3" />
                        Home
                      </Button>

                      <Button
                        variant="ghost"
                        className="w-full justify-start"
                        onClick={() => handleNavigation('/listings', 'search')}
                      >
                        <Search className="h-5 w-5 mr-3" />
                        Search Properties
                      </Button>

                      <Button
                        variant="ghost"
                        className="w-full justify-start"
                        onClick={() => handleNavigation('/agent-marketplace', 'agents')}
                      >
                        <User className="h-5 w-5 mr-3" />
                        Find Agents
                      </Button>

                      <div className="my-4 border-t" />

                      <Button
                        className="w-full"
                        onClick={() => {
                          setIsMenuOpen(false);
                          navigate('/login');
                        }}
                      >
                        Sign In
                      </Button>

                      <Button
                        variant="outline"
                        className="w-full"
                        onClick={() => {
                          setIsMenuOpen(false);
                          navigate('/signup');
                        }}
                      >
                        Sign Up
                      </Button>
                    </>
                  )}
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>

      {/* Bottom Navigation Bar */}
      {user && (
        <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white border-t shadow-lg">
          <div className="grid grid-cols-5 h-16">
            <button
              onClick={() => handleNavigation('/', 'home')}
              className={`flex flex-col items-center justify-center space-y-1 ${
                activeTab === 'home' ? 'text-blue-600' : 'text-gray-600'
              }`}
            >
              <Home className="h-5 w-5" />
              <span className="text-xs">Home</span>
            </button>

            <button
              onClick={() => handleNavigation('/listings', 'search')}
              className={`flex flex-col items-center justify-center space-y-1 ${
                activeTab === 'search' ? 'text-blue-600' : 'text-gray-600'
              }`}
            >
              <Search className="h-5 w-5" />
              <span className="text-xs">Search</span>
            </button>

            <button
              onClick={() => handleNavigation('/favorites', 'favorites')}
              className={`flex flex-col items-center justify-center space-y-1 relative ${
                activeTab === 'favorites' ? 'text-blue-600' : 'text-gray-600'
              }`}
            >
              <Heart className="h-5 w-5" />
              <span className="text-xs">Favorites</span>
              {favoriteCount > 0 && (
                <Badge className="absolute top-1 right-6 h-4 w-4 p-0 flex items-center justify-center text-[10px]">
                  {favoriteCount}
                </Badge>
              )}
            </button>

            <button
              onClick={() => handleNavigation('/messages', 'messages')}
              className={`flex flex-col items-center justify-center space-y-1 relative ${
                activeTab === 'messages' ? 'text-blue-600' : 'text-gray-600'
              }`}
            >
              <MessageSquare className="h-5 w-5" />
              <span className="text-xs">Messages</span>
              {unreadMessages > 0 && (
                <Badge className="absolute top-1 right-6 h-4 w-4 p-0 flex items-center justify-center text-[10px]">
                  {unreadMessages}
                </Badge>
              )}
            </button>

            <button
              onClick={() => handleNavigation(getDashboardRoute(), 'dashboard')}
              className={`flex flex-col items-center justify-center space-y-1 ${
                activeTab === 'dashboard' ? 'text-blue-600' : 'text-gray-600'
              }`}
            >
              <BarChart3 className="h-5 w-5" />
              <span className="text-xs">Dashboard</span>
            </button>
          </div>
        </div>
      )}

      {/* Spacer for fixed navigation */}
      <div className="lg:hidden h-14" /> {/* Top spacer */}
      {user && <div className="lg:hidden h-16" />} {/* Bottom spacer */}
    </>
  );
}