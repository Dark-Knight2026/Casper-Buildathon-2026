import { useEffect } from 'react';
import { useNotifications } from '@/contexts/NotificationContext';
import { supabase, isSupabaseConfigured } from '@/lib/supabase/client';
import { RealtimeChannel } from '@supabase/supabase-js';
import { sendMultiChannelNotification } from '@/lib/notificationChannels';
import { shouldBatchNotification, addToBatch } from '@/lib/notificationBatching';
import type { NotificationPriority } from '@/types/notification-channels';

// Type definitions for database records
interface PaymentRecord {
  id: string;
  amount?: number;
  status?: string;
  due_date?: string;
  payment_method?: string;
  tenant_id?: string;
  property_id?: string;
  user_id?: string;
  [key: string]: unknown;
}

interface MaintenanceRecord {
  id: string;
  title?: string;
  priority?: string;
  status?: string;
  assigned_to?: string;
  scheduled_date?: string;
  user_id?: string;
  [key: string]: unknown;
}

interface DocumentRecord {
  id: string;
  title?: string;
  requires_signature?: boolean;
  status?: string;
  shared_with?: string[];
  expiry_date?: string;
  user_id?: string;
  [key: string]: unknown;
}

interface LeaseRecord {
  id: string;
  lease_number?: string;
  status?: string;
  end_date?: string;
  start_date?: string;
  rent_amount?: number;
  user_id?: string;
  [key: string]: unknown;
}

interface ShowingRecord {
  id: string;
  scheduled_date?: string;
  status?: string;
  agent_id?: string;
  property_id?: string;
  client_name?: string;
  user_id?: string;
  [key: string]: unknown;
}

interface MessageRecord {
  id: string;
  sender_id?: string;
  receiver_id?: string;
  subject?: string;
  content?: string;
  is_read?: boolean;
  priority?: string;
  thread_id?: string;
  sender_name?: string;
  [key: string]: unknown;
}

interface AppointmentRecord {
  id: string;
  title?: string;
  description?: string;
  appointment_type?: string;
  scheduled_date?: string;
  scheduled_time?: string;
  status?: string;
  attendees?: string[];
  location?: string;
  reminder_sent?: boolean;
  user_id?: string;
  [key: string]: unknown;
}

interface InspectionRecord {
  id: string;
  property_id?: string;
  inspection_type?: string;
  scheduled_date?: string;
  status?: string;
  inspector_name?: string;
  findings?: string;
  user_id?: string;
  [key: string]: unknown;
}

interface OfferRecord {
  id: string;
  property_id?: string;
  buyer_name?: string;
  offer_amount?: number;
  status?: string;
  contingencies?: string[];
  expiry_date?: string;
  user_id?: string;
  [key: string]: unknown;
}

interface TenantRecord {
  id: string;
  name?: string;
  status?: string;
  lease_id?: string;
  move_in_date?: string;
  move_out_date?: string;
  user_id?: string;
  [key: string]: unknown;
}

/**
 * Hook to set up real-time notification triggers from Supabase database events
 * Supports batching for non-urgent notifications to reduce email/SMS costs
 */
export function useNotificationTriggers() {
  const { addNotification } = useNotifications();

  useEffect(() => {
    if (!isSupabaseConfigured()) {
      console.warn('Supabase not configured, notification triggers disabled');
      return;
    }

    const channels: RealtimeChannel[] = [];

    // Helper function to send notification with batching support
    const sendNotification = async (
      userId: string,
      title: string,
      message: string,
      priority: NotificationPriority,
      type: string,
      actionUrl?: string,
      actionLabel?: string,
      metadata?: Record<string, unknown>
    ) => {
      // Always add in-app notification
      addNotification({
        type,
        priority,
        title,
        message,
        isRead: false,
        isArchived: false,
        actionUrl,
        actionLabel,
        metadata,
      });

      // Check if notification should be batched
      const shouldBatch = await shouldBatchNotification(userId, priority);

      if (shouldBatch) {
        // Add to batch queue instead of sending immediately
        await addToBatch({
          userId,
          type,
          priority,
          title,
          message,
          actionUrl: actionUrl ? `${window.location.origin}${actionUrl}` : undefined,
          actionLabel,
          metadata,
        });
        console.log('Notification added to batch queue:', title);
      } else {
        // Send immediately for high/urgent priority
        try {
          await sendMultiChannelNotification(
            userId,
            title,
            message,
            priority,
            actionUrl ? `${window.location.origin}${actionUrl}` : undefined,
            actionLabel,
            metadata
          );
        } catch (error) {
          console.error('Failed to send multi-channel notification:', error);
        }
      }
    };

    // ==================== PAYMENT EVENTS ====================
    const paymentsChannel = supabase
      .channel('payments-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'payments',
        },
        async (payload) => {
          if (payload.eventType === 'INSERT') {
            const payment = payload.new as PaymentRecord;
            const priority: NotificationPriority = payment.amount && payment.amount > 5000 ? 'high' : 'medium';
            
            await sendNotification(
              payment.user_id || '',
              'New Payment Received',
              `Payment of $${payment.amount?.toLocaleString() || 'N/A'} has been recorded${payment.payment_method ? ` via ${payment.payment_method}` : ''}`,
              priority,
              'payment',
              `/payments/${payment.id}`,
              'View Payment',
              { paymentId: payment.id, amount: payment.amount }
            );
          } else if (payload.eventType === 'UPDATE') {
            const payment = payload.new as PaymentRecord;
            const oldPayment = payload.old as PaymentRecord;
            
            // Overdue payment (urgent - always immediate)
            if (payment.status === 'overdue' && oldPayment.status !== 'overdue') {
              await sendNotification(
                payment.user_id || '',
                'Payment Overdue',
                `Payment of $${payment.amount?.toLocaleString() || 'N/A'} is now overdue`,
                'urgent',
                'warning',
                `/payments/${payment.id}`,
                'View Details',
                { paymentId: payment.id }
              );
            }
            
            // Payment failed (high - may be batched based on preferences)
            if (payment.status === 'failed' && oldPayment.status !== 'failed') {
              await sendNotification(
                payment.user_id || '',
                'Payment Failed',
                `Payment of $${payment.amount?.toLocaleString() || 'N/A'} could not be processed. Please update payment method.`,
                'high',
                'warning',
                `/payments/${payment.id}`,
                'Retry Payment',
                { paymentId: payment.id }
              );
            }
            
            // Payment completed (low - will be batched)
            if (payment.status === 'completed' && oldPayment.status !== 'completed') {
              await sendNotification(
                payment.user_id || '',
                'Payment Completed',
                `Payment of $${payment.amount?.toLocaleString() || 'N/A'} has been successfully processed`,
                'low',
                'success',
                `/payments/${payment.id}`,
                'View Receipt',
                { paymentId: payment.id }
              );
            }
          }
        }
      )
      .subscribe();

    channels.push(paymentsChannel);

    // ==================== MAINTENANCE EVENTS ====================
    const maintenanceChannel = supabase
      .channel('maintenance-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'maintenance_requests',
        },
        async (payload) => {
          if (payload.eventType === 'INSERT') {
            const request = payload.new as MaintenanceRecord;
            const priority: NotificationPriority = request.priority === 'urgent' ? 'urgent' : request.priority === 'high' ? 'high' : 'medium';
            
            await sendNotification(
              request.user_id || '',
              'New Maintenance Request',
              request.title || 'A new maintenance request has been submitted',
              priority,
              'maintenance',
              `/maintenance/${request.id}`,
              'View Request',
              { requestId: request.id }
            );
          } else if (payload.eventType === 'UPDATE') {
            const request = payload.new as MaintenanceRecord;
            const oldRequest = payload.old as MaintenanceRecord;
            
            // Status completed (low - will be batched)
            if (request.status === 'completed' && oldRequest.status !== 'completed') {
              await sendNotification(
                request.user_id || '',
                'Maintenance Completed',
                'Maintenance request has been completed',
                'low',
                'success',
                `/maintenance/${request.id}`,
                'View Details',
                { requestId: request.id }
              );
            }
          }
        }
      )
      .subscribe();

    channels.push(maintenanceChannel);

    // ==================== DOCUMENT EVENTS ====================
    const documentsChannel = supabase
      .channel('documents-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'documents',
        },
        async (payload) => {
          if (payload.eventType === 'INSERT') {
            const document = payload.new as DocumentRecord;
            const priority: NotificationPriority = document.requires_signature ? 'high' : 'medium';
            
            await sendNotification(
              document.user_id || '',
              'New Document Available',
              document.title || 'A new document has been uploaded',
              priority,
              'document',
              `/documents/${document.id}`,
              document.requires_signature ? 'Sign Now' : 'View Document',
              { documentId: document.id }
            );
          } else if (payload.eventType === 'UPDATE') {
            const document = payload.new as DocumentRecord;
            const oldDocument = payload.old as DocumentRecord;
            
            // Document signed (low - will be batched)
            if (document.status === 'signed' && oldDocument.status !== 'signed') {
              await sendNotification(
                document.user_id || '',
                'Document Signed',
                `${document.title || 'Document'} has been successfully signed`,
                'low',
                'success',
                `/documents/${document.id}`,
                'View Document',
                { documentId: document.id }
              );
            }
          }
        }
      )
      .subscribe();

    channels.push(documentsChannel);

    // ==================== LEASE EVENTS ====================
    const leasesChannel = supabase
      .channel('leases-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'leases',
        },
        async (payload) => {
          if (payload.eventType === 'INSERT') {
            const lease = payload.new as LeaseRecord;
            
            await sendNotification(
              lease.user_id || '',
              'New Lease Created',
              `Lease ${lease.lease_number || lease.id} has been created${lease.rent_amount ? ` for $${lease.rent_amount.toLocaleString()}/month` : ''}`,
              'high',
              'lease',
              `/leases/${lease.id}`,
              'View Lease',
              { leaseId: lease.id }
            );
          } else if (payload.eventType === 'UPDATE') {
            const lease = payload.new as LeaseRecord;
            const oldLease = payload.old as LeaseRecord;
            
            // Lease expired (urgent - always immediate)
            if (lease.status === 'expired' && oldLease.status !== 'expired') {
              await sendNotification(
                lease.user_id || '',
                'Lease Expired',
                `Lease ${lease.lease_number || lease.id} has expired`,
                'urgent',
                'warning',
                `/leases/${lease.id}`,
                'View Lease',
                { leaseId: lease.id }
              );
            }
            
            // 7 days expiration warning (urgent - always immediate)
            if (lease.end_date) {
              const endDate = new Date(lease.end_date);
              const today = new Date();
              const daysUntilExpiration = Math.floor((endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
              
              if (daysUntilExpiration === 7 && lease.status === 'active') {
                await sendNotification(
                  lease.user_id || '',
                  'Lease Expiring This Week',
                  `Lease ${lease.lease_number || lease.id} expires in 7 days!`,
                  'urgent',
                  'warning',
                  `/leases/${lease.id}`,
                  'Take Action',
                  { leaseId: lease.id, daysUntilExpiration }
                );
              }
              
              // 30 days warning (medium - may be batched)
              if (daysUntilExpiration === 30 && lease.status === 'active') {
                await sendNotification(
                  lease.user_id || '',
                  'Lease Expiring in 30 Days',
                  `Lease ${lease.lease_number || lease.id} expires in 30 days`,
                  'medium',
                  'warning',
                  `/leases/${lease.id}`,
                  'Review Lease',
                  { leaseId: lease.id, daysUntilExpiration }
                );
              }
            }
          }
        }
      )
      .subscribe();

    channels.push(leasesChannel);

    // ==================== MESSAGE EVENTS ====================
    const messagesChannel = supabase
      .channel('messages-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
        },
        async (payload) => {
          const message = payload.new as MessageRecord;
          const priority: NotificationPriority = message.priority === 'high' || message.priority === 'urgent' ? 'high' : 'medium';
          
          if (message.receiver_id) {
            await sendNotification(
              message.receiver_id,
              message.subject || 'New Message',
              `${message.sender_name || 'Someone'} sent you a message${message.subject ? `: ${message.subject}` : ''}`,
              priority,
              'message',
              `/messages/${message.thread_id || message.id}`,
              'Read Message',
              { messageId: message.id, senderId: message.sender_id }
            );
          }
        }
      )
      .subscribe();

    channels.push(messagesChannel);

    // ==================== APPOINTMENT EVENTS ====================
    const appointmentsChannel = supabase
      .channel('appointments-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'appointments',
        },
        async (payload) => {
          if (payload.eventType === 'INSERT') {
            const appointment = payload.new as AppointmentRecord;
            
            await sendNotification(
              appointment.user_id || '',
              'New Appointment Scheduled',
              `${appointment.title || 'An appointment'} scheduled for ${appointment.scheduled_date ? new Date(appointment.scheduled_date).toLocaleDateString() : 'a future date'}${appointment.location ? ` at ${appointment.location}` : ''}`,
              'high',
              'showing',
              `/appointments/${appointment.id}`,
              'View Appointment',
              { appointmentId: appointment.id }
            );
          } else if (payload.eventType === 'UPDATE') {
            const appointment = payload.new as AppointmentRecord;
            
            // 1 hour reminder (urgent - always immediate)
            if (appointment.scheduled_date && appointment.scheduled_time) {
              const appointmentDateTime = new Date(`${appointment.scheduled_date} ${appointment.scheduled_time}`);
              const now = new Date();
              const hoursUntilAppointment = Math.floor((appointmentDateTime.getTime() - now.getTime()) / (1000 * 60 * 60));
              
              if (hoursUntilAppointment === 1) {
                await sendNotification(
                  appointment.user_id || '',
                  'Appointment in 1 Hour',
                  `${appointment.title || 'Your appointment'} starts in 1 hour${appointment.location ? ` at ${appointment.location}` : ''}`,
                  'urgent',
                  'showing',
                  `/appointments/${appointment.id}`,
                  'View Details',
                  { appointmentId: appointment.id }
                );
              }
            }
          }
        }
      )
      .subscribe();

    channels.push(appointmentsChannel);

    // ==================== OFFER EVENTS ====================
    const offersChannel = supabase
      .channel('offers-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'offers',
        },
        async (payload) => {
          if (payload.eventType === 'INSERT') {
            const offer = payload.new as OfferRecord;
            
            await sendNotification(
              offer.user_id || '',
              'New Offer Received',
              `${offer.buyer_name || 'A buyer'} submitted an offer of $${offer.offer_amount?.toLocaleString() || 'N/A'}`,
              'urgent',
              'success',
              `/offers/${offer.id}`,
              'Review Offer',
              { offerId: offer.id }
            );
          } else if (payload.eventType === 'UPDATE') {
            const offer = payload.new as OfferRecord;
            const oldOffer = payload.old as OfferRecord;
            
            // Offer accepted (urgent - always immediate)
            if (offer.status === 'accepted' && oldOffer.status !== 'accepted') {
              await sendNotification(
                offer.user_id || '',
                'Offer Accepted',
                `Offer of $${offer.offer_amount?.toLocaleString() || 'N/A'} has been accepted!`,
                'urgent',
                'success',
                `/offers/${offer.id}`,
                'View Offer',
                { offerId: offer.id }
              );
            }
            
            // Offer expiring in 24 hours (urgent - always immediate)
            if (offer.expiry_date) {
              const expiryDate = new Date(offer.expiry_date);
              const today = new Date();
              const hoursUntilExpiry = Math.floor((expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60));
              
              if (hoursUntilExpiry === 24 && offer.status === 'pending') {
                await sendNotification(
                  offer.user_id || '',
                  'Offer Expiring Soon',
                  `Offer of $${offer.offer_amount?.toLocaleString() || 'N/A'} expires in 24 hours`,
                  'urgent',
                  'warning',
                  `/offers/${offer.id}`,
                  'Review Now',
                  { offerId: offer.id, hoursUntilExpiry }
                );
              }
            }
          }
        }
      )
      .subscribe();

    channels.push(offersChannel);

    // Cleanup function to unsubscribe from all channels
    return () => {
      channels.forEach(channel => {
        supabase.removeChannel(channel);
      });
    };
  }, [addNotification]);
}