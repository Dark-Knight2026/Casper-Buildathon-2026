import React from 'react';
import { useNavigate } from 'react-router-dom';

import { useAuth } from '@/contexts/AuthContext';
import { RoleSwitcher } from '@/components/auth/RoleSwitcher';
import { getDashboardRoute } from '@/types/user';
import HeroSection from '@/components/HeroSection';
import { FeaturedProperties } from '@/components/FeaturedProperties';
import MarketAnalytics from '@/components/MarketAnalytics';
import PropertyAnalysis from '@/components/PropertyAnalysis';
import InvestmentCalculator from '@/components/InvestmentCalculator';
import { Button } from '@/components/ui/button';
import { ArrowRight } from 'lucide-react';

export default function HomePage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const handleGoToDashboard = () => {
    if (user) {
      const dashboardRoute = getDashboardRoute(user.role);
      navigate(dashboardRoute);
    }
  };

  return (
    <div className="min-h-screen">
      {/* Role Switcher Bar */}
      {user && (
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white py-3 px-4 sticky top-0 z-50 shadow-lg">
          <div className="container mx-auto flex items-center justify-between">
            <div className="flex items-center gap-4">
              <span className="text-sm font-medium">
                Welcome, {user.name || user.email}
              </span>
              <RoleSwitcher />
            </div>
            <Button 
              variant="secondary" 
              size="sm"
              onClick={handleGoToDashboard}
              className="gap-2"
            >
              Go to Dashboard
              <ArrowRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}

      <HeroSection />
      <FeaturedProperties />
      <MarketAnalytics />
      <PropertyAnalysis />
      <InvestmentCalculator />
    </div>
  );
}