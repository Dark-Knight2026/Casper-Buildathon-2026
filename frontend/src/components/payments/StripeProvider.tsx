/**
 * Stripe Provider Component
 * Wraps the application with Stripe Elements provider
 */

import React from 'react';
import { Elements } from '@stripe/react-stripe-js';
import { loadStripe, Stripe } from '@stripe/stripe-js';

// Initialize Stripe with publishable key
let stripePromise: Promise<Stripe | null> | null = null;

const getStripe = () => {
  if (!stripePromise) {
    const publishableKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY;
    if (!publishableKey) {
      console.error('Missing Stripe publishable key. Please set VITE_STRIPE_PUBLISHABLE_KEY in your .env file.');
      return null;
    }
    stripePromise = loadStripe(publishableKey);
  }
  return stripePromise;
};

interface StripeProviderProps {
  children: React.ReactNode;
}

export function StripeProvider({ children }: StripeProviderProps) {
  const stripe = getStripe();

  if (!stripe) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-2">Payment System Configuration Required</h2>
          <p className="text-gray-600">
            Stripe is not configured. Please contact your administrator.
          </p>
        </div>
      </div>
    );
  }

  return (
    <Elements stripe={stripe}>
      {children}
    </Elements>
  );
}