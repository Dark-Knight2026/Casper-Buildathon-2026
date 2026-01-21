import React, { useEffect, useState, useRef, useCallback } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { useOnboarding } from '@/contexts/OnboardingContext';
import { 
  ArrowRight, 
  ArrowLeft, 
  X, 
  CheckCircle, 
  Clock,
  Lightbulb,
  Target,
  Zap
} from 'lucide-react';

interface TooltipPosition {
  top: number;
  left: number;
  arrow: 'top' | 'bottom' | 'left' | 'right';
}

export default function OnboardingTour() {
  const { state, nextStep, prevStep, skipStep, skipFlow, completeFlow } = useOnboarding();
  const [tooltipPosition, setTooltipPosition] = useState<TooltipPosition | null>(null);
  const [highlightedElement, setHighlightedElement] = useState<Element | null>(null);
  const overlayRef = useRef<HTMLDivElement>(null);

  const currentStep = state.currentFlow?.steps[state.currentStepIndex];
  const progress = state.currentFlow ? ((state.currentStepIndex + 1) / state.currentFlow.steps.length) * 100 : 0;

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && state.isActive) {
        skipFlow();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [state.isActive, skipFlow]);

  // Calculate tooltip position based on target element
  useEffect(() => {
    if (!currentStep?.target || !state.isActive) {
      setTooltipPosition(null);
      setHighlightedElement(null);
      return;
    }

    const targetElement = document.querySelector(currentStep.target);
    if (!targetElement) {
      setTooltipPosition(null);
      setHighlightedElement(null);
      return;
    }

    setHighlightedElement(targetElement);

    const rect = targetElement.getBoundingClientRect();
    const tooltipWidth = 320;
    const tooltipHeight = 200;
    const padding = 16;

    let position: TooltipPosition;

    switch (currentStep.position || 'bottom') {
      case 'top':
        position = {
          top: rect.top - tooltipHeight - padding,
          left: rect.left + (rect.width - tooltipWidth) / 2,
          arrow: 'bottom'
        };
        break;
      case 'bottom':
        position = {
          top: rect.bottom + padding,
          left: rect.left + (rect.width - tooltipWidth) / 2,
          arrow: 'top'
        };
        break;
      case 'left':
        position = {
          top: rect.top + (rect.height - tooltipHeight) / 2,
          left: rect.left - tooltipWidth - padding,
          arrow: 'right'
        };
        break;
      case 'right':
        position = {
          top: rect.top + (rect.height - tooltipHeight) / 2,
          left: rect.right + padding,
          arrow: 'left'
        };
        break;
      default:
        position = {
          top: rect.bottom + padding,
          left: rect.left + (rect.width - tooltipWidth) / 2,
          arrow: 'top'
        };
    }

    // Ensure tooltip stays within viewport
    position.left = Math.max(padding, Math.min(position.left, window.innerWidth - tooltipWidth - padding));
    position.top = Math.max(padding, Math.min(position.top, window.innerHeight - tooltipHeight - padding));

    setTooltipPosition(position);
  }, [currentStep, state.isActive, state.currentStepIndex]);

  // Scroll target element into view
  useEffect(() => {
    if (highlightedElement) {
      highlightedElement.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
        inline: 'center'
      });
    }
  }, [highlightedElement]);

  const handleElementClick = useCallback((e: MouseEvent) => {
    if (currentStep?.action === 'click' && highlightedElement?.contains(e.target as Node)) {
      setTimeout(nextStep, 500); // Small delay to show the interaction
    }
  }, [currentStep, highlightedElement, nextStep]);

  // Add click listener for interactive steps
  useEffect(() => {
    if (currentStep?.action === 'click' && highlightedElement) {
      document.addEventListener('click', handleElementClick);
      return () => document.removeEventListener('click', handleElementClick);
    }
  }, [currentStep, highlightedElement, handleElementClick]);

  if (!state.isActive || !state.currentFlow || !currentStep) {
    return null;
  }

  const handleNext = () => {
    if (state.currentStepIndex === state.currentFlow!.steps.length - 1) {
      completeFlow();
    } else {
      nextStep();
    }
  };

  return (
    <>
      {/* Overlay */}
      <div
        ref={overlayRef}
        className="fixed inset-0 bg-black/50 z-50 pointer-events-none"
        style={{
          background: highlightedElement
            ? `radial-gradient(circle at ${tooltipPosition?.left || 0}px ${tooltipPosition?.top || 0}px, transparent 60px, rgba(0,0,0,0.5) 80px)`
            : 'rgba(0,0,0,0.5)'
        }}
      >
        {/* Highlight ring around target element */}
        {highlightedElement && tooltipPosition && (
          <div
            className="absolute border-4 border-blue-500 rounded-lg pointer-events-none animate-pulse"
            style={{
              top: highlightedElement.getBoundingClientRect().top - 4,
              left: highlightedElement.getBoundingClientRect().left - 4,
              width: highlightedElement.getBoundingClientRect().width + 8,
              height: highlightedElement.getBoundingClientRect().height + 8,
              boxShadow: '0 0 20px rgba(59, 130, 246, 0.5)'
            }}
          />
        )}
      </div>

      {/* Tooltip */}
      {currentStep.target && tooltipPosition ? (
        <Card
          className="fixed z-50 w-80 shadow-2xl border-2 border-blue-200 pointer-events-auto"
          style={{
            top: tooltipPosition.top,
            left: tooltipPosition.left
          }}
        >
          <CardContent className="p-6">
            {/* Arrow */}
            <div
              className={`absolute w-4 h-4 bg-white border-2 border-blue-200 rotate-45 ${
                tooltipPosition.arrow === 'top' ? '-top-2 left-1/2 -translate-x-1/2' :
                tooltipPosition.arrow === 'bottom' ? '-bottom-2 left-1/2 -translate-x-1/2' :
                tooltipPosition.arrow === 'left' ? '-left-2 top-1/2 -translate-y-1/2' :
                '-right-2 top-1/2 -translate-y-1/2'
              }`}
            />

            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                  <Target className="h-4 w-4 text-blue-600" />
                </div>
                <Badge variant="outline" className="text-xs">
                  Step {state.currentStepIndex + 1} of {state.currentFlow.steps.length}
                </Badge>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={skipFlow}
                className="h-6 w-6 text-gray-400 hover:text-gray-600"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            {/* Progress */}
            <Progress value={progress} className="mb-4" />

            {/* Content */}
            <div className="space-y-3">
              <h3 className="font-semibold text-gray-900">{currentStep.title}</h3>
              <p className="text-sm text-gray-600 leading-relaxed">{currentStep.description}</p>

              {currentStep.action && (
                <div className="flex items-center space-x-2 p-2 bg-blue-50 rounded-lg">
                  <Zap className="h-4 w-4 text-blue-600" />
                  <span className="text-xs text-blue-800 font-medium">
                    {currentStep.action === 'click' ? 'Click the highlighted element' :
                     currentStep.action === 'hover' ? 'Hover over the highlighted element' :
                     currentStep.action === 'scroll' ? 'Scroll to see more' :
                     'Wait for the action to complete'}
                  </span>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between mt-6">
              <Button
                variant="ghost"
                size="sm"
                onClick={prevStep}
                disabled={state.currentStepIndex === 0}
                className="text-gray-600"
              >
                <ArrowLeft className="h-4 w-4 mr-1" />
                Back
              </Button>

              <div className="flex space-x-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={skipStep}
                  className="text-gray-600"
                >
                  Skip
                </Button>
                <Button
                  size="sm"
                  onClick={handleNext}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  {state.currentStepIndex === state.currentFlow.steps.length - 1 ? (
                    <>
                      <CheckCircle className="h-4 w-4 mr-1" />
                      Complete
                    </>
                  ) : (
                    <>
                      Next
                      <ArrowRight className="h-4 w-4 ml-1" />
                    </>
                  )}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : (
        /* Modal for steps without targets */
        <Dialog open={true} onOpenChange={() => {}}>
          <DialogContent className="max-w-2xl">
            <div className="space-y-6">
              {/* Header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                    <Lightbulb className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold text-gray-900">{currentStep.title}</h2>
                    <div className="flex items-center space-x-2 mt-1">
                      <Badge variant="outline" className="text-xs">
                        Step {state.currentStepIndex + 1} of {state.currentFlow.steps.length}
                      </Badge>
                      <div className="flex items-center text-xs text-gray-500">
                        <Clock className="h-3 w-3 mr-1" />
                        {state.currentFlow.estimatedTime} min tour
                      </div>
                    </div>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={skipFlow}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="h-5 w-5" />
                </Button>
              </div>

              {/* Progress */}
              <Progress value={progress} />

              {/* Content */}
              <div className="space-y-4">
                <p className="text-gray-600 leading-relaxed">{currentStep.description}</p>

                {/* Render custom component if specified */}
                {currentStep.component && (
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <p className="text-sm text-gray-600">
                      Custom component: {currentStep.component}
                    </p>
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex items-center justify-between pt-4 border-t">
                <Button
                  variant="ghost"
                  onClick={prevStep}
                  disabled={state.currentStepIndex === 0}
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back
                </Button>

                <div className="flex space-x-3">
                  <Button
                    variant="ghost"
                    onClick={skipStep}
                    className="text-gray-600"
                  >
                    Skip Step
                  </Button>
                  <Button
                    onClick={handleNext}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    {state.currentStepIndex === state.currentFlow.steps.length - 1 ? (
                      <>
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Complete Tour
                      </>
                    ) : (
                      <>
                        Continue
                        <ArrowRight className="h-4 w-4 ml-2" />
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}