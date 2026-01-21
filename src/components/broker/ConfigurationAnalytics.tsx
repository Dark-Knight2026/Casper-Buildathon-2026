import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  TrendingUp, 
  Award, 
  Target,
  BarChart3,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Lightbulb
} from 'lucide-react';
import { ConfigurationPerformance, ConfigurationAnalytics as AnalyticsType } from '@/types/dealHealth';

interface ConfigurationAnalyticsProps {
  analytics: AnalyticsType;
}

export default function ConfigurationAnalytics({ analytics }: ConfigurationAnalyticsProps) {
  const getPerformanceColor = (rate: number) => {
    if (rate >= 90) return 'text-green-600';
    if (rate >= 75) return 'text-blue-600';
    if (rate >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getPerformanceBadge = (rate: number) => {
    if (rate >= 90) return <Badge className="bg-green-100 text-green-800">Excellent</Badge>;
    if (rate >= 75) return <Badge className="bg-blue-100 text-blue-800">Good</Badge>;
    if (rate >= 60) return <Badge className="bg-yellow-100 text-yellow-800">Fair</Badge>;
    return <Badge className="bg-red-100 text-red-800">Needs Improvement</Badge>;
  };

  const sortedConfigs = [...analytics.configurations].sort(
    (a, b) => b.accuracyRate - a.accuracyRate
  );

  const bestConfig = sortedConfigs[0];

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-xl font-bold text-gray-900 mb-2">Configuration Performance Analytics</h3>
        <p className="text-sm text-gray-600">
          Track which scoring configurations perform best for your deals and property types
        </p>
      </div>

      {/* Best Overall Configuration */}
      {bestConfig && (
        <Card className="border-2 border-green-200 bg-green-50">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Award className="h-5 w-5 text-green-600" />
                <CardTitle className="text-lg">Best Overall Configuration</CardTitle>
              </div>
              {getPerformanceBadge(bestConfig.accuracyRate)}
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <h4 className="font-semibold text-green-900 text-lg mb-1">{bestConfig.configurationName}</h4>
                <p className="text-sm text-green-700">
                  Used in {bestConfig.totalDealsUsed} deals with {bestConfig.accuracyRate}% prediction accuracy
                </p>
              </div>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="p-3 bg-white rounded-lg">
                  <p className="text-xs text-gray-600 mb-1">Success Rate</p>
                  <p className="text-2xl font-bold text-green-600">
                    {Math.round((bestConfig.successfulClosings / bestConfig.totalDealsUsed) * 100)}%
                  </p>
                </div>
                <div className="p-3 bg-white rounded-lg">
                  <p className="text-xs text-gray-600 mb-1">Avg Health Score</p>
                  <p className="text-2xl font-bold text-blue-600">{bestConfig.averageHealthScore}</p>
                </div>
                <div className="p-3 bg-white rounded-lg">
                  <p className="text-xs text-gray-600 mb-1">Avg Days to Close</p>
                  <p className="text-2xl font-bold text-purple-600">{bestConfig.averageDaysToClose}</p>
                </div>
                <div className="p-3 bg-white rounded-lg">
                  <p className="text-xs text-gray-600 mb-1">False Positives</p>
                  <p className="text-2xl font-bold text-orange-600">{bestConfig.falsePositives}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Best by Property Type */}
      {analytics.bestByPropertyType.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Target className="h-5 w-5 mr-2" />
              Best Configuration by Property Type
            </CardTitle>
            <CardDescription>
              Recommended configurations for each property category
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {analytics.bestByPropertyType.map((item) => (
                <div key={item.propertyType} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex-1">
                    <p className="font-medium capitalize">{item.propertyType.replace('-', ' ')}</p>
                    <p className="text-sm text-gray-600">{item.configurationName}</p>
                  </div>
                  <div className="text-right">
                    <p className={`text-xl font-bold ${getPerformanceColor(item.successRate)}`}>
                      {item.successRate}%
                    </p>
                    <p className="text-xs text-gray-500">success rate</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* All Configurations Performance */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <BarChart3 className="h-5 w-5 mr-2" />
            All Configurations Performance
          </CardTitle>
          <CardDescription>
            Detailed performance metrics for each configuration
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {sortedConfigs.map((config, index) => (
              <div key={config.configurationId} className="border rounded-lg p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-lg font-semibold">#{index + 1}</span>
                      <h4 className="font-semibold">{config.configurationName}</h4>
                      {index === 0 && <Award className="h-4 w-4 text-yellow-500" />}
                    </div>
                    <p className="text-sm text-gray-600">
                      {config.totalDealsUsed} deals • Last used {new Date(config.lastUsed).toLocaleDateString()}
                    </p>
                  </div>
                  {getPerformanceBadge(config.accuracyRate)}
                </div>

                <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-3">
                  <div>
                    <p className="text-xs text-gray-600 mb-1">Accuracy</p>
                    <p className={`text-lg font-bold ${getPerformanceColor(config.accuracyRate)}`}>
                      {config.accuracyRate}%
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-600 mb-1">Successful</p>
                    <div className="flex items-center gap-1">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      <p className="text-lg font-bold">{config.successfulClosings}</p>
                    </div>
                  </div>
                  <div>
                    <p className="text-xs text-gray-600 mb-1">Failed</p>
                    <div className="flex items-center gap-1">
                      <XCircle className="h-4 w-4 text-red-500" />
                      <p className="text-lg font-bold">{config.failedDeals}</p>
                    </div>
                  </div>
                  <div>
                    <p className="text-xs text-gray-600 mb-1">False Positives</p>
                    <div className="flex items-center gap-1">
                      <AlertTriangle className="h-4 w-4 text-orange-500" />
                      <p className="text-lg font-bold">{config.falsePositives}</p>
                    </div>
                  </div>
                  <div>
                    <p className="text-xs text-gray-600 mb-1">False Negatives</p>
                    <div className="flex items-center gap-1">
                      <AlertTriangle className="h-4 w-4 text-red-500" />
                      <p className="text-lg font-bold">{config.falseNegatives}</p>
                    </div>
                  </div>
                </div>

                <div className="mb-3">
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-gray-600">Prediction Accuracy</span>
                    <span className="font-medium">{config.accuracyRate}%</span>
                  </div>
                  <Progress value={config.accuracyRate} className="h-2" />
                </div>

                {config.propertyTypeBreakdown.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-gray-700 mb-2">Performance by Property Type:</p>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                      {config.propertyTypeBreakdown.map((pt) => (
                        <div key={pt.propertyType} className="text-xs p-2 bg-gray-50 rounded">
                          <p className="font-medium capitalize">{pt.propertyType.replace('-', ' ')}</p>
                          <p className="text-gray-600">
                            {pt.count} deals • {pt.successRate}% success
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Recommendations */}
      {analytics.recommendations.length > 0 && (
        <Card className="bg-blue-50 border-blue-200">
          <CardHeader>
            <CardTitle className="flex items-center text-blue-900">
              <Lightbulb className="h-5 w-5 mr-2" />
              AI Recommendations
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {analytics.recommendations.map((rec, idx) => (
                <li key={idx} className="flex items-start gap-2 text-sm text-blue-900">
                  <span className="text-blue-600 mt-1">•</span>
                  <span>{rec}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}