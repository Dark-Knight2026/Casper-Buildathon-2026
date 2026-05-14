/**
 * AuthPromptModal Component
 * 
 * Modal that prompts guest users to sign up or log in when they attempt
 * restricted actions (saving favorites, submitting applications, etc.)
 * 
 * Features:
 * - Clear value proposition for signing up
 * - Both sign up and login options
 * - Context-aware messaging based on user action
 * - Smooth transitions and animations
 */

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { UserPlus, LogIn, X, Lock } from 'lucide-react';

interface AuthPromptModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSignUp: () => void;
  onLogin: () => void;
  action?: string; // What the user was trying to do
}

export function AuthPromptModal({
  isOpen,
  onClose,
  onSignUp,
  onLogin,
  action = 'continue',
}: AuthPromptModalProps) {
  // Determine messaging based on action (icons removed per design decision —
  // see AuthPromptModal usages, header now shows title + description only).
  const getActionContext = () => {
    const actionLower = action.toLowerCase();

    if (actionLower.includes('save') || actionLower.includes('favorite')) {
      return {
        title: 'Save Your Favorites',
        description: 'Create an account to save properties and access them anytime.',
      };
    }

    if (actionLower.includes('apply') || actionLower.includes('application')) {
      return {
        title: 'Submit Your Application',
        description: 'Sign up to submit rental applications and track their status.',
      };
    }

    if (actionLower.includes('contact') || actionLower.includes('message')) {
      return {
        title: 'Contact Property Owner',
        description: 'Create an account to message property owners and schedule viewings.',
      };
    }

    return {
      title: 'Sign Up to Continue',
      description: 'Create a free account to access all features and save your progress.',
    };
  };

  const context = getActionContext();

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none"
          aria-label="Close"
        >
          <X className="h-4 w-4" />
        </button>

        <DialogHeader className="text-center space-y-3 pt-6 sm:pt-2">
          <DialogTitle className="text-2xl font-bold">
            {context.title}
          </DialogTitle>
          <DialogDescription className="text-base">
            {context.description}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-4">
          {/* Sign Up Button - Primary CTA */}
          <Button
            onClick={onSignUp}
            className="w-full h-12 text-base font-semibold"
            size="lg"
          >
            <UserPlus className="mr-2 h-5 w-5" />
            Create Free Account
          </Button>

          {/* Benefits List */}
          <div className="bg-muted/50 rounded-lg p-4 space-y-2">
            <p className="text-sm font-medium text-muted-foreground">
              Benefits of signing up:
            </p>
            <ul className="text-sm space-y-1 text-muted-foreground">
              <li className="flex items-center">
                <span className="mr-2">✓</span>
                Save favorite properties
              </li>
              <li className="flex items-center">
                <span className="mr-2">✓</span>
                Submit rental applications
              </li>
              <li className="flex items-center">
                <span className="mr-2">✓</span>
                Track application status
              </li>
              <li className="flex items-center">
                <span className="mr-2">✓</span>
                Message property owners
              </li>
              <li className="flex items-center">
                <span className="mr-2">✓</span>
                Get instant notifications
              </li>
            </ul>
          </div>

          {/* Divider */}
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">
                Already have an account?
              </span>
            </div>
          </div>

          {/* Login Button - Secondary CTA */}
          <Button
            onClick={onLogin}
            variant="outline"
            className="w-full h-11"
            size="lg"
          >
            <LogIn className="mr-2 h-4 w-4" />
            Log In
          </Button>

          {/* Privacy Note */}
          <p className="text-xs text-center text-muted-foreground">
            By signing up, you agree to our Terms of Service and Privacy Policy.
            Your data is secure and never shared.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Inline Auth Prompt Component
 * 
 * A smaller, inline version of the auth prompt for use in cards or sections
 * where a full modal might be too intrusive.
 */
interface InlineAuthPromptProps {
  action: string;
  onSignUp: () => void;
  onLogin: () => void;
  className?: string;
}

export function InlineAuthPrompt({
  action,
  onSignUp,
  onLogin,
  className = '',
}: InlineAuthPromptProps) {
  return (
    <div className={`border rounded-lg p-6 bg-muted/30 ${className}`}>
      <div className="flex items-start space-x-4">
        <div className="flex-shrink-0">
          <Lock className="h-8 w-8 text-primary" />
        </div>
        <div className="flex-1 space-y-3">
          <div>
            <h3 className="font-semibold text-lg">Sign up to {action}</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Create a free account to access this feature and save your progress.
            </p>
          </div>
          <div className="flex gap-2">
            <Button onClick={onSignUp} size="sm">
              <UserPlus className="mr-2 h-4 w-4" />
              Sign Up
            </Button>
            <Button onClick={onLogin} variant="outline" size="sm">
              <LogIn className="mr-2 h-4 w-4" />
              Log In
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}