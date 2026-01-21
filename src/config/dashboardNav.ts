import { 
  LayoutDashboard, 
  Building, 
  Users, 
  FileText, 
  Wrench, 
  MessageSquare, 
  DollarSign, 
  PieChart, 
  Settings,
  Home,
  Calendar,
  CreditCard,
  UserCheck,
  GitBranch,
  LineChart,
  Wallet,
  Receipt,
  Heart,
  Award,
  Search,
  Map,
  Briefcase,
  ListPlus
} from 'lucide-react';

export const landlordNavItems = [
  {
    group: 'Overview',
    items: [
      { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, exact: true },
    ]
  },
  {
    group: 'Portfolio',
    items: [
      { href: '/dashboard/portfolio', label: 'Properties', icon: Building },
      { href: '/dashboard/tenants', label: 'Tenants', icon: Users },
      { href: '/dashboard/leases', label: 'Leases', icon: FileText },
    ]
  },
  {
    group: 'Operations',
    items: [
      { href: '/dashboard/maintenance', label: 'Maintenance', icon: Wrench },
      { href: '/dashboard/messages', label: 'Messages', icon: MessageSquare },
    ]
  },
  {
    group: 'Financials',
    items: [
      { href: '/dashboard/financials', label: 'Financials', icon: DollarSign },
      { href: '/dashboard/financials/taxes', label: 'Tax Center', icon: Receipt },
    ]
  },
  {
    group: 'Insights',
    items: [
      { href: '/dashboard/insights', label: 'Analytics', icon: PieChart },
      { href: '/dashboard/settings', label: 'Settings', icon: Settings },
    ]
  },
];

export const tenantNavItems = [
  {
    group: 'Overview',
    items: [
      { href: '/tenant-dashboard', label: 'Dashboard', icon: LayoutDashboard, exact: true },
    ]
  },
  {
    group: 'Lease & Payments',
    items: [
      { href: '/tenant-dashboard/lease', label: 'Lease Info', icon: FileText },
      { href: '/tenant-dashboard/payments', label: 'Payments', icon: CreditCard },
    ]
  },
  {
    group: 'Living',
    items: [
      { href: '/tenant-dashboard/maintenance', label: 'Maintenance', icon: Wrench },
      { href: '/tenant-dashboard/calendar', label: 'Calendar', icon: Calendar },
    ]
  },
  {
    group: 'Financial',
    items: [
      { href: '/tenant-dashboard/financial/tax-center', label: 'Tax Center', icon: Receipt },
      { href: '/tenant-dashboard/financial/budget', label: 'Budget', icon: PieChart },
    ]
  },
  {
    group: 'Account',
    items: [
      { href: '/tenant-dashboard/settings', label: 'Settings', icon: Settings },
    ]
  }
];

export const agentNavItems = [
  {
    group: 'Overview',
    items: [
      { href: '/agent-dashboard', label: 'Dashboard', icon: LayoutDashboard, exact: true },
    ]
  },
  {
    group: 'Business',
    items: [
      { href: '/agent-dashboard/leads', label: 'Leads', icon: UserCheck },
      { href: '/agent-dashboard/pipeline', label: 'Pipeline', icon: GitBranch },
      { href: '/agent-dashboard/listings', label: 'Listings', icon: Home },
      { href: '/agent-dashboard/clients', label: 'Clients', icon: Users },
    ]
  },
  {
    group: 'Market & Finance',
    items: [
      { href: '/agent-dashboard/market', label: 'Market', icon: LineChart },
      { href: '/agent-dashboard/financial', label: 'Financial', icon: Wallet },
      { href: '/agent-dashboard/taxes', label: 'Tax Center', icon: Receipt },
    ]
  },
  {
    group: 'Tools',
    items: [
      { href: '/agent-dashboard/calendar', label: 'Calendar', icon: Calendar },
      { href: '/agent-dashboard/communication', label: 'Communication', icon: MessageSquare },
    ]
  }
];

export const brokerNavItems = [
  {
    group: 'Overview',
    items: [
      { href: '/broker-dashboard', label: 'Dashboard', icon: LayoutDashboard, exact: true },
    ]
  },
  {
    group: 'Management',
    items: [
      { href: '/broker-dashboard/agents', label: 'Agents', icon: Users },
      { href: '/broker-dashboard/deal-health', label: 'Deal Health', icon: Heart },
      { href: '/broker-dashboard/benchmarks', label: 'Benchmarks', icon: Award },
    ]
  },
  {
    group: 'Business',
    items: [
      { href: '/broker-dashboard/clients', label: 'Clients', icon: Briefcase },
      { href: '/broker-dashboard/transactions', label: 'Transactions', icon: FileText },
    ]
  },
  {
    group: 'Insights',
    items: [
      { href: '/broker-dashboard/analytics', label: 'Analytics', icon: PieChart },
      { href: '/broker-dashboard/calendar', label: 'Calendar', icon: Calendar },
    ]
  }
];

export const buyerNavItems = [
  {
    group: 'Overview',
    items: [
      { href: '/buyer-dashboard', label: 'Dashboard', icon: LayoutDashboard, exact: true },
    ]
  },
  {
    group: 'Search',
    items: [
      { href: '/buyer-dashboard/search', label: 'Search', icon: Search },
      { href: '/buyer-dashboard/tours', label: 'Tours', icon: Map },
    ]
  },
  {
    group: 'My Properties',
    items: [
      { href: '/buyer-dashboard/listings', label: 'My Listings', icon: ListPlus },
    ]
  },
  {
    group: 'Buying Process',
    items: [
      { href: '/buyer-dashboard/offers', label: 'Offers', icon: FileText },
      { href: '/buyer-dashboard/financials', label: 'Financials', icon: DollarSign },
      { href: '/buyer-dashboard/taxes', label: 'Tax Center', icon: Receipt },
    ]
  }
];

export const sellerNavItems = [
  {
    group: 'Overview',
    items: [
      { href: '/seller-dashboard', label: 'Dashboard', icon: LayoutDashboard, exact: true },
    ]
  },
  {
    group: 'My Property',
    items: [
      { href: '/seller-dashboard/listings', label: 'Listings', icon: Home },
      { href: '/seller-dashboard/offers', label: 'Offers', icon: FileText },
    ]
  },
  {
    group: 'Performance',
    items: [
      { href: '/seller-dashboard/analytics', label: 'Analytics', icon: LineChart },
      { href: '/seller-dashboard/calendar', label: 'Calendar', icon: Calendar },
    ]
  }
];