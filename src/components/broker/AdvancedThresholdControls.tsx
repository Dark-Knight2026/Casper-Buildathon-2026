import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Plus, 
  Trash2, 
  Clock, 
  DollarSign, 
  User, 
  Building2,
  TrendingUp,
  AlertCircle,
  Settings2
} from 'lucide-react';
import { 
  AdvancedThresholdConfig, 
  ConditionalThreshold, 
  TimeBasedRule, 
  AgentOverride,
  ThresholdCondition 
} from '@/types/dealHealth';

interface AdvancedThresholdControlsProps {
  config: AdvancedThresholdConfig;
  onChange: (config: AdvancedThresholdConfig) => void;
}

export default function AdvancedThresholdControls({ config, onChange }: AdvancedThresholdControlsProps) {
  const [activeTab, setActiveTab] = useState('conditional');

  const handleEnableAdvancedMode = (enabled: boolean) => {
    onChange({ ...config, enableAdvancedMode: enabled });
  };

  // Conditional Thresholds
  const addConditionalThreshold = () => {
    const newThreshold: ConditionalThreshold = {
      id: `cond_${Date.now()}`,
      name: 'New Conditional Rule',
      enabled: true,
      condition: {
        type: 'deal_value',
        operator: 'greater_than',
        value: 1000000
      },
      adjustments: {
        documentCritical: 10,
        documentWarning: 21
      }
    };
    onChange({
      ...config,
      conditionalThresholds: [...config.conditionalThresholds, newThreshold]
    });
  };

  const updateConditionalThreshold = (id: string, updates: Partial<ConditionalThreshold>) => {
    onChange({
      ...config,
      conditionalThresholds: config.conditionalThresholds.map(ct =>
        ct.id === id ? { ...ct, ...updates } : ct
      )
    });
  };

  const deleteConditionalThreshold = (id: string) => {
    onChange({
      ...config,
      conditionalThresholds: config.conditionalThresholds.filter(ct => ct.id !== id)
    });
  };

  // Time-Based Rules
  const addTimeBasedRule = () => {
    const newRule: TimeBasedRule = {
      id: `time_${Date.now()}`,
      name: 'Final Week Urgency',
      enabled: true,
      triggerDays: 7,
      adjustments: {
        documentCritical: 3,
        activityCritical: 2
      },
      description: 'Increase urgency in final week before closing'
    };
    onChange({
      ...config,
      timeBasedRules: [...config.timeBasedRules, newRule]
    });
  };

  const updateTimeBasedRule = (id: string, updates: Partial<TimeBasedRule>) => {
    onChange({
      ...config,
      timeBasedRules: config.timeBasedRules.map(tr =>
        tr.id === id ? { ...tr, ...updates } : tr
      )
    });
  };

  const deleteTimeBasedRule = (id: string) => {
    onChange({
      ...config,
      timeBasedRules: config.timeBasedRules.filter(tr => tr.id !== id)
    });
  };

  // Agent Overrides
  const addAgentOverride = () => {
    const newOverride: AgentOverride = {
      id: `agent_${Date.now()}`,
      agentName: '',
      enabled: true,
      adjustments: {
        activityWarning: 5
      },
      reason: 'Custom settings for this agent'
    };
    onChange({
      ...config,
      agentOverrides: [...config.agentOverrides, newOverride]
    });
  };

  const updateAgentOverride = (id: string, updates: Partial<AgentOverride>) => {
    onChange({
      ...config,
      agentOverrides: config.agentOverrides.map(ao =>
        ao.id === id ? { ...ao, ...updates } : ao
      )
    });
  };

  const deleteAgentOverride = (id: string) => {
    onChange({
      ...config,
      agentOverrides: config.agentOverrides.filter(ao => ao.id !== id)
    });
  };

  const getConditionIcon = (type: string) => {
    switch (type) {
      case 'deal_value': return <DollarSign className="h-4 w-4" />;
      case 'property_type': return <Building2 className="h-4 w-4" />;
      case 'days_until_closing': return <Clock className="h-4 w-4" />;
      case 'agent': return <User className="h-4 w-4" />;
      default: return <Settings2 className="h-4 w-4" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Advanced Mode Toggle */}
      <Card className={config.enableAdvancedMode ? 'border-blue-500' : ''}>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Settings2 className="h-5 w-5" />
                Advanced Threshold Controls
              </CardTitle>
              <CardDescription>
                Enable dynamic threshold adjustments based on deal conditions, timing, and agents
              </CardDescription>
            </div>
            <Switch
              checked={config.enableAdvancedMode}
              onCheckedChange={handleEnableAdvancedMode}
            />
          </div>
        </CardHeader>
        {config.enableAdvancedMode && (
          <CardContent>
            <div className="flex items-start gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <AlertCircle className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-blue-900">
                <p className="font-medium mb-1">Advanced Mode Enabled</p>
                <p>
                  Thresholds will be dynamically adjusted based on your configured rules. 
                  Rules are evaluated in order: Conditional → Time-Based → Agent Overrides.
                </p>
              </div>
            </div>
          </CardContent>
        )}
      </Card>

      {config.enableAdvancedMode && (
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="conditional">
              <TrendingUp className="h-4 w-4 mr-2" />
              Conditional Rules
            </TabsTrigger>
            <TabsTrigger value="time-based">
              <Clock className="h-4 w-4 mr-2" />
              Time-Based
            </TabsTrigger>
            <TabsTrigger value="agent-overrides">
              <User className="h-4 w-4 mr-2" />
              Agent Overrides
            </TabsTrigger>
          </TabsList>

          {/* Conditional Thresholds */}
          <TabsContent value="conditional" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-base">Conditional Threshold Rules</CardTitle>
                    <CardDescription>
                      Adjust thresholds based on deal value, property type, or other conditions
                    </CardDescription>
                  </div>
                  <Button onClick={addConditionalThreshold} size="sm">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Rule
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {config.conditionalThresholds.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <TrendingUp className="h-12 w-12 mx-auto mb-3 text-gray-400" />
                    <p>No conditional rules configured</p>
                    <p className="text-sm">Add rules to adjust thresholds based on deal conditions</p>
                  </div>
                ) : (
                  config.conditionalThresholds.map((threshold) => (
                    <Card key={threshold.id} className="border-2">
                      <CardContent className="p-4 space-y-4">
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-2 flex-1">
                            <Switch
                              checked={threshold.enabled}
                              onCheckedChange={(enabled) => 
                                updateConditionalThreshold(threshold.id, { enabled })
                              }
                            />
                            <Input
                              value={threshold.name}
                              onChange={(e) => 
                                updateConditionalThreshold(threshold.id, { name: e.target.value })
                              }
                              className="font-medium"
                              placeholder="Rule name"
                            />
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => deleteConditionalThreshold(threshold.id)}
                          >
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        </div>

                        <div className="grid grid-cols-3 gap-3">
                          <div>
                            <Label>Condition Type</Label>
                            <Select
                              value={threshold.condition.type}
                              onValueChange={(value) =>
                                updateConditionalThreshold(threshold.id, {
                                  condition: { ...threshold.condition, type: value as ThresholdCondition['type'] }
                                })
                              }
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="deal_value">Deal Value</SelectItem>
                                <SelectItem value="property_type">Property Type</SelectItem>
                                <SelectItem value="days_until_closing">Days Until Closing</SelectItem>
                                <SelectItem value="financing_status">Financing Status</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>

                          <div>
                            <Label>Operator</Label>
                            <Select
                              value={threshold.condition.operator}
                              onValueChange={(value) =>
                                updateConditionalThreshold(threshold.id, {
                                  condition: { ...threshold.condition, operator: value as ThresholdCondition['operator'] }
                                })
                              }
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="equals">Equals</SelectItem>
                                <SelectItem value="greater_than">Greater Than</SelectItem>
                                <SelectItem value="less_than">Less Than</SelectItem>
                                <SelectItem value="in_range">In Range</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>

                          <div>
                            <Label>Value</Label>
                            <Input
                              type={threshold.condition.type === 'deal_value' ? 'number' : 'text'}
                              value={threshold.condition.value}
                              onChange={(e) =>
                                updateConditionalThreshold(threshold.id, {
                                  condition: { 
                                    ...threshold.condition, 
                                    value: threshold.condition.type === 'deal_value' 
                                      ? parseFloat(e.target.value) 
                                      : e.target.value 
                                  }
                                })
                              }
                              placeholder={threshold.condition.type === 'deal_value' ? '1000000' : 'luxury'}
                            />
                          </div>
                        </div>

                        <div>
                          <Label className="mb-2 block">Threshold Adjustments (days)</Label>
                          <div className="grid grid-cols-3 gap-3">
                            <div>
                              <Label className="text-xs">Critical Docs</Label>
                              <Input
                                type="number"
                                value={threshold.adjustments.documentCritical || ''}
                                onChange={(e) =>
                                  updateConditionalThreshold(threshold.id, {
                                    adjustments: { 
                                      ...threshold.adjustments, 
                                      documentCritical: parseInt(e.target.value) || undefined 
                                    }
                                  })
                                }
                                placeholder="7"
                              />
                            </div>
                            <div>
                              <Label className="text-xs">Warning Docs</Label>
                              <Input
                                type="number"
                                value={threshold.adjustments.documentWarning || ''}
                                onChange={(e) =>
                                  updateConditionalThreshold(threshold.id, {
                                    adjustments: { 
                                      ...threshold.adjustments, 
                                      documentWarning: parseInt(e.target.value) || undefined 
                                    }
                                  })
                                }
                                placeholder="14"
                              />
                            </div>
                            <div>
                              <Label className="text-xs">Critical Activity</Label>
                              <Input
                                type="number"
                                value={threshold.adjustments.activityCritical || ''}
                                onChange={(e) =>
                                  updateConditionalThreshold(threshold.id, {
                                    adjustments: { 
                                      ...threshold.adjustments, 
                                      activityCritical: parseInt(e.target.value) || undefined 
                                    }
                                  })
                                }
                                placeholder="5"
                              />
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 text-sm text-gray-600 bg-gray-50 p-2 rounded">
                          {getConditionIcon(threshold.condition.type)}
                          <span>
                            When {threshold.condition.type.replace('_', ' ')} {threshold.condition.operator.replace('_', ' ')} {threshold.condition.value}
                          </span>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Time-Based Rules */}
          <TabsContent value="time-based" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-base">Time-Based Threshold Rules</CardTitle>
                    <CardDescription>
                      Automatically adjust thresholds as deals approach closing date
                    </CardDescription>
                  </div>
                  <Button onClick={addTimeBasedRule} size="sm">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Rule
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {config.timeBasedRules.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <Clock className="h-12 w-12 mx-auto mb-3 text-gray-400" />
                    <p>No time-based rules configured</p>
                    <p className="text-sm">Add rules to increase urgency as closing approaches</p>
                  </div>
                ) : (
                  config.timeBasedRules.map((rule) => (
                    <Card key={rule.id} className="border-2">
                      <CardContent className="p-4 space-y-4">
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-2 flex-1">
                            <Switch
                              checked={rule.enabled}
                              onCheckedChange={(enabled) => 
                                updateTimeBasedRule(rule.id, { enabled })
                              }
                            />
                            <Input
                              value={rule.name}
                              onChange={(e) => 
                                updateTimeBasedRule(rule.id, { name: e.target.value })
                              }
                              className="font-medium"
                              placeholder="Rule name"
                            />
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => deleteTimeBasedRule(rule.id)}
                          >
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        </div>

                        <div>
                          <Label>Trigger When (days until closing)</Label>
                          <Input
                            type="number"
                            value={rule.triggerDays}
                            onChange={(e) =>
                              updateTimeBasedRule(rule.id, { triggerDays: parseInt(e.target.value) || 0 })
                            }
                            placeholder="7"
                          />
                          <p className="text-xs text-gray-500 mt-1">
                            This rule activates when there are {rule.triggerDays} or fewer days until closing
                          </p>
                        </div>

                        <div>
                          <Label>Description</Label>
                          <Input
                            value={rule.description}
                            onChange={(e) =>
                              updateTimeBasedRule(rule.id, { description: e.target.value })
                            }
                            placeholder="Describe what this rule does"
                          />
                        </div>

                        <div>
                          <Label className="mb-2 block">Threshold Adjustments (days)</Label>
                          <div className="grid grid-cols-3 gap-3">
                            <div>
                              <Label className="text-xs">Critical Docs</Label>
                              <Input
                                type="number"
                                value={rule.adjustments.documentCritical || ''}
                                onChange={(e) =>
                                  updateTimeBasedRule(rule.id, {
                                    adjustments: { 
                                      ...rule.adjustments, 
                                      documentCritical: parseInt(e.target.value) || undefined 
                                    }
                                  })
                                }
                                placeholder="3"
                              />
                            </div>
                            <div>
                              <Label className="text-xs">Critical Activity</Label>
                              <Input
                                type="number"
                                value={rule.adjustments.activityCritical || ''}
                                onChange={(e) =>
                                  updateTimeBasedRule(rule.id, {
                                    adjustments: { 
                                      ...rule.adjustments, 
                                      activityCritical: parseInt(e.target.value) || undefined 
                                    }
                                  })
                                }
                                placeholder="2"
                              />
                            </div>
                            <div>
                              <Label className="text-xs">Critical Financing</Label>
                              <Input
                                type="number"
                                value={rule.adjustments.financingCritical || ''}
                                onChange={(e) =>
                                  updateTimeBasedRule(rule.id, {
                                    adjustments: { 
                                      ...rule.adjustments, 
                                      financingCritical: parseInt(e.target.value) || undefined 
                                    }
                                  })
                                }
                                placeholder="5"
                              />
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 text-sm bg-orange-50 p-2 rounded border border-orange-200">
                          <Clock className="h-4 w-4 text-orange-600" />
                          <span className="text-orange-900">
                            Activates at {rule.triggerDays} days before closing
                          </span>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Agent Overrides */}
          <TabsContent value="agent-overrides" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-base">Agent-Specific Overrides</CardTitle>
                    <CardDescription>
                      Customize thresholds for specific agents based on their work style
                    </CardDescription>
                  </div>
                  <Button onClick={addAgentOverride} size="sm">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Override
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {config.agentOverrides.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <User className="h-12 w-12 mx-auto mb-3 text-gray-400" />
                    <p>No agent overrides configured</p>
                    <p className="text-sm">Add overrides to customize thresholds for specific agents</p>
                  </div>
                ) : (
                  config.agentOverrides.map((override) => (
                    <Card key={override.id} className="border-2">
                      <CardContent className="p-4 space-y-4">
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-2 flex-1">
                            <Switch
                              checked={override.enabled}
                              onCheckedChange={(enabled) => 
                                updateAgentOverride(override.id, { enabled })
                              }
                            />
                            <Input
                              value={override.agentName}
                              onChange={(e) => 
                                updateAgentOverride(override.id, { agentName: e.target.value })
                              }
                              className="font-medium"
                              placeholder="Agent name"
                            />
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => deleteAgentOverride(override.id)}
                          >
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        </div>

                        <div>
                          <Label>Reason for Override</Label>
                          <Input
                            value={override.reason}
                            onChange={(e) =>
                              updateAgentOverride(override.id, { reason: e.target.value })
                            }
                            placeholder="e.g., Experienced agent with proven track record"
                          />
                        </div>

                        <div>
                          <Label className="mb-2 block">Threshold Adjustments (days)</Label>
                          <div className="grid grid-cols-3 gap-3">
                            <div>
                              <Label className="text-xs">Warning Activity</Label>
                              <Input
                                type="number"
                                value={override.adjustments.activityWarning || ''}
                                onChange={(e) =>
                                  updateAgentOverride(override.id, {
                                    adjustments: { 
                                      ...override.adjustments, 
                                      activityWarning: parseInt(e.target.value) || undefined 
                                    }
                                  })
                                }
                                placeholder="5"
                              />
                            </div>
                            <div>
                              <Label className="text-xs">Critical Activity</Label>
                              <Input
                                type="number"
                                value={override.adjustments.activityCritical || ''}
                                onChange={(e) =>
                                  updateAgentOverride(override.id, {
                                    adjustments: { 
                                      ...override.adjustments, 
                                      activityCritical: parseInt(e.target.value) || undefined 
                                    }
                                  })
                                }
                                placeholder="7"
                              />
                            </div>
                            <div>
                              <Label className="text-xs">Warning Docs</Label>
                              <Input
                                type="number"
                                value={override.adjustments.documentWarning || ''}
                                onChange={(e) =>
                                  updateAgentOverride(override.id, {
                                    adjustments: { 
                                      ...override.adjustments, 
                                      documentWarning: parseInt(e.target.value) || undefined 
                                    }
                                  })
                                }
                                placeholder="21"
                              />
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 text-sm bg-purple-50 p-2 rounded border border-purple-200">
                          <User className="h-4 w-4 text-purple-600" />
                          <span className="text-purple-900">
                            Applies to all deals handled by {override.agentName || 'this agent'}
                          </span>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}