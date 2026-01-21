import {
  DollarSign,
  CheckCircle,
  AlertCircle,
  Wrench,
  Clock,
  FileText,
  MessageSquare,
  XCircle,
  Upload,
  Calendar,
  Bell,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { NotificationType } from '@/types/notification';

interface NotificationConfig {
  icon: LucideIcon;
  color: string;
  bgColor: string;
  label: string;
}

export const notificationConfig: Record<NotificationType, NotificationConfig> = {
  payment_due: {
    icon: DollarSign,
    color: 'text-yellow-600',
    bgColor: 'bg-yellow-100',
    label: 'Payment Due',
  },
  payment_received: {
    icon: CheckCircle,
    color: 'text-green-600',
    bgColor: 'bg-green-100',
    label: 'Payment Received',
  },
  payment_overdue: {
    icon: AlertCircle,
    color: 'text-red-600',
    bgColor: 'bg-red-100',
    label: 'Payment Overdue',
  },
  maintenance_request_created: {
    icon: Wrench,
    color: 'text-blue-600',
    bgColor: 'bg-blue-100',
    label: 'Maintenance Request',
  },
  maintenance_request_updated: {
    icon: Wrench,
    color: 'text-blue-600',
    bgColor: 'bg-blue-100',
    label: 'Maintenance Update',
  },
  maintenance_request_completed: {
    icon: CheckCircle,
    color: 'text-green-600',
    bgColor: 'bg-green-100',
    label: 'Maintenance Completed',
  },
  lease_expiring: {
    icon: Clock,
    color: 'text-orange-600',
    bgColor: 'bg-orange-100',
    label: 'Lease Expiring',
  },
  lease_renewed: {
    icon: FileText,
    color: 'text-green-600',
    bgColor: 'bg-green-100',
    label: 'Lease Renewed',
  },
  lease_signed: {
    icon: FileText,
    color: 'text-green-600',
    bgColor: 'bg-green-100',
    label: 'Lease Signed',
  },
  message_received: {
    icon: MessageSquare,
    color: 'text-purple-600',
    bgColor: 'bg-purple-100',
    label: 'New Message',
  },
  application_submitted: {
    icon: FileText,
    color: 'text-blue-600',
    bgColor: 'bg-blue-100',
    label: 'Application Submitted',
  },
  application_approved: {
    icon: CheckCircle,
    color: 'text-green-600',
    bgColor: 'bg-green-100',
    label: 'Application Approved',
  },
  application_rejected: {
    icon: XCircle,
    color: 'text-red-600',
    bgColor: 'bg-red-100',
    label: 'Application Rejected',
  },
  document_uploaded: {
    icon: Upload,
    color: 'text-blue-600',
    bgColor: 'bg-blue-100',
    label: 'Document Uploaded',
  },
  document_signed: {
    icon: FileText,
    color: 'text-green-600',
    bgColor: 'bg-green-100',
    label: 'Document Signed',
  },
  inspection_scheduled: {
    icon: Calendar,
    color: 'text-blue-600',
    bgColor: 'bg-blue-100',
    label: 'Inspection Scheduled',
  },
  system_announcement: {
    icon: Bell,
    color: 'text-gray-600',
    bgColor: 'bg-gray-100',
    label: 'Announcement',
  },
};