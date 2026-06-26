export interface Workflow {
  id: string;
  name: string;
  description: string;
  isActive: boolean;
  lastRun: Date;
  runCount: number;
  type: 'email' | 'slack' | 'sms' | 'task';
}

export interface AutomationLogEntry {
  id: string;
  workflowName: string;
  action: string;
  status: 'success' | 'failed' | 'pending';
  timestamp: Date;
}

const MOCK_WORKFLOWS: Workflow[] = [
  { 
    id: 'wf1', 
    name: 'Auto-Send Rent Reminder', 
    description: 'Sends email 3 days before due date', 
    isActive: true, 
    lastRun: new Date(Date.now() - 1000 * 60 * 60 * 24), 
    runCount: 124,
    type: 'email'
  },
  { 
    id: 'wf2', 
    name: 'Forward Leads to Slack', 
    description: 'Posts new lead details to #sales channel', 
    isActive: true, 
    lastRun: new Date(Date.now() - 1000 * 60 * 30), 
    runCount: 45,
    type: 'slack'
  },
  { 
    id: 'wf3', 
    name: 'Vacation Responder', 
    description: 'Auto-reply to emails when OOO', 
    isActive: false, 
    lastRun: new Date(Date.now() - 1000 * 60 * 60 * 24 * 5), 
    runCount: 12,
    type: 'email'
  },
  { 
    id: 'wf4', 
    name: 'New Tenant Onboarding', 
    description: 'Create task list when lease is signed', 
    isActive: true, 
    lastRun: new Date(Date.now() - 1000 * 60 * 60 * 2), 
    runCount: 8,
    type: 'task'
  },
];

const MOCK_LOGS: AutomationLogEntry[] = [
  { id: 'l1', workflowName: 'Forward Leads to Slack', action: 'Posted lead "John Doe" to #sales', status: 'success', timestamp: new Date(Date.now() - 1000 * 60 * 5) },
  { id: 'l2', workflowName: 'Auto-Send Rent Reminder', action: 'Sent email to Unit 402', status: 'success', timestamp: new Date(Date.now() - 1000 * 60 * 60) },
  { id: 'l3', workflowName: 'New Tenant Onboarding', action: 'Created tasks for Lease #L-99', status: 'pending', timestamp: new Date(Date.now() - 1000 * 60 * 120) },
  { id: 'l4', workflowName: 'Auto-Send Rent Reminder', action: 'Failed to send to Unit 101 (Invalid Email)', status: 'failed', timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2) },
];

class WorkflowService {
  private workflows = [...MOCK_WORKFLOWS];
  private logs = [...MOCK_LOGS];

  async getWorkflows(): Promise<Workflow[]> {
    await new Promise(resolve => setTimeout(resolve, 300));
    return this.workflows;
  }

  async toggleWorkflow(id: string): Promise<Workflow | undefined> {
    await new Promise(resolve => setTimeout(resolve, 300));
    const wf = this.workflows.find(w => w.id === id);
    if (wf) {
      wf.isActive = !wf.isActive;
    }
    return wf;
  }

  async getHistory(): Promise<AutomationLogEntry[]> {
    await new Promise(resolve => setTimeout(resolve, 300));
    return this.logs;
  }
}

export const workflowService = new WorkflowService();