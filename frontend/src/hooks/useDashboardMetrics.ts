import { useState, useEffect } from 'react';

export interface DashboardMetrics {
  totalRevenue: number;
  revenueTrend: number;
  occupancyRate: number;
  occupancyTrend: number;
  activeLeases: number;
  expiringLeases: number;
  pendingApprovals: number;
}

export interface ActionItem {
  id: string;
  title: string;
  description: string;
  type: 'approval' | 'maintenance' | 'lease' | 'payment';
  priority: 'high' | 'medium' | 'low';
  date: Date;
  actionLabel: string;
  onAction: () => void;
}

export interface ActivityItem {
  id: string;
  type: 'lease_signed' | 'payment_received' | 'maintenance_completed' | 'tenant_joined';
  title: string;
  description: string;
  timestamp: Date;
}

export const useDashboardMetrics = () => {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [actionItems, setActionItems] = useState<ActionItem[]>([]);
  const [recentActivity, setRecentActivity] = useState<ActivityItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Simulate API fetch
    const fetchData = async () => {
      setIsLoading(true);
      try {
        // Mock data delay
        await new Promise(resolve => setTimeout(resolve, 800));
        
        setMetrics({
          totalRevenue: 45231.89,
          revenueTrend: 20.1,
          occupancyRate: 92,
          occupancyTrend: 2.5,
          activeLeases: 12,
          expiringLeases: 2,
          pendingApprovals: 3
        });

        setActionItems([
          {
            id: '1',
            title: 'Lease Approval Required',
            description: 'New lease for 123 Main St requires your approval.',
            type: 'approval',
            priority: 'high',
            date: new Date(),
            actionLabel: 'Review',
            onAction: () => console.log('Review lease 1')
          },
          {
            id: '2',
            title: 'Urgent Maintenance',
            description: 'Water leak reported at Unit 4B.',
            type: 'maintenance',
            priority: 'high',
            date: new Date(Date.now() - 86400000),
            actionLabel: 'View Request',
            onAction: () => console.log('View maintenance 2')
          },
          {
            id: '3',
            title: 'Rent Overdue',
            description: 'Tenant John Doe is 5 days late on rent.',
            type: 'payment',
            priority: 'medium',
            date: new Date(Date.now() - 432000000),
            actionLabel: 'Send Reminder',
            onAction: () => console.log('Remind tenant 3')
          }
        ]);

        setRecentActivity([
          {
            id: '1',
            type: 'lease_signed',
            title: 'Lease Signed',
            description: 'Sarah Jenkins signed lease for Unit 2A',
            timestamp: new Date(Date.now() - 1000 * 60 * 30) // 30 mins ago
          },
          {
            id: '2',
            type: 'payment_received',
            title: 'Rent Payment Received',
            description: '$2,400 from Mike Smith (Unit 5B)',
            timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2) // 2 hours ago
          },
          {
            id: '3',
            type: 'maintenance_completed',
            title: 'Maintenance Completed',
            description: 'HVAC repair at 123 Main St finished',
            timestamp: new Date(Date.now() - 1000 * 60 * 60 * 5) // 5 hours ago
          },
          {
            id: '4',
            type: 'tenant_joined',
            title: 'New Tenant Invitation',
            description: 'Invitation sent to prospective tenant',
            timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24) // 1 day ago
          }
        ]);

      } catch (error) {
        console.error("Failed to fetch dashboard metrics", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  return { metrics, actionItems, recentActivity, isLoading };
};