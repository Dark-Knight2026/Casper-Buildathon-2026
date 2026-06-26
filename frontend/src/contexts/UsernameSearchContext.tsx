import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback, useMemo } from 'react';
import { 
  CSPRUser, 
  UsernameSearchResult, 
  AssignmentRecord, 
  TaskGroup, 
  NotificationEvent,
  UserSearchFilters,
  AssignmentFilters,
  UsernameRegistrationData,
  AssignmentCreationData,
  UsernameValidationResult,
  UsernameConversionUtils
} from '@/types/username';

interface UsernameSearchContextType {
  // User Management
  users: CSPRUser[];
  currentUser: CSPRUser | null;
  
  // Search Functionality
  searchUsers: (query: string, filters?: UserSearchFilters) => Promise<UsernameSearchResult[]>;
  searchSuggestions: UsernameSearchResult[];
  isSearching: boolean;
  
  // Assignment Management
  assignments: AssignmentRecord[];
  taskGroups: TaskGroup[];
  notifications: NotificationEvent[];
  
  // Actions
  registerUsername: (data: UsernameRegistrationData) => Promise<CSPRUser>;
  updateUsername: (userId: string, updates: Partial<CSPRUser>) => Promise<CSPRUser>;
  createAssignment: (data: AssignmentCreationData) => Promise<AssignmentRecord>;
  updateAssignment: (assignmentId: string, updates: Partial<AssignmentRecord>) => Promise<AssignmentRecord>;
  createTaskGroup: (name: string, description?: string) => Promise<TaskGroup>;
  addAssignmentToGroup: (groupId: string, assignmentId: string) => Promise<void>;
  
  // Notifications
  markNotificationAsRead: (notificationId: string) => Promise<void>;
  getUnreadNotifications: () => NotificationEvent[];
  
  // Utility Functions
  usernameUtils: UsernameConversionUtils;
  validateUsername: (input: string) => UsernameValidationResult;
  getUserByUsername: (username: string) => CSPRUser | null;
  getUserAssignments: (userId: string) => AssignmentRecord[];
  
  // Filters
  setUserFilters: (filters: UserSearchFilters) => void;
  setAssignmentFilters: (filters: AssignmentFilters) => void;
  
  loading: boolean;
  error: string | null;
}

const UsernameSearchContext = createContext<UsernameSearchContextType | undefined>(undefined);

export function UsernameSearchProvider({ children }: { children: ReactNode }) {
  const [users, setUsers] = useState<CSPRUser[]>([]);
  const [currentUser, setCurrentUser] = useState<CSPRUser | null>(null);
  const [assignments, setAssignments] = useState<AssignmentRecord[]>([]);
  const [taskGroups, setTaskGroups] = useState<TaskGroup[]>([]);
  const [notifications, setNotifications] = useState<NotificationEvent[]>([]);
  const [searchSuggestions, setSearchSuggestions] = useState<UsernameSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Username utility functions
  const usernameUtils: UsernameConversionUtils = useMemo(() => ({
    toCSPRFormat: (baseName: string) => `CSPR.${baseName}`,
    toAliasFormat: (baseName: string) => `@${baseName}`,
    extractBaseName: (input: string) => {
      if (input.startsWith('CSPR.')) {
        return input.substring(5);
      }
      if (input.startsWith('@')) {
        return input.substring(1);
      }
      return input;
    },
    normalizeSearchInput: (input: string) => {
      return input.trim().toLowerCase();
    },
    validateCSPRName: (cspr_name: string): UsernameValidationResult => {
      if (!cspr_name.startsWith('CSPR.')) {
        return {
          is_valid: false,
          error_message: 'Username must start with CSPR.',
          suggested_format: `CSPR.${cspr_name}`
        };
      }
      
      const baseName = cspr_name.substring(5);
      if (baseName.length < 2) {
        return {
          is_valid: false,
          error_message: 'Base name must be at least 2 characters long'
        };
      }
      
      if (!/^[A-Za-z][A-Za-z0-9]*$/.test(baseName)) {
        return {
          is_valid: false,
          error_message: 'Base name must start with a letter and contain only letters and numbers'
        };
      }
      
      return { is_valid: true };
    }
  }), []);

  // Initialize with mock data
  useEffect(() => {
    initializeMockData();
  }, []);

  const initializeMockData = () => {
    const mockUsers: CSPRUser[] = [
      {
        id: 'user-1',
        email: 'john.robinson@example.com',
        name: 'John Robinson',
        role: 'agent',
        cspr_name: 'CSPR.JohnRobinson',
        username_alias: '@JohnRobinson',
        display_name: 'John Robinson',
        is_searchable: true,
        created_at: new Date('2024-01-01'),
        updated_at: new Date('2024-01-01'),
        avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=32&h=32&fit=crop&crop=face'
      },
      {
        id: 'user-2',
        email: 'sarah.broker@example.com',
        name: 'Sarah Broker',
        role: 'broker',
        cspr_name: 'CSPR.SarahBroker',
        username_alias: '@SarahBroker',
        display_name: 'Sarah Broker',
        is_searchable: true,
        created_at: new Date('2024-01-02'),
        updated_at: new Date('2024-01-02'),
        avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=32&h=32&fit=crop&crop=face'
      },
      {
        id: 'user-3',
        email: 'mike.cpa@example.com',
        name: 'Mike CPA',
        role: 'cpa',
        cspr_name: 'CSPR.MikeCPA',
        username_alias: '@MikeCPA',
        display_name: 'Mike Johnson (CPA)',
        is_searchable: true,
        created_at: new Date('2024-01-03'),
        updated_at: new Date('2024-01-03'),
        avatar: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?w=32&h=32&fit=crop&crop=face'
      },
      {
        id: 'user-4',
        email: 'lisa.contractor@example.com',
        name: 'Lisa Contractor',
        role: 'contractor',
        cspr_name: 'CSPR.LisaContractor',
        username_alias: '@LisaContractor',
        display_name: 'Lisa Wilson (Contractor)',
        is_searchable: true,
        created_at: new Date('2024-01-04'),
        updated_at: new Date('2024-01-04'),
        avatar: '/images/Contractor.jpg'
      },
      {
        id: 'user-5',
        email: 'david.notary@example.com',
        name: 'David Notary',
        role: 'notary',
        cspr_name: 'CSPR.DavidNotary',
        username_alias: '@DavidNotary',
        display_name: 'David Smith (Notary)',
        is_searchable: true,
        created_at: new Date('2024-01-05'),
        updated_at: new Date('2024-01-05'),
        avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=32&h=32&fit=crop&crop=face'
      }
    ];

    const mockAssignments: AssignmentRecord[] = [
      {
        id: 'assignment-1',
        assigned_by: 'user-2',
        assigned_to: 'user-1',
        assignment_type: 'property',
        target_id: 'property-1',
        target_type: 'property_listing',
        status: 'in_progress',
        priority: 'high',
        due_date: new Date('2024-02-15'),
        start_date: new Date('2024-01-15'),
        notes: 'Handle listing for downtown condo',
        created_at: new Date('2024-01-15'),
        updated_at: new Date('2024-01-15')
      },
      {
        id: 'assignment-2',
        assigned_by: 'user-1',
        assigned_to: 'user-3',
        assignment_type: 'transaction_task',
        target_id: 'transaction-1',
        target_type: 'tax_consultation',
        status: 'pending',
        priority: 'medium',
        due_date: new Date('2024-02-01'),
        notes: 'Tax consultation for property sale',
        created_at: new Date('2024-01-16'),
        updated_at: new Date('2024-01-16')
      }
    ];

    const mockNotifications: NotificationEvent[] = [
      {
        id: 'notification-1',
        recipient_id: 'user-1',
        sender_id: 'user-2',
        type: 'assignment_created',
        title: 'New Property Assignment',
        message: 'You have been assigned to handle the downtown condo listing',
        assignment_id: 'assignment-1',
        property_id: 'property-1',
        read: false,
        created_at: new Date('2024-01-15')
      }
    ];

    setUsers(mockUsers);
    setAssignments(mockAssignments);
    setNotifications(mockNotifications);
    setCurrentUser(mockUsers[0]); // Default to first user
  };

  // Search functionality
  const searchUsers = useCallback(async (query: string, filters?: UserSearchFilters): Promise<UsernameSearchResult[]> => {
    setIsSearching(true);
    try {
      const normalizedQuery = usernameUtils.normalizeSearchInput(query);
      const results: UsernameSearchResult[] = [];

      users.forEach(user => {
        if (!user.is_searchable) return;
        
        // Apply role filters
        if (filters?.roles && filters.roles.length > 0 && !filters.roles.includes(user.role)) {
          return;
        }

        let relevanceScore = 0;
        let matchType: UsernameSearchResult['match_type'] = 'display_name';

        // Check CSPR name match
        if (user.cspr_name.toLowerCase().includes(normalizedQuery)) {
          relevanceScore += 100;
          matchType = 'cspr_name';
        }
        
        // Check username alias match (handles @username searches)
        const baseNameFromQuery = usernameUtils.extractBaseName(query);
        const userBaseName = usernameUtils.extractBaseName(user.cspr_name);
        
        if (userBaseName.toLowerCase().includes(baseNameFromQuery.toLowerCase())) {
          relevanceScore += 90;
          matchType = 'username_alias';
        }

        // Check display name match
        if (user.display_name.toLowerCase().includes(normalizedQuery)) {
          relevanceScore += 80;
          matchType = 'display_name';
        }

        // Check email match
        if (user.email.toLowerCase().includes(normalizedQuery)) {
          relevanceScore += 70;
          matchType = 'email';
        }

        if (relevanceScore > 0) {
          results.push({
            user,
            match_type: matchType,
            relevance_score: relevanceScore
          });
        }
      });

      // Sort by relevance score
      results.sort((a, b) => b.relevance_score - a.relevance_score);
      
      setSearchSuggestions(results);
      return results;
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Search failed');
      return [];
    } finally {
      setIsSearching(false);
    }
  }, [users, usernameUtils]);

  // Utility functions (defined before they are used)
  const getUserByUsername = useCallback((username: string): CSPRUser | null => {
    const normalizedInput = usernameUtils.normalizeSearchInput(username);
    const baseName = usernameUtils.extractBaseName(username);
    
    return users.find(user => {
      const userBaseName = usernameUtils.extractBaseName(user.cspr_name);
      return userBaseName.toLowerCase() === baseName.toLowerCase() ||
             user.cspr_name.toLowerCase() === normalizedInput ||
             user.username_alias.toLowerCase() === normalizedInput;
    }) || null;
  }, [users, usernameUtils]);

  // User management functions
  const registerUsername = async (data: UsernameRegistrationData): Promise<CSPRUser> => {
    setLoading(true);
    try {
      const cspr_name = usernameUtils.toCSPRFormat(data.base_name);
      const validation = usernameUtils.validateCSPRName(cspr_name);
      
      if (!validation.is_valid) {
        throw new Error(validation.error_message);
      }

      // Check if username already exists
      const existingUser = users.find(u => 
        u.cspr_name.toLowerCase() === cspr_name.toLowerCase() ||
        u.email.toLowerCase() === data.email.toLowerCase()
      );
      
      if (existingUser) {
        throw new Error('Username or email already exists');
      }

      const newUser: CSPRUser = {
        id: `user-${Date.now()}`,
        email: data.email,
        name: data.display_name,
        role: data.role,
        cspr_name,
        username_alias: usernameUtils.toAliasFormat(data.base_name),
        display_name: data.display_name,
        is_searchable: true,
        created_at: new Date(),
        updated_at: new Date()
      };

      setUsers(prev => [...prev, newUser]);
      return newUser;
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to register username');
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const updateUsername = async (userId: string, updates: Partial<CSPRUser>): Promise<CSPRUser> => {
    setLoading(true);
    try {
      const updatedUsers = users.map(user => 
        user.id === userId 
          ? { ...user, ...updates, updated_at: new Date() }
          : user
      );
      
      setUsers(updatedUsers);
      const updatedUser = updatedUsers.find(u => u.id === userId)!;
      
      if (currentUser?.id === userId) {
        setCurrentUser(updatedUser);
      }
      
      return updatedUser;
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to update username');
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // Assignment management functions
  const createAssignment = async (data: AssignmentCreationData): Promise<AssignmentRecord> => {
    setLoading(true);
    try {
      // Find user by username (supports both @username and CSPR.name formats)
      const targetUser = getUserByUsername(data.assigned_to_username);
      if (!targetUser) {
        throw new Error(`User not found: ${data.assigned_to_username}`);
      }

      const newAssignment: AssignmentRecord = {
        id: `assignment-${Date.now()}`,
        assigned_by: currentUser?.id || '',
        assigned_to: targetUser.id,
        assignment_type: data.assignment_type,
        target_id: data.target_id,
        target_type: data.target_type,
        status: 'pending',
        priority: data.priority,
        due_date: data.due_date,
        start_date: data.start_date,
        notes: data.notes,
        created_at: new Date(),
        updated_at: new Date()
      };

      setAssignments(prev => [...prev, newAssignment]);

      // Create notification
      const notification: NotificationEvent = {
        id: `notification-${Date.now()}`,
        recipient_id: targetUser.id,
        sender_id: currentUser?.id || '',
        type: 'assignment_created',
        title: 'New Assignment',
        message: `You have been assigned a new ${data.assignment_type.replace('_', ' ')} task`,
        assignment_id: newAssignment.id,
        read: false,
        created_at: new Date()
      };

      setNotifications(prev => [...prev, notification]);
      
      return newAssignment;
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to create assignment');
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const updateAssignment = async (assignmentId: string, updates: Partial<AssignmentRecord>): Promise<AssignmentRecord> => {
    setLoading(true);
    try {
      const updatedAssignments = assignments.map(assignment => 
        assignment.id === assignmentId 
          ? { ...assignment, ...updates, updated_at: new Date() }
          : assignment
      );
      
      setAssignments(updatedAssignments);
      return updatedAssignments.find(a => a.id === assignmentId)!;
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to update assignment');
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const createTaskGroup = async (name: string, description?: string): Promise<TaskGroup> => {
    const newGroup: TaskGroup = {
      id: `group-${Date.now()}`,
      name,
      description,
      assignments: [],
      created_by: currentUser?.id || '',
      created_at: new Date(),
      status: 'active'
    };

    setTaskGroups(prev => [...prev, newGroup]);
    return newGroup;
  };

  const addAssignmentToGroup = async (groupId: string, assignmentId: string): Promise<void> => {
    const assignment = assignments.find(a => a.id === assignmentId);
    if (!assignment) {
      throw new Error('Assignment not found');
    }

    setTaskGroups(prev => prev.map(group => 
      group.id === groupId
        ? { ...group, assignments: [...group.assignments, assignment] }
        : group
    ));
  };

  // Notification functions
  const markNotificationAsRead = async (notificationId: string): Promise<void> => {
    setNotifications(prev => prev.map(notification => 
      notification.id === notificationId
        ? { ...notification, read: true }
        : notification
    ));
  };

  const getUnreadNotifications = (): NotificationEvent[] => {
    return notifications.filter(n => 
      n.recipient_id === currentUser?.id && !n.read
    );
  };

  const validateUsername = (input: string): UsernameValidationResult => {
    const baseName = usernameUtils.extractBaseName(input);
    const cspr_format = usernameUtils.toCSPRFormat(baseName);
    return usernameUtils.validateCSPRName(cspr_format);
  };

  const getUserAssignments = (userId: string): AssignmentRecord[] => {
    return assignments.filter(assignment => 
      assignment.assigned_to === userId || assignment.assigned_by === userId
    );
  };

  // Filter functions
  const setUserFilters = (filters: UserSearchFilters) => {
    // Implementation for user filtering
  };

  const setAssignmentFilters = (filters: AssignmentFilters) => {
    // Implementation for assignment filtering
  };

  const value: UsernameSearchContextType = {
    // State
    users,
    currentUser,
    searchSuggestions,
    isSearching,
    assignments,
    taskGroups,
    notifications,
    loading,
    error,

    // Search Functions
    searchUsers,

    // User Management
    registerUsername,
    updateUsername,

    // Assignment Management
    createAssignment,
    updateAssignment,
    createTaskGroup,
    addAssignmentToGroup,

    // Notifications
    markNotificationAsRead,
    getUnreadNotifications,

    // Utilities
    usernameUtils,
    validateUsername,
    getUserByUsername,
    getUserAssignments,

    // Filters
    setUserFilters,
    setAssignmentFilters
  };

  return (
    <UsernameSearchContext.Provider value={value}>
      {children}
    </UsernameSearchContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useUsernameSearch() {
  const context = useContext(UsernameSearchContext);
  if (context === undefined) {
    throw new Error('useUsernameSearch must be used within a UsernameSearchProvider');
  }
  return context;
}