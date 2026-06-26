import React, { useState } from 'react';
import { X, Plus, Save, Trash2, Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { toast } from '@/lib/toast';
import {
  FilterGroup,
  FilterCondition,
  FilterType,
  FilterPreset,
  createDefaultCondition,
  createDefaultFilterGroup,
  getOperatorsForType,
  getOperatorLabel,
  operatorRequiresValue,
  operatorRequiresTwoValues,
  validateFilterGroup,
  filterGroupToString,
  saveFilterPreset,
  getFilterPresets,
  deleteFilterPreset,
  generateFilterId,
} from '@/lib/filterUtils';
import { cn } from '@/lib/utils';

interface FilterField {
  key: string;
  label: string;
  type: FilterType;
  options?: Array<{ label: string; value: string | number }>;
}

interface FilterPanelProps {
  fields: FilterField[];
  filterGroup: FilterGroup;
  onFilterChange: (filterGroup: FilterGroup) => void;
  onClear: () => void;
  className?: string;
}

/**
 * Advanced filter panel with multiple conditions, AND/OR logic, and saved presets
 */
export const FilterPanel: React.FC<FilterPanelProps> = ({
  fields,
  filterGroup,
  onFilterChange,
  onClear,
  className,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [presets, setPresets] = useState<FilterPreset[]>(getFilterPresets());
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [presetName, setPresetName] = useState('');
  const [presetDescription, setPresetDescription] = useState('');

  const handleAddCondition = () => {
    const firstField = fields[0];
    if (!firstField) return;

    const newCondition = createDefaultCondition(firstField.key, firstField.type);
    onFilterChange({
      ...filterGroup,
      conditions: [...filterGroup.conditions, newCondition],
    });
  };

  const handleRemoveCondition = (conditionId: string) => {
    onFilterChange({
      ...filterGroup,
      conditions: filterGroup.conditions.filter((c) => c.id !== conditionId),
    });
  };

  const handleUpdateCondition = (
    conditionId: string,
    updates: Partial<FilterCondition>
  ) => {
    onFilterChange({
      ...filterGroup,
      conditions: filterGroup.conditions.map((c) =>
        c.id === conditionId ? { ...c, ...updates } : c
      ),
    });
  };

  const handleLogicChange = (logic: 'AND' | 'OR') => {
    onFilterChange({
      ...filterGroup,
      logic,
    });
  };

  const handleSavePreset = () => {
    if (!presetName.trim()) {
      toast.error('Please enter a preset name');
      return;
    }

    if (!validateFilterGroup(filterGroup)) {
      toast.error('Please complete all filter conditions');
      return;
    }

    const preset: FilterPreset = {
      id: generateFilterId(),
      name: presetName.trim(),
      description: presetDescription.trim() || undefined,
      filters: filterGroup,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    saveFilterPreset(preset);
    setPresets(getFilterPresets());
    setPresetName('');
    setPresetDescription('');
    setSaveDialogOpen(false);
    toast.success('Filter preset saved');
  };

  const handleLoadPreset = (preset: FilterPreset) => {
    onFilterChange(preset.filters);
    setIsOpen(false);
    toast.success(`Loaded preset: ${preset.name}`);
  };

  const handleDeletePreset = (presetId: string) => {
    deleteFilterPreset(presetId);
    setPresets(getFilterPresets());
    toast.success('Preset deleted');
  };

  const getFieldByKey = (key: string): FilterField | undefined => {
    return fields.find((f) => f.key === key);
  };

  const activeFiltersCount = filterGroup.conditions.length;

  return (
    <div className={cn('space-y-2', className)}>
      {/* Filter Button & Active Filters */}
      <div className="flex items-center gap-2 flex-wrap">
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm">
              <Filter className="mr-2 h-4 w-4" />
              Filters
              {activeFiltersCount > 0 && (
                <Badge variant="secondary" className="ml-2">
                  {activeFiltersCount}
                </Badge>
              )}
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Advanced Filters</DialogTitle>
              <DialogDescription>
                Add multiple conditions to filter your data. Use AND/OR logic to combine
                conditions.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              {/* Logic Selector */}
              {filterGroup.conditions.length > 1 && (
                <div className="flex items-center gap-2">
                  <Label>Match</Label>
                  <Select
                    value={filterGroup.logic}
                    onValueChange={(value) => handleLogicChange(value as 'AND' | 'OR')}
                  >
                    <SelectTrigger className="w-[120px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="AND">All (AND)</SelectItem>
                      <SelectItem value="OR">Any (OR)</SelectItem>
                    </SelectContent>
                  </Select>
                  <span className="text-sm text-muted-foreground">
                    of the following conditions:
                  </span>
                </div>
              )}

              {/* Filter Conditions */}
              <div className="space-y-3">
                {filterGroup.conditions.map((condition, index) => {
                  const field = getFieldByKey(condition.field);
                  if (!field) return null;

                  const operators = getOperatorsForType(field.type);
                  const requiresValue = operatorRequiresValue(condition.operator);
                  const requiresTwoValues = operatorRequiresTwoValues(condition.operator);

                  return (
                    <Card key={condition.id}>
                      <CardContent className="p-4">
                        <div className="flex items-start gap-2">
                          <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-2">
                            {/* Field Selector */}
                            <div>
                              <Label className="text-xs">Field</Label>
                              <Select
                                value={condition.field}
                                onValueChange={(value) => {
                                  const newField = getFieldByKey(value);
                                  if (newField) {
                                    handleUpdateCondition(condition.id, {
                                      field: value,
                                      type: newField.type,
                                      operator: getOperatorsForType(newField.type)[0],
                                      value: null,
                                    });
                                  }
                                }}
                              >
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {fields.map((f) => (
                                    <SelectItem key={f.key} value={f.key}>
                                      {f.label}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>

                            {/* Operator Selector */}
                            <div>
                              <Label className="text-xs">Operator</Label>
                              <Select
                                value={condition.operator}
                                onValueChange={(value) =>
                                  handleUpdateCondition(condition.id, {
                                    operator: value as FilterCondition['operator'],
                                    value: null,
                                  })
                                }
                              >
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {operators.map((op) => (
                                    <SelectItem key={op} value={op}>
                                      {getOperatorLabel(op)}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>

                            {/* Value Input */}
                            {requiresValue && (
                              <div>
                                <Label className="text-xs">Value</Label>
                                {field.type === 'select' && field.options ? (
                                  <Select
                                    value={String(condition.value || '')}
                                    onValueChange={(value) =>
                                      handleUpdateCondition(condition.id, { value })
                                    }
                                  >
                                    <SelectTrigger>
                                      <SelectValue placeholder="Select value" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {field.options.map((opt) => (
                                        <SelectItem key={opt.value} value={String(opt.value)}>
                                          {opt.label}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                ) : requiresTwoValues ? (
                                  <div className="flex gap-1">
                                    <Input
                                      type={field.type === 'number' ? 'number' : 'text'}
                                      placeholder="Min"
                                      value={
                                        Array.isArray(condition.value)
                                          ? condition.value[0] || ''
                                          : ''
                                      }
                                      onChange={(e) => {
                                        const currentValue = Array.isArray(condition.value)
                                          ? condition.value
                                          : [null, null];
                                        handleUpdateCondition(condition.id, {
                                          value: [e.target.value, currentValue[1]],
                                        });
                                      }}
                                    />
                                    <Input
                                      type={field.type === 'number' ? 'number' : 'text'}
                                      placeholder="Max"
                                      value={
                                        Array.isArray(condition.value)
                                          ? condition.value[1] || ''
                                          : ''
                                      }
                                      onChange={(e) => {
                                        const currentValue = Array.isArray(condition.value)
                                          ? condition.value
                                          : [null, null];
                                        handleUpdateCondition(condition.id, {
                                          value: [currentValue[0], e.target.value],
                                        });
                                      }}
                                    />
                                  </div>
                                ) : (
                                  <Input
                                    type={
                                      field.type === 'number'
                                        ? 'number'
                                        : field.type === 'date'
                                        ? 'date'
                                        : 'text'
                                    }
                                    placeholder="Enter value"
                                    value={String(condition.value || '')}
                                    onChange={(e) =>
                                      handleUpdateCondition(condition.id, {
                                        value: e.target.value,
                                      })
                                    }
                                  />
                                )}
                              </div>
                            )}
                          </div>

                          {/* Remove Button */}
                          <Button
                            variant="ghost"
                            size="icon"
                            className="mt-6"
                            onClick={() => handleRemoveCondition(condition.id)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>

              {/* Add Condition Button */}
              <Button variant="outline" size="sm" onClick={handleAddCondition}>
                <Plus className="mr-2 h-4 w-4" />
                Add Condition
              </Button>

              {/* Saved Presets */}
              {presets.length > 0 && (
                <div className="space-y-2">
                  <Label>Saved Presets</Label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {presets.map((preset) => (
                      <Card key={preset.id} className="cursor-pointer hover:bg-accent">
                        <CardContent className="p-3">
                          <div className="flex items-start justify-between">
                            <div
                              className="flex-1"
                              onClick={() => handleLoadPreset(preset)}
                            >
                              <div className="font-medium text-sm">{preset.name}</div>
                              {preset.description && (
                                <div className="text-xs text-muted-foreground">
                                  {preset.description}
                                </div>
                              )}
                              <div className="text-xs text-muted-foreground mt-1">
                                {preset.filters.conditions.length} condition(s)
                              </div>
                            </div>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeletePreset(preset.id);
                              }}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <DialogFooter className="flex justify-between">
              <div className="flex gap-2">
                <Button variant="outline" onClick={onClear}>
                  Clear All
                </Button>
                <Dialog open={saveDialogOpen} onOpenChange={setSaveDialogOpen}>
                  <DialogTrigger asChild>
                    <Button
                      variant="outline"
                      disabled={filterGroup.conditions.length === 0}
                    >
                      <Save className="mr-2 h-4 w-4" />
                      Save Preset
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Save Filter Preset</DialogTitle>
                      <DialogDescription>
                        Save your current filters as a preset for quick access later.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div>
                        <Label htmlFor="preset-name">Preset Name</Label>
                        <Input
                          id="preset-name"
                          placeholder="e.g., Active Properties"
                          value={presetName}
                          onChange={(e) => setPresetName(e.target.value)}
                        />
                      </div>
                      <div>
                        <Label htmlFor="preset-description">
                          Description (optional)
                        </Label>
                        <Input
                          id="preset-description"
                          placeholder="Brief description of this filter"
                          value={presetDescription}
                          onChange={(e) => setPresetDescription(e.target.value)}
                        />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setSaveDialogOpen(false)}>
                        Cancel
                      </Button>
                      <Button onClick={handleSavePreset}>Save</Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
              <Button onClick={() => setIsOpen(false)}>Apply Filters</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Active Filter Chips */}
        {filterGroup.conditions.length > 0 && (
          <>
            {filterGroup.conditions.map((condition) => {
              const field = getFieldByKey(condition.field);
              if (!field) return null;

              const operatorLabel = getOperatorLabel(condition.operator);
              const valueStr = Array.isArray(condition.value)
                ? condition.value.join(' - ')
                : String(condition.value || '');

              return (
                <Badge key={condition.id} variant="secondary" className="gap-1">
                  <span>
                    {field.label} {operatorLabel}
                    {operatorRequiresValue(condition.operator) && `: ${valueStr}`}
                  </span>
                  <X
                    className="h-3 w-3 cursor-pointer"
                    onClick={() => handleRemoveCondition(condition.id)}
                  />
                </Badge>
              );
            })}
            <Button variant="ghost" size="sm" onClick={onClear}>
              Clear All
            </Button>
          </>
        )}
      </div>
    </div>
  );
};