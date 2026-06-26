import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { WeightSchema } from '@/types/broker';
import { 
  Settings, 
  CheckCircle, 
  AlertTriangle,
  DollarSign,
  Clock,
  Star,
  Shield,
  Camera
} from 'lucide-react';

interface WeightSchemaEditorProps {
  currentSchema: WeightSchema;
  onSave: (schema: WeightSchema) => void;
  onCancel: () => void;
}

export default function WeightSchemaEditor({ currentSchema, onSave, onCancel }: WeightSchemaEditorProps) {
  const [weights, setWeights] = useState({
    production: currentSchema.production * 100,
    efficiency: currentSchema.efficiency * 100,
    clientExperience: currentSchema.clientExperience * 100,
    compliance: currentSchema.compliance * 100,
    marketing: currentSchema.marketing * 100
  });

  const total = Object.values(weights).reduce((sum, weight) => sum + weight, 0);
  const isValid = Math.abs(total - 100) < 0.1; // Allow for small floating point errors

  const handleWeightChange = (category: keyof typeof weights, value: number[]) => {
    const newWeight = value[0];
    const oldWeight = weights[category];
    const difference = newWeight - oldWeight;
    
    // Calculate remaining weight to distribute
    const otherCategories = Object.keys(weights).filter(key => key !== category) as (keyof typeof weights)[];
    const otherTotal = otherCategories.reduce((sum, key) => sum + weights[key], 0);
    
    // If we're increasing this weight, decrease others proportionally
    if (difference > 0 && otherTotal > 0) {
      const newWeights = { ...weights };
      newWeights[category] = newWeight;
      
      // Distribute the reduction proportionally among other categories
      const reductionRatio = Math.max(0, (otherTotal - difference) / otherTotal);
      
      otherCategories.forEach(key => {
        newWeights[key] = Math.max(0, weights[key] * reductionRatio);
      });
      
      setWeights(newWeights);
    } else {
      // Simple update for decreases
      setWeights(prev => ({
        ...prev,
        [category]: newWeight
      }));
    }
  };

  const handleSave = () => {
    if (isValid) {
      const newSchema: WeightSchema = {
        ...currentSchema,
        production: weights.production / 100,
        efficiency: weights.efficiency / 100,
        clientExperience: weights.clientExperience / 100,
        compliance: weights.compliance / 100,
        marketing: weights.marketing / 100,
        version: `v${parseFloat(currentSchema.version.substring(1)) + 0.1}`,
        activeFrom: new Date()
      };
      onSave(newSchema);
    }
  };

  const resetToDefaults = () => {
    setWeights({
      production: 35,
      efficiency: 25,
      clientExperience: 20,
      compliance: 15,
      marketing: 5
    });
  };

  const categories = [
    {
      key: 'production' as keyof typeof weights,
      label: 'Production',
      description: 'Deals closed, total volume',
      icon: DollarSign,
      color: 'text-green-600'
    },
    {
      key: 'efficiency' as keyof typeof weights,
      label: 'Efficiency & Speed',
      description: 'Average days to close',
      icon: Clock,
      color: 'text-blue-600'
    },
    {
      key: 'clientExperience' as keyof typeof weights,
      label: 'Client Experience',
      description: 'Client ratings, satisfaction',
      icon: Star,
      color: 'text-purple-600'
    },
    {
      key: 'compliance' as keyof typeof weights,
      label: 'Compliance & Reliability',
      description: 'On-time milestones, compliance',
      icon: Shield,
      color: 'text-orange-600'
    },
    {
      key: 'marketing' as keyof typeof weights,
      label: 'Marketing Quality',
      description: 'Photo/video quality, response time',
      icon: Camera,
      color: 'text-pink-600'
    }
  ];

  return (
    <div className="space-y-6">
      {/* Header with Total */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Weight Schema Editor</h3>
          <p className="text-sm text-gray-600">Adjust AQI component weightings</p>
        </div>
        <div className="flex items-center space-x-3">
          <div className="text-right">
            <div className={`text-2xl font-bold ${isValid ? 'text-green-600' : 'text-red-600'}`}>
              {total.toFixed(1)}%
            </div>
            <div className="text-xs text-gray-500">Total Weight</div>
          </div>
          {isValid ? (
            <CheckCircle className="h-8 w-8 text-green-500" />
          ) : (
            <AlertTriangle className="h-8 w-8 text-red-500" />
          )}
        </div>
      </div>

      {/* Status Banner */}
      <div className={`p-4 rounded-lg border ${
        isValid 
          ? 'bg-green-50 border-green-200' 
          : 'bg-red-50 border-red-200'
      }`}>
        <div className="flex items-center">
          {isValid ? (
            <CheckCircle className="h-5 w-5 text-green-600 mr-2" />
          ) : (
            <AlertTriangle className="h-5 w-5 text-red-600 mr-2" />
          )}
          <span className={`font-medium ${isValid ? 'text-green-900' : 'text-red-900'}`}>
            {isValid 
              ? 'Weight schema is valid and ready to save' 
              : `Total must equal 100% (currently ${total.toFixed(1)}%)`
            }
          </span>
        </div>
      </div>

      {/* Weight Sliders */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Settings className="h-5 w-5 mr-2" />
            Component Weights
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {categories.map((category) => {
            const Icon = category.icon;
            const weight = weights[category.key];
            
            return (
              <div key={category.key} className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
                      <Icon className={`h-4 w-4 ${category.color}`} />
                    </div>
                    <div>
                      <Label className="font-medium text-gray-900">{category.label}</Label>
                      <p className="text-xs text-gray-500">{category.description}</p>
                    </div>
                  </div>
                  <Badge variant="outline" className="min-w-[60px] justify-center">
                    {weight.toFixed(1)}%
                  </Badge>
                </div>
                
                <div className="px-3">
                  <Slider
                    value={[weight]}
                    onValueChange={(value) => handleWeightChange(category.key, value)}
                    max={100}
                    min={0}
                    step={0.5}
                    className="w-full"
                  />
                  <div className="flex justify-between text-xs text-gray-400 mt-1">
                    <span>0%</span>
                    <span>50%</span>
                    <span>100%</span>
                  </div>
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* Preview */}
      <Card>
        <CardHeader>
          <CardTitle>Weight Distribution Preview</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {categories.map((category) => {
              const weight = weights[category.key];
              const percentage = total > 0 ? (weight / total) * 100 : 0;
              
              return (
                <div key={category.key} className="flex items-center space-x-3">
                  <div className="w-24 text-sm font-medium text-gray-700">
                    {category.label}
                  </div>
                  <div className="flex-1 bg-gray-200 rounded-full h-3 relative overflow-hidden">
                    <div 
                      className={`h-full rounded-full transition-all duration-300 ${
                        category.key === 'production' ? 'bg-green-500' :
                        category.key === 'efficiency' ? 'bg-blue-500' :
                        category.key === 'clientExperience' ? 'bg-purple-500' :
                        category.key === 'compliance' ? 'bg-orange-500' :
                        'bg-pink-500'
                      }`}
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                  <div className="w-12 text-sm text-gray-600 text-right">
                    {weight.toFixed(1)}%
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex items-center justify-between">
        <Button variant="outline" onClick={resetToDefaults}>
          Reset to Defaults
        </Button>
        
        <div className="flex items-center space-x-3">
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button 
            onClick={handleSave}
            disabled={!isValid}
            className="bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-700 hover:to-orange-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Save Schema
          </Button>
        </div>
      </div>
    </div>
  );
}