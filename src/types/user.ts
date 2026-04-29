export type UserRole = 
  // Core Real Estate Roles
  | 'buyer' 
  | 'seller' 
  | 'agent' 
  | 'broker' 
  | 'landlord' 
  | 'tenant'
  // Act I: Pre-Offer Professionals
  | 'mortgage_broker'
  | 'cpa'
  | 'real_estate_attorney'
  | 'insurance_agent'
  | 'stager'
  | 'photographer'
  | 'contractor'
  | 'listing_attorney'
  | 'hoa_manager'
  // Act II: Post-Offer / Under Contract Professionals
  | 'appraiser'
  | 'home_inspector'
  | 'pest_inspector'
  | 'surveyor'
  | 'environmental_specialist'
  | 'buyer_attorney'
  | 'seller_attorney'
  | 'title_officer'
  | 'escrow_officer'
  | 'notary'
  // Admin
  | 'admin';

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  name?: string; // Computed from firstName + lastName
  role: UserRole;
  profileImage?: string;
  avatar?: string; // Alias for profileImage
  phone?: string;
  phoneNumber?: string; // Alias for phone
  company?: string;
  bio?: string;
  licenseNumber?: string; // For agents and brokers
  yearsExperience?: number;
  specializations?: string[];
  createdAt: Date;
  lastLogin?: Date;
  // Wallet-auth users carry their primary Casper public key here so the UI
  // can show a recognisable identifier before the user completes their profile.
  walletAddress?: string;
  // Mirrors backend `users.is_profile_complete` (true once email + names + phone
  // are populated). Used by the UI to nudge wallet-only users to fill in their
  // profile and to suppress the "Wallet User" placeholder backend ships on
  // first wallet login (see crates/api/src/services/auth/db.rs).
  isProfileComplete?: boolean;
}

export interface UserProfile extends User {
  stats?: {
    propertiesListed?: number;
    propertiesSold?: number;
    totalTransactions?: number;
    averageRating?: number;
    reviewCount?: number;
  };
  preferences?: {
    notifications: boolean;
    emailUpdates: boolean;
    marketingEmails: boolean;
  };
}

// Helper function to get user display name
export function getUserDisplayName(user: User): string {
  if (user.name) return user.name;
  if (user.firstName && user.lastName) return `${user.firstName} ${user.lastName}`;
  if (user.firstName) return user.firstName;
  return user.email;
}

// Helper function to get role display name
export function getRoleDisplayName(role: UserRole): string {
  const roleNames: Record<UserRole, string> = {
    buyer: 'Buyer',
    seller: 'Seller',
    agent: 'Real Estate Agent',
    broker: 'Broker',
    landlord: 'Landlord',
    tenant: 'Tenant',
    mortgage_broker: 'Mortgage Broker',
    cpa: 'CPA',
    real_estate_attorney: 'Real Estate Attorney',
    insurance_agent: 'Insurance Agent',
    stager: 'Home Stager',
    photographer: 'Photographer',
    contractor: 'Contractor',
    listing_attorney: 'Listing Attorney',
    hoa_manager: 'HOA Manager',
    appraiser: 'Appraiser',
    home_inspector: 'Home Inspector',
    pest_inspector: 'Pest Inspector',
    surveyor: 'Surveyor',
    environmental_specialist: 'Environmental Specialist',
    buyer_attorney: 'Buyer Attorney',
    seller_attorney: 'Seller Attorney',
    title_officer: 'Title Officer',
    escrow_officer: 'Escrow Officer',
    notary: 'Notary',
    admin: 'Administrator'
  };
  return roleNames[role] || role;
}

// Helper function to get dashboard route for role
export function getDashboardRoute(role: UserRole): string {
  const routes: Record<UserRole, string> = {
    buyer: '/buyer-dashboard',
    seller: '/seller-dashboard',
    agent: '/agent-dashboard',
    broker: '/broker-dashboard',
    landlord: '/landlord-dashboard',
    tenant: '/tenant-dashboard',
    mortgage_broker: '/agent-dashboard',
    cpa: '/agent-dashboard',
    real_estate_attorney: '/agent-dashboard',
    insurance_agent: '/agent-dashboard',
    stager: '/agent-dashboard',
    photographer: '/agent-dashboard',
    contractor: '/agent-dashboard',
    listing_attorney: '/agent-dashboard',
    hoa_manager: '/landlord-dashboard',
    appraiser: '/agent-dashboard',
    home_inspector: '/agent-dashboard',
    pest_inspector: '/agent-dashboard',
    surveyor: '/agent-dashboard',
    environmental_specialist: '/agent-dashboard',
    buyer_attorney: '/agent-dashboard',
    seller_attorney: '/agent-dashboard',
    title_officer: '/agent-dashboard',
    escrow_officer: '/agent-dashboard',
    notary: '/agent-dashboard',
    admin: '/agent-dashboard'
  };
  return routes[role] || '/';
}

// Route-level role type (includes 'both' as a sentinel for landlord+tenant access)
export type RouteRole = 'landlord' | 'tenant' | 'admin' | 'both';

// Role categories for grouping
export const CORE_ROLES: UserRole[] = ['buyer', 'seller', 'agent', 'broker', 'landlord', 'tenant'];
export const PRE_OFFER_ROLES: UserRole[] = [
  'mortgage_broker',
  'cpa',
  'real_estate_attorney',
  'insurance_agent',
  'stager',
  'photographer',
  'contractor',
  'listing_attorney',
  'hoa_manager'
];
export const POST_OFFER_ROLES: UserRole[] = [
  'appraiser',
  'home_inspector',
  'pest_inspector',
  'surveyor',
  'environmental_specialist',
  'buyer_attorney',
  'seller_attorney',
  'title_officer',
  'escrow_officer',
  'notary'
];