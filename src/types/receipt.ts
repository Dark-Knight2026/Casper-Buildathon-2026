/**
 * Receipt Type Definitions
 */

export interface Receipt {
  id: string;
  receipt_number: string;
  payment_id: string;
  tenant_id: string;
  landlord_id: string;
  property_id: string;
  amount: number;
  payment_date: Date;
  payment_method: string;
  description: string;
  created_at: Date;
}

export interface ReceiptData {
  receiptNumber: string;
  paymentDate: string;
  paymentMethod: string;
  amount: number;
  tenant: {
    name: string;
    email: string;
    phone?: string;
  };
  landlord: {
    name: string;
    company?: string;
    email: string;
    phone?: string;
    address?: string;
  };
  property: {
    address: string;
    unit?: string;
    city: string;
    state: string;
    zipCode: string;
  };
  breakdown: PaymentBreakdown[];
  notes?: string;
}

export interface PaymentBreakdown {
  description: string;
  amount: number;
}

export interface ReceiptGenerationOptions {
  includeBreakdown?: boolean;
  includeNotes?: boolean;
  logoUrl?: string;
  companyInfo?: {
    name: string;
    address: string;
    phone: string;
    email: string;
    website?: string;
  };
}