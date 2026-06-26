import { LucideIcon } from 'lucide-react';

export type InsightType = 'opportunity' | 'risk' | 'info' | 'action';
export type InsightCategory = 'financial' | 'market' | 'tenant' | 'maintenance' | 'lead';

export interface Insight {
  id: string;
  title: string;
  description: string;
  type: InsightType;
  category: InsightCategory;
  score?: number; // 0-100 confidence or importance score
  timestamp: string;
  actionLabel?: string;
  actionUrl?: string;
}

export interface MarketTrend {
  id: string;
  location: string;
  metric: string;
  value: number;
  change: number; // percentage
  direction: 'up' | 'down' | 'flat';
  forecast: string;
  confidence: number;
}

export interface RiskAssessment {
  entityId: string; // tenantId or propertyId
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  factors: string[];
  recommendation: string;
}

// Mock Data
const MOCK_INSIGHTS: Insight[] = [
  {
    id: '1',
    title: 'High-Value Lead Detected',
    description: 'Lead "Sarah Johnson" has viewed 5 properties in the last 24h and matches your premium listing criteria.',
    type: 'opportunity',
    category: 'lead',
    score: 92,
    timestamp: new Date().toISOString(),
    actionLabel: 'Contact Now',
  },
  {
    id: '2',
    title: 'Rent Collection Risk',
    description: 'Tenant at Unit 4B has shown a pattern of late payments. AI predicts 75% chance of late payment next month.',
    type: 'risk',
    category: 'financial',
    score: 75,
    timestamp: new Date().toISOString(),
    actionLabel: 'Send Reminder',
  },
  {
    id: '3',
    title: 'Market Rent Adjustment',
    description: 'Comparable properties in Downtown area have increased rent by 5%. Consider adjusting rent for Unit 12.',
    type: 'opportunity',
    category: 'market',
    score: 85,
    timestamp: new Date().toISOString(),
    actionLabel: 'Review Pricing',
  },
  {
    id: '4',
    title: 'Maintenance Optimization',
    description: 'HVAC systems in Building A are due for preventive maintenance. Scheduling now could save 20% on emergency repairs.',
    type: 'action',
    category: 'maintenance',
    score: 88,
    timestamp: new Date().toISOString(),
    actionLabel: 'Schedule Service',
  },
];

const MOCK_TRENDS: MarketTrend[] = [
  {
    id: '1',
    location: 'Downtown',
    metric: 'Average Rent',
    value: 2450,
    change: 5.2,
    direction: 'up',
    forecast: 'Continuing upward trend for Q3',
    confidence: 0.9,
  },
  {
    id: '2',
    location: 'Suburbs',
    metric: 'Days on Market',
    value: 14,
    change: -12,
    direction: 'down',
    forecast: 'High demand expected to persist',
    confidence: 0.85,
  },
];

export const aiService = {
  getRecommendations: async (userId: string, role: string): Promise<Insight[]> => {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 800));
    
    // Filter mock data based on role (simple simulation)
    if (role === 'agent') {
      return MOCK_INSIGHTS.filter(i => ['lead', 'market'].includes(i.category));
    } else if (role === 'landlord') {
      return MOCK_INSIGHTS.filter(i => ['financial', 'tenant', 'maintenance'].includes(i.category));
    }
    return MOCK_INSIGHTS;
  },

  getMarketInsights: async (location: string): Promise<MarketTrend[]> => {
    await new Promise(resolve => setTimeout(resolve, 600));
    return MOCK_TRENDS;
  },

  getRiskAssessment: async (entityId: string): Promise<RiskAssessment> => {
    await new Promise(resolve => setTimeout(resolve, 500));
    return {
      entityId,
      riskLevel: 'medium',
      factors: ['Late payment history', 'Credit score fluctuation'],
      recommendation: 'Request early payment or set up auto-pay',
    };
  }
};