import React, { createContext, useContext, useState, useEffect } from 'react';
import { logger } from '@/utils/logger';
import { Agent, AgentPerformanceReport, AgentStats, AgentTimelineEntry } from '@/types/agent';

interface AgentContextType {
  agents: Agent[];
  agentStats: AgentStats;
  selectedAgent: Agent | null;
  isLoading: boolean;
  
  // Agent management
  addAgent: (agent: Omit<Agent, 'id' | 'joinDate' | 'timeline' | 'lastActivity'>) => Promise<void>;
  updateAgent: (agentId: string, updates: Partial<Agent>) => Promise<void>;
  updateAgentStatus: (agentId: string, status: Agent['status']) => Promise<void>;
  deleteAgent: (agentId: string) => Promise<void>;
  getAgent: (agentId: string) => Agent | undefined;
  setSelectedAgent: (agent: Agent | null) => void;
  // Performance and reporting
  getAgentPerformanceReport: (agentId: string, period: 'monthly' | 'quarterly' | 'yearly') => AgentPerformanceReport | null;
  updateAgentPerformance: (agentId: string, metrics: Partial<Agent['performance']>) => Promise<void>;
  addAgentTimelineEntry: (agentId: string, entry: Omit<AgentTimelineEntry, 'id'>) => Promise<void>;
  // Client assignment
  assignClientToAgent: (agentId: string, clientId: string) => Promise<void>;
  unassignClientFromAgent: (agentId: string, clientId: string) => Promise<void>;
  getAgentClients: (agentId: string) => string[];
  // Filtering and search
  filterAgents: (filters: {
    status?: Agent['status'];
    role?: Agent['role'];
    territory?: string;
    specialty?: string;
    search?: string;
  }) => Agent[];
  // Statistics
  refreshStats: () => Promise<void>;
}

const AgentContext = createContext<AgentContextType | undefined>(undefined);

export function AgentProvider({ children }: { children: React.ReactNode }) {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [agentStats, setAgentStats] = useState<AgentStats>({
    totalAgents: 0,
    activeAgents: 0,
    newAgentsThisMonth: 0,
    topPerformer: null,
    totalSalesVolume: 0,
    totalTransactions: 0,
    averagePerformanceScore: 0
  });

  // Initialize with mock data
  useEffect(() => {
    const mockAgents: Agent[] = [
      {
        id: 'agent-1',
        name: 'Sarah Johnson',
        email: 'sarah.johnson@keychain.com',
        phone: '(757) 555-0123',
        licenseNumber: 'VA-12345678',
        joinDate: '2023-01-15',
        status: 'active',
        role: 'senior-agent',
        specialties: ['Luxury Homes', 'Waterfront Properties'],
        territory: ['Norfolk', 'Virginia Beach'],
        performance: {
          totalSales: 24,
          totalVolume: 12500000,
          activeListings: 8,
          closedDeals: 18,
          averageDaysOnMarket: 32,
          clientSatisfactionScore: 4.8,
          conversionRate: 75,
          monthlyGoal: 2000000,
          yearlyGoal: 15000000
        },
        address: {
          street: '123 Broker Lane',
          city: 'Norfolk',
          state: 'VA',
          zipCode: '23510'
        },
        experience: 8,
        education: ['Real Estate License - Virginia', 'Business Administration - ODU'],
        certifications: ['CRS', 'GRI', 'ABR'],
        languages: ['English', 'Spanish'],
        commissionStructure: {
          splitPercentage: 70,
          capAmount: 25000,
          bonusStructure: 'Quarterly Performance Bonus'
        },
        assignedClients: ['client-1', 'client-2', 'client-3'],
        timeline: [
          {
            id: 'timeline-1',
            type: 'sale',
            title: 'Closed $850K Waterfront Home',
            description: 'Successfully closed luxury waterfront property in Virginia Beach',
            date: '2024-01-10',
            amount: 850000
          },
          {
            id: 'timeline-2',
            type: 'listing',
            title: 'New Luxury Listing',
            description: 'Added $1.2M luxury home to portfolio',
            date: '2024-01-05',
            amount: 1200000
          }
        ],
        lastActivity: '2024-01-15T10:30:00Z',
        socialMedia: {
          website: 'https://sarahjohnson-realty.com',
          linkedin: 'https://linkedin.com/in/sarahjohnson',
          facebook: 'https://facebook.com/sarahjohnsonrealty'
        }
      },
      {
        id: 'agent-2',
        name: 'Michael Chen',
        email: 'michael.chen@keychain.com',
        phone: '(757) 555-0124',
        licenseNumber: 'VA-87654321',
        joinDate: '2023-06-01',
        status: 'active',
        role: 'agent',
        specialties: ['First-Time Buyers', 'Investment Properties'],
        territory: ['Norfolk', 'Chesapeake'],
        performance: {
          totalSales: 16,
          totalVolume: 6800000,
          activeListings: 5,
          closedDeals: 12,
          averageDaysOnMarket: 28,
          clientSatisfactionScore: 4.6,
          conversionRate: 68,
          monthlyGoal: 1200000,
          yearlyGoal: 8000000
        },
        address: {
          street: '456 Agent Street',
          city: 'Norfolk',
          state: 'VA',
          zipCode: '23511'
        },
        experience: 3,
        education: ['Real Estate License - Virginia', 'Finance - VCU'],
        certifications: ['ABR', 'SFR'],
        languages: ['English', 'Mandarin'],
        commissionStructure: {
          splitPercentage: 60,
          capAmount: 20000
        },
        assignedClients: ['client-4', 'client-5'],
        timeline: [
          {
            id: 'timeline-3',
            type: 'client_meeting',
            title: 'First-Time Buyer Consultation',
            description: 'Met with new clients for home buying consultation',
            date: '2024-01-12'
          }
        ],
        lastActivity: '2024-01-14T15:45:00Z'
      },
      {
        id: 'agent-3',
        name: 'Emily Rodriguez',
        email: 'emily.rodriguez@keychain.com',
        phone: '(757) 555-0125',
        licenseNumber: 'VA-11223344',
        joinDate: '2024-01-01',
        status: 'pending',
        role: 'agent',
        specialties: ['Residential Sales'],
        territory: ['Portsmouth'],
        performance: {
          totalSales: 0,
          totalVolume: 0,
          activeListings: 2,
          closedDeals: 0,
          averageDaysOnMarket: 0,
          clientSatisfactionScore: 0,
          conversionRate: 0,
          monthlyGoal: 500000,
          yearlyGoal: 3000000
        },
        address: {
          street: '789 New Agent Ave',
          city: 'Portsmouth',
          state: 'VA',
          zipCode: '23704'
        },
        experience: 0,
        education: ['Real Estate License - Virginia'],
        certifications: [],
        languages: ['English'],
        commissionStructure: {
          splitPercentage: 50
        },
        assignedClients: [],
        timeline: [
          {
            id: 'timeline-4',
            type: 'training',
            title: 'Completed Onboarding',
            description: 'Finished new agent onboarding program',
            date: '2024-01-08'
          }
        ],
        lastActivity: '2024-01-13T09:15:00Z'
      }
    ];

    setAgents(mockAgents);
    calculateStats(mockAgents);
  }, []);

  const calculateStats = (agentList: Agent[]) => {
    const activeAgents = agentList.filter(agent => agent.status === 'active');
    const newAgentsThisMonth = agentList.filter(agent => {
      const joinDate = new Date(agent.joinDate);
      const now = new Date();
      return joinDate.getMonth() === now.getMonth() && joinDate.getFullYear() === now.getFullYear();
    });

    const topPerformer = activeAgents.reduce((top, agent) => {
      return agent.performance.totalVolume > (top?.performance.totalVolume || 0) ? agent : top;
    }, null as Agent | null);

    const totalSalesVolume = agentList.reduce((sum, agent) => sum + agent.performance.totalVolume, 0);
    const totalTransactions = agentList.reduce((sum, agent) => sum + agent.performance.totalSales, 0);
    const averagePerformanceScore = activeAgents.length > 0 
      ? activeAgents.reduce((sum, agent) => sum + agent.performance.clientSatisfactionScore, 0) / activeAgents.length 
      : 0;

    setAgentStats({
      totalAgents: agentList.length,
      activeAgents: activeAgents.length,
      newAgentsThisMonth: newAgentsThisMonth.length,
      topPerformer,
      totalSalesVolume,
      totalTransactions,
      averagePerformanceScore
    });
  };

  const addAgent = async (agentData: Omit<Agent, 'id' | 'joinDate' | 'timeline' | 'lastActivity'>) => {
    setIsLoading(true);
    try {
      const newAgent: Agent = {
        ...agentData,
        id: `agent-${Date.now()}`,
        joinDate: new Date().toISOString().split('T')[0],
        timeline: [],
        lastActivity: new Date().toISOString()
      };

      const updatedAgents = [...agents, newAgent];
      setAgents(updatedAgents);
      calculateStats(updatedAgents);

      // Add timeline entry
      await addAgentTimelineEntry(newAgent.id, {
        type: 'note',
        title: 'Agent Added',
        description: 'New agent added to the brokerage',
        date: new Date().toISOString().split('T')[0]
      });
    } catch (error) {
      logger.error('Error adding agent:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const updateAgent = async (agentId: string, updates: Partial<Agent>) => {
    setIsLoading(true);
    try {
      const updatedAgents = agents.map(agent =>
        agent.id === agentId 
          ? { ...agent, ...updates, lastActivity: new Date().toISOString() }
          : agent
      );
      setAgents(updatedAgents);
      calculateStats(updatedAgents);

      if (selectedAgent?.id === agentId) {
        setSelectedAgent(updatedAgents.find(a => a.id === agentId) || null);
      }
    } catch (error) {
      logger.error('Error updating agent:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const updateAgentStatus = async (agentId: string, status: Agent['status']) => {
    await updateAgent(agentId, { status });
  };

  const deleteAgent = async (agentId: string) => {
    setIsLoading(true);
    try {
      const updatedAgents = agents.filter(agent => agent.id !== agentId);
      setAgents(updatedAgents);
      calculateStats(updatedAgents);

      if (selectedAgent?.id === agentId) {
        setSelectedAgent(null);
      }
    } catch (error) {
      logger.error('Error deleting agent:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const getAgent = (agentId: string) => {
    return agents.find(agent => agent.id === agentId);
  };

  const getAgentPerformanceReport = (agentId: string, period: 'monthly' | 'quarterly' | 'yearly'): AgentPerformanceReport | null => {
    const agent = getAgent(agentId);
    if (!agent) return null;

    // Mock performance report - in real app, this would fetch from API
    return {
      agentId,
      period: {
        startDate: '2024-01-01',
        endDate: '2024-01-31',
        type: period
      },
      metrics: {
        salesVolume: agent.performance.totalVolume,
        transactionCount: agent.performance.totalSales,
        averageTransactionValue: agent.performance.totalVolume / Math.max(agent.performance.totalSales, 1),
        listingsCreated: agent.performance.activeListings + agent.performance.closedDeals,
        listingsSold: agent.performance.closedDeals,
        averageDaysOnMarket: agent.performance.averageDaysOnMarket,
        clientAcquisition: agent.assignedClients.length,
        clientRetention: 85,
        goalAchievement: (agent.performance.totalVolume / agent.performance.yearlyGoal) * 100,
        commissionEarned: agent.performance.totalVolume * (agent.commissionStructure.splitPercentage / 100) * 0.03
      },
      rankings: {
        salesVolumeRank: 1,
        transactionCountRank: 1,
        clientSatisfactionRank: 1,
        totalAgents: agents.length
      },
      goals: {
        salesVolumeGoal: agent.performance.yearlyGoal,
        transactionGoal: 25,
        achievement: (agent.performance.totalVolume / agent.performance.yearlyGoal) * 100
      }
    };
  };

  const updateAgentPerformance = async (agentId: string, metrics: Partial<Agent['performance']>) => {
    const agent = getAgent(agentId);
    if (!agent) return;

    await updateAgent(agentId, {
      performance: { ...agent.performance, ...metrics }
    });
  };

  const addAgentTimelineEntry = async (agentId: string, entry: Omit<AgentTimelineEntry, 'id'>) => {
    const agent = getAgent(agentId);
    if (!agent) return;

    const newEntry: AgentTimelineEntry = {
      ...entry,
      id: `timeline-${Date.now()}`
    };

    await updateAgent(agentId, {
      timeline: [...agent.timeline, newEntry]
    });
  };

  const assignClientToAgent = async (agentId: string, clientId: string) => {
    const agent = getAgent(agentId);
    if (!agent) return;

    if (!agent.assignedClients.includes(clientId)) {
      await updateAgent(agentId, {
        assignedClients: [...agent.assignedClients, clientId]
      });

      await addAgentTimelineEntry(agentId, {
        type: 'note',
        title: 'Client Assigned',
        description: `New client assigned to agent`,
        date: new Date().toISOString().split('T')[0],
        clientId
      });
    }
  };

  const unassignClientFromAgent = async (agentId: string, clientId: string) => {
    const agent = getAgent(agentId);
    if (!agent) return;

    await updateAgent(agentId, {
      assignedClients: agent.assignedClients.filter(id => id !== clientId)
    });

    await addAgentTimelineEntry(agentId, {
      type: 'note',
      title: 'Client Unassigned',
      description: `Client removed from agent`,
      date: new Date().toISOString().split('T')[0],
      clientId
    });
  };

  const getAgentClients = (agentId: string): string[] => {
    const agent = getAgent(agentId);
    return agent?.assignedClients || [];
  };

  const filterAgents = (filters: {
    status?: Agent['status'];
    role?: Agent['role'];
    territory?: string;
    specialty?: string;
    search?: string;
  }) => {
    return agents.filter(agent => {
      if (filters.status && agent.status !== filters.status) return false;
      if (filters.role && agent.role !== filters.role) return false;
      if (filters.territory && !agent.territory.includes(filters.territory)) return false;
      if (filters.specialty && !agent.specialties.includes(filters.specialty)) return false;
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        return agent.name.toLowerCase().includes(searchLower) ||
               agent.email.toLowerCase().includes(searchLower) ||
               agent.licenseNumber.toLowerCase().includes(searchLower);
      }
      return true;
    });
  };

  const refreshStats = async () => {
    calculateStats(agents);
  };

  const value: AgentContextType = {
    agents,
    agentStats,
    selectedAgent,
    isLoading,
    addAgent,
    updateAgent,
    updateAgentStatus,
    deleteAgent,
    getAgent,
    setSelectedAgent,
    getAgentPerformanceReport,
    updateAgentPerformance,
    addAgentTimelineEntry,
    assignClientToAgent,
    unassignClientFromAgent,
    getAgentClients,
    filterAgents,
    refreshStats
  };

  return (
    <AgentContext.Provider value={value}>
      {children}
    </AgentContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAgent() {
  const context = useContext(AgentContext);
  if (context === undefined) {
    throw new Error('useAgent must be used within an AgentProvider');
  }
  return context;
}