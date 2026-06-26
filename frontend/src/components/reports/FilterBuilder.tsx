/**
 * Filter Builder Component
 * Build custom filters for reports
 */

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, X } from 'lucide-react';
import type { ReportFilter } from '@/types/report';

interface FilterBuilderProps {
  filters: ReportFilter[];
  onChange: (filters: ReportFilter[]) => void;
}

export function FilterBuilder({ filters, onChange }: FilterBuilderProps) {
  const [showAddFilter, setShowAddFilter] = useState(false);
  const [newFilterField, setNewFilterField] = useState('');
  const [newFilterOperator, setNewFilterOperator] = useState<ReportFilter['operator']>('equals');
  const [newFilterValue, setNewFilterValue] = useState('');

  const handleAddFilter = () => {
    if (!newFilterField || !newFilterValue) return;

    const newFilter: ReportFilter = {
      id: `filter_${Date.now()}`,
      field: newFilterField,
      operator: newFilterOperator,
      value: newFilterValue,
    };

    onChange([...filters, newFilter]);
    setNewFilterField('');
    setNewFilterValue('');
    setShowAddFilter(false);
  };

  const handleRemoveFilter = (filterId: string) => {
    onChange(filters.filter((f) => f.id !== filterId));
  };

  return (
    <div className="space-y-3">
      {filters.map((filter) => (
        <div key={filter.id} className="flex items-center gap-2 p-3 border rounded-lg bg-gray-50">
          <div className="flex-1">
            <p className="text-sm">
              <span className="font-medium">{filter.field}</span>{' '}
              <span className="text-gray-600">{filter.operator.replace('_', ' ')}</span>{' '}
              <span className="font-medium">{filter.value}</span>
            </p>
          </div>
          <Button variant="ghost" size="sm" onClick={() => handleRemoveFilter(filter.id)}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      ))}

      {showAddFilter ? (
        <div className="space-y-3 p-4 border rounded-lg bg-gray-50">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <Select value={newFilterField} onValueChange={setNewFilterField}>
              <SelectTrigger>
                <SelectValue placeholder="Select field" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="property">Property</SelectItem>
                <SelectItem value="revenue">Revenue</SelectItem>
                <SelectItem value="expenses">Expenses</SelectItem>
                <SelectItem value="occupancy_rate">Occupancy Rate</SelectItem>
                <SelectItem value="tenant">Tenant</SelectItem>
              </SelectContent>
            </Select>

            <Select value={newFilterOperator} onValueChange={(v) => setNewFilterOperator(v as ReportFilter['operator'])}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="equals">Equals</SelectItem>
                <SelectItem value="not_equals">Not Equals</SelectItem>
                <SelectItem value="greater_than">Greater Than</SelectItem>
                <SelectItem value="less_than">Less Than</SelectItem>
                <SelectItem value="contains">Contains</SelectItem>
              </SelectContent>
            </Select>

            <Input
              placeholder="Value"
              value={newFilterValue}
              onChange={(e) => setNewFilterValue(e.target.value)}
            />
          </div>

          <div className="flex gap-2">
            <Button size="sm" onClick={handleAddFilter}>
              Add Filter
            </Button>
            <Button size="sm" variant="outline" onClick={() => setShowAddFilter(false)}>
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        <Button variant="outline" size="sm" onClick={() => setShowAddFilter(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Add Filter
        </Button>
      )}
    </div>
  );
}