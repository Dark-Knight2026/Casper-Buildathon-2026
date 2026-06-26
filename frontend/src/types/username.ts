export interface CSPRUser {
  id: string;
  email: string;
  name: string;
  role: string;
  avatar?: string;
  // CSPR Username System
  cspr_name: string;        // Full CSPR format: "CSPR.JohnRobinson"
  username_alias: string;   // Alias format: "@JohnRobinson"
  display_name: string;     // Human readable: "John Robinson"
  is_searchable: boolean;   // Can be found in searches
  created_at: Date;
  updated_at: Date;
}

export interface UsernameSearchResult {
  user: CSPRUser;
  match_type: 'cspr_name' | 'username_alias' | 'display_name' | 'email';
  relevance_score: number;
}

export interface AssignmentRecord {
  id: string;
  assigned_by: string;      // User ID who made the assignment
  assigned_to: string;      // User ID who received the assignment
  assignment_type: 'property' | 'transaction_task' | 'client_management' | 'document_review';
  target_id: string;        // Property ID, Task ID, etc.
  target_type: string;      // 'property', 'task', 'client', etc.
  status: 'pending' | 'accepted' | 'in_progress' | 'completed' | 'declined';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  due_date?: Date;
  start_date?: Date;
  notes?: string;
  created_at: Date;
  updated_at: Date;
}

export interface TaskGroup {
  id: string;
  name: string;
  description?: string;
  assignments: AssignmentRecord[];
  created_by: string;
  created_at: Date;
  status: 'active' | 'completed' | 'archived';
}

export interface NotificationEvent {
  id: string;
  recipient_id: string;
  sender_id: string;
  type: 'assignment_created' | 'assignment_updated' | 'task_completed' | 'mention' | 'system';
  title: string;
  message: string;
  assignment_id?: string;
  property_id?: string;
  read: boolean;
  created_at: Date;
}

export interface UsernameValidationResult {
  is_valid: boolean;
  error_message?: string;
  suggested_format?: string;
}

// Search and filter interfaces
export interface UserSearchFilters {
  roles?: string[];
  is_available?: boolean;
  location?: string;
  specializations?: string[];
  search_query?: string;
}

export interface AssignmentFilters {
  assigned_to?: string;
  assigned_by?: string;
  status?: AssignmentRecord['status'][];
  assignment_type?: AssignmentRecord['assignment_type'][];
  priority?: AssignmentRecord['priority'][];
  date_range?: {
    start?: Date;
    end?: Date;
  };
}

// Form data interfaces
export interface UsernameRegistrationData {
  base_name: string;        // e.g., "JohnRobinson"
  display_name: string;     // e.g., "John Robinson"
  email: string;
  role: string;
  specializations?: string[];
  location?: string;
}

export interface AssignmentCreationData {
  assigned_to_username: string;  // Can be @username or CSPR.name format
  assignment_type: AssignmentRecord['assignment_type'];
  target_id: string;
  target_type: string;
  priority: AssignmentRecord['priority'];
  due_date?: Date;
  start_date?: Date;
  notes?: string;
}

// Utility types for username operations
export type UsernameFormat = 'cspr' | 'alias' | 'display';
export type SearchMode = 'exact' | 'partial' | 'fuzzy';

export interface UsernameConversionUtils {
  toCSPRFormat: (baseName: string) => string;
  toAliasFormat: (baseName: string) => string;
  extractBaseName: (input: string) => string;
  normalizeSearchInput: (input: string) => string;
  validateCSPRName: (cspr_name: string) => UsernameValidationResult;
}