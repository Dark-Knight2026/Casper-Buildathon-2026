import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ComplianceIssue, AntiGamingAudit } from '@/types/broker';
import { 
  Shield, 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  Search,
  FileText,
  Calendar,
  Eye,
  Flag,
  AlertCircle
} from 'lucide-react';

export default function ComplianceConsole() {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterSeverity, setFilterSeverity] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');

  // Mock compliance issues
  const complianceIssues: ComplianceIssue[] = [
    {
      id: 'comp-1',
      agentId: 'agent-2',
      type: 'license_expiry',
      severity: 'high',
      description: 'License expires in 45 days - renewal required',
      dueDate: new Date('2024-11-15'),
      status: 'open',
      createdAt: new Date('2024-09-01')
    },
    {
      id: 'comp-2',
      agentId: 'agent-4',
      type: 'escrow_reconciliation',
      severity: 'critical',
      description: 'Escrow account reconciliation overdue by 15 days',
      dueDate: new Date('2024-09-15'),
      status: 'in_progress',
      createdAt: new Date('2024-08-30')
    },
    {
      id: 'comp-3',
      agentId: 'agent-1',
      type: 'insurance_expiry',
      severity: 'medium',
      description: 'E&O Insurance renewal due in 60 days',
      dueDate: new Date('2024-12-01'),
      status: 'open',
      createdAt: new Date('2024-09-02')
    }
  ];

  // Mock anti-gaming audit logs
  const antiGamingAudits: AntiGamingAudit[] = [
    {
      id: 'audit-1',
      dealId: 'deal-123',
      agentId: 'agent-3',
      rule: 'duplicate_listing_detection',
      severity: 'medium',
      penalty: 5,
      notes: 'Property listed twice with minor address variations',
      createdAt: new Date('2024-09-01')
    },
    {
      id: 'audit-2',
      dealId: 'deal-124',
      agentId: 'agent-5',
      rule: 'price_change_penalty',
      severity: 'low',
      penalty: 2,
      notes: 'Excessive price reductions detected (6 changes in 30 days)',
      createdAt: new Date('2024-08-28')
    },
    {
      id: 'audit-3',
      dealId: 'deal-125',
      agentId: 'agent-2',
      rule: 'review_hygiene',
      severity: 'high',
      penalty: 10,
      notes: 'Multiple reviews from same IP address detected',
      createdAt: new Date('2024-08-25')
    }
  ];

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-red-100 text-red-800 border-red-200';
      case 'high': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low': return 'bg-blue-100 text-blue-800 border-blue-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open': return 'bg-red-100 text-red-800 border-red-200';
      case 'in_progress': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'resolved': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'license_expiry': return Calendar;
      case 'insurance_expiry': return Shield;
      case 'escrow_reconciliation': return FileText;
      case 'audit_finding': return Flag;
      default: return AlertTriangle;
    }
  };

  const filteredIssues = complianceIssues.filter(issue => {
    const matchesSearch = issue.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesSeverity = filterSeverity === 'all' || issue.severity === filterSeverity;
    const matchesStatus = filterStatus === 'all' || issue.status === filterStatus;
    return matchesSearch && matchesSeverity && matchesStatus;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Compliance Console</h2>
          <p className="text-gray-600">Monitor compliance issues and anti-gaming controls</p>
        </div>
        <Button className="bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-700 hover:to-orange-700">
          <FileText className="h-4 w-4 mr-2" />
          Generate Report
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="border-l-4 border-l-red-500">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Critical Issues</p>
                <p className="text-2xl font-bold text-red-600">1</p>
              </div>
              <AlertCircle className="h-8 w-8 text-red-500" />
            </div>
            <p className="text-xs text-gray-500 mt-2">Immediate attention</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-orange-500">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">High Priority</p>
                <p className="text-2xl font-bold text-orange-600">1</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-orange-500" />
            </div>
            <p className="text-xs text-gray-500 mt-2">Action required</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-yellow-500">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">In Progress</p>
                <p className="text-2xl font-bold text-yellow-600">1</p>
              </div>
              <Clock className="h-8 w-8 text-yellow-500" />
            </div>
            <p className="text-xs text-gray-500 mt-2">Being addressed</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-green-500">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Resolved</p>
                <p className="text-2xl font-bold text-green-600">12</p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-500" />
            </div>
            <p className="text-xs text-gray-500 mt-2">This month</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex items-center space-x-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            placeholder="Search compliance issues..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={filterSeverity} onValueChange={setFilterSeverity}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Severity</SelectItem>
            <SelectItem value="critical">Critical</SelectItem>
            <SelectItem value="high">High</SelectItem>
            <SelectItem value="medium">Medium</SelectItem>
            <SelectItem value="low">Low</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="open">Open</SelectItem>
            <SelectItem value="in_progress">In Progress</SelectItem>
            <SelectItem value="resolved">Resolved</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Compliance Issues */}
      <Card>
        <CardHeader>
          <CardTitle>Active Compliance Issues</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {filteredIssues.map((issue) => {
              const TypeIcon = getTypeIcon(issue.type);
              const daysUntilDue = Math.ceil((issue.dueDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
              
              return (
                <div key={issue.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                  <div className="flex items-center space-x-4">
                    <div className="w-10 h-10 bg-gradient-to-r from-red-400 to-orange-400 rounded-full flex items-center justify-center">
                      <TypeIcon className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900">{issue.description}</p>
                      <div className="flex items-center space-x-4 text-sm text-gray-600 mt-1">
                        <span>Agent ID: {issue.agentId}</span>
                        <span>Due: {issue.dueDate.toLocaleDateString()}</span>
                        <span className={daysUntilDue < 0 ? 'text-red-600 font-medium' : daysUntilDue < 30 ? 'text-orange-600 font-medium' : ''}>
                          {daysUntilDue < 0 ? `${Math.abs(daysUntilDue)} days overdue` : `${daysUntilDue} days remaining`}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <Badge className={`${getSeverityColor(issue.severity)} border`}>
                      {issue.severity}
                    </Badge>
                    <Badge className={`${getStatusColor(issue.status)} border`}>
                      {issue.status}
                    </Badge>
                    <Button variant="outline" size="sm">
                      <Eye className="h-4 w-4 mr-1" />
                      View
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Anti-Gaming Audit Log */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Anti-Gaming Audit Log</span>
            <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">
              <Shield className="h-4 w-4 mr-1" />
              Controls Active
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {antiGamingAudits.map((audit) => (
              <div key={audit.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-4">
                  <div className="w-10 h-10 bg-gradient-to-r from-yellow-400 to-orange-400 rounded-full flex items-center justify-center">
                    <Flag className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">{audit.rule.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</p>
                    <p className="text-sm text-gray-600 mt-1">{audit.notes}</p>
                    <div className="flex items-center space-x-4 text-xs text-gray-500 mt-2">
                      <span>Deal: {audit.dealId}</span>
                      <span>Agent: {audit.agentId}</span>
                      <span>{audit.createdAt.toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <Badge className={`${getSeverityColor(audit.severity)} border`}>
                    {audit.severity}
                  </Badge>
                  <div className="text-right">
                    <div className="text-sm font-medium text-red-600">
                      -{audit.penalty} pts
                    </div>
                    <div className="text-xs text-gray-500">Penalty</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
          
          <div className="mt-6 p-4 bg-blue-50 rounded-lg">
            <h4 className="font-medium text-blue-900 mb-2">Active Anti-Gaming Controls:</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-blue-700">
              <div className="flex items-center">
                <CheckCircle className="h-4 w-4 mr-2" />
                Verified closings (triple proof)
              </div>
              <div className="flex items-center">
                <CheckCircle className="h-4 w-4 mr-2" />
                Review hygiene monitoring
              </div>
              <div className="flex items-center">
                <CheckCircle className="h-4 w-4 mr-2" />
                Lead attribution validation
              </div>
              <div className="flex items-center">
                <CheckCircle className="h-4 w-4 mr-2" />
                Price change penalties
              </div>
              <div className="flex items-center">
                <CheckCircle className="h-4 w-4 mr-2" />
                Duplicate listing detection
              </div>
              <div className="flex items-center">
                <CheckCircle className="h-4 w-4 mr-2" />
                Segment specialization enforcement
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}