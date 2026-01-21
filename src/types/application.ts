// Tenant Application Types

export interface PersonalInfo {
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  ssn: string; // Encrypted
  phone: string;
  email: string;
  currentAddress: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
  };
  desiredMoveInDate: string;
  numberOfOccupants: number;
  pets?: {
    type: string;
    breed: string;
    weight: number;
  }[];
}

export interface EmploymentInfo {
  currentEmployer: {
    name: string;
    position: string;
    startDate: string;
    monthlyIncome: number;
    supervisorName: string;
    supervisorPhone: string;
    address: string;
  };
  previousEmployer?: {
    name: string;
    position: string;
    startDate: string;
    endDate: string;
    reason: string;
  };
}

export interface RentalHistory {
  currentLandlord: {
    name: string;
    phone: string;
    address: string;
    monthlyRent: number;
    leaseStartDate: string;
    leaseEndDate: string;
    reasonForMoving: string;
  };
  previousLandlords: {
    name: string;
    phone: string;
    address: string;
    monthlyRent: number;
    leaseStartDate: string;
    leaseEndDate: string;
  }[];
}

export interface References {
  personal: {
    name: string;
    relationship: string;
    phone: string;
    email?: string;
  }[];
  emergency: {
    name: string;
    relationship: string;
    phone: string;
  };
}

export interface AdditionalInfo {
  bankruptcyHistory: boolean;
  bankruptcyDetails?: string;
  evictionHistory: boolean;
  evictionDetails?: string;
  criminalHistory: boolean;
  criminalDetails?: string;
  vehicles: {
    make: string;
    model: string;
    year: number;
    licensePlate: string;
    color: string;
  }[];
  additionalComments?: string;
}

export interface TenantApplication {
  id: string;
  propertyId: string;
  userId?: string;
  applicationStatus: 'draft' | 'pending' | 'under_review' | 'approved' | 'denied' | 'conditional';
  applicationScore?: number;
  personalInfo: PersonalInfo;
  employmentInfo: EmploymentInfo;
  rentalHistory: RentalHistory;
  references: References;
  additionalInfo: AdditionalInfo;
  documents: {
    id: string;
    type: 'id' | 'pay_stub' | 'bank_statement' | 'other';
    name: string;
    url: string;
    uploadedAt: string;
  }[];
  applicationFeePaid: boolean;
  submittedAt?: string;
  reviewedAt?: string;
  decisionReason?: string;
  decisionDate?: string;
  createdAt: string;
  updatedAt: string;
}

export interface BackgroundCheck {
  id: string;
  applicationId: string;
  checkType: 'credit' | 'criminal' | 'eviction' | 'employment' | 'rental';
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  provider?: string;
  requestDate: string;
  completionDate?: string;
  results?: {
    score?: number;
    details?: string;
    passed?: boolean;
    findings?: string[];
  };
  cost?: number;
  createdAt: string;
  updatedAt: string;
}

export interface ApplicationNote {
  id: string;
  applicationId: string;
  userId: string;
  userName?: string;
  note: string;
  createdAt: string;
}

export interface ApplicationScoreBreakdown {
  incomeVerification: {
    score: number;
    maxScore: 30;
    details: string;
  };
  creditScore: {
    score: number;
    maxScore: 25;
    details: string;
  };
  rentalHistory: {
    score: number;
    maxScore: 20;
    details: string;
  };
  employmentStability: {
    score: number;
    maxScore: 15;
    details: string;
  };
  backgroundCheck: {
    score: number;
    maxScore: 10;
    details: string;
  };
  totalScore: number;
  maxTotalScore: 100;
  rating: 'excellent' | 'good' | 'fair' | 'poor';
}

export interface ApplicationFilters {
  status?: string[];
  propertyId?: string;
  dateRange?: {
    start: string;
    end: string;
  };
  minScore?: number;
  maxScore?: number;
  searchTerm?: string;
}

export interface ApplicationAnalytics {
  totalApplications: number;
  approvalRate: number;
  averageProcessingTime: number; // in days
  averageScore: number;
  applicationsByMonth: {
    month: string;
    count: number;
  }[];
  statusDistribution: {
    status: string;
    count: number;
    percentage: number;
  }[];
  scoreDistribution: {
    range: string;
    count: number;
  }[];
  topDenialReasons: {
    reason: string;
    count: number;
  }[];
}

export interface DecisionData {
  action: 'approve' | 'deny' | 'conditional' | 'request_info';
  reason?: string;
  conditions?: string[];
  leaseTerms?: {
    monthlyRent: number;
    securityDeposit: number;
    leaseStartDate: string;
    leaseDuration: number; // months
    additionalTerms?: string;
  };
  requestedInfo?: string[];
  offerExpirationDate?: string;
}