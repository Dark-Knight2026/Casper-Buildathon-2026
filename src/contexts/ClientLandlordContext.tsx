import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Client, Property, Tenant, ClientFilter, PropertyFilter, ClientFormData, PropertyFormData, TenantFormData, CommunicationLog, ContactDetails, PropertyPreferences, ClientSegmentation, PropertyDetails, LeaseInfo } from '@/types/client';

interface ClientLandlordContextType {
  // Client (Landlord) Management
  clients: Client[];
  selectedClient: Client | null;
  clientFilter: ClientFilter;
  
  // Property Management
  properties: Property[];
  selectedProperty: Property | null;
  propertyFilter: PropertyFilter;
  
  // Tenant Management
  tenants: Tenant[];
  
  // Actions
  createClient: (clientData: ClientFormData) => Promise<Client>;
  updateClient: (clientId: string, updates: Partial<Client>) => Promise<Client>;
  deleteClient: (clientId: string) => Promise<void>;
  getClientById: (clientId: string) => Client | null;
  
  createProperty: (propertyData: PropertyFormData) => Promise<Property>;
  updateProperty: (propertyId: string, updates: Partial<Property>) => Promise<Property>;
  assignPropertyToLandlord: (propertyId: string, landlordId: string) => Promise<void>;
  
  createTenant: (tenantData: TenantFormData) => Promise<Tenant>;
  updateTenant: (tenantId: string, updates: Partial<Tenant>) => Promise<Tenant>;
  getTenantsForProperty: (propertyId: string) => Tenant[];
  
  addCommunicationLog: (clientId: string, log: Omit<CommunicationLog, 'id'>) => Promise<void>;
  
  // Filtering and Search
  setClientFilter: (filter: ClientFilter) => void;
  setPropertyFilter: (filter: PropertyFilter) => void;
  searchClients: (query: string) => Client[];
  
  // Selection
  selectClient: (client: Client | null) => void;
  selectProperty: (property: Property | null) => void;
  
  // Validation
  validateClientPropertyAssignment: (clientId: string, propertyId: string) => boolean;
  
  loading: boolean;
  error: string | null;
}

const ClientLandlordContext = createContext<ClientLandlordContextType | undefined>(undefined);

export function ClientLandlordProvider({ children }: { children: ReactNode }) {
  const [clients, setClients] = useState<Client[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);
  const [clientFilter, setClientFilter] = useState<ClientFilter>({});
  const [propertyFilter, setPropertyFilter] = useState<PropertyFilter>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initialize with mock data
  useEffect(() => {
    initializeMockData();
  }, []);

  const initializeMockData = () => {
    // Mock clients (landlords)
    const mockClients: Client[] = [
      {
        id: 'client-1',
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
        propertyId: 'property-1',
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
        id: 'client-2',
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
        propertyId: 'property-2',
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
        landlordId: 'client-1',
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
        landlordId: 'client-2',
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
      }
    ];

    // Mock tenants
    const mockTenants: Tenant[] = [
      {
        id: 'tenant-1',
        propertyId: 'property-1',
        landlordId: 'client-1',
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
      }
    ];

    setClients(mockClients);
    setProperties(mockProperties);
    setTenants(mockTenants);
  };

  // Client Management Functions
  const createClient = async (clientData: ClientFormData): Promise<Client> => {
    setLoading(true);
    try {
      // Validate one property per landlord rule
      if (clientData.propertyId) {
        const existingClientWithProperty = clients.find(c => c.propertyId === clientData.propertyId);
        if (existingClientWithProperty) {
          throw new Error('This property is already assigned to another landlord');
        }
      }

      const newClient: Client = {
        id: `client-${Date.now()}`,
        type: 'landlord',
        personalInfo: clientData.personalInfo as ContactDetails,
        propertyId: clientData.propertyId || '',
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
      return newClient;
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to create client');
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const updateClient = async (clientId: string, updates: Partial<Client>): Promise<Client> => {
    setLoading(true);
    try {
      // Validate property assignment if being updated
      if (updates.propertyId) {
        const existingClientWithProperty = clients.find(c => c.propertyId === updates.propertyId && c.id !== clientId);
        if (existingClientWithProperty) {
          throw new Error('This property is already assigned to another landlord');
        }
      }

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

  const getClientById = (clientId: string): Client | null => {
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
      const updatedProperties = properties.map(property => 
        property.id === propertyId 
          ? { ...property, ...updates, lastUpdated: new Date() }
          : property
      );
      
      setProperties(updatedProperties);
      const updatedProperty = updatedProperties.find(p => p.id === propertyId)!;
      
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
      // Check if landlord already has a property
      const existingClient = clients.find(c => c.id === landlordId);
      if (existingClient?.propertyId && existingClient.propertyId !== propertyId) {
        throw new Error('This landlord already has a property assigned');
      }

      // Update property
      await updateProperty(propertyId, { landlordId });
      
      // Update client
      if (existingClient) {
        await updateClient(landlordId, { propertyId });
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to assign property');
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // Tenant Management Functions
  const createTenant = async (tenantData: TenantFormData): Promise<Tenant> => {
    setLoading(true);
    try {
      const newTenant: Tenant = {
        id: `tenant-${Date.now()}`,
        propertyId: tenantData.propertyId,
        landlordId: properties.find(p => p.id === tenantData.propertyId)?.landlordId || '',
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
      const property = properties.find(p => p.id === tenantData.propertyId);
      if (property) {
        await updateProperty(property.id, {
          tenantIds: [...property.tenantIds, newTenant.id],
          status: 'rented'
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

  // Search and Filter Functions
  const searchClients = (query: string): Client[] => {
    if (!query.trim()) return clients;
    
    const lowercaseQuery = query.toLowerCase();
    return clients.filter(client => 
      client.personalInfo.firstName.toLowerCase().includes(lowercaseQuery) ||
      client.personalInfo.lastName.toLowerCase().includes(lowercaseQuery) ||
      client.personalInfo.email.toLowerCase().includes(lowercaseQuery) ||
      client.personalInfo.phone.includes(query)
    );
  };

  // Validation Functions
  const validateClientPropertyAssignment = (clientId: string, propertyId: string): boolean => {
    const existingClientWithProperty = clients.find(c => c.propertyId === propertyId && c.id !== clientId);
    return !existingClientWithProperty;
  };

  // Selection Functions
  const selectClient = (client: Client | null) => {
    setSelectedClient(client);
    if (client?.propertyId) {
      const property = properties.find(p => p.id === client.propertyId);
      setSelectedProperty(property || null);
    }
  };

  const selectProperty = (property: Property | null) => {
    setSelectedProperty(property);
    if (property?.landlordId) {
      const client = clients.find(c => c.id === property.landlordId);
      setSelectedClient(client || null);
    }
  };

  const value: ClientLandlordContextType = {
    // State
    clients,
    selectedClient,
    clientFilter,
    properties,
    selectedProperty,
    propertyFilter,
    tenants,
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

    // Validation
    validateClientPropertyAssignment
  };

  return (
    <ClientLandlordContext.Provider value={value}>
      {children}
    </ClientLandlordContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useClientLandlord() {
  const context = useContext(ClientLandlordContext);
  if (context === undefined) {
    throw new Error('useClientLandlord must be used within a ClientLandlordProvider');
  }
  return context;
}