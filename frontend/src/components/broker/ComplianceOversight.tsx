import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Shield, AlertCircle, CheckCircle, FileText } from 'lucide-react';

export default function ComplianceOversight() {
  const complianceItems = [
    {
      id: 1,
      title: 'Agent License Renewals',
      status: 'compliant',
      dueDate: '2024-12-31',
      description: 'All agent licenses are current and valid'
    },
    {
      id: 2,
      title: 'Transaction Documentation',
      status: 'warning',
      dueDate: '2024-01-15',
      description: '3 transactions missing required documentation'
    },
    {
      id: 3,
      title: 'Fair Housing Training',
      status: 'compliant',
      dueDate: '2024-06-30',
      description: 'All agents completed required training'
    },
    {
      id: 4,
      title: 'Trust Account Reconciliation',
      status: 'compliant',
      dueDate: '2024-01-31',
      description: 'Monthly reconciliation completed'
    }
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Compliance Oversight</h2>
        <div className="flex items-center space-x-2">
          <Badge className="bg-green-100 text-green-800">98% Compliant</Badge>
          <Button variant="outline">
            <FileText className="h-4 w-4 mr-2" />
            Generate Report
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Shield className="h-5 w-5 mr-2 text-green-600" />
              Compliance Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Overall Score</span>
                <span className="text-2xl font-bold text-green-600">98%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div className="bg-green-600 h-2 rounded-full" style={{ width: '98%' }}></div>
              </div>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-600">Compliant Items</span>
                  <p className="font-medium text-green-600">23</p>
                </div>
                <div>
                  <span className="text-gray-600">Needs Attention</span>
                  <p className="font-medium text-orange-600">1</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Upcoming Deadlines</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-2 bg-orange-50 rounded">
                <div>
                  <p className="font-medium text-sm">Transaction Documentation</p>
                  <p className="text-xs text-gray-600">Due Jan 15, 2024</p>
                </div>
                <AlertCircle className="h-4 w-4 text-orange-600" />
              </div>
              <div className="flex items-center justify-between p-2 bg-gray-50 rounded">
                <div>
                  <p className="font-medium text-sm">Trust Account Reconciliation</p>
                  <p className="text-xs text-gray-600">Due Jan 31, 2024</p>
                </div>
                <CheckCircle className="h-4 w-4 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Compliance Items</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {complianceItems.map((item) => (
              <div key={item.id} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center space-x-3">
                  {item.status === 'compliant' ? (
                    <CheckCircle className="h-5 w-5 text-green-600" />
                  ) : (
                    <AlertCircle className="h-5 w-5 text-orange-600" />
                  )}
                  <div>
                    <h4 className="font-medium">{item.title}</h4>
                    <p className="text-sm text-gray-600">{item.description}</p>
                    <p className="text-xs text-gray-500">Due: {item.dueDate}</p>
                  </div>
                </div>
                <Badge 
                  className={
                    item.status === 'compliant' 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-orange-100 text-orange-800'
                  }
                >
                  {item.status}
                </Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}