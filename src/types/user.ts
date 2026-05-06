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

// Mirrors backend `users.status` enum. `unknown` is the local sentinel for
// the rare case where the backend ships a value we have not added here yet —
// keeps the union narrow without a generic `string` escape hatch.
export type UserStatus =
  | 'active'
  | 'inactive'
  | 'suspended'
  | 'pending_verification';

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
  // Mirrors backend `users.status`. `inactive` indicates a self-deactivated
  // account; `suspended` is a moderation action; `pending_verification` is
  // the bootstrap state for wallet-only users who have not confirmed email.
  status?: UserStatus;
  // Number of active leases the user is bound to. Drives the role-switch and
  // account-deletion guards on the client (see backend
  // `active_leases_blocking` 409 path).
  activeLeasesCount?: number;
  // Server timestamp of the last profile mutation. Used to detect concurrent
  // edits and to invalidate cached UI state after PATCH /users/me.
  updatedAt?: Date;
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

// Maps a role to its post-login dashboard path. Only `/tenant/dashboard`
// and `/landlord/dashboard` exist in App.tsx today, so every non-tenant role
// lands on the landlord dashboard until role-specific dashboards are added.
// Paths must match the <Route path=...> declarations in App.tsx exactly,
// otherwise the * catch-all swallows the redirect.
export function getDashboardRoute(role: UserRole): string {
  if (role === 'tenant') return '/tenant/dashboard';
  return '/landlord/dashboard';
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