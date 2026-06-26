export interface User {
  id: string;
  name: string;
  avatarUrl?: string;
  status: 'online' | 'away' | 'busy' | 'offline';
  role: string;
}

export interface Comment {
  id: string;
  contextId: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  text: string;
  timestamp: Date;
}

export interface Activity {
  id: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  action: string;
  target: string;
  timestamp: Date;
  type: 'update' | 'create' | 'delete' | 'comment';
}

const MOCK_USERS: User[] = [
  { id: 'u1', name: 'Sarah Agent', status: 'online', role: 'Agent', avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Sarah' },
  { id: 'u2', name: 'Mike Broker', status: 'busy', role: 'Broker', avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Mike' },
  { id: 'u3', name: 'Jessica Admin', status: 'away', role: 'Admin', avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Jessica' },
  { id: 'u4', name: 'David Legal', status: 'online', role: 'Legal', avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=David' },
];

const MOCK_ACTIVITIES: Activity[] = [
  { id: 'a1', userId: 'u1', userName: 'Sarah Agent', userAvatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Sarah', action: 'updated', target: 'Lease #L-2024-001', timestamp: new Date(Date.now() - 1000 * 60 * 5), type: 'update' },
  { id: 'a2', userId: 'u2', userName: 'Mike Broker', userAvatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Mike', action: 'approved', target: 'Application #APP-88', timestamp: new Date(Date.now() - 1000 * 60 * 30), type: 'create' },
  { id: 'a3', userId: 'u3', userName: 'Jessica Admin', userAvatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Jessica', action: 'commented on', target: 'Maintenance Request #MR-102', timestamp: new Date(Date.now() - 1000 * 60 * 60), type: 'comment' },
];

const MOCK_COMMENTS: Comment[] = [
  { id: 'c1', contextId: 'general', userId: 'u2', userName: 'Mike Broker', userAvatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Mike', text: 'Hey team, great work on the Q3 numbers!', timestamp: new Date(Date.now() - 1000 * 60 * 120) },
];

class CollaborationService {
  private users = [...MOCK_USERS];
  private activities = [...MOCK_ACTIVITIES];
  private comments = [...MOCK_COMMENTS];

  async getOnlineUsers(contextId: string): Promise<User[]> {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 500));
    return this.users;
  }

  async getActivities(limit: number = 5): Promise<Activity[]> {
    await new Promise(resolve => setTimeout(resolve, 500));
    return this.activities.slice(0, limit);
  }

  async getComments(contextId: string): Promise<Comment[]> {
    await new Promise(resolve => setTimeout(resolve, 500));
    return this.comments.filter(c => c.contextId === contextId);
  }

  async addComment(contextId: string, userId: string, text: string): Promise<Comment> {
    const user = this.users.find(u => u.id === userId) || this.users[0];
    const newComment: Comment = {
      id: `c${Date.now()}`,
      contextId,
      userId,
      userName: user.name,
      userAvatar: user.avatarUrl,
      text,
      timestamp: new Date(),
    };
    this.comments.push(newComment);
    return newComment;
  }

  // Simulate receiving a new activity (for polling/subscription simulation)
  subscribeToActivity(callback: (activity: Activity) => void) {
    const interval = setInterval(() => {
      const randomUser = this.users[Math.floor(Math.random() * this.users.length)];
      const actions = ['viewed', 'edited', 'commented on', 'shared'];
      const targets = ['Property 101', 'Lease Agreement', 'Tenant Profile', 'Market Report'];
      
      const newActivity: Activity = {
        id: `a${Date.now()}`,
        userId: randomUser.id,
        userName: randomUser.name,
        userAvatar: randomUser.avatarUrl,
        action: actions[Math.floor(Math.random() * actions.length)],
        target: targets[Math.floor(Math.random() * targets.length)],
        timestamp: new Date(),
        type: 'update'
      };
      
      this.activities.unshift(newActivity);
      if (this.activities.length > 20) this.activities.pop();
      
      callback(newActivity);
    }, 15000); // New activity every 15 seconds

    return () => clearInterval(interval);
  }
}

export const collaborationService = new CollaborationService();