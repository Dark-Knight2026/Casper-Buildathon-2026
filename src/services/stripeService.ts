/**
 * Stripe Service
 * Handles Stripe payment processing, customer management, and payment methods
 */

import { loadStripe, Stripe, PaymentIntent } from '@stripe/stripe-js';
import { logger } from '@/utils/logger';
import { supabase } from '@/lib/supabase/client';

// Initialize Stripe with publishable key
let stripePromise: Promise<Stripe | null> | null = null;

export const getStripe = () => {
  if (!stripePromise) {
    const publishableKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY;
    if (!publishableKey) {
      logger.error('Missing Stripe publishable key');
      return null;
    }
    stripePromise = loadStripe(publishableKey);
  }
  return stripePromise;
};

export interface StripeCustomer {
  id: string;
  email: string;
  name?: string;
  phone?: string;
}

export interface PaymentMethodData {
  id: string;
  type: 'card' | 'us_bank_account';
  card?: {
    brand: string;
    last4: string;
    exp_month: number;
    exp_year: number;
  };
  us_bank_account?: {
    bank_name: string;
    last4: string;
    account_type: string;
  };
  billing_details: {
    name?: string;
    email?: string;
    phone?: string;
  };
  created: number;
}

export interface CreatePaymentIntentParams {
  amount: number;
  currency?: string;
  customerId: string;
  paymentMethodId?: string;
  metadata?: Record<string, string>;
}

export interface PaymentIntentResult {
  id: string;
  amount: number;
  clientSecret: string;
  status: string;
  currency: string;
}

export interface RefundResult {
  id: string;
  amount: number;
  status: string;
  reason?: string;
}

class StripeService {
  /**
   * Create a Stripe customer for a user
   */
  async createCustomer(userId: string, email: string, name?: string): Promise<{ success: boolean; customerId?: string; error?: string }> {
    try {
      // Call backend API to create Stripe customer
      const response = await fetch('/api/stripe/create-customer', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId, email, name }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to create customer');
      }

      const data = await response.json();

      // Update user record with Stripe customer ID
      const { error: updateError } = await supabase
        .from('users')
        .update({ stripe_customer_id: data.customerId })
        .eq('id', userId);

      if (updateError) {
        logger.error('Error updating user with Stripe customer ID:', updateError);
      }

      return { success: true, customerId: data.customerId };
    } catch (error) {
      logger.error('Error creating Stripe customer:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create customer',
      };
    }
  }

  /**
   * Get or create Stripe customer for a user
   */
  async getOrCreateCustomer(userId: string): Promise<{ success: boolean; customerId?: string; error?: string }> {
    try {
      // Check if user already has a Stripe customer ID
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('stripe_customer_id, email, full_name')
        .eq('id', userId)
        .single();

      if (userError) {
        throw new Error('Failed to fetch user data');
      }

      if (userData.stripe_customer_id) {
        return { success: true, customerId: userData.stripe_customer_id };
      }

      // Create new customer
      return await this.createCustomer(userId, userData.email, userData.full_name);
    } catch (error) {
      logger.error('Error getting or creating customer:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get or create customer',
      };
    }
  }

  /**
   * Add a payment method to a customer
   */
  async addPaymentMethod(
    customerId: string,
    paymentMethodId: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const response = await fetch('/api/stripe/add-payment-method', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ customerId, paymentMethodId }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to add payment method');
      }

      return { success: true };
    } catch (error) {
      logger.error('Error adding payment method:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to add payment method',
      };
    }
  }

  /**
   * Remove a payment method
   */
  async removePaymentMethod(paymentMethodId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const response = await fetch('/api/stripe/remove-payment-method', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ paymentMethodId }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to remove payment method');
      }

      return { success: true };
    } catch (error) {
      logger.error('Error removing payment method:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to remove payment method',
      };
    }
  }

  /**
   * Set default payment method
   */
  async setDefaultPaymentMethod(
    customerId: string,
    paymentMethodId: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const response = await fetch('/api/stripe/set-default-payment-method', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ customerId, paymentMethodId }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to set default payment method');
      }

      return { success: true };
    } catch (error) {
      logger.error('Error setting default payment method:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to set default payment method',
      };
    }
  }

  /**
   * List all payment methods for a customer
   */
  async listPaymentMethods(customerId: string): Promise<{ success: boolean; paymentMethods?: PaymentMethodData[]; error?: string }> {
    try {
      const response = await fetch(`/api/stripe/list-payment-methods?customerId=${customerId}`);

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to list payment methods');
      }

      const data = await response.json();
      return { success: true, paymentMethods: data.paymentMethods };
    } catch (error) {
      logger.error('Error listing payment methods:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to list payment methods',
      };
    }
  }

  /**
   * Create a payment intent
   */
  async createPaymentIntent(params: CreatePaymentIntentParams): Promise<{ success: boolean; paymentIntent?: PaymentIntentResult; error?: string }> {
    try {
      const response = await fetch('/api/stripe/create-payment-intent', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(params),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to create payment intent');
      }

      const data = await response.json();
      return { success: true, paymentIntent: data.paymentIntent };
    } catch (error) {
      logger.error('Error creating payment intent:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create payment intent',
      };
    }
  }

  /**
   * Confirm a payment intent
   */
  async confirmPayment(
    clientSecret: string,
    paymentMethodId?: string
  ): Promise<{ success: boolean; paymentIntent?: PaymentIntent; error?: string }> {
    try {
      const stripe = await getStripe();
      if (!stripe) {
        throw new Error('Stripe not initialized');
      }

      const result = await stripe.confirmCardPayment(clientSecret, {
        payment_method: paymentMethodId,
      });

      if (result.error) {
        throw new Error(result.error.message);
      }

      return { success: true, paymentIntent: result.paymentIntent };
    } catch (error) {
      logger.error('Error confirming payment:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to confirm payment',
      };
    }
  }

  /**
   * Process a refund
   */
  async refundPayment(
    paymentIntentId: string,
    amount?: number,
    reason?: string
  ): Promise<{ success: boolean; refund?: RefundResult; error?: string }> {
    try {
      const response = await fetch('/api/stripe/refund-payment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ paymentIntentId, amount, reason }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to process refund');
      }

      const data = await response.json();
      return { success: true, refund: data.refund };
    } catch (error) {
      logger.error('Error processing refund:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to process refund',
      };
    }
  }

  /**
   * Get payment intent status
   */
  async getPaymentIntent(paymentIntentId: string): Promise<{ success: boolean; paymentIntent?: PaymentIntentResult; error?: string }> {
    try {
      const response = await fetch(`/api/stripe/payment-intent?id=${paymentIntentId}`);

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to get payment intent');
      }

      const data = await response.json();
      return { success: true, paymentIntent: data.paymentIntent };
    } catch (error) {
      logger.error('Error getting payment intent:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get payment intent',
      };
    }
  }
}

export const stripeService = new StripeService();