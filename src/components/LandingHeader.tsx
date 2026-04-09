import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';

export default function LandingHeader() {
  const navigate = useNavigate();
  const { profile } = useAuth();

  const handlePropertiesClick = () => {
    if (profile?.role === 'tenant') {
      navigate('/tenant/properties');
    } else {
      navigate('/listings');
    }
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-background/90 backdrop-blur-sm border-b border-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <Link to="/" className="text-xl font-bold text-primary">
          LeaseFi
        </Link>

        <nav className="hidden md:flex items-center gap-8">
          <button
            onClick={handlePropertiesClick}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            Properties
          </button>
          <Link to="/ico" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
            Token Sale
          </Link>
        </nav>

        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => navigate('/auth/login')}>
            Sign In
          </Button>
          <Button size="sm" onClick={() => navigate('/auth/register')}>
            Get Started
          </Button>
        </div>
      </div>
    </header>
  );
}
