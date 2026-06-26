import { useQuery } from '@tanstack/react-query';

export interface Payment {
  id: number;
  month: string;
  amount: number;
  dueDate: string;
  paidDate: string;
  status: string;
  method: string;
}

export interface MaintenanceRequest {
  id: number;
  issue: string;
  description: string;
  priority: string;
  status: string;
  dateSubmitted: string;
  assignedTo: string;
  estimatedCompletion?: string;
  completedDate?: string;
}

export interface Notification {
  id: number;
  type: string;
  message: string;
  date: string;
  priority: string;
}

export interface LeaseInfo {
  property: string;
  unit: string;
  address: string;
  monthlyRent: number;
  leaseStart: string;
  leaseEnd: string;
  deposit: number;
  landlord: string;
  landlordPhone: string;
  landlordEmail: string;
}

// Data fetching functions
const fetchLeaseInfo = async (): Promise<LeaseInfo> => {
  await new Promise(resolve => setTimeout(resolve, 300));
  
  return {
    property: 'Sunset Apartments',
    unit: 'Unit 12A',
    address: '123 Sunset Blvd, Virginia Beach, VA',
    monthlyRent: 2200,
    leaseStart: '2023-09-01',
    leaseEnd: '2024-08-31',
    deposit: 2200,
    landlord: 'Property Management Co.',
    landlordPhone: '(757) 555-0100',
    landlordEmail: 'management@sunsetapts.com'
  };
};

const fetchRentPayments = async (): Promise<Payment[]> => {
  await new Promise(resolve => setTimeout(resolve, 300));
  
  return [
    {
      id: 1,
      month: 'January 2024',
      amount: 2200,
      dueDate: '2024-01-01',
      paidDate: '2023-12-28',
      status: 'Paid',
      method: 'Auto-Pay'
    },
    {
      id: 2,
      month: 'December 2023',
      amount: 2200,
      dueDate: '2023-12-01',
      paidDate: '2023-11-30',
      status: 'Paid',
      method: 'Bank Transfer'
    },
    {
      id: 3,
      month: 'November 2023',
      amount: 2200,
      dueDate: '2023-11-01',
      paidDate: '2023-10-29',
      status: 'Paid',
      method: 'Auto-Pay'
    }
  ];
};

const fetchMaintenanceRequests = async (): Promise<MaintenanceRequest[]> => {
  await new Promise(resolve => setTimeout(resolve, 300));
  
  return [
    {
      id: 1,
      issue: 'Leaking faucet in kitchen',
      description: 'Kitchen faucet has been dripping for the past week',
      priority: 'Medium',
      status: 'In Progress',
      dateSubmitted: '2024-01-12',
      assignedTo: 'Bob Wilson',
      estimatedCompletion: '2024-01-15'
    },
    {
      id: 2,
      issue: 'Light fixture replacement',
      description: 'Bathroom light fixture needs replacement',
      priority: 'Low',
      status: 'Completed',
      dateSubmitted: '2024-01-05',
      assignedTo: 'Alice Brown',
      completedDate: '2024-01-08'
    }
  ];
};

const fetchNotifications = async (): Promise<Notification[]> => {
  await new Promise(resolve => setTimeout(resolve, 300));
  
  return [
    {
      id: 1,
      type: 'Payment Reminder',
      message: 'February rent payment is due in 5 days',
      date: '2024-01-26',
      priority: 'High'
    },
    {
      id: 2,
      type: 'Maintenance Update',
      message: 'Kitchen faucet repair scheduled for tomorrow',
      date: '2024-01-14',
      priority: 'Medium'
    },
    {
      id: 3,
      type: 'Lease Renewal',
      message: 'Lease renewal notice - 6 months remaining',
      date: '2024-01-10',
      priority: 'Low'
    }
  ];
};

export const useTenantDashboard = () => {
  const { data: leaseInfo, isLoading: leaseLoading } = useQuery({
    queryKey: ['tenant-dashboard', 'lease-info'],
    queryFn: fetchLeaseInfo,
  });

  const { data: rentPayments = [], isLoading: paymentsLoading } = useQuery({
    queryKey: ['tenant-dashboard', 'rent-payments'],
    queryFn: fetchRentPayments,
  });

  const { data: maintenanceRequests = [], isLoading: maintenanceLoading } = useQuery({
    queryKey: ['tenant-dashboard', 'maintenance-requests'],
    queryFn: fetchMaintenanceRequests,
  });

  const { data: notifications = [], isLoading: notificationsLoading } = useQuery({
    queryKey: ['tenant-dashboard', 'notifications'],
    queryFn: fetchNotifications,
  });

  const isLoading = leaseLoading || paymentsLoading || maintenanceLoading || notificationsLoading;

  return {
    isLoading,
    leaseInfo: leaseInfo || null,
    rentPayments,
    maintenanceRequests,
    notifications
  };
};