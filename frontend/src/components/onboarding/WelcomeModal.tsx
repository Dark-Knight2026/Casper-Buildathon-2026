import React from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useOnboarding } from '@/contexts/OnboardingContext';
import { useAuth } from '@/hooks/useAuth';
import { 
  Sparkles, 
  Clock, 
  CheckCircle, 
  ArrowRight,
  X,
  Home,
  Users,
  TrendingUp,
  Building
} from 'lucide-react';

export default function WelcomeModal() {
  const { state, startOnboarding, skipFlow, setWelcomeShown, getFlowForRole } = useOnboarding();
  const { user } = useAuth();

  if (!state.showWelcome || !user) {
    return null;
  }

  const userFlow = getFlowForRole(user.role);
  if (!userFlow) {
    return null;
  }

  const handleStartTour = () => {
    startOnboarding(userFlow.id);
  };

  const handleSkip = () => {
    skipFlow();
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'buyer': return Home;
      case 'seller': return TrendingUp;
      case 'agent': return Users;
      case 'landlord': return Building;
      default: return Users;
    }
  };

  const getRoleDescription = (role: string) => {
    switch (role) {
      case 'buyer': return 'Find your perfect property with our advanced search and personalized recommendations.';
      case 'seller': return 'List your property professionally and connect with qualified buyers quickly.';
      case 'agent': return 'Grow your real estate business with powerful tools for client management and lead generation.';
      case 'landlord': return 'Streamline your rental operations with automated tenant screening and lease management.';
      default: return 'Discover all the features designed to make your real estate experience seamless.';
    }
  };

  const RoleIcon = getRoleIcon(user.role);

  return (
    <Dialog open={true} onOpenChange={() => {}}>
      <DialogContent className="max-w-2xl">
        <div className="relative">
          {/* Close button */}
          <Button
            variant="ghost"
            size="icon"
            onClick={handleSkip}
            className="absolute top-0 right-0 text-gray-400 hover:text-gray-600"
          >
            <X className="h-5 w-5" />
          </Button>

          <div className="space-y-6">
            {/* Header */}
            <div className="text-center space-y-4">
              <div className="flex items-center justify-center">
                <div className="relative">
                  <div className="w-20 h-20 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                    <RoleIcon className="h-10 w-10 text-white" />
                  </div>
                  <div className="absolute -top-2 -right-2 w-8 h-8 bg-yellow-400 rounded-full flex items-center justify-center">
                    <Sparkles className="h-4 w-4 text-white" />
                  </div>
                </div>
              </div>
              
              <div>
                <h1 className="text-3xl font-bold text-gray-900 mb-2">
                  Welcome to KeyChain!
                </h1>
                <p className="text-lg text-gray-600 max-w-md mx-auto">
                  {getRoleDescription(user.role)}
                </p>
              </div>
            </div>

            {/* Tour Preview */}
            <Card className="border-2 border-blue-100 bg-gradient-to-r from-blue-50 to-purple-50">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-1">
                      {userFlow.name}
                    </h3>
                    <div className="flex items-center space-x-3 text-sm text-gray-600">
                      <div className="flex items-center">
                        <Clock className="h-4 w-4 mr-1" />
                        {userFlow.estimatedTime} minutes
                      </div>
                      <div className="flex items-center">
                        <CheckCircle className="h-4 w-4 mr-1" />
                        {userFlow.steps.length} steps
                      </div>
                    </div>
                  </div>
                  <Badge className="bg-blue-100 text-blue-800">
                    Interactive Tour
                  </Badge>
                </div>

                {/* Preview steps */}
                <div className="space-y-2">
                  <p className="text-sm font-medium text-gray-700 mb-3">What you'll learn:</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {userFlow.steps.slice(0, 4).map((step, index) => (
                      <div key={step.id} className="flex items-center space-x-2 text-sm text-gray-600">
                        <div className="w-5 h-5 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                          <span className="text-xs font-medium text-blue-600">{index + 1}</span>
                        </div>
                        <span className="truncate">{step.title}</span>
                      </div>
                    ))}
                    {userFlow.steps.length > 4 && (
                      <div className="flex items-center space-x-2 text-sm text-gray-500">
                        <div className="w-5 h-5 bg-gray-100 rounded-full flex items-center justify-center flex-shrink-0">
                          <span className="text-xs">+</span>
                        </div>
                        <span>{userFlow.steps.length - 4} more steps...</span>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Benefits */}
            <div className="grid grid-cols-3 gap-4 text-center">
              <div className="space-y-2">
                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                  <CheckCircle className="h-6 w-6 text-green-600" />
                </div>
                <h4 className="font-medium text-gray-900">Quick Setup</h4>
                <p className="text-xs text-gray-600">Get started in minutes</p>
              </div>
              <div className="space-y-2">
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto">
                  <Sparkles className="h-6 w-6 text-blue-600" />
                </div>
                <h4 className="font-medium text-gray-900">Personalized</h4>
                <p className="text-xs text-gray-600">Tailored to your role</p>
              </div>
              <div className="space-y-2">
                <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mx-auto">
                  <TrendingUp className="h-6 w-6 text-purple-600" />
                </div>
                <h4 className="font-medium text-gray-900">Results</h4>
                <p className="text-xs text-gray-600">Achieve your goals faster</p>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between pt-6 border-t">
              <Button
                variant="ghost"
                onClick={handleSkip}
                className="text-gray-600"
              >
                Skip for now
              </Button>
              <Button
                onClick={handleStartTour}
                className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-6"
              >
                Start Tour
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}