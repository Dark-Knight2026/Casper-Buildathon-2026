export interface Transaction {
  id: string;
  property: string;
  agent: string;
  buyer: string;
  price: number;
  status: 'closing' | 'escrow' | 'pending' | 'contingent' | 'active';
  stage: string;
  closingDate: string;
  progress: number;
  daysUntilClosing: number;
  lastActivityDate: string;
  missingDocuments: string[];
  communicationFrequency: number; // messages per week
  financingStatus: 'approved' | 'pending' | 'conditional' | 'not_started';
  inspectionStatus: 'completed' | 'scheduled' | 'pending' | 'issues_found';
  contingenciesRemaining: number;
  propertyType?: 'residential' | 'commercial' | 'multi-family' | 'land' | 'luxury';
}

export interface DealHealthScore {
  transactionId: string;
  overallScore: number; // 0-100
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  factors: {
    documentCompletion: number;
    activityLevel: number;
    timelineAdherence: number;
    financingStrength: number;
    communicationQuality: number;
  };
  alerts: DealAlert[];
  recommendations: string[];
  lastUpdated: Date;
  configurationUsed?: string; // ID of configuration used
}

export interface DealAlert {
  id: string;
  severity: 'info' | 'warning' | 'critical';
  category: 'documents' | 'timeline' | 'communication' | 'financing' | 'inspection';
  message: string;
  actionRequired: string;
  dueDate?: string;
}

export interface DealHealthMetrics {
  totalDeals: number;
  healthyDeals: number;
  atRiskDeals: number;
  criticalDeals: number;
  averageHealthScore: number;
  predictedClosureRate: number;
}

export interface ScoringWeights {
  documentCompletion: number;
  activityLevel: number;
  timelineAdherence: number;
  financingStrength: number;
  communicationQuality: number;
}

export interface RiskThresholds {
  low: number; // score >= this value
  medium: number; // score >= this value
  high: number; // score >= this value
  // critical: anything below high threshold
}

export interface AlertThresholds {
  criticalDocumentsMissing: number; // days until closing
  warningDocumentsMissing: number;
  criticalActivityGap: number; // days since last activity
  warningActivityGap: number;
  criticalFinancingDeadline: number; // days until closing
  warningFinancingDeadline: number;
}

// Advanced threshold controls
export interface ConditionalThreshold {
  id: string;
  name: string;
  enabled: boolean;
  condition: ThresholdCondition;
  adjustments: ThresholdAdjustments;
}

export interface ThresholdCondition {
  type: 'deal_value' | 'property_type' | 'days_until_closing' | 'agent' | 'financing_status';
  operator: 'equals' | 'greater_than' | 'less_than' | 'in_range' | 'contains';
  value: string | number | string[];
  secondValue?: number; // for range conditions
}

export interface ThresholdAdjustments {
  documentCritical?: number;
  documentWarning?: number;
  activityCritical?: number;
  activityWarning?: number;
  financingCritical?: number;
  financingWarning?: number;
  weightAdjustments?: Partial<ScoringWeights>;
}

export interface TimeBasedRule {
  id: string;
  name: string;
  enabled: boolean;
  triggerDays: number; // days until closing when rule activates
  adjustments: ThresholdAdjustments;
  description: string;
}

export interface AgentOverride {
  id: string;
  agentName: string;
  enabled: boolean;
  adjustments: ThresholdAdjustments;
  reason: string;
}

export interface AdvancedThresholdConfig {
  conditionalThresholds: ConditionalThreshold[];
  timeBasedRules: TimeBasedRule[];
  agentOverrides: AgentOverride[];
  enableAdvancedMode: boolean;
}

export interface ScoringConfiguration {
  id: string;
  name: string;
  description: string;
  propertyTypes?: string[]; // Applicable property types
  weights: ScoringWeights;
  riskThresholds: RiskThresholds;
  alertThresholds: AlertThresholds;
  advancedThresholds?: AdvancedThresholdConfig;
  isDefault: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface ConfigurationPerformance {
  configurationId: string;
  configurationName: string;
  totalDealsUsed: number;
  successfulClosings: number;
  failedDeals: number;
  averageHealthScore: number;
  accuracyRate: number; // % of predictions that were correct
  falsePositives: number; // Predicted failure but closed successfully
  falseNegatives: number; // Predicted success but failed
  averageDaysToClose: number;
  propertyTypeBreakdown: {
    propertyType: string;
    count: number;
    successRate: number;
  }[];
  lastUsed: Date;
}

export interface ConfigurationAnalytics {
  configurations: ConfigurationPerformance[];
  bestOverallConfiguration: string;
  bestByPropertyType: {
    propertyType: string;
    configurationId: string;
    configurationName: string;
    successRate: number;
  }[];
  recommendations: string[];
}

export const DEFAULT_ADVANCED_THRESHOLD_CONFIG: AdvancedThresholdConfig = {
  conditionalThresholds: [],
  timeBasedRules: [],
  agentOverrides: [],
  enableAdvancedMode: false
};

export const DEFAULT_SCORING_CONFIG: ScoringConfiguration = {
  id: 'default',
  name: 'Standard Scoring',
  description: 'Balanced approach for typical real estate transactions',
  weights: {
    documentCompletion: 0.25,
    activityLevel: 0.20,
    timelineAdherence: 0.25,
    financingStrength: 0.20,
    communicationQuality: 0.10
  },
  riskThresholds: {
    low: 80,
    medium: 60,
    high: 40
  },
  alertThresholds: {
    criticalDocumentsMissing: 7,
    warningDocumentsMissing: 14,
    criticalActivityGap: 5,
    warningActivityGap: 3,
    criticalFinancingDeadline: 14,
    warningFinancingDeadline: 21
  },
  advancedThresholds: DEFAULT_ADVANCED_THRESHOLD_CONFIG,
  isDefault: true,
  createdAt: new Date(),
  updatedAt: new Date()
};

export const PRESET_CONFIGURATIONS: ScoringConfiguration[] = [
  DEFAULT_SCORING_CONFIG,
  {
    id: 'fast-track',
    name: 'Fast-Track Scoring',
    description: 'Prioritizes speed and efficiency for quick closings',
    weights: {
      documentCompletion: 0.20,
      activityLevel: 0.25,
      timelineAdherence: 0.35,
      financingStrength: 0.15,
      communicationQuality: 0.05
    },
    riskThresholds: {
      low: 85,
      medium: 70,
      high: 50
    },
    alertThresholds: {
      criticalDocumentsMissing: 5,
      warningDocumentsMissing: 10,
      criticalActivityGap: 3,
      warningActivityGap: 2,
      criticalFinancingDeadline: 10,
      warningFinancingDeadline: 15
    },
    advancedThresholds: DEFAULT_ADVANCED_THRESHOLD_CONFIG,
    isDefault: false,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: 'high-value',
    name: 'High-Value Scoring',
    description: 'Emphasizes documentation and financing for luxury properties',
    propertyTypes: ['luxury'],
    weights: {
      documentCompletion: 0.30,
      activityLevel: 0.15,
      timelineAdherence: 0.20,
      financingStrength: 0.30,
      communicationQuality: 0.05
    },
    riskThresholds: {
      low: 85,
      medium: 70,
      high: 50
    },
    alertThresholds: {
      criticalDocumentsMissing: 10,
      warningDocumentsMissing: 21,
      criticalActivityGap: 7,
      warningActivityGap: 5,
      criticalFinancingDeadline: 21,
      warningFinancingDeadline: 30
    },
    advancedThresholds: DEFAULT_ADVANCED_THRESHOLD_CONFIG,
    isDefault: false,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: 'client-focused',
    name: 'Client-Focused Scoring',
    description: 'Prioritizes communication and client satisfaction',
    weights: {
      documentCompletion: 0.20,
      activityLevel: 0.20,
      timelineAdherence: 0.20,
      financingStrength: 0.15,
      communicationQuality: 0.25
    },
    riskThresholds: {
      low: 80,
      medium: 60,
      high: 40
    },
    alertThresholds: {
      criticalDocumentsMissing: 7,
      warningDocumentsMissing: 14,
      criticalActivityGap: 4,
      warningActivityGap: 2,
      criticalFinancingDeadline: 14,
      warningFinancingDeadline: 21
    },
    advancedThresholds: DEFAULT_ADVANCED_THRESHOLD_CONFIG,
    isDefault: false,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  // Property-specific configurations
  {
    id: 'residential',
    name: 'Residential Properties',
    description: 'Optimized for single-family homes and condos with standard timelines',
    propertyTypes: ['residential'],
    weights: {
      documentCompletion: 0.25,
      activityLevel: 0.20,
      timelineAdherence: 0.25,
      financingStrength: 0.20,
      communicationQuality: 0.10
    },
    riskThresholds: {
      low: 80,
      medium: 60,
      high: 40
    },
    alertThresholds: {
      criticalDocumentsMissing: 7,
      warningDocumentsMissing: 14,
      criticalActivityGap: 5,
      warningActivityGap: 3,
      criticalFinancingDeadline: 14,
      warningFinancingDeadline: 21
    },
    advancedThresholds: DEFAULT_ADVANCED_THRESHOLD_CONFIG,
    isDefault: false,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: 'commercial',
    name: 'Commercial Properties',
    description: 'Designed for office, retail, and industrial properties with complex due diligence',
    propertyTypes: ['commercial'],
    weights: {
      documentCompletion: 0.35,
      activityLevel: 0.15,
      timelineAdherence: 0.15,
      financingStrength: 0.30,
      communicationQuality: 0.05
    },
    riskThresholds: {
      low: 85,
      medium: 70,
      high: 50
    },
    alertThresholds: {
      criticalDocumentsMissing: 14,
      warningDocumentsMissing: 30,
      criticalActivityGap: 10,
      warningActivityGap: 7,
      criticalFinancingDeadline: 30,
      warningFinancingDeadline: 45
    },
    advancedThresholds: DEFAULT_ADVANCED_THRESHOLD_CONFIG,
    isDefault: false,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: 'multi-family',
    name: 'Multi-Family Properties',
    description: 'Tailored for apartment buildings and multi-unit properties with investor focus',
    propertyTypes: ['multi-family'],
    weights: {
      documentCompletion: 0.30,
      activityLevel: 0.15,
      timelineAdherence: 0.20,
      financingStrength: 0.30,
      communicationQuality: 0.05
    },
    riskThresholds: {
      low: 85,
      medium: 70,
      high: 50
    },
    alertThresholds: {
      criticalDocumentsMissing: 10,
      warningDocumentsMissing: 21,
      criticalActivityGap: 7,
      warningActivityGap: 5,
      criticalFinancingDeadline: 21,
      warningFinancingDeadline: 35
    },
    advancedThresholds: DEFAULT_ADVANCED_THRESHOLD_CONFIG,
    isDefault: false,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: 'land',
    name: 'Land & Development',
    description: 'Specialized for raw land and development opportunities with extended timelines',
    propertyTypes: ['land'],
    weights: {
      documentCompletion: 0.35,
      activityLevel: 0.10,
      timelineAdherence: 0.15,
      financingStrength: 0.35,
      communicationQuality: 0.05
    },
    riskThresholds: {
      low: 85,
      medium: 70,
      high: 50
    },
    alertThresholds: {
      criticalDocumentsMissing: 21,
      warningDocumentsMissing: 45,
      criticalActivityGap: 14,
      warningActivityGap: 10,
      criticalFinancingDeadline: 45,
      warningFinancingDeadline: 60
    },
    advancedThresholds: DEFAULT_ADVANCED_THRESHOLD_CONFIG,
    isDefault: false,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: 'luxury',
    name: 'Luxury Residential',
    description: 'Premium properties over $1M requiring white-glove service and detailed documentation',
    propertyTypes: ['luxury'],
    weights: {
      documentCompletion: 0.30,
      activityLevel: 0.15,
      timelineAdherence: 0.20,
      financingStrength: 0.25,
      communicationQuality: 0.10
    },
    riskThresholds: {
      low: 85,
      medium: 70,
      high: 50
    },
    alertThresholds: {
      criticalDocumentsMissing: 10,
      warningDocumentsMissing: 21,
      criticalActivityGap: 7,
      warningActivityGap: 5,
      criticalFinancingDeadline: 21,
      warningFinancingDeadline: 30
    },
    advancedThresholds: DEFAULT_ADVANCED_THRESHOLD_CONFIG,
    isDefault: false,
    createdAt: new Date(),
    updatedAt: new Date()
  }
];