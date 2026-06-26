import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Settings, Check, RotateCcw, BarChart3, Building2, Settings2 } from 'lucide-react';
import { ScoringConfiguration, PRESET_CONFIGURATIONS, DEFAULT_SCORING_CONFIG, ConfigurationAnalytics, DEFAULT_ADVANCED_THRESHOLD_CONFIG } from '@/types/dealHealth';
import ConfigurationAnalyticsComponent from './ConfigurationAnalytics';
import AdvancedThresholdControls from './AdvancedThresholdControls';

interface ScoringConfigModalProps {
  currentConfig: ScoringConfiguration;
  onConfigChange: (config: ScoringConfiguration) => void;
  analytics?: ConfigurationAnalytics;
}

export default function ScoringConfigModal({ currentConfig, onConfigChange, analytics }: ScoringConfigModalProps) {
  const [open, setOpen] = useState(false);
  const [editedConfig, setEditedConfig] = useState<ScoringConfiguration>(currentConfig);
  const [activeTab, setActiveTab] = useState('presets');

  // Separate presets into general and property-specific
  const generalPresets = PRESET_CONFIGURATIONS.filter(p => !p.propertyTypes || p.propertyTypes.length === 0);
  const propertyPresets = PRESET_CONFIGURATIONS.filter(p => p.propertyTypes && p.propertyTypes.length > 0);

  const handleWeightChange = (key: keyof ScoringConfiguration['weights'], value: string) => {
    const numValue = parseFloat(value) || 0;
    setEditedConfig({
      ...editedConfig,
      weights: {
        ...editedConfig.weights,
        [key]: numValue / 100 // Convert percentage to decimal
      }
    });
  };

  const handleRiskThresholdChange = (key: keyof ScoringConfiguration['riskThresholds'], value: string) => {
    const numValue = parseInt(value) || 0;
    setEditedConfig({
      ...editedConfig,
      riskThresholds: {
        ...editedConfig.riskThresholds,
        [key]: numValue
      }
    });
  };

  const handleAlertThresholdChange = (key: keyof ScoringConfiguration['alertThresholds'], value: string) => {
    const numValue = parseInt(value) || 0;
    setEditedConfig({
      ...editedConfig,
      alertThresholds: {
        ...editedConfig.alertThresholds,
        [key]: numValue
      }
    });
  };

  const getTotalWeight = () => {
    const weights = editedConfig.weights;
    return Math.round((weights.documentCompletion + weights.activityLevel + weights.timelineAdherence + 
            weights.financingStrength + weights.communicationQuality) * 100);
  };

  const isValidWeights = () => {
    return getTotalWeight() === 100;
  };

  const handleApply = () => {
    if (!isValidWeights()) {
      alert('Total weights must equal 100%');
      return;
    }
    onConfigChange({
      ...editedConfig,
      updatedAt: new Date()
    });
    setOpen(false);
  };

  const handlePresetSelect = (preset: ScoringConfiguration) => {
    setEditedConfig({
      ...preset,
      advancedThresholds: preset.advancedThresholds || DEFAULT_ADVANCED_THRESHOLD_CONFIG
    });
  };

  const handleReset = () => {
    setEditedConfig(DEFAULT_SCORING_CONFIG);
  };

  const getPropertyTypeIcon = () => {
    return <Building2 className="h-3 w-3" />;
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Settings className="h-4 w-4 mr-2" />
          Scoring Settings
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Deal Health Scoring Configuration</DialogTitle>
          <DialogDescription>
            Customize how deal health scores are calculated. Choose a preset, property-specific template, or create your own custom configuration.
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger value="presets">General</TabsTrigger>
            <TabsTrigger value="property-types">
              <Building2 className="h-4 w-4 mr-1" />
              Property
            </TabsTrigger>
            <TabsTrigger value="weights">Weights</TabsTrigger>
            <TabsTrigger value="thresholds">Thresholds</TabsTrigger>
            <TabsTrigger value="advanced">
              <Settings2 className="h-4 w-4 mr-1" />
              Advanced
            </TabsTrigger>
            {analytics && (
              <TabsTrigger value="analytics">
                <BarChart3 className="h-4 w-4 mr-1" />
                Analytics
              </TabsTrigger>
            )}
          </TabsList>

          <TabsContent value="presets" className="space-y-4">
            <div>
              <h3 className="text-sm font-semibold text-gray-700 mb-3">General Configurations</h3>
              <p className="text-xs text-gray-600 mb-3">
                Versatile configurations suitable for various transaction types and business models.
              </p>
              <div className="space-y-3">
                {generalPresets.map((preset) => (
                  <Card 
                    key={preset.id} 
                    className={`cursor-pointer transition-all ${
                      editedConfig.id === preset.id ? 'border-blue-500 border-2' : ''
                    }`}
                    onClick={() => handlePresetSelect(preset)}
                  >
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-base">{preset.name}</CardTitle>
                        {editedConfig.id === preset.id && (
                          <Badge variant="default" className="bg-blue-500">
                            <Check className="h-3 w-3 mr-1" />
                            Selected
                          </Badge>
                        )}
                      </div>
                      <CardDescription className="text-sm">{preset.description}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div>
                          <span className="text-gray-600">Documents:</span>
                          <span className="font-medium ml-1">{Math.round(preset.weights.documentCompletion * 100)}%</span>
                        </div>
                        <div>
                          <span className="text-gray-600">Activity:</span>
                          <span className="font-medium ml-1">{Math.round(preset.weights.activityLevel * 100)}%</span>
                        </div>
                        <div>
                          <span className="text-gray-600">Timeline:</span>
                          <span className="font-medium ml-1">{Math.round(preset.weights.timelineAdherence * 100)}%</span>
                        </div>
                        <div>
                          <span className="text-gray-600">Financing:</span>
                          <span className="font-medium ml-1">{Math.round(preset.weights.financingStrength * 100)}%</span>
                        </div>
                        <div>
                          <span className="text-gray-600">Communication:</span>
                          <span className="font-medium ml-1">{Math.round(preset.weights.communicationQuality * 100)}%</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="property-types" className="space-y-4">
            <div>
              <h3 className="text-sm font-semibold text-gray-700 mb-3">Property-Specific Configurations</h3>
              <p className="text-xs text-gray-600 mb-3">
                Optimized scoring templates tailored for specific property types with appropriate timelines and priorities.
              </p>
              <div className="space-y-3">
                {propertyPresets.map((preset) => (
                  <Card 
                    key={preset.id} 
                    className={`cursor-pointer transition-all ${
                      editedConfig.id === preset.id ? 'border-blue-500 border-2' : ''
                    }`}
                    onClick={() => handlePresetSelect(preset)}
                  >
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {getPropertyTypeIcon()}
                          <CardTitle className="text-base">{preset.name}</CardTitle>
                        </div>
                        {editedConfig.id === preset.id && (
                          <Badge variant="default" className="bg-blue-500">
                            <Check className="h-3 w-3 mr-1" />
                            Selected
                          </Badge>
                        )}
                      </div>
                      <CardDescription className="text-sm">{preset.description}</CardDescription>
                      {preset.propertyTypes && (
                        <div className="flex gap-1 mt-2">
                          {preset.propertyTypes.map(type => (
                            <Badge key={type} variant="outline" className="text-xs capitalize">
                              {type.replace('-', ' ')}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div>
                            <span className="text-gray-600">Documents:</span>
                            <span className="font-medium ml-1">{Math.round(preset.weights.documentCompletion * 100)}%</span>
                          </div>
                          <div>
                            <span className="text-gray-600">Activity:</span>
                            <span className="font-medium ml-1">{Math.round(preset.weights.activityLevel * 100)}%</span>
                          </div>
                          <div>
                            <span className="text-gray-600">Timeline:</span>
                            <span className="font-medium ml-1">{Math.round(preset.weights.timelineAdherence * 100)}%</span>
                          </div>
                          <div>
                            <span className="text-gray-600">Financing:</span>
                            <span className="font-medium ml-1">{Math.round(preset.weights.financingStrength * 100)}%</span>
                          </div>
                          <div>
                            <span className="text-gray-600">Communication:</span>
                            <span className="font-medium ml-1">{Math.round(preset.weights.communicationQuality * 100)}%</span>
                          </div>
                        </div>
                        <div className="pt-2 border-t text-xs">
                          <p className="text-gray-600 mb-1">Alert Timing:</p>
                          <div className="grid grid-cols-2 gap-1">
                            <span>Critical Docs: {preset.alertThresholds.criticalDocumentsMissing} days</span>
                            <span>Critical Activity: {preset.alertThresholds.criticalActivityGap} days</span>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="weights" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Factor Weights</CardTitle>
                <CardDescription>
                  Adjust the importance of each factor in the overall health score calculation.
                  Total must equal 100%.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div>
                    <Label htmlFor="documentCompletion">Document Completion</Label>
                    <div className="flex items-center gap-2 mt-1">
                      <Input
                        id="documentCompletion"
                        type="number"
                        min="0"
                        max="100"
                        value={Math.round(editedConfig.weights.documentCompletion * 100)}
                        onChange={(e) => handleWeightChange('documentCompletion', e.target.value)}
                        className="w-24"
                      />
                      <span className="text-sm text-gray-600">%</span>
                      <div className="flex-1 bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-blue-500 h-2 rounded-full transition-all" 
                          style={{ width: `${editedConfig.weights.documentCompletion * 100}%` }}
                        />
                      </div>
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="activityLevel">Activity Level</Label>
                    <div className="flex items-center gap-2 mt-1">
                      <Input
                        id="activityLevel"
                        type="number"
                        min="0"
                        max="100"
                        value={Math.round(editedConfig.weights.activityLevel * 100)}
                        onChange={(e) => handleWeightChange('activityLevel', e.target.value)}
                        className="w-24"
                      />
                      <span className="text-sm text-gray-600">%</span>
                      <div className="flex-1 bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-blue-500 h-2 rounded-full transition-all" 
                          style={{ width: `${editedConfig.weights.activityLevel * 100}%` }}
                        />
                      </div>
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="timelineAdherence">Timeline Adherence</Label>
                    <div className="flex items-center gap-2 mt-1">
                      <Input
                        id="timelineAdherence"
                        type="number"
                        min="0"
                        max="100"
                        value={Math.round(editedConfig.weights.timelineAdherence * 100)}
                        onChange={(e) => handleWeightChange('timelineAdherence', e.target.value)}
                        className="w-24"
                      />
                      <span className="text-sm text-gray-600">%</span>
                      <div className="flex-1 bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-blue-500 h-2 rounded-full transition-all" 
                          style={{ width: `${editedConfig.weights.timelineAdherence * 100}%` }}
                        />
                      </div>
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="financingStrength">Financing Strength</Label>
                    <div className="flex items-center gap-2 mt-1">
                      <Input
                        id="financingStrength"
                        type="number"
                        min="0"
                        max="100"
                        value={Math.round(editedConfig.weights.financingStrength * 100)}
                        onChange={(e) => handleWeightChange('financingStrength', e.target.value)}
                        className="w-24"
                      />
                      <span className="text-sm text-gray-600">%</span>
                      <div className="flex-1 bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-blue-500 h-2 rounded-full transition-all" 
                          style={{ width: `${editedConfig.weights.financingStrength * 100}%` }}
                        />
                      </div>
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="communicationQuality">Communication Quality</Label>
                    <div className="flex items-center gap-2 mt-1">
                      <Input
                        id="communicationQuality"
                        type="number"
                        min="0"
                        max="100"
                        value={Math.round(editedConfig.weights.communicationQuality * 100)}
                        onChange={(e) => handleWeightChange('communicationQuality', e.target.value)}
                        className="w-24"
                      />
                      <span className="text-sm text-gray-600">%</span>
                      <div className="flex-1 bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-blue-500 h-2 rounded-full transition-all" 
                          style={{ width: `${editedConfig.weights.communicationQuality * 100}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div className={`p-3 rounded-lg ${isValidWeights() ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
                  <p className={`text-sm font-medium ${isValidWeights() ? 'text-green-900' : 'text-red-900'}`}>
                    Total Weight: {getTotalWeight()}%
                    {isValidWeights() ? ' ✓' : ' (Must equal 100%)'}
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="thresholds" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Risk Level Thresholds</CardTitle>
                <CardDescription>
                  Define score ranges for each risk level classification.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <Label htmlFor="lowRisk">Low Risk (Score ≥)</Label>
                  <Input
                    id="lowRisk"
                    type="number"
                    min="0"
                    max="100"
                    value={editedConfig.riskThresholds.low}
                    onChange={(e) => handleRiskThresholdChange('low', e.target.value)}
                    className="mt-1"
                  />
                  <p className="text-xs text-gray-500 mt-1">Deals with scores at or above this value are considered low risk</p>
                </div>

                <div>
                  <Label htmlFor="mediumRisk">Medium Risk (Score ≥)</Label>
                  <Input
                    id="mediumRisk"
                    type="number"
                    min="0"
                    max="100"
                    value={editedConfig.riskThresholds.medium}
                    onChange={(e) => handleRiskThresholdChange('medium', e.target.value)}
                    className="mt-1"
                  />
                  <p className="text-xs text-gray-500 mt-1">Deals with scores at or above this value are considered medium risk</p>
                </div>

                <div>
                  <Label htmlFor="highRisk">High Risk (Score ≥)</Label>
                  <Input
                    id="highRisk"
                    type="number"
                    min="0"
                    max="100"
                    value={editedConfig.riskThresholds.high}
                    onChange={(e) => handleRiskThresholdChange('high', e.target.value)}
                    className="mt-1"
                  />
                  <p className="text-xs text-gray-500 mt-1">Deals with scores at or above this value are considered high risk (below this is critical)</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Alert Thresholds</CardTitle>
                <CardDescription>
                  Configure when alerts are triggered based on days until closing or days since activity.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="criticalDocs">Critical - Missing Docs (days)</Label>
                    <Input
                      id="criticalDocs"
                      type="number"
                      min="0"
                      value={editedConfig.alertThresholds.criticalDocumentsMissing}
                      onChange={(e) => handleAlertThresholdChange('criticalDocumentsMissing', e.target.value)}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="warningDocs">Warning - Missing Docs (days)</Label>
                    <Input
                      id="warningDocs"
                      type="number"
                      min="0"
                      value={editedConfig.alertThresholds.warningDocumentsMissing}
                      onChange={(e) => handleAlertThresholdChange('warningDocumentsMissing', e.target.value)}
                      className="mt-1"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="criticalActivity">Critical - Activity Gap (days)</Label>
                    <Input
                      id="criticalActivity"
                      type="number"
                      min="0"
                      value={editedConfig.alertThresholds.criticalActivityGap}
                      onChange={(e) => handleAlertThresholdChange('criticalActivityGap', e.target.value)}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="warningActivity">Warning - Activity Gap (days)</Label>
                    <Input
                      id="warningActivity"
                      type="number"
                      min="0"
                      value={editedConfig.alertThresholds.warningActivityGap}
                      onChange={(e) => handleAlertThresholdChange('warningActivityGap', e.target.value)}
                      className="mt-1"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="criticalFinancing">Critical - Financing (days)</Label>
                    <Input
                      id="criticalFinancing"
                      type="number"
                      min="0"
                      value={editedConfig.alertThresholds.criticalFinancingDeadline}
                      onChange={(e) => handleAlertThresholdChange('criticalFinancingDeadline', e.target.value)}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="warningFinancing">Warning - Financing (days)</Label>
                    <Input
                      id="warningFinancing"
                      type="number"
                      min="0"
                      value={editedConfig.alertThresholds.warningFinancingDeadline}
                      onChange={(e) => handleAlertThresholdChange('warningFinancingDeadline', e.target.value)}
                      className="mt-1"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="advanced" className="space-y-4">
            <AdvancedThresholdControls
              config={editedConfig.advancedThresholds || DEFAULT_ADVANCED_THRESHOLD_CONFIG}
              onChange={(advancedThresholds) => 
                setEditedConfig({ ...editedConfig, advancedThresholds })
              }
            />
          </TabsContent>

          {analytics && (
            <TabsContent value="analytics" className="space-y-4">
              <ConfigurationAnalyticsComponent analytics={analytics} />
            </TabsContent>
          )}
        </Tabs>

        <div className="flex justify-between pt-4 border-t">
          <Button variant="outline" onClick={handleReset}>
            <RotateCcw className="h-4 w-4 mr-2" />
            Reset to Default
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleApply} disabled={!isValidWeights()}>
              Apply Configuration
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}