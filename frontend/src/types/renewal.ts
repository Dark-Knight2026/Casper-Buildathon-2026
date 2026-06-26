export interface RenewalOfferWithRelations {
  id: string;
  lease_id: string;
  landlord_id: string;
  tenant_id: string;
  status: 'pending' | 'accepted' | 'declined' | 'negotiating' | 'expired';
  original_rent: number;
  proposed_rent: number;
  final_rent: number | null;
  original_term_months: number;
  proposed_term_months: number;
  final_term_months: number | null;
  special_terms: string | null;
  offer_expiration_date: string;
  response_date: string | null;
  new_lease_start_date: string;
  new_lease_end_date: string;
  negotiation_rounds: number;
  created_at: string;
  updated_at: string;
  lease?: {
    id: string;
    monthly_rent: number;
    lease_term_months: number;
    start_date: string;
    end_date: string;
    landlord_id: string;
    tenant_id: string;
    property_id: string;
    security_deposit?: number;
    late_fee?: number;
    property?: {
      id: string;
      address: string;
      city: string;
      state: string;
      zip_code: string;
      property_type: string;
    };
    tenant?: {
      id: string;
      first_name: string;
      last_name: string;
      email: string;
      phone: string;
    };
    landlord?: {
      id: string;
      first_name: string;
      last_name: string;
      email: string;
      phone: string;
    };
  };
  counter_offers?: CounterOfferType[];
}

export interface CounterOfferType {
  id: string;
  renewal_id: string;
  offered_by: 'tenant' | 'landlord';
  proposed_rent: number;
  proposed_term_months: number;
  additional_terms: string | null;
  status: 'pending' | 'accepted' | 'rejected';
  created_at: string;
}

export interface LeaseWithDetails {
  id: string;
  monthly_rent: number;
  lease_term_months: number;
  start_date: string;
  end_date: string;
  status: string;
  property: {
    id: string;
    address: string;
    city: string;
    state: string;
    zip_code: string;
    property_type: string;
  };
  tenant: {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
    phone: string;
  };
  landlord?: {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
    phone: string;
  };
}