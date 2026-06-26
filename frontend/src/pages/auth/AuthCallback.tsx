import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { getDashboardRoute } from '@/types/user';
import { Loader2 } from 'lucide-react';

export function AuthCallback() {
  const navigate = useNavigate();
  const { profile, loading } = useAuth();

  useEffect(() => {
    if (!loading && profile) {
      // If the user clicked a protected action before signing in,
      // useAuthPrompt stored the original destination. Honour it after OAuth
      // so they don't have to navigate back manually. Validate against the
      // same allowlist as useAuthPrompt: same-origin relative path only.
      // localStorage is writable by any same-origin script, so an absolute
      // or protocol-relative path here would be an open-redirect vector.
      const intent = localStorage.getItem('auth_redirect_intent');
      localStorage.removeItem('auth_redirect_intent');
      localStorage.removeItem('auth_action_intent');
      if (intent && intent.startsWith('/') && !intent.startsWith('//')) {
        navigate(intent);
        return;
      }
      navigate(getDashboardRoute(profile.role));
    }
  }, [loading, profile, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-600" />
        <p className="text-gray-600">Processing login...</p>
      </div>
    </div>
  );
}

export default AuthCallback;