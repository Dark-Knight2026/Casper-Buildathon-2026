import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { useAuth } from './AuthContext';
import { onboardingFlows, OnboardingFlow } from '@/data/onboardingFlows';

interface OnboardingState {
  isActive: boolean;
  currentFlow: OnboardingFlow | null;
  currentStepIndex: number;
  completedFlows: string[];
  skippedFlows: string[];
  isFirstTime: boolean;
  showWelcome: boolean;
}

interface OnboardingContextType {
  state: OnboardingState;
  startOnboarding: (flowId: string) => void;
  nextStep: () => void;
  prevStep: () => void;
  skipStep: () => void;
  skipFlow: () => void;
  completeFlow: () => void;
  resetOnboarding: () => void;
  setWelcomeShown: () => void;
  getFlowForRole: (role: string) => OnboardingFlow | null;
  isStepCompleted: (stepId: string) => boolean;
}

const OnboardingContext = createContext<OnboardingContextType | undefined>(undefined);

export function OnboardingProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [state, setState] = useState<OnboardingState>({
    isActive: false,
    currentFlow: null,
    currentStepIndex: 0,
    completedFlows: [],
    skippedFlows: [],
    isFirstTime: true,
    showWelcome: false
  });

  // Load onboarding state from localStorage
  useEffect(() => {
    const savedState = localStorage.getItem('onboarding-state');
    if (savedState) {
      const parsed = JSON.parse(savedState);
      setState(prev => ({ ...prev, ...parsed }));
    }
  }, []);

  // Save onboarding state to localStorage
  useEffect(() => {
    localStorage.setItem('onboarding-state', JSON.stringify({
      completedFlows: state.completedFlows,
      skippedFlows: state.skippedFlows,
      isFirstTime: state.isFirstTime
    }));
  }, [state.completedFlows, state.skippedFlows, state.isFirstTime]);

  const getFlowForRole = useCallback((role: string): OnboardingFlow | null => {
    return onboardingFlows.find(flow => flow.role === role) || null;
  }, []);

  // Check if user should see onboarding
  useEffect(() => {
    if (user && state.isFirstTime && !state.isActive) {
      const userFlow = getFlowForRole(user.role);
      if (userFlow && !state.completedFlows.includes(userFlow.id) && !state.skippedFlows.includes(userFlow.id)) {
        setState(prev => ({ ...prev, showWelcome: true }));
      }
    }
  }, [user, state.isFirstTime, state.isActive, state.completedFlows, state.skippedFlows, getFlowForRole]);

  const startOnboarding = (flowId: string) => {
    const flow = onboardingFlows.find(f => f.id === flowId);
    if (flow) {
      setState(prev => ({
        ...prev,
        isActive: true,
        currentFlow: flow,
        currentStepIndex: 0,
        showWelcome: false
      }));
    }
  };

  const nextStep = () => {
    setState(prev => {
      if (!prev.currentFlow) return prev;
      
      const nextIndex = prev.currentStepIndex + 1;
      if (nextIndex >= prev.currentFlow.steps.length) {
        // Flow completed
        return {
          ...prev,
          isActive: false,
          currentFlow: null,
          currentStepIndex: 0,
          completedFlows: [...prev.completedFlows, prev.currentFlow.id],
          isFirstTime: false
        };
      }
      
      return {
        ...prev,
        currentStepIndex: nextIndex
      };
    });
  };

  const prevStep = () => {
    setState(prev => ({
      ...prev,
      currentStepIndex: Math.max(0, prev.currentStepIndex - 1)
    }));
  };

  const skipStep = () => {
    nextStep();
  };

  const skipFlow = () => {
    setState(prev => ({
      ...prev,
      isActive: false,
      currentFlow: null,
      currentStepIndex: 0,
      skippedFlows: prev.currentFlow ? [...prev.skippedFlows, prev.currentFlow.id] : prev.skippedFlows,
      isFirstTime: false,
      showWelcome: false
    }));
  };

  const completeFlow = () => {
    setState(prev => ({
      ...prev,
      isActive: false,
      currentFlow: null,
      currentStepIndex: 0,
      completedFlows: prev.currentFlow ? [...prev.completedFlows, prev.currentFlow.id] : prev.completedFlows,
      isFirstTime: false
    }));
  };

  const resetOnboarding = () => {
    setState({
      isActive: false,
      currentFlow: null,
      currentStepIndex: 0,
      completedFlows: [],
      skippedFlows: [],
      isFirstTime: true,
      showWelcome: false
    });
    localStorage.removeItem('onboarding-state');
  };

  const setWelcomeShown = () => {
    setState(prev => ({ ...prev, showWelcome: false }));
  };

  const isStepCompleted = (stepId: string): boolean => {
    return state.completedFlows.some(flowId => {
      const flow = onboardingFlows.find(f => f.id === flowId);
      return flow?.steps.some(step => step.id === stepId);
    });
  };

  const contextValue: OnboardingContextType = {
    state,
    startOnboarding,
    nextStep,
    prevStep,
    skipStep,
    skipFlow,
    completeFlow,
    resetOnboarding,
    setWelcomeShown,
    getFlowForRole,
    isStepCompleted
  };

  return (
    <OnboardingContext.Provider value={contextValue}>
      {children}
    </OnboardingContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useOnboarding() {
  const context = useContext(OnboardingContext);
  if (!context) {
    throw new Error('useOnboarding must be used within an OnboardingProvider');
  }
  return context;
}