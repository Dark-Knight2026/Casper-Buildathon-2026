import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Loader2 } from 'lucide-react';

export function AuthCallback() {
  const navigate = useNavigate();
  const { profile, loading } = useAuth();

  useEffect(() => {
    if (!loading && profile) {
      // Redirect based on user role
      const redirectPath = profile.role === 'tenant'
        ? '/tenant/dashboard'
        : '/landlord/dashboard';
      navigate(redirectPath);
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