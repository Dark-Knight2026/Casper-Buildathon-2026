import React, { createContext, useContext, useState, ReactNode, useCallback } from 'react';
import { Client, ClientFormData, ClientFilters, ClientStats } from '@/types/client';
import { useAuth } from './AuthContext';

interface ClientContextType {
  clients: Client[];
  filteredClients: Client[];
  filters: ClientFilters;
  stats: ClientStats;
  isLoading: boolean;
  addClient: (clientData: ClientFormData) => Promise<Client>;
  updateClient: (id: string, clientData: Partial<Client>) => Promise<Client>;
  deleteClient: (id: string) => Promise<void>;
  getClient: (id: string) => Client | undefined;
  setFilters: (filters: ClientFilters) => void;
  refreshClients: () => Promise<void>;
  addClientNote: (clientId: string, note: string) => Promise<void>;
  updateClientStatus: (clientId: string, status: Client['status']) => Promise<void>;
}

const ClientContext = createContext<ClientContextType | undefined>(undefined);

// Enhanced mock data for demonstration
const mockClients: Client[] = [
  {
    id: '1',
    firstName: 'John',
    lastName: 'Smith',
    email: 'john.smith@email.com',
    phone: '(757) 555-0123',
    type: 'buyer',
    status: 'active',
    assignedDate: new Date('2024-01-01'),
    lastContact: new Date('2024-01-12'),
    notes: 'Looking for a family home in Virginia Beach area. Budget flexible. Has pre-approval letter from bank.\n\n2024-01-12: Showed 3 properties in Chesapeake area. Client very interested in colonial style homes.',
    assignedAgent: 'Mike Agent',
    source: 'website',
    priority: 'high',
    communicationPreference: 'email',
    preferences: {
      budget: { min: 400000, max: 600000 },
      location: ['Virginia Beach', 'Norfolk', 'Chesapeake'],
      propertyType: ['Single Family', 'Townhouse'],
      bedrooms: 3,
      bathrooms: 2,
      features: ['Garage', 'Backyard', 'Modern Kitchen']
    },
    documents: [
      {
        id: '1',
        name: 'Pre-approval Letter',
        type: 'Financial',
        url: '/documents/preapproval_john_smith.pdf',
        uploadDate: new Date('2024-01-02')
      },
      {
        id: '2',
        name: 'Property Wishlist',
        type: 'Preferences',
        url: '/documents/wishlist_john_smith.pdf',
        uploadDate: new Date('2024-01-05')
      }
    ],
    timeline: [
      {
        id: '1',
        date: new Date('2024-01-01'),
        action: 'Client Added',
        description: 'New client added to the system',
        performedBy: 'Mike Agent'
      },
      {
        id: '2',
        date: new Date('2024-01-02'),
        action: 'Document Uploaded',
        description: 'Pre-approval letter uploaded',
        performedBy: 'John Smith'
      },
      {
        id: '3',
        date: new Date('2024-01-12'),
        action: 'Property Showing',
        description: 'Showed 3 properties in Chesapeake area',
        performedBy: 'Mike Agent'
      }
    ],
    tags: ['first-time-buyer', 'pre-approved', 'family-oriented'],
    leadScore: 85,
    conversionProbability: 75
  },
  {
    id: '2',
    firstName: 'Sarah',
    lastName: 'Johnson',
    email: 'sarah.johnson@email.com',
    phone: '(757) 555-0456',
    type: 'seller',
    status: 'active',
    assignedDate: new Date('2024-01-05'),
    lastContact: new Date('2024-01-11'),
    notes: 'Needs to sell current home before relocating for work. Timeline is flexible but prefers quick sale.\n\n2024-01-11: Completed CMA analysis. Property valued at $475,000.',
    assignedAgent: 'Mike Agent',
    source: 'referral',
    priority: 'medium',
    communicationPreference: 'phone',
    preferences: {
      budget: { min: 450000, max: 500000 }
    },
    documents: [
      {
        id: '3',
        name: 'Property Deed',
        type: 'Legal',
        url: '/documents/deed_sarah_johnson.pdf',
        uploadDate: new Date('2024-01-06')
      }
    ],
    timeline: [
      {
        id: '4',
        date: new Date('2024-01-05'),
        action: 'Client Added',
        description: 'Referred by previous client Tom Wilson',
        performedBy: 'Mike Agent'
      },
      {
        id: '5',
        date: new Date('2024-01-11'),
        action: 'CMA Completed',
        description: 'Comparative Market Analysis completed - $475,000 estimated value',
        performedBy: 'Mike Agent'
      }
    ],
    tags: ['relocation', 'time-sensitive', 'referral'],
    leadScore: 92,
    conversionProbability: 88
  },
  {
    id: '3',
    firstName: 'Michael',
    lastName: 'Davis',
    email: 'michael.davis@email.com',
    phone: '(757) 555-0789',
    type: 'investor',
    status: 'pending',
    assignedDate: new Date('2024-01-08'),
    lastContact: new Date('2024-01-10'),
    notes: 'Interested in rental properties. Looking for ROI of 8%+. Has cash available for immediate purchase.\n\n2024-01-10: Sent initial property list with potential investments.',
    assignedAgent: 'Mike Agent',
    source: 'social_media',
    priority: 'medium',
    communicationPreference: 'email',
    preferences: {
      budget: { min: 200000, max: 400000 },
      propertyType: ['Multi-Family', 'Condo'],
      features: ['Rental Income Potential', 'Low Maintenance']
    },
    documents: [
      {
        id: '4',
        name: 'Investment Criteria',
        type: 'Investment',
        url: '/documents/investment_criteria_michael_davis.pdf',
        uploadDate: new Date('2024-01-09')
      }
    ],
    timeline: [
      {
        id: '6',
        date: new Date('2024-01-08'),
        action: 'Client Added',
        description: 'Lead from Facebook advertising campaign',
        performedBy: 'Mike Agent'
      },
      {
        id: '7',
        date: new Date('2024-01-10'),
        action: 'Property List Sent',
        description: 'Sent list of 5 potential investment properties',
        performedBy: 'Mike Agent'
      }
    ],
    tags: ['investor', 'cash-buyer', 'social-media-lead'],
    leadScore: 78,
    conversionProbability: 65
  },
  {
    id: '4',
    firstName: 'Emily',
    lastName: 'Rodriguez',
    email: 'emily.rodriguez@email.com',
    phone: '(757) 555-0321',
    type: 'renter',
    status: 'active',
    assignedDate: new Date('2024-01-10'),
    lastContact: new Date('2024-01-14'),
    notes: 'Young professional looking for 1-2BR apartment near downtown. Pet-friendly required for her dog.\n\n2024-01-14: Scheduled viewing for 3 apartments this weekend.',
    assignedAgent: 'Mike Agent',
    source: 'website',
    priority: 'high',
    communicationPreference: 'text',
    preferences: {
      budget: { min: 1200, max: 1800 },
      location: ['Downtown', 'Ghent', 'Colley Bay'],
      propertyType: ['Apartment', 'Condo'],
      bedrooms: 2,
      bathrooms: 1,
      features: ['Pet-Friendly', 'Parking', 'Laundry']
    },
    timeline: [
      {
        id: '8',
        date: new Date('2024-01-10'),
        action: 'Client Added',
        description: 'Inquiry from website contact form',
        performedBy: 'Mike Agent'
      },
      {
        id: '9',
        date: new Date('2024-01-14'),
        action: 'Viewings Scheduled',
        description: 'Scheduled 3 apartment viewings for weekend',
        performedBy: 'Mike Agent'
      }
    ],
    tags: ['young-professional', 'pet-owner', 'downtown-preferred'],
    leadScore: 72,
    conversionProbability: 80
  }
];

export function ClientProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [clients, setClients] = useState<Client[]>(mockClients);
  const [filters, setFilters] = useState<ClientFilters>({});
  const [isLoading, setIsLoading] = useState(false);

  // Filter clients based on current filters
  const filteredClients = clients.filter(client => {
    if (filters.status && filters.status.length > 0 && !filters.status.includes(client.status)) {
      return false;
    }
    if (filters.type && filters.type.length > 0 && !filters.type.includes(client.type)) {
      return false;
    }
    if (filters.priority && filters.priority.length > 0 && !filters.priority.includes(client.priority)) {
      return false;
    }
    if (filters.assignedAgent && client.assignedAgent !== filters.assignedAgent) {
      return false;
    }
    if (filters.searchTerm) {
      const searchTerm = filters.searchTerm.toLowerCase();
      const fullName = `${client.firstName} ${client.lastName}`.toLowerCase();
      if (!fullName.includes(searchTerm) && 
          !client.email.toLowerCase().includes(searchTerm) &&
          !client.phone.includes(searchTerm)) {
        return false;
      }
    }
    return true;
  });

  // Calculate stats
  const stats: ClientStats = {
    total: clients.length,
    active: clients.filter(c => c.status === 'active').length,
    pending: clients.filter(c => c.status === 'pending').length,
    closed: clients.filter(c => c.status === 'closed').length,
    byType: {
      buyer: clients.filter(c => c.type === 'buyer').length,
      seller: clients.filter(c => c.type === 'seller').length,
      renter: clients.filter(c => c.type === 'renter').length,
      investor: clients.filter(c => c.type === 'investor').length,
    },
    byPriority: {
      low: clients.filter(c => c.priority === 'low').length,
      medium: clients.filter(c => c.priority === 'medium').length,
      high: clients.filter(c => c.priority === 'high').length,
      urgent: clients.filter(c => c.priority === 'urgent').length,
    },
    conversionRate: clients.length > 0 ? (clients.filter(c => c.status === 'closed').length / clients.length) * 100 : 0,
    averageLeadScore: clients.length > 0 ? clients.reduce((sum, c) => sum + (c.leadScore || 0), 0) / clients.length : 0
  };

  const addClient = useCallback(async (clientData: ClientFormData): Promise<Client> => {
    setIsLoading(true);
    try {
      const newClient: Client = {
        id: Date.now().toString(),
        ...clientData,
        status: 'pending',
        assignedDate: new Date(),
        lastContact: new Date(),
        assignedAgent: user?.name || 'Unassigned',
        timeline: [{
          id: '1',
          date: new Date(),
          action: 'Client Added',
          description: 'New client added to the system',
          performedBy: user?.name || 'System'
        }],
        leadScore: Math.floor(Math.random() * 40) + 60, // Random score between 60-100
        conversionProbability: Math.floor(Math.random() * 30) + 50 // Random probability between 50-80
      };

      setClients(prev => [...prev, newClient]);
      return newClient;
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  const updateClient = useCallback(async (id: string, clientData: Partial<Client>): Promise<Client> => {
    setIsLoading(true);
    try {
      const updatedClient = clients.find(c => c.id === id);
      if (!updatedClient) throw new Error('Client not found');

      const updated = { ...updatedClient, ...clientData };
      setClients(prev => prev.map(c => c.id === id ? updated : c));
      return updated;
    } finally {
      setIsLoading(false);
    }
  }, [clients]);

  const deleteClient = useCallback(async (id: string): Promise<void> => {
    setIsLoading(true);
    try {
      setClients(prev => prev.filter(c => c.id !== id));
    } finally {
      setIsLoading(false);
    }
  }, []);

  const getClient = useCallback((id: string): Client | undefined => {
    return clients.find(c => c.id === id);
  }, [clients]);

  const refreshClients = useCallback(async (): Promise<void> => {
    setIsLoading(true);
    try {
      // In a real app, this would fetch from an API
      await new Promise(resolve => setTimeout(resolve, 1000));
    } finally {
      setIsLoading(false);
    }
  }, []);

  const addClientNote = useCallback(async (clientId: string, note: string): Promise<void> => {
    const client = clients.find(c => c.id === clientId);
    if (client) {
      const updatedNotes = client.notes ? `${client.notes}\n\n${new Date().toLocaleDateString()}: ${note}` : note;
      const newTimelineEntry = {
        id: Date.now().toString(),
        date: new Date(),
        action: 'Note Added',
        description: note,
        performedBy: user?.name || 'System'
      };
      
      await updateClient(clientId, { 
        notes: updatedNotes,
        lastContact: new Date(),
        timeline: [...(client.timeline || []), newTimelineEntry]
      });
    }
  }, [clients, updateClient, user]);

  const updateClientStatus = useCallback(async (clientId: string, status: Client['status']): Promise<void> => {
    const client = clients.find(c => c.id === clientId);
    if (client) {
      const newTimelineEntry = {
        id: Date.now().toString(),
        date: new Date(),
        action: 'Status Updated',
        description: `Status changed to ${status}`,
        performedBy: user?.name || 'System'
      };
      
      await updateClient(clientId, { 
        status,
        lastContact: new Date(),
        timeline: [...(client.timeline || []), newTimelineEntry]
      });
    }
  }, [clients, updateClient, user]);

  return (
    <ClientContext.Provider value={{
      clients,
      filteredClients,
      filters,
      stats,
      isLoading,
      addClient,
      updateClient,
      deleteClient,
      getClient,
      setFilters,
      refreshClients,
      addClientNote,
      updateClientStatus
    }}>
      {children}
    </ClientContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useClients() {
  const context = useContext(ClientContext);
  if (context === undefined) {
    throw new Error('useClients must be used within a ClientProvider');
  }
  return context;
}