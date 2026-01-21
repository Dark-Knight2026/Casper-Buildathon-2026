export interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  target?: string; // CSS selector for the element to highlight
  position?: 'top' | 'bottom' | 'left' | 'right';
  action?: 'click' | 'hover' | 'scroll' | 'wait';
  component?: string; // Component name as string instead of React.ComponentType
  optional?: boolean;
}

export interface OnboardingFlow {
  id: string;
  name: string;
  role: string;
  steps: OnboardingStep[];
  estimatedTime: number; // in minutes
}

export const onboardingFlows: OnboardingFlow[] = [
  {
    id: 'buyer-onboarding',
    name: 'Buyer Getting Started',
    role: 'buyer',
    estimatedTime: 5,
    steps: [
      {
        id: 'welcome',
        title: 'Welcome to KeyChain!',
        description: 'Let\'s help you find your perfect property. This quick tour will show you the key features.',
        component: 'WelcomeStep'
      },
      {
        id: 'search-properties',
        title: 'Search Properties',
        description: 'Use our advanced search to find properties that match your criteria. Try the search bar or browse featured listings.',
        target: '[data-onboarding="search-bar"]',
        position: 'bottom',
        action: 'click'
      },
      {
        id: 'save-favorites',
        title: 'Save Your Favorites',
        description: 'Click the heart icon on any property to save it to your favorites for easy access later.',
        target: '[data-onboarding="favorite-button"]',
        position: 'left',
        action: 'click'
      },
      {
        id: 'view-details',
        title: 'Property Details',
        description: 'Click "View Details" to see high-quality photos, amenities, and contact the property owner.',
        target: '[data-onboarding="view-details"]',
        position: 'top',
        action: 'click'
      },
      {
        id: 'dashboard-tour',
        title: 'Your Dashboard',
        description: 'Access your saved properties, search history, and messages from your personal dashboard.',
        target: '[data-onboarding="dashboard-link"]',
        position: 'bottom',
        action: 'click'
      },
      {
        id: 'setup-preferences',
        title: 'Set Your Preferences',
        description: 'Complete your profile and set search preferences to get personalized recommendations.',
        component: 'PreferencesSetup'
      }
    ]
  },
  {
    id: 'seller-onboarding',
    name: 'Seller Getting Started',
    role: 'seller',
    estimatedTime: 7,
    steps: [
      {
        id: 'welcome',
        title: 'Welcome, Property Owner!',
        description: 'Ready to list your property? Let\'s walk through the process to get maximum exposure.',
        component: 'WelcomeStep'
      },
      {
        id: 'create-listing',
        title: 'Create Your First Listing',
        description: 'Click here to start creating a professional property listing with our guided wizard.',
        target: '[data-onboarding="create-listing"]',
        position: 'bottom',
        action: 'click'
      },
      {
        id: 'upload-photos',
        title: 'Add High-Quality Photos',
        description: 'Great photos get 40% more views! Upload multiple angles and highlight your property\'s best features.',
        component: 'PhotoUploadGuide'
      },
      {
        id: 'pricing-strategy',
        title: 'Smart Pricing',
        description: 'Use our market analysis tools to price your property competitively and attract more buyers.',
        component: 'PricingGuide'
      },
      {
        id: 'manage-inquiries',
        title: 'Manage Inquiries',
        description: 'Respond to buyer messages quickly from your dashboard to increase your success rate.',
        target: '[data-onboarding="messages"]',
        position: 'left',
        action: 'click'
      },
      {
        id: 'analytics-overview',
        title: 'Track Performance',
        description: 'Monitor views, favorites, and inquiries to optimize your listings for better results.',
        target: '[data-onboarding="analytics"]',
        position: 'bottom',
        action: 'click'
      }
    ]
  },
  {
    id: 'agent-onboarding',
    name: 'Agent Professional Setup',
    role: 'agent',
    estimatedTime: 10,
    steps: [
      {
        id: 'welcome',
        title: 'Welcome, Real Estate Professional!',
        description: 'Let\'s set up your professional profile and explore tools to grow your business.',
        component: 'WelcomeStep'
      },
      {
        id: 'complete-profile',
        title: 'Complete Your Profile',
        description: 'Add your license information, experience, and specializations to build trust with clients.',
        component: 'AgentProfileSetup'
      },
      {
        id: 'client-management',
        title: 'Client Management',
        description: 'Organize your buyers and sellers, track their preferences, and manage communications.',
        target: '[data-onboarding="client-management"]',
        position: 'bottom',
        action: 'click'
      },
      {
        id: 'listing-tools',
        title: 'Professional Listing Tools',
        description: 'Create compelling listings with AI-generated descriptions and professional templates.',
        target: '[data-onboarding="listing-tools"]',
        position: 'right',
        action: 'click'
      },
      {
        id: 'lead-generation',
        title: 'Generate Leads',
        description: 'Get discovered by potential clients through our agent marketplace and referral system.',
        target: '[data-onboarding="agent-marketplace"]',
        position: 'bottom',
        action: 'click'
      },
      {
        id: 'calendar-integration',
        title: 'Schedule Showings',
        description: 'Integrate your calendar to easily schedule property showings and client meetings.',
        target: '[data-onboarding="calendar"]',
        position: 'bottom',
        action: 'click'
      },
      {
        id: 'analytics-dashboard',
        title: 'Business Analytics',
        description: 'Track your performance, conversion rates, and identify opportunities for growth.',
        component: 'AnalyticsIntro'
      }
    ]
  },
  {
    id: 'landlord-onboarding',
    name: 'Landlord Management Setup',
    role: 'landlord',
    estimatedTime: 8,
    steps: [
      {
        id: 'welcome',
        title: 'Welcome, Property Manager!',
        description: 'Let\'s set up your rental management system and streamline your operations.',
        component: 'WelcomeStep'
      },
      {
        id: 'property-portfolio',
        title: 'Add Your Properties',
        description: 'Start by adding all your rental properties to create a centralized portfolio.',
        component: 'PropertyPortfolioSetup'
      },
      {
        id: 'tenant-screening',
        title: 'Tenant Screening',
        description: 'Learn about our tenant screening tools to find reliable, qualified renters.',
        component: 'TenantScreeningGuide'
      },
      {
        id: 'lease-management',
        title: 'Digital Lease Management',
        description: 'Create, send, and manage lease agreements digitally with e-signature capabilities.',
        target: '[data-onboarding="lease-management"]',
        position: 'bottom',
        action: 'click'
      },
      {
        id: 'maintenance-requests',
        title: 'Maintenance Workflow',
        description: 'Set up automated maintenance request handling and connect with service professionals.',
        component: 'MaintenanceSetup'
      },
      {
        id: 'rent-collection',
        title: 'Automated Rent Collection',
        description: 'Enable online rent payments and automatic late fee processing for consistent cash flow.',
        component: 'RentCollectionSetup'
      },
      {
        id: 'financial-reporting',
        title: 'Financial Reports',
        description: 'Generate income statements, expense reports, and tax documents automatically.',
        target: '[data-onboarding="financial-reports"]',
        position: 'left',
        action: 'click'
      }
    ]
  }
];