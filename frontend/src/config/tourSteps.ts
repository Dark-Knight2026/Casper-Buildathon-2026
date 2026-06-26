import { TourStep } from '@/components/dashboard/GenericOnboardingTour';

// Landlord Dashboard Tour
export const LANDLORD_TOUR_STEPS: TourStep[] = [
  {
    target: '[data-tour="overview"]',
    title: 'Welcome to Your Landlord Dashboard!',
    description: 'This is your central hub for managing properties, tenants, finances, and more. Let\'s take a quick tour of the key features.',
    position: 'bottom'
  },
  {
    target: '[data-tour="quick-stats"]',
    title: 'Quick Stats',
    description: 'Get an instant overview of your portfolio: total properties, occupancy rate, monthly income, and ROI at a glance.',
    position: 'bottom'
  },
  {
    target: '[data-tour="properties-tab"]',
    title: 'Properties Management',
    description: 'View and manage all your rental properties. Add new properties, edit details, and track performance metrics.',
    position: 'bottom'
  },
  {
    target: '[data-tour="tax-prep-tab"]',
    title: 'Tax Preparation',
    description: 'Comprehensive tax tools including income tracking, expense categorization, Schedule E generation, and AI-powered tax assistance.',
    position: 'bottom'
  },
  {
    target: '[data-tour="analytics-tab"]',
    title: 'Advanced Analytics',
    description: 'Dive deep into your portfolio performance with detailed analytics, predictive insights, and trend analysis.',
    position: 'bottom'
  },
  {
    target: '[data-tour="settings"]',
    title: 'Dashboard Settings',
    description: 'Customize your dashboard: toggle dark mode, rearrange widgets, enable keyboard shortcuts, and more!',
    position: 'left'
  }
];

// Buyer Dashboard Tour
export const BUYER_TOUR_STEPS: TourStep[] = [
  {
    target: '[data-tour="overview"]',
    title: 'Welcome to Your Buyer Dashboard!',
    description: 'Your personalized hub for finding and tracking properties. Let\'s explore the key features to help you find your dream home.',
    position: 'bottom'
  },
  {
    target: '[data-tour="search"]',
    title: 'Property Search',
    description: 'Search for properties using filters like location, price range, bedrooms, and more. Save your favorite searches for quick access.',
    position: 'bottom'
  },
  {
    target: '[data-tour="recommendations"]',
    title: 'AI-Powered Recommendations',
    description: 'Get personalized property recommendations based on your preferences, search history, and viewing patterns.',
    position: 'bottom'
  },
  {
    target: '[data-tour="wishlist"]',
    title: 'Your Wishlist',
    description: 'Save properties you love to your wishlist. Compare them side-by-side and schedule tours with ease.',
    position: 'bottom'
  },
  {
    target: '[data-tour="offers"]',
    title: 'Manage Offers',
    description: 'Track all your property offers in one place. See offer status, counteroffers, and important deadlines.',
    position: 'bottom'
  },
  {
    target: '[data-tour="settings"]',
    title: 'Preferences',
    description: 'Customize your experience: set notification preferences, update search criteria, and manage your profile.',
    position: 'left'
  }
];

// Agent Dashboard Tour
export const AGENT_TOUR_STEPS: TourStep[] = [
  {
    target: '[data-tour="overview"]',
    title: 'Welcome to Your Agent Dashboard!',
    description: 'Manage your clients, listings, and transactions all in one place. Let\'s explore the tools that will help you close more deals.',
    position: 'bottom'
  },
  {
    target: '[data-tour="stats"]',
    title: 'Performance Metrics',
    description: 'Track your sales performance, commission earnings, and conversion rates. Monitor your progress toward your goals.',
    position: 'bottom'
  },
  {
    target: '[data-tour="listings"]',
    title: 'Active Listings',
    description: 'Manage all your property listings. Update details, add photos, schedule showings, and track interest levels.',
    position: 'bottom'
  },
  {
    target: '[data-tour="clients"]',
    title: 'Client Management',
    description: 'Keep track of all your clients, their preferences, and communication history. Never miss a follow-up opportunity.',
    position: 'bottom'
  },
  {
    target: '[data-tour="calendar"]',
    title: 'Calendar & Showings',
    description: 'Schedule and manage property showings, client meetings, and important deadlines all in one calendar.',
    position: 'bottom'
  },
  {
    target: '[data-tour="tax-center"]',
    title: 'Tax Center',
    description: 'Manage your business taxes, track commissions, expenses, and prepare for tax season with specialized tools.',
    position: 'bottom'
  },
  {
    target: '[data-tour="settings"]',
    title: 'Dashboard Settings',
    description: 'Customize your workspace, set notification preferences, and configure integrations with your favorite tools.',
    position: 'left'
  }
];

// Tenant Dashboard Tour
export const TENANT_TOUR_STEPS: TourStep[] = [
  {
    target: '[data-tour="overview"]',
    title: 'Welcome to Your Tenant Dashboard!',
    description: 'Your one-stop portal for managing your rental. Pay rent, submit maintenance requests, and communicate with your landlord.',
    position: 'bottom'
  },
  {
    target: '[data-tour="rent-payment"]',
    title: 'Rent Payment',
    description: 'Pay your rent online with just a few clicks. Set up autopay, view payment history, and download receipts.',
    position: 'bottom'
  },
  {
    target: '[data-tour="maintenance"]',
    title: 'Maintenance Requests',
    description: 'Submit maintenance requests with photos and descriptions. Track the status and communicate with service providers.',
    position: 'bottom'
  },
  {
    target: '[data-tour="lease"]',
    title: 'Lease Information',
    description: 'Access your lease agreement, view important dates, and get reminders about lease renewal deadlines.',
    position: 'bottom'
  },
  {
    target: '[data-tour="tax-center"]',
    title: 'Tax Center',
    description: 'Access rent receipts for tax credits, track deductible expenses, and manage your renter tax benefits.',
    position: 'bottom'
  },
  {
    target: '[data-tour="messages"]',
    title: 'Messages',
    description: 'Communicate directly with your landlord or property manager. All conversations are saved for your records.',
    position: 'bottom'
  },
  {
    target: '[data-tour="settings"]',
    title: 'Account Settings',
    description: 'Update your contact information, payment methods, and notification preferences.',
    position: 'left'
  }
];

// Generic Professional Dashboard Tour (for specialized roles)
export const PROFESSIONAL_TOUR_STEPS: TourStep[] = [
  {
    target: '[data-tour="overview"]',
    title: 'Welcome to Your Professional Dashboard!',
    description: 'Manage your real estate services, clients, and projects efficiently. Let\'s explore the key features.',
    position: 'bottom'
  },
  {
    target: '[data-tour="stats"]',
    title: 'Quick Overview',
    description: 'View your key metrics at a glance: active projects, pending tasks, and recent activities.',
    position: 'bottom'
  },
  {
    target: '[data-tour="projects"]',
    title: 'Active Projects',
    description: 'Track all your ongoing projects, deadlines, and deliverables in one organized view.',
    position: 'bottom'
  },
  {
    target: '[data-tour="clients"]',
    title: 'Client Management',
    description: 'Manage your client relationships, view project history, and track communications.',
    position: 'bottom'
  },
  {
    target: '[data-tour="calendar"]',
    title: 'Schedule & Tasks',
    description: 'Keep track of appointments, deadlines, and important tasks. Never miss a commitment.',
    position: 'bottom'
  },
  {
    target: '[data-tour="settings"]',
    title: 'Settings',
    description: 'Customize your dashboard, manage integrations, and configure your preferences.',
    position: 'left'
  }
];

// Broker Dashboard Tour
export const BROKER_TOUR_STEPS: TourStep[] = [
  {
    target: '[data-tour="overview"]',
    title: 'Welcome to Your Broker Dashboard!',
    description: 'Oversee your brokerage operations, manage agents, and track overall performance. Let\'s explore the management tools.',
    position: 'bottom'
  },
  {
    target: '[data-tour="stats"]',
    title: 'Brokerage Metrics',
    description: 'Monitor total sales volume, commission splits, agent performance, and market share at a glance.',
    position: 'bottom'
  },
  {
    target: '[data-tour="agents"]',
    title: 'Agent Management',
    description: 'Oversee your team of agents, track their performance, manage commissions, and provide support.',
    position: 'bottom'
  },
  {
    target: '[data-tour="listings"]',
    title: 'Brokerage Listings',
    description: 'View all listings across your brokerage. Monitor market activity and identify opportunities.',
    position: 'bottom'
  },
  {
    target: '[data-tour="reports"]',
    title: 'Reports & Analytics',
    description: 'Access comprehensive reports on sales, commissions, agent productivity, and market trends.',
    position: 'bottom'
  },
  {
    target: '[data-tour="settings"]',
    title: 'Brokerage Settings',
    description: 'Configure commission structures, manage office settings, and customize workflows.',
    position: 'left'
  }
];

// Seller Dashboard Tour
export const SELLER_TOUR_STEPS: TourStep[] = [
  {
    target: '[data-tour="overview"]',
    title: 'Welcome to Your Seller Dashboard!',
    description: 'Track your property listing, manage showings, and review offers. Let\'s explore how to sell your property successfully.',
    position: 'bottom'
  },
  {
    target: '[data-tour="listing"]',
    title: 'Your Listing',
    description: 'View your property listing details, photos, and description. See how buyers are engaging with your property.',
    position: 'bottom'
  },
  {
    target: '[data-tour="analytics"]',
    title: 'Listing Performance',
    description: 'Track views, favorites, and showing requests. Understand how your property compares to similar listings.',
    position: 'bottom'
  },
  {
    target: '[data-tour="showings"]',
    title: 'Showings & Tours',
    description: 'Manage showing requests, approve times, and receive feedback from potential buyers after each showing.',
    position: 'bottom'
  },
  {
    target: '[data-tour="offers"]',
    title: 'Offers & Negotiations',
    description: 'Review incoming offers, compare terms, and work with your agent to negotiate the best deal.',
    position: 'bottom'
  },
  {
    target: '[data-tour="settings"]',
    title: 'Settings',
    description: 'Update your contact preferences, showing availability, and notification settings.',
    position: 'left'
  }
];