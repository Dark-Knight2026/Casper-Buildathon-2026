export interface Agent {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  licenseNumber: string;
  status: 'active' | 'suspended' | 'inactive';
  hireDate: Date;
  team?: string;
  region?: string;
  brokerage: string;
  licenseExpiry: Date;
  enoInsuranceExpiry: Date;
}

export interface WeightSchema {
  id: string;
  version: string;
  production: number; // 35%
  efficiency: number; // 25%
  clientExperience: number; // 20%
  compliance: number; // 15%
  marketing: number; // 5%
  activeFrom: Date;
  activeTo?: Date;
  isActive: boolean;
}

export interface Segment {
  id: string;
  city: string;
  propertyType: 'SFH' | 'Condo' | 'Multi-family' | 'Commercial';
  priceBand: '<$500k' | '$500k-$1M' | '$1M-$3M' | '>$3M';
}

export interface MetricsRaw {
  agentId: string;
  segmentId: string;
  windowStart: Date;
  windowEnd: Date;
  dealsCount: number;
  totalVolume: number;
  averageDaysToClose: number;
  pricingAccuracy: number; // sold_price / list_price
  clientRating: number;
  onTimeRate: number;
  marketingQuality: number;
  priceChangeCount: number;
  verifiedClosings: number;
}

export interface AQISnapshot {
  agentId: string;
  segmentId?: string;
  schemaId: string;
  aqiScore: number;
  components: {
    production: number;
    efficiency: number;
    clientExperience: number;
    compliance: number;
    marketing: number;
  };
  sampleSize: number;
  updatedAt: Date;
  isGlobal: boolean;
}

export interface SkillRating {
  agentId: string;
  mu: number; // skill mean
  sigma: number; // uncertainty
  lastUpdated: Date;
  modelVersion: string;
  recentDeltas: number[];
}

export interface Deal {
  id: string;
  agentId: string;
  segmentId: string;
  propertyAddress: string;
  closedAt: Date;
  soldPrice: number;
  listPrice: number;
  daysToClose: number;
  financing: 'cash' | 'mortgage' | 'other';
  contingencies: string[];
  inventoryMOI: number; // months of inventory
  verificationFlags: string[];
  expectedDTC?: number;
  expectedPriceRatio?: number;
}

export interface AntiGamingAudit {
  id: string;
  dealId: string;
  agentId: string;
  rule: string;
  severity: 'low' | 'medium' | 'high';
  penalty: number;
  notes: string;
  createdAt: Date;
}

export interface Review {
  id: string;
  transactionId: string;
  agentId: string;
  rating: number;
  verified: boolean;
  source: string;
  createdAt: Date;
  ipHash: string;
  deviceHash: string;
}

export interface LeaderboardEntry {
  agentId: string;
  agentName: string;
  rank: number;
  aqiScore: number;
  confidenceInterval: [number, number];
  dealsCount: number;
  totalVolume: number;
  skillRating: {
    mu: number;
    sigma: number;
  };
}

export interface BrokerAnalytics {
  totalAgents: number;
  activeAgents: number;
  totalDeals: number;
  totalVolume: number;
  averageAQI: number;
  topPerformers: LeaderboardEntry[];
  complianceIssues: number;
  pendingApprovals: number;
  licenseExpirations: number;
}

export interface ComplianceIssue {
  id: string;
  agentId: string;
  type: 'license_expiry' | 'insurance_expiry' | 'escrow_reconciliation' | 'audit_finding';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  dueDate: Date;
  status: 'open' | 'in_progress' | 'resolved';
  createdAt: Date;
}

export interface LeadRoutingRule {
  id: string;
  segmentId: string;
  method: 'round_robin' | 'performance_weight' | 'availability';
  agentIds: string[];
  caps: {
    daily?: number;
    weekly?: number;
    monthly?: number;
  };
  isActive: boolean;
}

export interface CommissionSplit {
  id: string;
  agentId: string;
  brokerSplit: number;
  agentSplit: number;
  bonusTiers: {
    aqiThreshold: number;
    bonusPercentage: number;
  }[];
  effectiveFrom: Date;
  effectiveTo?: Date;
}