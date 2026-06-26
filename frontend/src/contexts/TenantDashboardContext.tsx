import React, { createContext, useContext, useState, useCallback } from 'react';
import {
  MaintenanceRequest,
  Payment,
  PaymentMethod,
  TenantDocument,
  TenantNotification,
  NotificationPreferences,
  Lease,
  TenantDashboardStats,
  CommunityAnnouncement,
  MaintenanceRequestForm,
  PaymentForm,
  PaymentMethodForm,
  DocumentUploadForm
} from '@/types/tenant';

interface TenantDashboardContextType {
  // Maintenance Requests
  maintenanceRequests: MaintenanceRequest[];
  createMaintenanceRequest: (request: MaintenanceRequestForm) => Promise<MaintenanceRequest>;
  updateMaintenanceRequest: (id: string, updates: Partial<MaintenanceRequest>) => Promise<void>;
  getMaintenanceRequest: (id: string) => MaintenanceRequest | undefined;
  
  // Payments
  payments: Payment[];
  paymentMethods: PaymentMethod[];
  makePayment: (payment: PaymentForm) => Promise<Payment>;
  addPaymentMethod: (method: PaymentMethodForm) => Promise<PaymentMethod>;
  setDefaultPaymentMethod: (id: string) => Promise<void>;
  deletePaymentMethod: (id: string) => Promise<void>;
  
  // Documents
  documents: TenantDocument[];
  uploadDocument: (doc: DocumentUploadForm) => Promise<TenantDocument>;
  signDocument: (id: string) => Promise<void>;
  downloadDocument: (id: string) => Promise<void>;
  
  // Notifications
  notifications: TenantNotification[];
  notificationPreferences: NotificationPreferences;
  markNotificationAsRead: (id: string) => Promise<void>;
  markAllNotificationsAsRead: () => Promise<void>;
  updateNotificationPreferences: (prefs: Partial<NotificationPreferences>) => Promise<void>;
  
  // Lease
  lease: Lease | null;
  
  // Dashboard Stats
  dashboardStats: TenantDashboardStats;
  
  // Community
  announcements: CommunityAnnouncement[];
}

const TenantDashboardContext = createContext<TenantDashboardContextType | undefined>(undefined);

export function TenantDashboardProvider({ children }: { children: React.ReactNode }) {
  // Mock data - replace with actual API calls
  const [maintenanceRequests, setMaintenanceRequests] = useState<MaintenanceRequest[]>([
    {
      id: '1',
      tenant_id: 'tenant-1',
      property_id: 'prop-1',
      title: 'Leaking Kitchen Faucet',
      description: 'The kitchen faucet has been dripping constantly for the past week, wasting water.',
      category: 'plumbing',
      priority: 'medium',
      status: 'in_progress',
      attachments: [
        {
          id: 'att-1',
          file_name: '/images/FaucetLeak.jpg',
          file_url: '/images/FaucetLeak.jpg',
          file_type: 'image/jpeg',
          file_size: 245678,
          uploaded_by: 'tenant-1',
          uploaded_at: new Date('2024-01-12')
        }
      ],
      assigned_to: 'tech-1',
      assigned_to_name: 'Bob Wilson',
      scheduled_date: new Date('2024-01-15'),
      notes: [
        {
          id: 'note-1',
          author_id: 'tech-1',
          author_name: 'Bob Wilson',
          author_role: 'Technician',
          content: 'Scheduled for tomorrow morning. Will bring replacement parts.',
          is_internal: false,
          created_at: new Date('2024-01-14')
        }
      ],
      created_at: new Date('2024-01-12'),
      updated_at: new Date('2024-01-14')
    },
    {
      id: '2',
      tenant_id: 'tenant-1',
      property_id: 'prop-1',
      title: 'Bathroom Light Fixture',
      description: 'Light fixture in master bathroom needs replacement',
      category: 'electrical',
      priority: 'low',
      status: 'completed',
      attachments: [],
      assigned_to: 'tech-2',
      assigned_to_name: 'Alice Brown',
      completed_date: new Date('2024-01-08'),
      tenant_rating: 5,
      tenant_feedback: 'Quick and professional service!',
      notes: [],
      created_at: new Date('2024-01-05'),
      updated_at: new Date('2024-01-08')
    }
  ]);

  const [payments, setPayments] = useState<Payment[]>([
    {
      id: 'pay-1',
      tenant_id: 'tenant-1',
      property_id: 'prop-1',
      lease_id: 'lease-1',
      amount: 2200,
      due_date: new Date('2024-02-01'),
      status: 'pending',
      late_fee: 0,
      discount: 0,
      total_amount: 2200,
      payment_type: 'rent',
      created_at: new Date('2024-01-01'),
      updated_at: new Date('2024-01-01')
    },
    {
      id: 'pay-2',
      tenant_id: 'tenant-1',
      property_id: 'prop-1',
      lease_id: 'lease-1',
      amount: 2200,
      due_date: new Date('2024-01-01'),
      paid_date: new Date('2023-12-28'),
      status: 'completed',
      payment_method_id: 'pm-1',
      transaction_id: 'txn-12345',
      receipt_url: '/receipts/jan-2024.pdf',
      late_fee: 0,
      discount: 0,
      total_amount: 2200,
      payment_type: 'rent',
      created_at: new Date('2023-12-01'),
      updated_at: new Date('2023-12-28')
    }
  ]);

  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([
    {
      id: 'pm-1',
      tenant_id: 'tenant-1',
      type: 'credit_card',
      provider: 'Visa',
      last_four: '4242',
      expiry_date: '12/25',
      is_default: true,
      is_auto_pay: true,
      auto_pay_day: 28,
      is_verified: true,
      created_at: new Date('2023-09-01'),
      updated_at: new Date('2023-09-01')
    }
  ]);

  const [documents, setDocuments] = useState<TenantDocument[]>([
    {
      id: 'doc-1',
      tenant_id: 'tenant-1',
      property_id: 'prop-1',
      category: 'lease',
      title: 'Lease Agreement 2023-2024',
      description: 'Annual lease agreement',
      file_name: 'lease-2023-2024.pdf',
      file_url: '/documents/lease-2023-2024.pdf',
      file_type: 'application/pdf',
      file_size: 1245678,
      requires_signature: false,
      signature_status: 'signed',
      signed_date: new Date('2023-09-01'),
      expiry_date: new Date('2024-08-31'),
      uploaded_by: 'landlord-1',
      uploaded_by_name: 'Property Management Co.',
      access_level: 'tenant_landlord',
      version: 1,
      is_archived: false,
      tags: ['lease', '2023-2024'],
      created_at: new Date('2023-09-01'),
      updated_at: new Date('2023-09-01')
    }
  ]);

  const [notifications, setNotifications] = useState<TenantNotification[]>([
    {
      id: 'notif-1',
      tenant_id: 'tenant-1',
      type: 'payment',
      title: 'Rent Payment Due Soon',
      message: 'Your February rent payment of $2,200 is due in 5 days',
      priority: 'high',
      action_url: '/tenant-dashboard?tab=payments',
      action_label: 'Make Payment',
      read: false,
      created_at: new Date('2024-01-26'),
      expires_at: new Date('2024-02-01')
    },
    {
      id: 'notif-2',
      tenant_id: 'tenant-1',
      type: 'maintenance',
      title: 'Maintenance Update',
      message: 'Kitchen faucet repair scheduled for tomorrow at 10 AM',
      priority: 'medium',
      read: false,
      created_at: new Date('2024-01-14')
    }
  ]);

  const [notificationPreferences, setNotificationPreferences] = useState<NotificationPreferences>({
    tenant_id: 'tenant-1',
    email_enabled: true,
    email_address: 'tenant@example.com',
    sms_enabled: true,
    phone_number: '+1234567890',
    push_enabled: true,
    maintenance_updates: true,
    payment_reminders: true,
    payment_reminder_days: [7, 3, 1],
    lease_updates: true,
    community_announcements: true,
    marketing_communications: false,
    quiet_hours_enabled: true,
    quiet_hours_start: '22:00',
    quiet_hours_end: '08:00',
    updated_at: new Date()
  });

  const [lease] = useState<Lease>({
    id: 'lease-1',
    tenant_id: 'tenant-1',
    property_id: 'prop-1',
    landlord_id: 'landlord-1',
    start_date: new Date('2023-09-01'),
    end_date: new Date('2024-08-31'),
    monthly_rent: 2200,
    security_deposit: 2200,
    status: 'active',
    lease_document_id: 'doc-1',
    auto_renew: false,
    created_at: new Date('2023-08-15'),
    updated_at: new Date('2023-09-01')
  });

  const [dashboardStats] = useState<TenantDashboardStats>({
    upcoming_payment: payments.find(p => p.status === 'pending'),
    days_until_payment: 5,
    total_paid_this_year: 2200,
    open_maintenance_requests: 1,
    pending_documents: 0,
    unread_notifications: 2,
    lease_expiry_days: 214,
    payment_history_count: 5,
    maintenance_history_count: 2
  });

  const [announcements] = useState<CommunityAnnouncement[]>([
    {
      id: 'ann-1',
      property_id: 'prop-1',
      title: 'Pool Maintenance Schedule',
      content: 'The community pool will be closed for maintenance on February 1-2, 2024.',
      category: 'maintenance',
      priority: 'medium',
      published_by: 'landlord-1',
      published_by_name: 'Property Management',
      published_at: new Date('2024-01-20'),
      is_pinned: true
    }
  ]);

  const createMaintenanceRequest = useCallback(async (requestForm: MaintenanceRequestForm): Promise<MaintenanceRequest> => {
    const newRequest: MaintenanceRequest = {
      id: `req-${Date.now()}`,
      tenant_id: 'tenant-1',
      property_id: 'prop-1',
      title: requestForm.title,
      description: requestForm.description,
      category: requestForm.category,
      priority: requestForm.priority,
      status: 'submitted',
      attachments: [],
      notes: [],
      created_at: new Date(),
      updated_at: new Date()
    };
    
    setMaintenanceRequests(prev => [newRequest, ...prev]);
    return newRequest;
  }, []);

  const updateMaintenanceRequest = useCallback(async (id: string, updates: Partial<MaintenanceRequest>) => {
    setMaintenanceRequests(prev =>
      prev.map(req => req.id === id ? { ...req, ...updates, updated_at: new Date() } : req)
    );
  }, []);

  const getMaintenanceRequest = useCallback((id: string) => {
    return maintenanceRequests.find(req => req.id === id);
  }, [maintenanceRequests]);

  const makePayment = useCallback(async (paymentForm: PaymentForm): Promise<Payment> => {
    const payment = payments.find(p => p.id === paymentForm.payment_method_id);
    if (payment) {
      const updatedPayment = {
        ...payment,
        status: 'processing' as const,
        paid_date: new Date(),
        updated_at: new Date()
      };
      setPayments(prev => prev.map(p => p.id === payment.id ? updatedPayment : p));
      return updatedPayment;
    }
    throw new Error('Payment not found');
  }, [payments]);

  const addPaymentMethod = useCallback(async (methodForm: PaymentMethodForm): Promise<PaymentMethod> => {
    const newMethod: PaymentMethod = {
      id: `pm-${Date.now()}`,
      tenant_id: 'tenant-1',
      type: methodForm.type,
      provider: 'Provider',
      last_four: '****',
      is_default: methodForm.is_default,
      is_auto_pay: methodForm.is_auto_pay,
      auto_pay_day: methodForm.auto_pay_day,
      is_verified: false,
      created_at: new Date(),
      updated_at: new Date()
    };
    
    setPaymentMethods(prev => [...prev, newMethod]);
    return newMethod;
  }, []);

  const setDefaultPaymentMethod = useCallback(async (id: string) => {
    setPaymentMethods(prev =>
      prev.map(pm => ({ ...pm, is_default: pm.id === id }))
    );
  }, []);

  const deletePaymentMethod = useCallback(async (id: string) => {
    setPaymentMethods(prev => prev.filter(pm => pm.id !== id));
  }, []);

  const uploadDocument = useCallback(async (docForm: DocumentUploadForm): Promise<TenantDocument> => {
    const newDoc: TenantDocument = {
      id: `doc-${Date.now()}`,
      tenant_id: 'tenant-1',
      property_id: 'prop-1',
      category: docForm.category,
      title: docForm.title,
      description: docForm.description,
      file_name: docForm.file.name,
      file_url: URL.createObjectURL(docForm.file),
      file_type: docForm.file.type,
      file_size: docForm.file.size,
      requires_signature: false,
      uploaded_by: 'tenant-1',
      uploaded_by_name: 'Current Tenant',
      access_level: 'tenant_landlord',
      version: 1,
      is_archived: false,
      tags: docForm.tags,
      created_at: new Date(),
      updated_at: new Date()
    };
    
    setDocuments(prev => [newDoc, ...prev]);
    return newDoc;
  }, []);

  const signDocument = useCallback(async (id: string) => {
    setDocuments(prev =>
      prev.map(doc =>
        doc.id === id
          ? { ...doc, signature_status: 'signed' as const, signed_date: new Date(), updated_at: new Date() }
          : doc
      )
    );
  }, []);

  const downloadDocument = useCallback(async (id: string) => {
    const doc = documents.find(d => d.id === id);
    if (doc) {
      window.open(doc.file_url, '_blank');
    }
  }, [documents]);

  const markNotificationAsRead = useCallback(async (id: string) => {
    setNotifications(prev =>
      prev.map(notif =>
        notif.id === id ? { ...notif, read: true, read_at: new Date() } : notif
      )
    );
  }, []);

  const markAllNotificationsAsRead = useCallback(async () => {
    setNotifications(prev =>
      prev.map(notif => ({ ...notif, read: true, read_at: new Date() }))
    );
  }, []);

  const updateNotificationPreferences = useCallback(async (prefs: Partial<NotificationPreferences>) => {
    setNotificationPreferences(prev => ({ ...prev, ...prefs, updated_at: new Date() }));
  }, []);

  const value: TenantDashboardContextType = {
    maintenanceRequests,
    createMaintenanceRequest,
    updateMaintenanceRequest,
    getMaintenanceRequest,
    payments,
    paymentMethods,
    makePayment,
    addPaymentMethod,
    setDefaultPaymentMethod,
    deletePaymentMethod,
    documents,
    uploadDocument,
    signDocument,
    downloadDocument,
    notifications,
    notificationPreferences,
    markNotificationAsRead,
    markAllNotificationsAsRead,
    updateNotificationPreferences,
    lease,
    dashboardStats,
    announcements
  };

  return (
    <TenantDashboardContext.Provider value={value}>
      {children}
    </TenantDashboardContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useTenantDashboard() {
  const context = useContext(TenantDashboardContext);
  if (context === undefined) {
    throw new Error('useTenantDashboard must be used within a TenantDashboardProvider');
  }
  return context;
}