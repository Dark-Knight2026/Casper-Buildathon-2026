import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Menu, X } from 'lucide-react';
import { buttonVariants } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';

const NAV_LINKS = [
  { to: '/properties', label: 'Properties' },
  { to: '/ico', label: 'BIG Token' },
  { to: '/help', label: 'Help' },
];

export function LandingHeader() {
  const { profile } = useAuth();
  const { pathname } = useLocation();
  const dashboardPath = profile?.role === 'landlord' ? '/landlord/dashboard' : '/tenant/dashboard';
  const [mobileOpen, setMobileOpen] = useState(false);

  const isActive = (to: string) => pathname === to || pathname.startsWith(to + '/');

  useEffect(() => {
    const onResize = () => {
      if (window.innerWidth >= 768) setMobileOpen(false);
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  return (
    <>
    <header className="fixed top-0 left-0 right-0 z-50 bg-background/90 backdrop-blur-sm border-b border-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <Link to="/" className="text-xl font-bold text-primary shrink-0">
          LeaseFi
        </Link>

        {/* Desktop nav */}
        <nav aria-label="Main navigation" className="hidden md:flex items-center gap-8">
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
        <div className="hidden md:flex items-center gap-3">
          {profile ? (
            <Link to={dashboardPath} className={buttonVariants({ size: 'sm' })}>
              Dashboard
            </Link>
          ) : (
            <>
              <Link to="/auth/login" className={buttonVariants({ variant: 'ghost', size: 'sm' })}>
                Sign In
              </Link>
              <Link to="/auth/register" className={buttonVariants({ size: 'sm' })}>
                Get Started
              </Link>
            </>
          )}
        </div>

        {/* Burger — visible below md, wrapper hides on desktop */}
        <div className="md:hidden">
          <button
            className="p-2 rounded-md text-muted-foreground hover:text-foreground"
            onClick={() => setMobileOpen((prev) => !prev)}
            aria-label="Toggle menu"
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>
    </header>

      {/* Full-screen mobile menu overlay — rendered OUTSIDE <header> because
          the header sets `backdrop-blur-sm`, which establishes a new
          containing block for `position: fixed` descendants. Inside, the
          overlay would only be 64px tall (header height) rather than viewport. */}
      {mobileOpen && (
        <div className="fixed top-16 left-0 right-0 bottom-0 z-40 bg-background flex flex-col px-6 py-8 overflow-y-auto md:hidden">
          <nav aria-label="Mobile navigation" className="flex flex-col gap-1 flex-1">
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
            {profile ? (
              <Link
                to={dashboardPath}
                onClick={() => setMobileOpen(false)}
                className={buttonVariants({ size: 'lg', className: 'w-full' })}
              >
                Dashboard
              </Link>
            ) : (
              <>
                <Link
                  to="/auth/login"
                  onClick={() => setMobileOpen(false)}
                  className={buttonVariants({ variant: 'outline', size: 'lg', className: 'w-full' })}
                >
                  Sign In
                </Link>
                <Link
                  to="/auth/register"
                  onClick={() => setMobileOpen(false)}
                  className={buttonVariants({ size: 'lg', className: 'w-full' })}
                >
                  Get Started
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
