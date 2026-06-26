import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { CommissionSplit } from '@/types/broker';
import { 
  DollarSign, 
  Plus, 
  TrendingUp, 
  Award,
  Calendar,
  FileText,
  Edit,
  Download,
  CreditCard
} from 'lucide-react';

export default function RevenuePayouts() {
  const [isCreateSplitOpen, setIsCreateSplitOpen] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState('current');

  // Mock commission splits
  const commissionSplits: CommissionSplit[] = [
    {
      id: 'split-1',
      agentId: 'agent-1',
      brokerSplit: 20,
      agentSplit: 80,
      bonusTiers: [
        { aqiThreshold: 85, bonusPercentage: 2 },
        { aqiThreshold: 90, bonusPercentage: 5 }
      ],
      effectiveFrom: new Date('2024-01-01'),
      effectiveTo: new Date('2024-12-31')
    },
    {
      id: 'split-2',
      agentId: 'agent-2',
      brokerSplit: 25,
      agentSplit: 75,
      bonusTiers: [
        { aqiThreshold: 80, bonusPercentage: 1 },
        { aqiThreshold: 85, bonusPercentage: 3 }
      ],
      effectiveFrom: new Date('2024-01-01'),
      effectiveTo: new Date('2024-12-31')
    }
  ];

  // Mock revenue data
  const revenueData = [
    {
      agentId: 'agent-1',
      agentName: 'Emily Rodriguez',
      aqiScore: 92.3,
      grossCommission: 125000,
      brokerShare: 25000,
      agentShare: 100000,
      bonusEarned: 6250,
      totalPayout: 106250,
      deals: 24,
      split: '20/80'
    },
    {
      agentId: 'agent-2',
      agentName: 'Michael Chen',
      aqiScore: 87.9,
      grossCommission: 98000,
      brokerShare: 24500,
      agentShare: 73500,
      bonusEarned: 2940,
      totalPayout: 76440,
      deals: 19,
      split: '25/75'
    },
    {
      agentId: 'agent-3',
      agentName: 'Sarah Williams',
      aqiScore: 84.1,
      grossCommission: 87000,
      brokerShare: 21750,
      agentShare: 65250,
      bonusEarned: 0,
      totalPayout: 65250,
      deals: 16,
      split: '25/75'
    }
  ];

  const getAQIBonusColor = (aqiScore: number) => {
    if (aqiScore >= 90) return 'text-green-600 bg-green-50 border-green-200';
    if (aqiScore >= 85) return 'text-blue-600 bg-blue-50 border-blue-200';
    if (aqiScore >= 80) return 'text-yellow-600 bg-yellow-50 border-yellow-200';
    return 'text-gray-600 bg-gray-50 border-gray-200';
  };

  const totalRevenue = revenueData.reduce((sum, agent) => sum + agent.grossCommission, 0);
  const totalBrokerShare = revenueData.reduce((sum, agent) => sum + agent.brokerShare, 0);
  const totalAgentPayouts = revenueData.reduce((sum, agent) => sum + agent.totalPayout, 0);
  const totalBonuses = revenueData.reduce((sum, agent) => sum + agent.bonusEarned, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Revenue & Payouts</h2>
          <p className="text-gray-600">Manage commission splits and AQI-based bonuses</p>
        </div>
        <div className="flex items-center space-x-3">
          <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="current">Current Month</SelectItem>
              <SelectItem value="last">Last Month</SelectItem>
              <SelectItem value="quarter">This Quarter</SelectItem>
              <SelectItem value="year">This Year</SelectItem>
            </SelectContent>
          </Select>
          
          <Dialog open={isCreateSplitOpen} onOpenChange={setIsCreateSplitOpen}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Plus className="h-4 w-4 mr-2" />
                New Split
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Create Commission Split Agreement</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Agent</Label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Select agent" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="agent-1">Emily Rodriguez</SelectItem>
                      <SelectItem value="agent-2">Michael Chen</SelectItem>
                      <SelectItem value="agent-3">Sarah Williams</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Broker Split (%)</Label>
                    <Input type="number" placeholder="20" />
                  </div>
                  <div className="space-y-2">
                    <Label>Agent Split (%)</Label>
                    <Input type="number" placeholder="80" />
                  </div>
                </div>

                <div className="space-y-4">
                  <Label>AQI Bonus Tiers</Label>
                  <div className="space-y-2">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label className="text-sm">AQI Threshold</Label>
                        <Input type="number" placeholder="85" />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-sm">Bonus %</Label>
                        <Input type="number" placeholder="2" />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <Input type="number" placeholder="90" />
                      <Input type="number" placeholder="5" />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Effective From</Label>
                    <Input type="date" />
                  </div>
                  <div className="space-y-2">
                    <Label>Effective To</Label>
                    <Input type="date" />
                  </div>
                </div>

                <div className="flex justify-end space-x-2">
                  <Button variant="outline" onClick={() => setIsCreateSplitOpen(false)}>
                    Cancel
                  </Button>
                  <Button className="bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-700 hover:to-orange-700">
                    Create Agreement
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>

          <Button className="bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-700 hover:to-orange-700">
            <Download className="h-4 w-4 mr-2" />
            Export Report
          </Button>
        </div>
      </div>

      {/* Revenue Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="border-l-4 border-l-green-500">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Revenue</p>
                <p className="text-2xl font-bold text-green-600">${(totalRevenue / 1000).toFixed(0)}K</p>
              </div>
              <DollarSign className="h-8 w-8 text-green-500" />
            </div>
            <p className="text-xs text-gray-500 mt-2">Gross commission</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-blue-500">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Broker Share</p>
                <p className="text-2xl font-bold text-blue-600">${(totalBrokerShare / 1000).toFixed(0)}K</p>
              </div>
              <TrendingUp className="h-8 w-8 text-blue-500" />
            </div>
            <p className="text-xs text-gray-500 mt-2">{((totalBrokerShare / totalRevenue) * 100).toFixed(1)}% of total</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-purple-500">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Agent Payouts</p>
                <p className="text-2xl font-bold text-purple-600">${(totalAgentPayouts / 1000).toFixed(0)}K</p>
              </div>
              <CreditCard className="h-8 w-8 text-purple-500" />
            </div>
            <p className="text-xs text-gray-500 mt-2">Including bonuses</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-orange-500">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">AQI Bonuses</p>
                <p className="text-2xl font-bold text-orange-600">${(totalBonuses / 1000).toFixed(0)}K</p>
              </div>
              <Award className="h-8 w-8 text-orange-500" />
            </div>
            <p className="text-xs text-gray-500 mt-2">Performance rewards</p>
          </CardContent>
        </Card>
      </div>

      {/* Agent Revenue Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle>Agent Revenue & Payouts</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {revenueData.map((agent) => (
              <div key={agent.agentId} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-4">
                  <div className="w-10 h-10 bg-gradient-to-r from-green-400 to-blue-500 rounded-full flex items-center justify-center">
                    <DollarSign className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">{agent.agentName}</p>
                    <div className="flex items-center space-x-4 text-sm text-gray-600">
                      <span>{agent.deals} deals</span>
                      <span>Split: {agent.split}</span>
                      <Badge className={`${getAQIBonusColor(agent.aqiScore)} border text-xs`}>
                        AQI: {agent.aqiScore}
                      </Badge>
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-4 gap-4 text-right">
                  <div>
                    <div className="text-sm font-medium text-gray-900">
                      ${(agent.grossCommission / 1000).toFixed(0)}K
                    </div>
                    <div className="text-xs text-gray-500">Gross</div>
                  </div>
                  <div>
                    <div className="text-sm font-medium text-blue-600">
                      ${(agent.brokerShare / 1000).toFixed(0)}K
                    </div>
                    <div className="text-xs text-gray-500">Broker</div>
                  </div>
                  <div>
                    <div className="text-sm font-medium text-orange-600">
                      ${(agent.bonusEarned / 1000).toFixed(1)}K
                    </div>
                    <div className="text-xs text-gray-500">Bonus</div>
                  </div>
                  <div>
                    <div className="text-lg font-bold text-green-600">
                      ${(agent.totalPayout / 1000).toFixed(0)}K
                    </div>
                    <div className="text-xs text-gray-500">Total Payout</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Commission Split Agreements */}
      <Card>
        <CardHeader>
          <CardTitle>Active Commission Split Agreements</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {commissionSplits.map((split) => (
              <div key={split.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-4">
                  <div className="w-10 h-10 bg-gradient-to-r from-purple-400 to-pink-400 rounded-full flex items-center justify-center">
                    <FileText className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">Agent {split.agentId}</p>
                    <div className="flex items-center space-x-4 text-sm text-gray-600">
                      <span>Split: {split.brokerSplit}/{split.agentSplit}</span>
                      <span>Bonus Tiers: {split.bonusTiers.length}</span>
                      <span>Valid: {split.effectiveFrom.toLocaleDateString()} - {split.effectiveTo?.toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="text-right">
                    <div className="text-sm font-medium text-gray-900">
                      Max Bonus: {Math.max(...split.bonusTiers.map(t => t.bonusPercentage))}%
                    </div>
                    <div className="text-xs text-gray-500">
                      At AQI {Math.max(...split.bonusTiers.map(t => t.aqiThreshold))}+
                    </div>
                  </div>
                  <Button variant="outline" size="sm">
                    <Edit className="h-4 w-4 mr-1" />
                    Edit
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}