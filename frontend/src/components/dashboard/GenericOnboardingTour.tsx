import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useDashboardPreferences } from '@/contexts/DashboardPreferencesContext';
import { X, ChevronLeft, ChevronRight, Check } from 'lucide-react';

export interface TourStep {
  target: string;
  title: string;
  description: string;
  position: 'top' | 'bottom' | 'left' | 'right';
}

interface GenericOnboardingTourProps {
  steps: TourStep[];
  storageKey?: string;
}

export default function GenericOnboardingTour({ steps, storageKey = 'dashboard-tour-completed' }: GenericOnboardingTourProps) {
  const { preferences, completeOnboarding } = useDashboardPreferences();
  const [currentStep, setCurrentStep] = useState(0);
  const [isVisible, setIsVisible] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const [tourCompleted, setTourCompleted] = useState(false);

  // Check if tour was already completed for this specific dashboard
  useEffect(() => {
    const completed = localStorage.getItem(storageKey);
    setTourCompleted(completed === 'true');
  }, [storageKey]);

  const updatePosition = useCallback(() => {
    const step = steps[currentStep];
    const target = document.querySelector(step.target);
    
    if (target) {
      const rect = target.getBoundingClientRect();
      let top = 0;
      let left = 0;

      switch (step.position) {
        case 'bottom':
          top = rect.bottom + 10;
          left = rect.left + rect.width / 2;
          break;
        case 'top':
          top = rect.top - 10;
          left = rect.left + rect.width / 2;
          break;
        case 'left':
          top = rect.top + rect.height / 2;
          left = rect.left - 10;
          break;
        case 'right':
          top = rect.top + rect.height / 2;
          left = rect.right + 10;
          break;
      }

      setPosition({ top, left });

      // Highlight target element
      target.classList.add('ring-2', 'ring-blue-500', 'ring-offset-2', 'relative', 'z-50');
      
      // Cleanup previous highlights
      document.querySelectorAll('[data-tour]').forEach(el => {
        if (el !== target) {
          el.classList.remove('ring-2', 'ring-blue-500', 'ring-offset-2', 'relative', 'z-50');
        }
      });
    }
  }, [currentStep, steps]);

  useEffect(() => {
    if (preferences.showOnboarding && !tourCompleted) {
      // Small delay to ensure DOM is ready
      setTimeout(() => {
        setIsVisible(true);
        updatePosition();
      }, 500);
    }
  }, [preferences.showOnboarding, tourCompleted, updatePosition]);

  useEffect(() => {
    if (isVisible) {
      updatePosition();
    }
  }, [currentStep, isVisible, updatePosition]);

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleComplete();
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSkip = () => {
    setIsVisible(false);
    localStorage.setItem(storageKey, 'true');
    setTourCompleted(true);
    completeOnboarding();
    // Cleanup all highlights
    document.querySelectorAll('[data-tour]').forEach(el => {
      el.classList.remove('ring-2', 'ring-blue-500', 'ring-offset-2', 'relative', 'z-50');
    });
  };

  const handleComplete = () => {
    setIsVisible(false);
    localStorage.setItem(storageKey, 'true');
    setTourCompleted(true);
    completeOnboarding();
    // Cleanup all highlights
    document.querySelectorAll('[data-tour]').forEach(el => {
      el.classList.remove('ring-2', 'ring-blue-500', 'ring-offset-2', 'relative', 'z-50');
    });
  };

  if (!isVisible || !preferences.showOnboarding || tourCompleted || steps.length === 0) {
    return null;
  }

  const step = steps[currentStep];

  return (
    <>
      {/* Overlay */}
      <div className="fixed inset-0 bg-black/50 z-40" onClick={handleSkip} />

      {/* Tour Card */}
      <Card 
        className="fixed z-50 w-96 shadow-2xl"
        style={{
          top: `${position.top}px`,
          left: `${position.left}px`,
          transform: step.position === 'bottom' || step.position === 'top' 
            ? 'translateX(-50%)' 
            : step.position === 'left' 
            ? 'translate(-100%, -50%)' 
            : 'translateY(-50%)'
        }}
      >
        <CardContent className="p-6">
          <div className="flex justify-between items-start mb-4">
            <div className="flex-1">
              <h3 className="text-lg font-semibold mb-2">{step.title}</h3>
              <p className="text-sm text-gray-600 dark:text-gray-300">{step.description}</p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleSkip}
              className="ml-2"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          <div className="flex items-center justify-between mt-6">
            <div className="flex gap-1">
              {steps.map((_, index) => (
                <div
                  key={index}
                  className={`h-2 w-2 rounded-full transition-colors ${
                    index === currentStep 
                      ? 'bg-blue-600' 
                      : index < currentStep 
                      ? 'bg-blue-300' 
                      : 'bg-gray-300'
                  }`}
                />
              ))}
            </div>

            <div className="flex gap-2">
              {currentStep > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handlePrevious}
                >
                  <ChevronLeft className="h-4 w-4 mr-1" />
                  Previous
                </Button>
              )}
              
              <Button
                size="sm"
                onClick={handleNext}
              >
                {currentStep === steps.length - 1 ? (
                  <>
                    <Check className="h-4 w-4 mr-1" />
                    Finish
                  </>
                ) : (
                  <>
                    Next
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </>
                )}
              </Button>
            </div>
          </div>

          <div className="mt-4 text-center">
            <Button
              variant="link"
              size="sm"
              onClick={handleSkip}
              className="text-xs text-gray-500"
            >
              Skip tour
            </Button>
          </div>
        </CardContent>
      </Card>
    </>
  );
}