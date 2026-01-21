import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { 
  AlertTriangle, 
  CheckCircle, 
  TrendingDown, 
  TrendingUp,
  AlertCircle,
  FileText,
  Clock,
  DollarSign,
  MessageSquare,
  Activity,
  ChevronDown,
  ChevronUp,
  Info
} from 'lucide-react';
import { Transaction, DealHealthScore, ScoringConfiguration, DEFAULT_SCORING_CONFIG } from '@/types/dealHealth';
import { DealHealthCalculator } from '@/lib/dealHealthCalculator';
import ScoringConfigModal from './ScoringConfigModal';
import { generateMockAnalytics } from '@/lib/mockAnalyticsData';

export default function DealHealthDashboard() {
  const [expandedDeal, setExpandedDeal] = useState<string | null>(null);
  const [filterRisk, setFilterRisk] = useState<'all' | 'low' | 'medium' | 'high' | 'critical'>('all');
  const [scoringConfig, setScoringConfig] = useState<ScoringConfiguration>(DEFAULT_SCORING_CONFIG);

  // Generate mock analytics data
  const analytics = generateMockAnalytics();

  // Mock transaction data with health scoring inputs
  const transactions: Transaction[] = [
    {
      id: '1',
      property: '123 Oak Street, Norfolk',
      agent: 'Emily Rodriguez',
      buyer: 'John & Sarah Smith',
      price: 850000,
      status: 'closing',
      stage: 'Final walkthrough',
      closingDate: '2024-01-15',
      progress: 90,
      daysUntilClosing: 5,
      lastActivityDate: '2024-01-09',
      missingDocuments: ['Final inspection report'],
      communicationFrequency: 5,
      financingStatus: 'approved',
      inspectionStatus: 'completed',
      contingenciesRemaining: 0,
      propertyType: 'residential'
    },
    {
      id: '2',
      property: '456 Pine Avenue, Virginia Beach',
      agent: 'Michael Smith',
      buyer: 'Robert Johnson',
      price: 720000,
      status: 'escrow',
      stage: 'Inspection period',
      closingDate: '2024-01-22',
      progress: 65,
      daysUntilClosing: 12,
      lastActivityDate: '2024-01-08',
      missingDocuments: ['Appraisal report', 'Title insurance', 'HOA documents'],
      communicationFrequency: 3,
      financingStatus: 'conditional',
      inspectionStatus: 'scheduled',
      contingenciesRemaining: 2,
      propertyType: 'residential'
    },
    {
      id: '3',
      property: '789 Maple Drive, Chesapeake',
      agent: 'Lisa Johnson',
      buyer: 'David & Maria Garcia',
      price: 650000,
      status: 'pending',
      stage: 'Loan approval',
      closingDate: '2024-02-01',
      progress: 45,
      daysUntilClosing: 22,
      lastActivityDate: '2024-01-03',
      missingDocuments: ['Purchase agreement', 'Earnest money receipt', 'Loan application', 'Pre-approval letter'],
      communicationFrequency: 1,
      financingStatus: 'pending',
      inspectionStatus: 'pending',
      contingenciesRemaining: 4,
      propertyType: 'residential'
    },
    {
      id: '4',
      property: '321 Elm Street, Portsmouth',
      agent: 'Emily Rodriguez',
      buyer: 'Jennifer Wilson',
      price: 485000,
      status: 'contingent',
      stage: 'Appraisal ordered',
      closingDate: '2024-02-10',
      progress: 30,
      daysUntilClosing: 31,
      lastActivityDate: '2024-01-07',
      missingDocuments: ['Seller disclosure', 'Property survey'],
      communicationFrequency: 4,
      financingStatus: 'conditional',
      inspectionStatus: 'pending',
      contingenciesRemaining: 3,
      propertyType: 'residential'
    },
    {
      id: '5',
      property: '555 Beach Road, Norfolk',
      agent: 'Michael Smith',
      buyer: 'Thomas Anderson',
      price: 920000,
      status: 'escrow',
      stage: 'Repair negotiations',
      closingDate: '2024-01-28',
      progress: 55,
      daysUntilClosing: 18,
      lastActivityDate: '2023-12-30',
      missingDocuments: ['Repair addendum', 'Updated inspection', 'Contractor estimates', 'Lender approval'],
      communicationFrequency: 0.5,
      financingStatus: 'pending',
      inspectionStatus: 'issues_found',
      contingenciesRemaining: 5,
      propertyType: 'luxury'
    }
  ];

  // Calculate health scores using current configuration
  const calculator = new DealHealthCalculator(scoringConfig);
  const healthScores = transactions.map(t => calculator.calculateHealthScore(t));
  const metrics = DealHealthCalculator.calculateAggregateMetrics(healthScores);

  // Filter transactions by risk level
  const filteredScores = filterRisk === 'all' 
    ? healthScores 
    : healthScores.filter(s => s.riskLevel === filterRisk);

  const handleConfigChange = (newConfig: ScoringConfiguration) => {
    setScoringConfig(newConfig);
  };

  const getRiskColor = (riskLevel: string) => {
    switch (riskLevel) {
      case 'low': return 'bg-green-100 text-green-800 border-green-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'high': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'critical': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getRiskIcon = (riskLevel: string) => {
    switch (riskLevel) {
      case 'low': return <CheckCircle className="h-5 w-5 text-green-600" />;
      case 'medium': return <AlertCircle className="h-5 w-5 text-yellow-600" />;
      case 'high': return <AlertTriangle className="h-5 w-5 text-orange-600" />;
      case 'critical': return <AlertTriangle className="h-5 w-5 text-red-600" />;
      default: return <Activity className="h-5 w-5 text-gray-600" />;
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= scoringConfig.riskThresholds.low) return 'text-green-600';
    if (score >= scoringConfig.riskThresholds.medium) return 'text-yellow-600';
    if (score >= scoringConfig.riskThresholds.high) return 'text-orange-600';
    return 'text-red-600';
  };

  const getAlertIcon = (category: string) => {
    switch (category) {
      case 'documents': return <FileText className="h-4 w-4" />;
      case 'timeline': return <Clock className="h-4 w-4" />;
      case 'communication': return <MessageSquare className="h-4 w-4" />;
      case 'financing': return <DollarSign className="h-4 w-4" />;
      case 'inspection': return <Activity className="h-4 w-4" />;
      default: return <AlertCircle className="h-4 w-4" />;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Deal Health Monitoring</h2>
          <p className="text-sm text-gray-600 mt-1">AI-powered predictive insights for transaction risk management</p>
        </div>
        <div className="flex gap-2">
          <ScoringConfigModal 
            currentConfig={scoringConfig}
            onConfigChange={handleConfigChange}
            analytics={analytics}
          />
          <Button variant="outline">
            <FileText className="h-4 w-4 mr-2" />
            Export Report
          </Button>
        </div>
      </div>

      {/* Current Configuration Info */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <Info className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-medium text-blue-900">
                Current Scoring Configuration: {scoringConfig.name}
              </p>
              <p className="text-xs text-blue-700 mt-1">{scoringConfig.description}</p>
              <div className="grid grid-cols-5 gap-3 mt-2 text-xs">
                <div>
                  <span className="text-blue-700">Documents:</span>
                  <span className="font-medium text-blue-900 ml-1">
                    {Math.round(scoringConfig.weights.documentCompletion * 100)}%
                  </span>
                </div>
                <div>
                  <span className="text-blue-700">Activity:</span>
                  <span className="font-medium text-blue-900 ml-1">
                    {Math.round(scoringConfig.weights.activityLevel * 100)}%
                  </span>
                </div>
                <div>
                  <span className="text-blue-700">Timeline:</span>
                  <span className="font-medium text-blue-900 ml-1">
                    {Math.round(scoringConfig.weights.timelineAdherence * 100)}%
                  </span>
                </div>
                <div>
                  <span className="text-blue-700">Financing:</span>
                  <span className="font-medium text-blue-900 ml-1">
                    {Math.round(scoringConfig.weights.financingStrength * 100)}%
                  </span>
                </div>
                <div>
                  <span className="text-blue-700">Communication:</span>
                  <span className="font-medium text-blue-900 ml-1">
                    {Math.round(scoringConfig.weights.communicationQuality * 100)}%
                  </span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Aggregate Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Deals</p>
                <p className="text-2xl font-bold text-gray-900">{metrics.totalDeals}</p>
              </div>
              <Activity className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Healthy</p>
                <p className="text-2xl font-bold text-green-600">{metrics.healthyDeals}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">At Risk</p>
                <p className="text-2xl font-bold text-yellow-600">{metrics.atRiskDeals}</p>
              </div>
              <AlertCircle className="h-8 w-8 text-yellow-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Critical</p>
                <p className="text-2xl font-bold text-red-600">{metrics.criticalDeals}</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-red-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Predicted Close Rate</p>
                <p className="text-2xl font-bold text-purple-600">{metrics.predictedClosureRate}%</p>
              </div>
              <TrendingUp className="h-8 w-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filter Buttons */}
      <div className="flex gap-2">
        <Button 
          variant={filterRisk === 'all' ? 'default' : 'outline'} 
          size="sm"
          onClick={() => setFilterRisk('all')}
        >
          All Deals
        </Button>
        <Button 
          variant={filterRisk === 'critical' ? 'default' : 'outline'} 
          size="sm"
          onClick={() => setFilterRisk('critical')}
          className="text-red-600 border-red-200 hover:bg-red-50"
        >
          Critical
        </Button>
        <Button 
          variant={filterRisk === 'high' ? 'default' : 'outline'} 
          size="sm"
          onClick={() => setFilterRisk('high')}
          className="text-orange-600 border-orange-200 hover:bg-orange-50"
        >
          High Risk
        </Button>
        <Button 
          variant={filterRisk === 'medium' ? 'default' : 'outline'} 
          size="sm"
          onClick={() => setFilterRisk('medium')}
          className="text-yellow-600 border-yellow-200 hover:bg-yellow-50"
        >
          Medium Risk
        </Button>
        <Button 
          variant={filterRisk === 'low' ? 'default' : 'outline'} 
          size="sm"
          onClick={() => setFilterRisk('low')}
          className="text-green-600 border-green-200 hover:bg-green-50"
        >
          Healthy
        </Button>
      </div>

      {/* Deal Health Cards */}
      <div className="space-y-4">
        {filteredScores.map((healthScore) => {
          const transaction = transactions.find(t => t.id === healthScore.transactionId)!;
          const isExpanded = expandedDeal === healthScore.transactionId;

          return (
            <Card key={healthScore.transactionId} className="border-2">
              <CardContent className="p-6">
                {/* Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-start space-x-4 flex-1">
                    <div className="mt-1">
                      {getRiskIcon(healthScore.riskLevel)}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-semibold">{transaction.property}</h3>
                        <Badge className={getRiskColor(healthScore.riskLevel)}>
                          {healthScore.riskLevel.toUpperCase()} RISK
                        </Badge>
                        {transaction.propertyType && (
                          <Badge variant="outline" className="capitalize">
                            {transaction.propertyType.replace('-', ' ')}
                          </Badge>
                        )}
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-gray-600">
                        <div>
                          <span className="font-medium">Agent:</span> {transaction.agent}
                        </div>
                        <div>
                          <span className="font-medium">Buyer:</span> {transaction.buyer}
                        </div>
                        <div>
                          <span className="font-medium">Closing:</span> {transaction.closingDate}
                        </div>
                        <div>
                          <span className="font-medium">Days Left:</span> {transaction.daysUntilClosing}
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="text-right ml-4">
                    <p className="text-sm text-gray-600">Health Score</p>
                    <p className={`text-3xl font-bold ${getScoreColor(healthScore.overallScore)}`}>
                      {healthScore.overallScore}
                    </p>
                    <p className="text-xs text-gray-500">out of 100</p>
                  </div>
                </div>

                {/* Health Factors */}
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-4">
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-gray-600">Documents</span>
                      <span className="font-medium">{healthScore.factors.documentCompletion}</span>
                    </div>
                    <Progress value={healthScore.factors.documentCompletion} className="h-2" />
                  </div>
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-gray-600">Activity</span>
                      <span className="font-medium">{healthScore.factors.activityLevel}</span>
                    </div>
                    <Progress value={healthScore.factors.activityLevel} className="h-2" />
                  </div>
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-gray-600">Timeline</span>
                      <span className="font-medium">{healthScore.factors.timelineAdherence}</span>
                    </div>
                    <Progress value={healthScore.factors.timelineAdherence} className="h-2" />
                  </div>
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-gray-600">Financing</span>
                      <span className="font-medium">{healthScore.factors.financingStrength}</span>
                    </div>
                    <Progress value={healthScore.factors.financingStrength} className="h-2" />
                  </div>
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-gray-600">Communication</span>
                      <span className="font-medium">{healthScore.factors.communicationQuality}</span>
                    </div>
                    <Progress value={healthScore.factors.communicationQuality} className="h-2" />
                  </div>
                </div>

                {/* Alerts Summary */}
                {healthScore.alerts.length > 0 && (
                  <div className="flex items-center gap-2 mb-4 p-3 bg-orange-50 border border-orange-200 rounded-lg">
                    <AlertTriangle className="h-5 w-5 text-orange-600 flex-shrink-0" />
                    <p className="text-sm font-medium text-orange-900">
                      {healthScore.alerts.filter(a => a.severity === 'critical').length} critical alert(s), {' '}
                      {healthScore.alerts.filter(a => a.severity === 'warning').length} warning(s)
                    </p>
                  </div>
                )}

                {/* Expand/Collapse Button */}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setExpandedDeal(isExpanded ? null : healthScore.transactionId)}
                  className="w-full"
                >
                  {isExpanded ? (
                    <>
                      <ChevronUp className="h-4 w-4 mr-2" />
                      Hide Details
                    </>
                  ) : (
                    <>
                      <ChevronDown className="h-4 w-4 mr-2" />
                      Show Alerts & Recommendations
                    </>
                  )}
                </Button>

                {/* Expanded Details */}
                {isExpanded && (
                  <div className="mt-4 pt-4 border-t space-y-4">
                    {/* Alerts */}
                    {healthScore.alerts.length > 0 && (
                      <div>
                        <h4 className="font-semibold mb-3 flex items-center">
                          <AlertTriangle className="h-4 w-4 mr-2" />
                          Active Alerts
                        </h4>
                        <div className="space-y-2">
                          {healthScore.alerts.map((alert) => (
                            <div
                              key={alert.id}
                              className={`p-3 rounded-lg border ${
                                alert.severity === 'critical'
                                  ? 'bg-red-50 border-red-200'
                                  : alert.severity === 'warning'
                                  ? 'bg-yellow-50 border-yellow-200'
                                  : 'bg-blue-50 border-blue-200'
                              }`}
                            >
                              <div className="flex items-start gap-3">
                                <div className="mt-0.5">
                                  {getAlertIcon(alert.category)}
                                </div>
                                <div className="flex-1">
                                  <div className="flex items-center gap-2 mb-1">
                                    <p className="font-medium text-sm">{alert.message}</p>
                                    {alert.dueDate && (
                                      <Badge variant="outline" className="text-xs">
                                        {alert.dueDate}
                                      </Badge>
                                    )}
                                  </div>
                                  <p className="text-sm text-gray-700">
                                    <span className="font-medium">Action:</span> {alert.actionRequired}
                                  </p>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Recommendations */}
                    <div>
                      <h4 className="font-semibold mb-3 flex items-center">
                        <TrendingUp className="h-4 w-4 mr-2" />
                        Recommendations
                      </h4>
                      <ul className="space-y-2">
                        {healthScore.recommendations.map((rec, idx) => (
                          <li key={idx} className="flex items-start gap-2 text-sm">
                            <span className="text-blue-600 mt-1">•</span>
                            <span>{rec}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Quick Actions */}
                    <div className="flex gap-2 pt-2">
                      <Button size="sm" variant="default">
                        Contact Agent
                      </Button>
                      <Button size="sm" variant="outline">
                        View Documents
                      </Button>
                      <Button size="sm" variant="outline">
                        Update Status
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {filteredScores.length === 0 && (
        <Card>
          <CardContent className="p-12 text-center">
            <CheckCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">No deals match the selected filter</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}