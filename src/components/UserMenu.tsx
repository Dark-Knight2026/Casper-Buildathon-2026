import React from 'react';
import { useAuth, UserRole } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  User, 
  LogOut, 
  Home, 
  Building, 
  UserCheck, 
  Briefcase,
  Calculator,
  Scale,
  Shield,
  Palette,
  Camera,
  Hammer,
  FileText,
  Users,
  TrendingUp,
  Search,
  Bug,
  MapPin,
  Leaf,
  Gavel,
  ScrollText,
  DollarSign,
  Stamp
} from 'lucide-react';

const roleConfig: Record<UserRole, { label: string; icon: React.ReactNode; category: string }> = {
  // Core Real Estate Roles
  buyer: { label: 'Buyer', icon: <Home className="w-4 h-4" />, category: 'Core Roles' },
  seller: { label: 'Seller', icon: <Building className="w-4 h-4" />, category: 'Core Roles' },
  agent: { label: 'Real Estate Agent', icon: <UserCheck className="w-4 h-4" />, category: 'Core Roles' },
  broker: { label: 'Broker', icon: <Briefcase className="w-4 h-4" />, category: 'Core Roles' },
  landlord: { label: 'Landlord', icon: <Building className="w-4 h-4" />, category: 'Core Roles' },
  tenant: { label: 'Tenant', icon: <Home className="w-4 h-4" />, category: 'Core Roles' },
  
  // Act I: Pre-Offer Professionals
  mortgage_broker: { label: 'Mortgage Broker', icon: <Calculator className="w-4 h-4" />, category: 'Pre-Offer Professionals' },
  cpa: { label: 'CPA / Tax Advisor', icon: <TrendingUp className="w-4 h-4" />, category: 'Pre-Offer Professionals' },
  real_estate_attorney: { label: 'Real Estate Attorney', icon: <Scale className="w-4 h-4" />, category: 'Pre-Offer Professionals' },
  insurance_agent: { label: 'Insurance Agent', icon: <Shield className="w-4 h-4" />, category: 'Pre-Offer Professionals' },
  stager: { label: 'Home Stager', icon: <Palette className="w-4 h-4" />, category: 'Pre-Offer Professionals' },
  photographer: { label: 'Photographer', icon: <Camera className="w-4 h-4" />, category: 'Pre-Offer Professionals' },
  contractor: { label: 'Contractor', icon: <Hammer className="w-4 h-4" />, category: 'Pre-Offer Professionals' },
  listing_attorney: { label: 'Listing Attorney', icon: <FileText className="w-4 h-4" />, category: 'Pre-Offer Professionals' },
  hoa_manager: { label: 'HOA Manager', icon: <Users className="w-4 h-4" />, category: 'Pre-Offer Professionals' },

  // Act II: Post-Offer / Under Contract Professionals
  appraiser: { label: 'Appraiser', icon: <TrendingUp className="w-4 h-4" />, category: 'Post-Offer Professionals' },
  home_inspector: { label: 'Home Inspector', icon: <Search className="w-4 h-4" />, category: 'Post-Offer Professionals' },
  pest_inspector: { label: 'Pest Inspector', icon: <Bug className="w-4 h-4" />, category: 'Post-Offer Professionals' },
  surveyor: { label: 'Surveyor', icon: <MapPin className="w-4 h-4" />, category: 'Post-Offer Professionals' },
  environmental_specialist: { label: 'Environmental Specialist', icon: <Leaf className="w-4 h-4" />, category: 'Post-Offer Professionals' },
  buyer_attorney: { label: 'Buyer Attorney', icon: <Gavel className="w-4 h-4" />, category: 'Post-Offer Professionals' },
  seller_attorney: { label: 'Seller Attorney', icon: <Scale className="w-4 h-4" />, category: 'Post-Offer Professionals' },
  title_officer: { label: 'Title Officer', icon: <ScrollText className="w-4 h-4" />, category: 'Shared Neutral Roles' },
  escrow_officer: { label: 'Escrow Officer', icon: <DollarSign className="w-4 h-4" />, category: 'Shared Neutral Roles' },
  notary: { label: 'Notary', icon: <Stamp className="w-4 h-4" />, category: 'Shared Neutral Roles' }
};

// Group roles by category
const rolesByCategory = Object.entries(roleConfig).reduce((acc, [role, config]) => {
  const category = config.category;
  if (!acc[category]) {
    acc[category] = [];
  }
  acc[category].push({ role: role as UserRole, ...config });
  return acc;
}, {} as Record<string, Array<{ role: UserRole; label: string; icon: React.ReactNode; category: string }>>);

export default function UserMenu() {
  const { user, logout, switchRole } = useAuth();

  if (!user) return null;

  const currentRoleConfig = roleConfig[user.role];
  const initials = [user.firstName?.[0], user.lastName?.[0]]
    .filter(Boolean)
    .join('')
    .toUpperCase();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="relative h-8 w-8 rounded-full">
          <Avatar className="h-8 w-8">
            <AvatarImage src={user.avatar} alt={user.name} />
            <AvatarFallback>
              {initials || <User className="h-4 w-4" />}
            </AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-80" align="end" forceMount>
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none">{user.name}</p>
            <p className="text-xs leading-none text-muted-foreground">
              {user.email}
            </p>
            <div className="flex items-center space-x-2 mt-2">
              {currentRoleConfig.icon}
              <span className="text-xs text-blue-600 font-medium">
                {currentRoleConfig.label}
              </span>
            </div>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        
        <DropdownMenuSub>
          <DropdownMenuSubTrigger>
            <UserCheck className="mr-2 h-4 w-4" />
            <span>Switch Role</span>
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent className="w-64 max-h-96 overflow-y-auto">
            {Object.entries(rolesByCategory).map(([category, roles]) => (
              <div key={category}>
                <DropdownMenuLabel className="text-xs text-gray-500 font-semibold uppercase tracking-wider px-2 py-1">
                  {category}
                </DropdownMenuLabel>
                {roles.map(({ role, label, icon }) => (
                  <DropdownMenuItem
                    key={role}
                    onClick={() => switchRole(role)}
                    className={`cursor-pointer ${user.role === role ? 'bg-blue-50 text-blue-700' : ''}`}
                  >
                    <div className="flex items-center space-x-2 w-full">
                      {icon}
                      <span className="text-sm">{label}</span>
                      {user.role === role && (
                        <span className="ml-auto text-xs text-blue-600">Current</span>
                      )}
                    </div>
                  </DropdownMenuItem>
                ))}
                <DropdownMenuSeparator />
              </div>
            ))}
          </DropdownMenuSubContent>
        </DropdownMenuSub>
        
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={logout} className="cursor-pointer text-red-600">
          <LogOut className="mr-2 h-4 w-4" />
          <span>Log out</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}