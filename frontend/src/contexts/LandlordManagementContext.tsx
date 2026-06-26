import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { 
  ClientLandlord, 
  Property, 
  Tenant, 
  ClientLandlordFilter, 
  PropertyFilter, 
  ClientLandlordFormData, 
  PropertyFormData, 
  TenantFormData, 
  CommunicationLog,
  NotificationEvent,
  ContactDetails,
  PropertyPreferences,
  ClientSegmentation,
  PropertyDetails,
  LeaseInfo
} from '@/types/clientLandlord';

interface LandlordManagementContextType {
  // Client (Landlord) Management
  clients: ClientLandlord[];
  selectedClient: ClientLandlord | null;
  clientFilter: ClientLandlordFilter;
  
  // Property Management
  properties: Property[];
  selectedProperty: Property | null;
  propertyFilter: PropertyFilter;
  
  // Tenant Management
  tenants: Tenant[];
  
  // Notifications
  notifications: NotificationEvent[];
  
  // Actions
  createClient: (clientData: ClientLandlordFormData) => Promise<ClientLandlord>;
  updateClient: (clientId: string, updates: Partial<ClientLandlord>) => Promise<ClientLandlord>;
  deleteClient: (clientId: string) => Promise<void>;
  getClientById: (clientId: string) => ClientLandlord | null;
  
  createProperty: (propertyData: PropertyFormData) => Promise<Property>;
  updateProperty: (propertyId: string, updates: Partial<Property>) => Promise<Property>;
  assignPropertyToLandlord: (propertyId: string, landlordId: string) => Promise<void>;
  removePropertyFromLandlord: (propertyId: string, landlordId: string) => Promise<void>;
  
  createTenant: (tenantData: TenantFormData) => Promise<Tenant>;
  updateTenant: (tenantId: string, updates: Partial<Tenant>) => Promise<Tenant>;
  getTenantsForProperty: (propertyId: string) => Tenant[];
  
  addCommunicationLog: (clientId: string, log: Omit<CommunicationLog, 'id'>) => Promise<void>;
  
  // Filtering and Search
  setClientFilter: (filter: ClientLandlordFilter) => void;
  setPropertyFilter: (filter: PropertyFilter) => void;
  searchClients: (query: string) => ClientLandlord[];
  
  // Selection
  selectClient: (client: ClientLandlord | null) => void;
  selectProperty: (property: Property | null) => void;
  
  // Notifications
  createNotification: (notification: Omit<NotificationEvent, 'id' | 'createdAt' | 'readBy'>) => Promise<void>;
  markNotificationAsRead: (notificationId: string, userId: string) => Promise<void>;
  getUnreadNotifications: (userId: string) => NotificationEvent[];
  
  loading: boolean;
  error: string | null;
}

const LandlordManagementContext = createContext<LandlordManagementContextType | undefined>(undefined);

export function LandlordManagementProvider({ children }: { children: ReactNode }) {
  const [clients, setClients] = useState<ClientLandlord[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [notifications, setNotifications] = useState<NotificationEvent[]>([]);
  const [selectedClient, setSelectedClient] = useState<ClientLandlord | null>(null);
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);
  const [clientFilter, setClientFilter] = useState<ClientLandlordFilter>({});
  const [propertyFilter, setPropertyFilter] = useState<PropertyFilter>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initialize with mock data
  useEffect(() => {
    initializeMockData();
  }, []);

  const initializeMockData = () => {
    // Mock clients (landlords) - Updated to support multiple properties
    const mockClients: ClientLandlord[] = [
      {
        id: 'landlord-1',
        type: 'landlord',
        personalInfo: {
          firstName: 'John',
          lastName: 'Smith',
          email: 'john.smith@email.com',
          phone: '(757) 555-0101',
          preferredContactMethod: 'email',
          address: {
            street: '123 Main St',
            city: 'Norfolk',
            state: 'VA',
            zipCode: '23510'
          }
        },
        propertyIds: ['property-1', 'property-3'], // Multiple properties
        agentId: 'agent-1',
        brokerId: 'broker-1',
        preferences: {
          priceRange: { min: 200000, max: 500000 },
          propertyTypes: ['single-family', 'condo'],
          bedrooms: { min: 2, max: 4 },
          bathrooms: { min: 2, max: 3 },
          squareFootage: { min: 1200, max: 2500 },
          preferredLocations: ['Norfolk', 'Virginia Beach'],
          amenities: ['parking', 'laundry'],
          investmentGoals: ['rental-income', 'appreciation']
        },
        segmentation: {
          clientType: 'investor',
          budgetTier: 'mid-range',
          urgency: 'within-3-months',
          source: 'referral',
          tags: ['experienced-investor', 'local-market']
        },
        communicationHistory: [],
        documents: [],
        notes: [],
        status: 'active',
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-15'),
        lastContactDate: new Date('2024-01-10')
      },
      {
        id: 'landlord-2',
        type: 'landlord',
        personalInfo: {
          firstName: 'Sarah',
          lastName: 'Johnson',
          email: 'sarah.johnson@email.com',
          phone: '(757) 555-0102',
          preferredContactMethod: 'phone',
          address: {
            street: '456 Oak Ave',
            city: 'Virginia Beach',
            state: 'VA',
            zipCode: '23451'
          }
        },
        propertyIds: ['property-2'], // Single property
        agentId: 'agent-1',
        brokerId: 'broker-1',
        preferences: {
          priceRange: { min: 300000, max: 700000 },
          propertyTypes: ['townhouse', 'single-family'],
          bedrooms: { min: 3, max: 5 },
          bathrooms: { min: 2, max: 4 },
          squareFootage: { min: 1800, max: 3500 },
          preferredLocations: ['Virginia Beach', 'Chesapeake'],
          amenities: ['pool', 'garage', 'yard'],
          investmentGoals: ['rental-income']
        },
        segmentation: {
          clientType: 'investor',
          budgetTier: 'luxury',
          urgency: 'immediate',
          source: 'website',
          tags: ['first-time-investor', 'high-budget']
        },
        communicationHistory: [],
        documents: [],
        notes: [],
        status: 'active',
        createdAt: new Date('2024-01-05'),
        updatedAt: new Date('2024-01-12'),
        lastContactDate: new Date('2024-01-08')
      }
    ];

    // Mock properties
    const mockProperties: Property[] = [
      {
        id: 'property-1',
        landlordId: 'landlord-1',
        agentId: 'agent-1',
        brokerId: 'broker-1',
        tenantIds: ['tenant-1'],
        details: {
          address: {
            street: '789 Elm Street',
            city: 'Norfolk',
            state: 'VA',
            zipCode: '23510'
          },
          price: 325000,
          bedrooms: 3,
          bathrooms: 2,
          squareFootage: 1850,
          propertyType: 'single-family',
          yearBuilt: 2015,
          lotSize: 0.25,
          features: ['hardwood-floors', 'updated-kitchen', 'fenced-yard', 'garage'],
          description: 'Beautiful single-family home in desirable Norfolk neighborhood.',
          images: ['/api/placeholder/400/300']
        },
        status: 'rented',
        listingDate: new Date('2024-01-01'),
        lastUpdated: new Date('2024-01-15'),
        financialInfo: {
          monthlyIncome: 2200,
          expenses: [
            {
              id: 'exp-1',
              type: 'maintenance',
              amount: 150,
              date: new Date('2024-01-01'),
              description: 'Monthly maintenance reserve',
              recurring: true,
              frequency: 'monthly'
            }
          ]
        }
      },
      {
        id: 'property-2',
        landlordId: 'landlord-2',
        agentId: 'agent-1',
        brokerId: 'broker-1',
        tenantIds: [],
        details: {
          address: {
            street: '321 Beach Road',
            city: 'Virginia Beach',
            state: 'VA',
            zipCode: '23451'
          },
          price: 485000,
          bedrooms: 4,
          bathrooms: 3,
          squareFootage: 2800,
          propertyType: 'townhouse',
          yearBuilt: 2018,
          lotSize: 0.15,
          features: ['ocean-view', 'modern-appliances', 'deck', 'two-car-garage'],
          description: 'Stunning oceanview townhouse with modern amenities.',
          images: ['/api/placeholder/400/300']
        },
        status: 'available',
        listingDate: new Date('2024-01-05'),
        lastUpdated: new Date('2024-01-12'),
        financialInfo: {
          expenses: [
            {
              id: 'exp-2',
              type: 'insurance',
              amount: 200,
              date: new Date('2024-01-01'),
              description: 'Property insurance',
              recurring: true,
              frequency: 'monthly'
            }
          ]
        }
      },
      {
        id: 'property-3',
        landlordId: 'landlord-1', // Second property for landlord-1
        agentId: 'agent-1',
        brokerId: 'broker-1',
        tenantIds: ['tenant-2'],
        details: {
          address: {
            street: '555 Pine Avenue',
            city: 'Norfolk',
            state: 'VA',
            zipCode: '23507'
          },
          price: 275000,
          bedrooms: 2,
          bathrooms: 2,
          squareFootage: 1400,
          propertyType: 'condo',
          yearBuilt: 2020,
          lotSize: 0,
          features: ['balcony', 'granite-counters', 'stainless-appliances', 'parking'],
          description: 'Modern condo with city views and premium finishes.',
          images: ['/api/placeholder/400/300']
        },
        status: 'rented',
        listingDate: new Date('2024-01-08'),
        lastUpdated: new Date('2024-01-20'),
        financialInfo: {
          monthlyIncome: 1800,
          expenses: [
            {
              id: 'exp-3',
              type: 'management',
              amount: 180,
              date: new Date('2024-01-01'),
              description: 'Property management fee',
              recurring: true,
              frequency: 'monthly'
            }
          ]
        }
      }
    ];

    // Mock tenants
    const mockTenants: Tenant[] = [
      {
        id: 'tenant-1',
        propertyId: 'property-1',
        landlordId: 'landlord-1',
        agentId: 'agent-1',
        personalInfo: {
          firstName: 'Mike',
          lastName: 'Davis',
          email: 'mike.davis@email.com',
          phone: '(757) 555-0201',
          preferredContactMethod: 'email'
        },
        leaseInfo: {
          startDate: new Date('2024-01-01'),
          endDate: new Date('2024-12-31'),
          monthlyRent: 2200,
          securityDeposit: 2200,
          leaseTerms: 'Standard 12-month lease'
        },
        paymentHistory: [
          {
            id: 'pay-1',
            date: new Date('2024-01-01'),
            amount: 2200,
            type: 'rent',
            status: 'paid',
            method: 'bank-transfer'
          }
        ],
        status: 'active',
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01')
      },
      {
        id: 'tenant-2',
        propertyId: 'property-3',
        landlordId: 'landlord-1',
        agentId: 'agent-1',
        personalInfo: {
          firstName: 'Jennifer',
          lastName: 'Wilson',
          email: 'jennifer.wilson@email.com',
          phone: '(757) 555-0202',
          preferredContactMethod: 'text'
        },
        leaseInfo: {
          startDate: new Date('2024-01-15'),
          endDate: new Date('2025-01-14'),
          monthlyRent: 1800,
          securityDeposit: 1800,
          leaseTerms: 'Standard 12-month lease with pet addendum'
        },
        paymentHistory: [
          {
            id: 'pay-2',
            date: new Date('2024-01-15'),
            amount: 1800,
            type: 'rent',
            status: 'paid',
            method: 'online'
          }
        ],
        status: 'active',
        createdAt: new Date('2024-01-15'),
        updatedAt: new Date('2024-01-15')
      }
    ];

    setClients(mockClients);
    setProperties(mockProperties);
    setTenants(mockTenants);
  };

  // Client Management Functions
  const createClient = async (clientData: ClientLandlordFormData): Promise<ClientLandlord> => {
    setLoading(true);
    try {
      const newClient: ClientLandlord = {
        id: `landlord-${Date.now()}`,
        type: 'landlord',
        personalInfo: clientData.personalInfo as ContactDetails,
        propertyIds: clientData.propertyIds || [],
        agentId: clientData.agentId || '',
        brokerId: 'broker-1', // Default broker
        preferences: clientData.preferences || {} as PropertyPreferences,
        segmentation: clientData.segmentation || {} as ClientSegmentation,
        communicationHistory: [],
        documents: [],
        notes: clientData.notes ? [{
          id: `note-${Date.now()}`,
          content: clientData.notes,
          createdBy: 'current-user',
          createdByName: 'Current User',
          createdAt: new Date(),
          priority: 'medium',
          category: 'general'
        }] : [],
        status: 'active',
        createdAt: new Date(),
        updatedAt: new Date()
      };

      setClients(prev => [...prev, newClient]);
      
      // Create notification for agent and broker
      await createNotification({
        type: 'property_status_change',
        recipientIds: [newClient.agentId, newClient.brokerId],
        recipientRoles: ['agent', 'broker'],
        landlordId: newClient.id,
        title: 'New Landlord Client Added',
        message: `New landlord client ${newClient.personalInfo.firstName} ${newClient.personalInfo.lastName} has been added to your portfolio.`,
        priority: 'medium'
      });
      
      return newClient;
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to create client');
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const updateClient = async (clientId: string, updates: Partial<ClientLandlord>): Promise<ClientLandlord> => {
    setLoading(true);
    try {
      const updatedClients = clients.map(client => 
        client.id === clientId 
          ? { ...client, ...updates, updatedAt: new Date() }
          : client
      );
      
      setClients(updatedClients);
      const updatedClient = updatedClients.find(c => c.id === clientId)!;
      
      if (selectedClient?.id === clientId) {
        setSelectedClient(updatedClient);
      }
      
      return updatedClient;
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to update client');
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const deleteClient = async (clientId: string): Promise<void> => {
    setLoading(true);
    try {
      setClients(prev => prev.filter(client => client.id !== clientId));
      if (selectedClient?.id === clientId) {
        setSelectedClient(null);
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to delete client');
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const getClientById = (clientId: string): ClientLandlord | null => {
    return clients.find(client => client.id === clientId) || null;
  };

  // Property Management Functions
  const createProperty = async (propertyData: PropertyFormData): Promise<Property> => {
    setLoading(true);
    try {
      const newProperty: Property = {
        id: `property-${Date.now()}`,
        landlordId: propertyData.landlordId || '',
        agentId: propertyData.agentId || '',
        brokerId: 'broker-1',
        tenantIds: [],
        details: propertyData.details as PropertyDetails,
        status: propertyData.status || 'available',
        listingDate: new Date(),
        lastUpdated: new Date(),
        financialInfo: {
          expenses: []
        }
      };

      setProperties(prev => [...prev, newProperty]);
      
      // Update landlord's property list if assigned
      if (propertyData.landlordId) {
        const landlord = clients.find(c => c.id === propertyData.landlordId);
        if (landlord) {
          await updateClient(landlord.id, {
            propertyIds: [...landlord.propertyIds, newProperty.id]
          });
        }
      }
      
      return newProperty;
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to create property');
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const updateProperty = async (propertyId: string, updates: Partial<Property>): Promise<Property> => {
    setLoading(true);
    try {
      const oldProperty = properties.find(p => p.id === propertyId);
      const updatedProperties = properties.map(property => 
        property.id === propertyId 
          ? { ...property, ...updates, lastUpdated: new Date() }
          : property
      );
      
      setProperties(updatedProperties);
      const updatedProperty = updatedProperties.find(p => p.id === propertyId)!;
      
      // Create notification if status changed
      if (oldProperty && oldProperty.status !== updatedProperty.status) {
        await createNotification({
          type: 'property_status_change',
          recipientIds: [updatedProperty.landlordId, updatedProperty.agentId, updatedProperty.brokerId],
          recipientRoles: ['landlord', 'agent', 'broker'],
          propertyId: updatedProperty.id,
          landlordId: updatedProperty.landlordId,
          title: 'Property Status Changed',
          message: `Property at ${updatedProperty.details.address.street} status changed from ${oldProperty.status} to ${updatedProperty.status}.`,
          priority: 'medium'
        });
      }
      
      if (selectedProperty?.id === propertyId) {
        setSelectedProperty(updatedProperty);
      }
      
      return updatedProperty;
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to update property');
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const assignPropertyToLandlord = async (propertyId: string, landlordId: string): Promise<void> => {
    setLoading(true);
    try {
      // Update property
      await updateProperty(propertyId, { landlordId });
      
      // Update client's property list
      const client = clients.find(c => c.id === landlordId);
      if (client && !client.propertyIds.includes(propertyId)) {
        await updateClient(landlordId, { 
          propertyIds: [...client.propertyIds, propertyId] 
        });
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to assign property');
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const removePropertyFromLandlord = async (propertyId: string, landlordId: string): Promise<void> => {
    setLoading(true);
    try {
      // Update property to remove landlord
      await updateProperty(propertyId, { landlordId: '' });
      
      // Update client's property list
      const client = clients.find(c => c.id === landlordId);
      if (client) {
        await updateClient(landlordId, { 
          propertyIds: client.propertyIds.filter(id => id !== propertyId) 
        });
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to remove property');
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // Tenant Management Functions
  const createTenant = async (tenantData: TenantFormData): Promise<Tenant> => {
    setLoading(true);
    try {
      const property = properties.find(p => p.id === tenantData.propertyId);
      const newTenant: Tenant = {
        id: `tenant-${Date.now()}`,
        propertyId: tenantData.propertyId,
        landlordId: property?.landlordId || '',
        personalInfo: tenantData.personalInfo as ContactDetails,
        leaseInfo: tenantData.leaseInfo as LeaseInfo,
        emergencyContact: tenantData.emergencyContact,
        paymentHistory: [],
        status: 'active',
        createdAt: new Date(),
        updatedAt: new Date()
      };

      setTenants(prev => [...prev, newTenant]);
      
      // Update property to include tenant
      if (property) {
        await updateProperty(property.id, {
          tenantIds: [...property.tenantIds, newTenant.id],
          status: 'rented'
        });
        
        // Create notification
        await createNotification({
          type: 'tenant_added',
          recipientIds: [property.landlordId, property.agentId, property.brokerId],
          recipientRoles: ['landlord', 'agent', 'broker'],
          propertyId: property.id,
          tenantId: newTenant.id,
          landlordId: property.landlordId,
          title: 'New Tenant Added',
          message: `New tenant ${newTenant.personalInfo.firstName} ${newTenant.personalInfo.lastName} has been added to property at ${property.details.address.street}.`,
          priority: 'medium'
        });
      }
      
      return newTenant;
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to create tenant');
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const updateTenant = async (tenantId: string, updates: Partial<Tenant>): Promise<Tenant> => {
    setLoading(true);
    try {
      const updatedTenants = tenants.map(tenant => 
        tenant.id === tenantId 
          ? { ...tenant, ...updates, updatedAt: new Date() }
          : tenant
      );
      
      setTenants(updatedTenants);
      return updatedTenants.find(t => t.id === tenantId)!;
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to update tenant');
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const getTenantsForProperty = (propertyId: string): Tenant[] => {
    return tenants.filter(tenant => tenant.propertyId === propertyId);
  };

  // Communication Functions
  const addCommunicationLog = async (clientId: string, log: Omit<CommunicationLog, 'id'>): Promise<void> => {
    const newLog: CommunicationLog = {
      ...log,
      id: `log-${Date.now()}`
    };

    await updateClient(clientId, {
      communicationHistory: [
        ...clients.find(c => c.id === clientId)?.communicationHistory || [],
        newLog
      ],
      lastContactDate: new Date()
    });
  };

  // Notification Functions
  const createNotification = async (notification: Omit<NotificationEvent, 'id' | 'createdAt' | 'readBy'>): Promise<void> => {
    const newNotification: NotificationEvent = {
      ...notification,
      id: `notification-${Date.now()}`,
      createdAt: new Date(),
      readBy: []
    };
    
    setNotifications(prev => [...prev, newNotification]);
  };

  const markNotificationAsRead = async (notificationId: string, userId: string): Promise<void> => {
    setNotifications(prev => prev.map(notification => 
      notification.id === notificationId
        ? { ...notification, readBy: [...notification.readBy, userId] }
        : notification
    ));
  };

  const getUnreadNotifications = (userId: string): NotificationEvent[] => {
    return notifications.filter(notification => 
      notification.recipientIds.includes(userId) && 
      !notification.readBy.includes(userId)
    );
  };

  // Search and Filter Functions
  const searchClients = (query: string): ClientLandlord[] => {
    if (!query.trim()) return clients;
    
    const lowercaseQuery = query.toLowerCase();
    return clients.filter(client => 
      client.personalInfo.firstName.toLowerCase().includes(lowercaseQuery) ||
      client.personalInfo.lastName.toLowerCase().includes(lowercaseQuery) ||
      client.personalInfo.email.toLowerCase().includes(lowercaseQuery) ||
      client.personalInfo.phone.includes(query)
    );
  };

  // Selection Functions
  const selectClient = (client: ClientLandlord | null) => {
    setSelectedClient(client);
    if (client?.propertyIds.length) {
      const firstProperty = properties.find(p => p.id === client.propertyIds[0]);
      setSelectedProperty(firstProperty || null);
    }
  };

  const selectProperty = (property: Property | null) => {
    setSelectedProperty(property);
    if (property?.landlordId) {
      const client = clients.find(c => c.id === property.landlordId);
      setSelectedClient(client || null);
    }
  };

  const value: LandlordManagementContextType = {
    // State
    clients,
    selectedClient,
    clientFilter,
    properties,
    selectedProperty,
    propertyFilter,
    tenants,
    notifications,
    loading,
    error,

    // Client Actions
    createClient,
    updateClient,
    deleteClient,
    getClientById,

    // Property Actions
    createProperty,
    updateProperty,
    assignPropertyToLandlord,
    removePropertyFromLandlord,

    // Tenant Actions
    createTenant,
    updateTenant,
    getTenantsForProperty,

    // Communication
    addCommunicationLog,

    // Filtering and Search
    setClientFilter,
    setPropertyFilter,
    searchClients,

    // Selection
    selectClient,
    selectProperty,

    // Notifications
    createNotification,
    markNotificationAsRead,
    getUnreadNotifications
  };

  return (
    <LandlordManagementContext.Provider value={value}>
      {children}
    </LandlordManagementContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useLandlordManagement() {
  const context = useContext(LandlordManagementContext);
  if (context === undefined) {
    throw new Error('useLandlordManagement must be used within a LandlordManagementProvider');
  }
  return context;
}