import { useState, useEffect } from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useICOWallet } from '@/hooks/ico/useICOWallet';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ProfileNudgeDialog } from '@/components/auth/ProfileNudgeDialog';
import {
  LayoutDashboard,
  Home,
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
  HelpCircle,
} from 'lucide-react';
import type { User as UserType } from '@/types/user';

// The placeholder backend stamps onto wallet-only rows on first login
// (see crates/api/src/services/auth/db.rs — `INSERT … 'Wallet', 'User'`).
// We treat this exact pair as "no real name yet" so the avatar shows a
// neutral icon instead of misleading "WU" initials.
const PLACEHOLDER_FIRST = 'Wallet';
const PLACEHOLDER_LAST = 'User';

function headerInitials(profile: UserType): string {
  const isPlaceholder =
    profile.firstName === PLACEHOLDER_FIRST && profile.lastName === PLACEHOLDER_LAST;
  if (isPlaceholder) return '';
  return [profile.firstName?.[0], profile.lastName?.[0]]
    .filter(Boolean)
    .join('')
    .toUpperCase();
}

function HeaderAvatar({ profile, onNavigate }: { profile: UserType; onNavigate?: () => void }) {
  const initials = headerInitials(profile);
  return (
    <Link
      to="/tenant/profile"
      onClick={onNavigate}
      aria-label="Open profile"
      className="inline-flex shrink-0 rounded-full ring-2 ring-border transition hover:ring-primary focus:outline-none focus-visible:ring-primary"
    >
      <Avatar className="h-8 w-8">
        <AvatarImage src={profile.avatar} alt="" />
        <AvatarFallback className="bg-primary/10 text-xs font-semibold text-primary">
          {initials || <User className="h-4 w-4" />}
        </AvatarFallback>
      </Avatar>
    </Link>
  );
}

const NAV_LINKS = [
  { to: '/tenant/dashboard',       label: 'Dashboard',    icon: LayoutDashboard },
  { to: '/tenant/properties',      label: 'My Properties', icon: Home },
  { to: '/tenant/property-search', label: 'Browse',       icon: Search },
  { to: '/tenant/leases',          label: 'Leases',       icon: FileText },
  { to: '/tenant/payments',        label: 'Payments',     icon: CreditCard },
  { to: '/tenant/maintenance',     label: 'Maintenance',  icon: Wrench },
  { to: '/tenant/renewals',        label: 'Renewals',     icon: RefreshCw },
  { to: '/tenant/messages',         label: 'Messages',     icon: MessageSquare },
];

export default function TenantLayout() {
  const { profile, walletSignOut } = useAuth();
  const { disconnect } = useICOWallet();
  const { pathname } = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  // Sign out fully — both our backend session AND the CSPR.click wallet
  // session. We use a hard `location.assign` instead of `navigate` because
  // `clickRef.signOut()` is asynchronous: a soft React-Router navigation
  // would mount the next page while the SDK still has the previous account
  // cached, and useWalletConnect's auto-login effect would immediately
  // trigger a fresh signMessage popup. Reloading the page nukes the in-memory
  // SDK state so the next page (landing) starts from a clean slate.
  const handleSignOut = () => {
    disconnect();
    walletSignOut();
    window.location.assign('/');
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
            <Link
              to="/help"
              className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground transition-colors"
              aria-label="Help and onboarding"
            >
              <HelpCircle className="h-4 w-4 mr-1.5" />
              Help
            </Link>
            <Button variant="ghost" size="sm" onClick={handleSignOut}>
              <LogOut className="h-4 w-4 mr-1.5" />
              Sign Out
            </Button>
            {profile && <HeaderAvatar profile={profile} />}
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
          <div className="mt-6 pt-4 border-t border-border space-y-3">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                {profile && (
                  <HeaderAvatar profile={profile} onNavigate={() => setMobileOpen(false)} />
                )}
                <Link
                  to="/help"
                  onClick={() => setMobileOpen(false)}
                  className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  <HelpCircle className="h-4 w-4 mr-1.5" />
                  Help
                </Link>
              </div>
              <Button variant="ghost" size="sm" onClick={handleSignOut}>
                <LogOut className="h-4 w-4 mr-1.5" />
                Sign Out
              </Button>
            </div>
          </div>
        </div>
      )}

      <main className="pt-16">
        <Outlet />
      </main>

      <ProfileNudgeDialog profilePath="/tenant/profile" />
    </div>
  );
}
