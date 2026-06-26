export interface Agent {
  id: string;
  name: string;
  email: string;
  phone: string;
  licenseNumber: string;
  joinDate: string;
  status: 'active' | 'inactive' | 'pending';
  role: 'agent' | 'senior-agent' | 'team-lead';
  profileImage?: string;
  specialties: string[];
  territory: string[];
  
  // Performance metrics
  performance: {
    totalSales: number;
    totalVolume: number;
    activeListings: number;
    closedDeals: number;
    averageDaysOnMarket: number;
    clientSatisfactionScore: number;
    conversionRate: number;
    monthlyGoal: number;
    yearlyGoal: number;
  };
  
  // Contact information
  address: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
  };
  
  // Professional details
  experience: number; // years
  education: string[];
  certifications: string[];
  languages: string[];
  
  // Commission structure
  commissionStructure: {
    splitPercentage: number;
    capAmount?: number;
    bonusStructure?: string;
  };
  
  // Assigned clients
  assignedClients: string[]; // Client IDs
  
  // Timeline and activity
  timeline: AgentTimelineEntry[];
  lastActivity: string;
  
  // Social media and marketing
  socialMedia?: {
    website?: string;
    linkedin?: string;
    facebook?: string;
    instagram?: string;
    twitter?: string;
  };
}

export interface AgentTimelineEntry {
  id: string;
  type: 'sale' | 'listing' | 'client_meeting' | 'training' | 'achievement' | 'note';
  title: string;
  description: string;
  date: string;
  amount?: number;
  clientId?: string;
  propertyId?: string;
}

export interface AgentPerformanceReport {
  agentId: string;
  period: {
    startDate: string;
    endDate: string;
    type: 'monthly' | 'quarterly' | 'yearly';
  };
  metrics: {
    salesVolume: number;
    transactionCount: number;
    averageTransactionValue: number;
    listingsCreated: number;
    listingsSold: number;
    averageDaysOnMarket: number;
    clientAcquisition: number;
    clientRetention: number;
    goalAchievement: number;
    commissionEarned: number;
  };
  rankings: {
    salesVolumeRank: number;
    transactionCountRank: number;
    clientSatisfactionRank: number;
    totalAgents: number;
  };
  goals: {
    salesVolumeGoal: number;
    transactionGoal: number;
    achievement: number;
  };
}

export interface AgentStats {
  totalAgents: number;
  activeAgents: number;
  newAgentsThisMonth: number;
  topPerformer: Agent | null;
  totalSalesVolume: number;
  totalTransactions: number;
  averagePerformanceScore: number;
}