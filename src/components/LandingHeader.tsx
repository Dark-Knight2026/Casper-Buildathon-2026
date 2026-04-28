import { Link } from 'react-router-dom';
import { buttonVariants } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';

export default function LandingHeader() {
  const { profile } = useAuth();
  const dashboardPath = profile?.role === 'landlord' ? '/landlord/dashboard' : '/tenant/dashboard';

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-background/90 backdrop-blur-sm border-b border-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <Link to="/" className="text-xl font-bold text-primary">
          LeaseFi
        </Link>

        <nav className="hidden md:flex items-center gap-8">
          <Link
            to="/properties"
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            Properties
          </Link>
          <Link to="/ico" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
            Token Sale
          </Link>
        </nav>

        <div className="flex items-center gap-3">
          {/* Render as real <a> (via Link) with button styling — preserves right-click /
              middle-click / screen-reader "link" role that a <button>+onClick would hide. */}
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
      </div>
    </header>
  );
}
