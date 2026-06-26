export interface Integration {
  id: string;
  name: string;
  description: string;
  iconName: 'calendar' | 'credit-card' | 'briefcase' | 'file-signature' | 'mail';
  isConnected: boolean;
  lastSync?: Date;
  status: 'healthy' | 'error' | 'syncing' | 'disconnected';
}

const MOCK_INTEGRATIONS: Integration[] = [
  {
    id: 'int_google_calendar',
    name: 'Google Calendar',
    description: 'Sync viewings and appointments automatically.',
    iconName: 'calendar',
    isConnected: false,
    status: 'disconnected'
  },
  {
    id: 'int_stripe',
    name: 'Stripe',
    description: 'Process rent payments and security deposits secure.',
    iconName: 'credit-card',
    isConnected: true,
    lastSync: new Date(Date.now() - 1000 * 60 * 5),
    status: 'healthy'
  },
  {
    id: 'int_salesforce',
    name: 'Salesforce',
    description: 'Sync leads and contacts with your CRM.',
    iconName: 'briefcase',
    isConnected: true,
    lastSync: new Date(Date.now() - 1000 * 60 * 60 * 2),
    status: 'healthy'
  },
  {
    id: 'int_docusign',
    name: 'DocuSign',
    description: 'Send and sign lease agreements digitally.',
    iconName: 'file-signature',
    isConnected: false,
    status: 'disconnected'
  },
  {
    id: 'int_gmail',
    name: 'Gmail',
    description: 'Integrate email for seamless communication tracking.',
    iconName: 'mail',
    isConnected: false,
    status: 'disconnected'
  }
];

class IntegrationService {
  private integrations = [...MOCK_INTEGRATIONS];

  async getIntegrations(): Promise<Integration[]> {
    await new Promise(resolve => setTimeout(resolve, 400));
    return this.integrations;
  }

  async connectService(id: string): Promise<Integration | undefined> {
    await new Promise(resolve => setTimeout(resolve, 600));
    const int = this.integrations.find(i => i.id === id);
    if (int) {
      int.isConnected = true;
      int.status = 'syncing';
      int.lastSync = new Date();
      // Simulate sync completion
      setTimeout(() => {
        int.status = 'healthy';
      }, 2000);
    }
    return int;
  }

  async disconnectService(id: string): Promise<Integration | undefined> {
    await new Promise(resolve => setTimeout(resolve, 400));
    const int = this.integrations.find(i => i.id === id);
    if (int) {
      int.isConnected = false;
      int.status = 'disconnected';
      int.lastSync = undefined;
    }
    return int;
  }
}

export const integrationService = new IntegrationService();