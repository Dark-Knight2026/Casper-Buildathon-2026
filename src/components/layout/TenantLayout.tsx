import { useState, useEffect } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import {
  LayoutDashboard,
  Search,
  FileText,
  CreditCard,
  Wrench,
  RefreshCw,
  MessageSquare,
  User,
  Menu,
  X,
  LogOut,
} from 'lucide-react';

const NAV_LINKS = [
  { to: '/tenant/dashboard',       label: 'Dashboard',    icon: LayoutDashboard },
  { to: '/tenant/properties',      label: 'Properties',   icon: Search },
  { to: '/tenant/leases',          label: 'Leases',       icon: FileText },
  { to: '/tenant/payments',        label: 'Payments',     icon: CreditCard },
  { to: '/tenant/maintenance',     label: 'Maintenance',  icon: Wrench },
  { to: '/tenant/renewals',        label: 'Renewals',     icon: RefreshCw },
  { to: '/messages',               label: 'Messages',     icon: MessageSquare },
  { to: '/tenant/profile',         label: 'Profile',      icon: User },
];

export default function TenantLayout() {
  const { profile, walletSignOut } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleSignOut = () => {
    walletSignOut();
    navigate('/auth/login', { replace: true });
  };

  const isActive = (to: string) => pathname === to || pathname.startsWith(to + '/');

  useEffect(() => {
    const onResize = () => {
      if (window.innerWidth >= 1024) setMobileOpen(false);
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <header className="fixed top-0 left-0 right-0 z-50 bg-background/90 backdrop-blur-sm border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link to="/" className="text-xl font-bold text-primary shrink-0">
            LeaseFi
          </Link>

          {/* Desktop nav */}
          <nav className="hidden lg:flex items-center gap-8">
            {NAV_LINKS.map(({ to, label }) => (
              <Link
                key={to}
                to={to}
                className={`text-sm transition-colors ${
                  isActive(to)
                    ? 'text-foreground font-medium'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {label}
              </Link>
            ))}
          </nav>

          {/* Desktop right side */}
          <div className="hidden lg:flex items-center gap-3">
            {profile && (
              <span className="text-sm text-muted-foreground">
                {profile.firstName ?? profile.email}
              </span>
            )}
            <Button variant="ghost" size="sm" onClick={handleSignOut}>
              <LogOut className="h-4 w-4 mr-1.5" />
              Sign Out
            </Button>
          </div>

          {/* Burger — visible on mobile & tablet, wrapper handles hiding on desktop */}
          <div className="lg:hidden">
            <button
              className="p-2 rounded-md text-muted-foreground hover:text-foreground"
              onClick={() => setMobileOpen(prev => !prev)}
              aria-label="Toggle menu"
            >
              {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>
      </header>

      {/* Full-screen mobile/tablet menu overlay — only mounted when open, JS hides on desktop */}
      {mobileOpen && window.innerWidth < 1024 && (
        <div className="fixed top-16 left-0 right-0 bottom-0 z-40 bg-background flex flex-col px-6 py-8 overflow-y-auto">
          <nav className="flex flex-col gap-1 flex-1">
            {NAV_LINKS.map(({ to, label }) => (
              <Link
                key={to}
                to={to}
                onClick={() => setMobileOpen(false)}
                className={`text-base transition-colors py-3 border-b border-border/50 ${
                  isActive(to)
                    ? 'text-foreground font-medium'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {label}
              </Link>
            ))}
          </nav>
          <div className="mt-6 pt-4 border-t border-border flex items-center justify-between">
            {profile && (
              <span className="text-sm text-muted-foreground">
                {profile.firstName ?? profile.email}
              </span>
            )}
            <Button variant="ghost" size="sm" onClick={handleSignOut}>
              <LogOut className="h-4 w-4 mr-1.5" />
              Sign Out
            </Button>
          </div>
        </div>
      )}

      <main className="pt-16">
        <Outlet />
      </main>
    </div>
  );
}
