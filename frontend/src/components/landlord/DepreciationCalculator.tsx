import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useLandlordManagement } from '@/contexts/LandlordManagementContext';
import { Property } from '@/types/clientLandlord';
import {
  Calculator,
  Plus,
  Download,
  TrendingDown,
  Building,
  Calendar,
  DollarSign,
  Info,
  Trash2
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface DepreciationCalculatorProps {
  landlordId: string;
}

interface DepreciationSchedule {
  id: string;
  propertyId: string;
  propertyAddress: string;
  purchaseDate: Date;
  purchasePrice: number;
  landValue: number;
  buildingValue: number;
  depreciationMethod: 'MACRS' | 'Straight-Line';
  recoveryPeriod: number; // 27.5 for residential, 39 for commercial
  yearlyDepreciation: number;
  accumulatedDepreciation: number;
  remainingBasis: number;
  schedule: Array<{
    year: number;
    depreciation: number;
    accumulated: number;
    remaining: number;
  }>;
}

interface CapitalImprovement {
  id: string;
  propertyId: string;
  description: string;
  date: Date;
  cost: number;
  recoveryPeriod: number;
  depreciationStartYear: number;
}

export default function DepreciationCalculator({ landlordId }: DepreciationCalculatorProps) {
  const { toast } = useToast();
  const { properties } = useLandlordManagement();
  const landlordProperties = properties.filter(p => p.landlordId === landlordId);
  
  const [depreciationSchedules, setDepreciationSchedules] = useState<DepreciationSchedule[]>([]);
  const [capitalImprovements, setCapitalImprovements] = useState<CapitalImprovement[]>([]);
  const [showNewScheduleDialog, setShowNewScheduleDialog] = useState(false);
  const [showImprovementDialog, setShowImprovementDialog] = useState(false);
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);
  
  // New schedule form data
  const [newSchedule, setNewSchedule] = useState({
    propertyId: '',
    purchaseDate: '',
    purchasePrice: 0,
    landValue: 0,
    depreciationMethod: 'MACRS' as const,
    recoveryPeriod: 27.5
  });
  
  // New improvement form data
  const [newImprovement, setNewImprovement] = useState({
    propertyId: '',
    description: '',
    date: '',
    cost: 0,
    recoveryPeriod: 27.5
  });

  // Calculate MACRS depreciation
  const calculateMACRSDepreciation = (
    buildingValue: number,
    recoveryPeriod: number,
    purchaseDate: Date
  ): DepreciationSchedule['schedule'] => {
    const currentYear = new Date().getFullYear();
    const startYear = purchaseDate.getFullYear();
    const monthsInFirstYear = 13 - purchaseDate.getMonth(); // Mid-month convention
    
    const schedule: DepreciationSchedule['schedule'] = [];
    let accumulated = 0;
    
    // MACRS uses mid-month convention
    const annualRate = 1 / recoveryPeriod;
    
    for (let year = startYear; year <= startYear + Math.ceil(recoveryPeriod); year++) {
      let yearlyDepreciation: number;
      
      if (year === startYear) {
        // First year - partial year using mid-month convention
        yearlyDepreciation = buildingValue * annualRate * (monthsInFirstYear / 12);
      } else if (year === startYear + Math.ceil(recoveryPeriod)) {
        // Last year - remaining depreciation
        yearlyDepreciation = buildingValue - accumulated;
      } else {
        // Full year depreciation
        yearlyDepreciation = buildingValue * annualRate;
      }
      
      accumulated += yearlyDepreciation;
      const remaining = buildingValue - accumulated;
      
      schedule.push({
        year,
        depreciation: Math.round(yearlyDepreciation * 100) / 100,
        accumulated: Math.round(accumulated * 100) / 100,
        remaining: Math.round(remaining * 100) / 100
      });
      
      if (remaining <= 0) break;
    }
    
    return schedule;
  };

  // Create new depreciation schedule
  const handleCreateSchedule = () => {
    if (!newSchedule.propertyId || !newSchedule.purchaseDate || newSchedule.purchasePrice <= 0) {
      toast({
        title: 'Missing Information',
        description: 'Please fill in all required fields.',
        variant: 'destructive',
      });
      return;
    }
    
    const property = landlordProperties.find(p => p.id === newSchedule.propertyId);
    if (!property) return;
    
    const buildingValue = newSchedule.purchasePrice - newSchedule.landValue;
    const purchaseDate = new Date(newSchedule.purchaseDate);
    
    const schedule = calculateMACRSDepreciation(
      buildingValue,
      newSchedule.recoveryPeriod,
      purchaseDate
    );
    
    const currentYear = new Date().getFullYear();
    const currentYearSchedule = schedule.find(s => s.year === currentYear);
    const yearlyDepreciation = currentYearSchedule?.depreciation || 0;
    const accumulatedDepreciation = currentYearSchedule?.accumulated || 0;
    const remainingBasis = currentYearSchedule?.remaining || buildingValue;
    
    const newDepreciationSchedule: DepreciationSchedule = {
      id: `dep-${Date.now()}`,
      propertyId: newSchedule.propertyId,
      propertyAddress: property.details.address.street,
      purchaseDate,
      purchasePrice: newSchedule.purchasePrice,
      landValue: newSchedule.landValue,
      buildingValue,
      depreciationMethod: newSchedule.depreciationMethod,
      recoveryPeriod: newSchedule.recoveryPeriod,
      yearlyDepreciation,
      accumulatedDepreciation,
      remainingBasis,
      schedule
    };
    
    setDepreciationSchedules([...depreciationSchedules, newDepreciationSchedule]);
    
    toast({
      title: 'Schedule Created',
      description: `Depreciation schedule created for ${property.details.address.street}`,
    });
    
    setShowNewScheduleDialog(false);
    setNewSchedule({
      propertyId: '',
      purchaseDate: '',
      purchasePrice: 0,
      landValue: 0,
      depreciationMethod: 'MACRS',
      recoveryPeriod: 27.5
    });
  };

  // Add capital improvement
  const handleAddImprovement = () => {
    if (!newImprovement.propertyId || !newImprovement.description || newImprovement.cost <= 0) {
      toast({
        title: 'Missing Information',
        description: 'Please fill in all required fields.',
        variant: 'destructive',
      });
      return;
    }
    
    const improvementDate = new Date(newImprovement.date);
    
    const improvement: CapitalImprovement = {
      id: `imp-${Date.now()}`,
      propertyId: newImprovement.propertyId,
      description: newImprovement.description,
      date: improvementDate,
      cost: newImprovement.cost,
      recoveryPeriod: newImprovement.recoveryPeriod,
      depreciationStartYear: improvementDate.getFullYear()
    };
    
    setCapitalImprovements([...capitalImprovements, improvement]);
    
    toast({
      title: 'Improvement Added',
      description: `Capital improvement "${newImprovement.description}" has been added.`,
    });
    
    setShowImprovementDialog(false);
    setNewImprovement({
      propertyId: '',
      description: '',
      date: '',
      cost: 0,
      recoveryPeriod: 27.5
    });
  };

  // Delete depreciation schedule
  const handleDeleteSchedule = (scheduleId: string) => {
    setDepreciationSchedules(depreciationSchedules.filter(s => s.id !== scheduleId));
    toast({
      title: 'Schedule Deleted',
      description: 'Depreciation schedule has been removed.',
    });
  };

  // Delete capital improvement
  const handleDeleteImprovement = (improvementId: string) => {
    setCapitalImprovements(capitalImprovements.filter(i => i.id !== improvementId));
    toast({
      title: 'Improvement Deleted',
      description: 'Capital improvement has been removed.',
    });
  };

  // Calculate total depreciation for current year
  const currentYear = new Date().getFullYear();
  const totalYearlyDepreciation = depreciationSchedules.reduce((sum, schedule) => {
    return sum + schedule.yearlyDepreciation;
  }, 0);
  
  const totalAccumulatedDepreciation = depreciationSchedules.reduce((sum, schedule) => {
    return sum + schedule.accumulatedDepreciation;
  }, 0);
  
  const totalRemainingBasis = depreciationSchedules.reduce((sum, schedule) => {
    return sum + schedule.remainingBasis;
  }, 0);

  // Calculate improvement depreciation for current year
  const improvementDepreciation = capitalImprovements.reduce((sum, improvement) => {
    const yearsElapsed = currentYear - improvement.depreciationStartYear;
    if (yearsElapsed >= 0 && yearsElapsed < improvement.recoveryPeriod) {
      return sum + (improvement.cost / improvement.recoveryPeriod);
    }
    return sum;
  }, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Depreciation Calculator</h2>
          <p className="text-gray-600 mt-1">
            Calculate and track MACRS depreciation for your rental properties
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShowImprovementDialog(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Improvement
          </Button>
          <Button onClick={() => setShowNewScheduleDialog(true)}>
            <Plus className="h-4 w-4 mr-2" />
            New Schedule
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Properties</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">
                  {depreciationSchedules.length}
                </p>
                <p className="text-xs text-gray-500 mt-1">with schedules</p>
              </div>
              <Building className="h-8 w-8 text-gray-400" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Current Year</p>
                <p className="text-2xl font-bold text-purple-600 mt-1">
                  ${totalYearlyDepreciation.toLocaleString()}
                </p>
                <p className="text-xs text-gray-500 mt-1">depreciation</p>
              </div>
              <TrendingDown className="h-8 w-8 text-purple-400" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Accumulated</p>
                <p className="text-2xl font-bold text-blue-600 mt-1">
                  ${totalAccumulatedDepreciation.toLocaleString()}
                </p>
                <p className="text-xs text-gray-500 mt-1">total taken</p>
              </div>
              <Calendar className="h-8 w-8 text-blue-400" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Remaining Basis</p>
                <p className="text-2xl font-bold text-green-600 mt-1">
                  ${totalRemainingBasis.toLocaleString()}
                </p>
                <p className="text-xs text-gray-500 mt-1">to depreciate</p>
              </div>
              <DollarSign className="h-8 w-8 text-green-400" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Info Alert */}
      <Card className="border-blue-200 bg-blue-50">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <Info className="h-5 w-5 text-blue-600 mt-0.5" />
            <div>
              <h3 className="font-semibold text-blue-900">About MACRS Depreciation</h3>
              <p className="text-sm text-blue-800 mt-1">
                Residential rental properties use a 27.5-year recovery period. Commercial properties use 39 years. 
                The IRS requires using the mid-month convention, meaning you claim half a month's depreciation for 
                the month the property is placed in service.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Depreciation Schedules */}
      <Card>
        <CardHeader>
          <CardTitle>Active Depreciation Schedules</CardTitle>
        </CardHeader>
        <CardContent>
          {depreciationSchedules.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <Calculator className="h-16 w-16 mx-auto mb-4 text-gray-300" />
              <p className="text-lg font-medium">No Depreciation Schedules</p>
              <p className="text-sm mt-1">Create your first schedule to start tracking depreciation</p>
              <Button onClick={() => setShowNewScheduleDialog(true)} className="mt-4">
                <Plus className="h-4 w-4 mr-2" />
                Create Schedule
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {depreciationSchedules.map(schedule => (
                <Card key={schedule.id} className="border-gray-200">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h3 className="font-semibold text-lg">{schedule.propertyAddress}</h3>
                        <div className="flex items-center gap-4 mt-2 text-sm text-gray-600">
                          <span>Purchased: {schedule.purchaseDate.toLocaleDateString()}</span>
                          <Badge variant="outline">{schedule.recoveryPeriod} years</Badge>
                          <Badge variant="outline">{schedule.depreciationMethod}</Badge>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteSchedule(schedule.id)}
                      >
                        <Trash2 className="h-4 w-4 text-red-600" />
                      </Button>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-4">
                      <div className="p-3 bg-gray-50 rounded-lg">
                        <p className="text-xs text-gray-600">Purchase Price</p>
                        <p className="text-sm font-semibold mt-1">
                          ${schedule.purchasePrice.toLocaleString()}
                        </p>
                      </div>
                      <div className="p-3 bg-gray-50 rounded-lg">
                        <p className="text-xs text-gray-600">Land Value</p>
                        <p className="text-sm font-semibold mt-1">
                          ${schedule.landValue.toLocaleString()}
                        </p>
                      </div>
                      <div className="p-3 bg-gray-50 rounded-lg">
                        <p className="text-xs text-gray-600">Building Value</p>
                        <p className="text-sm font-semibold mt-1">
                          ${schedule.buildingValue.toLocaleString()}
                        </p>
                      </div>
                      <div className="p-3 bg-purple-50 rounded-lg">
                        <p className="text-xs text-purple-600">Annual Depreciation</p>
                        <p className="text-sm font-semibold text-purple-600 mt-1">
                          ${schedule.yearlyDepreciation.toLocaleString()}
                        </p>
                      </div>
                      <div className="p-3 bg-blue-50 rounded-lg">
                        <p className="text-xs text-blue-600">Accumulated</p>
                        <p className="text-sm font-semibold text-blue-600 mt-1">
                          ${schedule.accumulatedDepreciation.toLocaleString()}
                        </p>
                      </div>
                    </div>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedProperty(landlordProperties.find(p => p.id === schedule.propertyId) || null)}
                    >
                      View Full Schedule
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Capital Improvements */}
      <Card>
        <CardHeader>
          <CardTitle>Capital Improvements</CardTitle>
        </CardHeader>
        <CardContent>
          {capitalImprovements.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <p className="text-sm">No capital improvements tracked</p>
              <Button variant="outline" onClick={() => setShowImprovementDialog(true)} className="mt-3" size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Add Improvement
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {capitalImprovements.map(improvement => {
                const property = landlordProperties.find(p => p.id === improvement.propertyId);
                const yearsElapsed = currentYear - improvement.depreciationStartYear;
                const annualDepreciation = improvement.cost / improvement.recoveryPeriod;
                const accumulated = Math.min(annualDepreciation * yearsElapsed, improvement.cost);
                
                return (
                  <div key={improvement.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <h4 className="font-semibold">{improvement.description}</h4>
                        <Badge variant="outline">{improvement.recoveryPeriod} years</Badge>
                      </div>
                      <p className="text-sm text-gray-600 mt-1">
                        {property?.details.address.street} • {improvement.date.toLocaleDateString()}
                      </p>
                      <div className="flex items-center gap-4 mt-2 text-sm">
                        <span className="text-gray-600">
                          Cost: <span className="font-semibold">${improvement.cost.toLocaleString()}</span>
                        </span>
                        <span className="text-purple-600">
                          Annual: <span className="font-semibold">${annualDepreciation.toLocaleString()}</span>
                        </span>
                        <span className="text-blue-600">
                          Accumulated: <span className="font-semibold">${accumulated.toLocaleString()}</span>
                        </span>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteImprovement(improvement.id)}
                    >
                      <Trash2 className="h-4 w-4 text-red-600" />
                    </Button>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* New Schedule Dialog */}
      <Dialog open={showNewScheduleDialog} onOpenChange={setShowNewScheduleDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Create Depreciation Schedule</DialogTitle>
            <DialogDescription>
              Enter property purchase information to calculate MACRS depreciation
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {/* Property Selection */}
            <div>
              <Label>Property *</Label>
              <Select
                value={newSchedule.propertyId}
                onValueChange={(value) => setNewSchedule({ ...newSchedule, propertyId: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a property" />
                </SelectTrigger>
                <SelectContent>
                  {landlordProperties
                    .filter(p => !depreciationSchedules.find(s => s.propertyId === p.id))
                    .map(property => (
                      <SelectItem key={property.id} value={property.id}>
                        {property.details.address.street}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>

            {/* Purchase Date */}
            <div>
              <Label>Purchase Date *</Label>
              <Input
                type="date"
                value={newSchedule.purchaseDate}
                onChange={(e) => setNewSchedule({ ...newSchedule, purchaseDate: e.target.value })}
              />
            </div>

            {/* Purchase Price */}
            <div>
              <Label>Purchase Price *</Label>
              <Input
                type="number"
                value={newSchedule.purchasePrice}
                onChange={(e) => setNewSchedule({ ...newSchedule, purchasePrice: parseFloat(e.target.value) || 0 })}
                placeholder="0.00"
                min="0"
                step="1000"
              />
            </div>

            {/* Land Value */}
            <div>
              <Label>Land Value (non-depreciable) *</Label>
              <Input
                type="number"
                value={newSchedule.landValue}
                onChange={(e) => setNewSchedule({ ...newSchedule, landValue: parseFloat(e.target.value) || 0 })}
                placeholder="0.00"
                min="0"
                step="1000"
              />
              <p className="text-xs text-gray-500 mt-1">
                Typically 20-30% of purchase price. Only the building can be depreciated.
              </p>
            </div>

            {/* Building Value (calculated) */}
            <div className="p-3 bg-blue-50 rounded-lg">
              <p className="text-sm font-medium text-blue-900">
                Depreciable Building Value: ${(newSchedule.purchasePrice - newSchedule.landValue).toLocaleString()}
              </p>
            </div>

            {/* Recovery Period */}
            <div>
              <Label>Recovery Period</Label>
              <Select
                value={newSchedule.recoveryPeriod.toString()}
                onValueChange={(value) => setNewSchedule({ ...newSchedule, recoveryPeriod: parseFloat(value) })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="27.5">27.5 years (Residential)</SelectItem>
                  <SelectItem value="39">39 years (Commercial)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setShowNewScheduleDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateSchedule}>
              Create Schedule
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* New Improvement Dialog */}
      <Dialog open={showImprovementDialog} onOpenChange={setShowImprovementDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Capital Improvement</DialogTitle>
            <DialogDescription>
              Track improvements that add value and can be depreciated
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {/* Property Selection */}
            <div>
              <Label>Property *</Label>
              <Select
                value={newImprovement.propertyId}
                onValueChange={(value) => setNewImprovement({ ...newImprovement, propertyId: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a property" />
                </SelectTrigger>
                <SelectContent>
                  {landlordProperties.map(property => (
                    <SelectItem key={property.id} value={property.id}>
                      {property.details.address.street}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Description */}
            <div>
              <Label>Description *</Label>
              <Input
                value={newImprovement.description}
                onChange={(e) => setNewImprovement({ ...newImprovement, description: e.target.value })}
                placeholder="e.g., New roof, HVAC system, kitchen remodel"
              />
            </div>

            {/* Date */}
            <div>
              <Label>Date Placed in Service *</Label>
              <Input
                type="date"
                value={newImprovement.date}
                onChange={(e) => setNewImprovement({ ...newImprovement, date: e.target.value })}
              />
            </div>

            {/* Cost */}
            <div>
              <Label>Cost *</Label>
              <Input
                type="number"
                value={newImprovement.cost}
                onChange={(e) => setNewImprovement({ ...newImprovement, cost: parseFloat(e.target.value) || 0 })}
                placeholder="0.00"
                min="0"
                step="100"
              />
            </div>

            {/* Recovery Period */}
            <div>
              <Label>Recovery Period</Label>
              <Select
                value={newImprovement.recoveryPeriod.toString()}
                onValueChange={(value) => setNewImprovement({ ...newImprovement, recoveryPeriod: parseFloat(value) })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="27.5">27.5 years (Residential)</SelectItem>
                  <SelectItem value="15">15 years (Land improvements)</SelectItem>
                  <SelectItem value="5">5 years (Appliances, carpets)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setShowImprovementDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddImprovement}>
              Add Improvement
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Full Schedule Dialog */}
      {selectedProperty && (
        <Dialog open={!!selectedProperty} onOpenChange={() => setSelectedProperty(null)}>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Depreciation Schedule</DialogTitle>
              <DialogDescription>
                {selectedProperty.details.address.street}
              </DialogDescription>
            </DialogHeader>
            {depreciationSchedules
              .filter(s => s.propertyId === selectedProperty.id)
              .map(schedule => (
                <div key={schedule.id} className="py-4">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Year</TableHead>
                        <TableHead className="text-right">Annual Depreciation</TableHead>
                        <TableHead className="text-right">Accumulated</TableHead>
                        <TableHead className="text-right">Remaining Basis</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {schedule.schedule.map(year => (
                        <TableRow key={year.year} className={year.year === currentYear ? 'bg-blue-50' : ''}>
                          <TableCell className="font-medium">
                            {year.year}
                            {year.year === currentYear && (
                              <Badge variant="outline" className="ml-2">Current</Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-right font-semibold text-purple-600">
                            ${year.depreciation.toLocaleString()}
                          </TableCell>
                          <TableCell className="text-right">
                            ${year.accumulated.toLocaleString()}
                          </TableCell>
                          <TableCell className="text-right">
                            ${year.remaining.toLocaleString()}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  <div className="flex justify-end mt-4">
                    <Button variant="outline" size="sm">
                      <Download className="h-4 w-4 mr-2" />
                      Export Schedule
                    </Button>
                  </div>
                </div>
              ))}
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}