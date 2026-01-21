/**
 * Filter utilities for advanced filtering functionality
 */

export type FilterOperator =
  | 'equals'
  | 'notEquals'
  | 'contains'
  | 'notContains'
  | 'startsWith'
  | 'endsWith'
  | 'greaterThan'
  | 'lessThan'
  | 'greaterThanOrEqual'
  | 'lessThanOrEqual'
  | 'between'
  | 'in'
  | 'notIn'
  | 'isEmpty'
  | 'isNotEmpty';

export type FilterType = 'text' | 'number' | 'date' | 'select' | 'multiSelect' | 'boolean';

export type FilterCondition = {
  id: string;
  field: string;
  operator: FilterOperator;
  value: string | number | boolean | string[] | number[] | null;
  type: FilterType;
};

export type FilterGroup = {
  id: string;
  logic: 'AND' | 'OR';
  conditions: FilterCondition[];
};

export type FilterPreset = {
  id: string;
  name: string;
  description?: string;
  filters: FilterGroup;
  createdAt: Date;
  updatedAt: Date;
};

/**
 * Get available operators for a filter type
 */
export function getOperatorsForType(type: FilterType): FilterOperator[] {
  switch (type) {
    case 'text':
      return [
        'equals',
        'notEquals',
        'contains',
        'notContains',
        'startsWith',
        'endsWith',
        'isEmpty',
        'isNotEmpty',
      ];
    case 'number':
      return [
        'equals',
        'notEquals',
        'greaterThan',
        'lessThan',
        'greaterThanOrEqual',
        'lessThanOrEqual',
        'between',
        'isEmpty',
        'isNotEmpty',
      ];
    case 'date':
      return [
        'equals',
        'notEquals',
        'greaterThan',
        'lessThan',
        'greaterThanOrEqual',
        'lessThanOrEqual',
        'between',
        'isEmpty',
        'isNotEmpty',
      ];
    case 'select':
      return ['equals', 'notEquals', 'in', 'notIn', 'isEmpty', 'isNotEmpty'];
    case 'multiSelect':
      return ['in', 'notIn', 'isEmpty', 'isNotEmpty'];
    case 'boolean':
      return ['equals'];
    default:
      return ['equals', 'notEquals'];
  }
}

/**
 * Get operator label
 */
export function getOperatorLabel(operator: FilterOperator): string {
  const labels: Record<FilterOperator, string> = {
    equals: 'Equals',
    notEquals: 'Not Equals',
    contains: 'Contains',
    notContains: 'Does Not Contain',
    startsWith: 'Starts With',
    endsWith: 'Ends With',
    greaterThan: 'Greater Than',
    lessThan: 'Less Than',
    greaterThanOrEqual: 'Greater Than or Equal',
    lessThanOrEqual: 'Less Than or Equal',
    between: 'Between',
    in: 'In',
    notIn: 'Not In',
    isEmpty: 'Is Empty',
    isNotEmpty: 'Is Not Empty',
  };
  return labels[operator];
}

/**
 * Check if operator requires a value input
 */
export function operatorRequiresValue(operator: FilterOperator): boolean {
  return !['isEmpty', 'isNotEmpty'].includes(operator);
}

/**
 * Check if operator requires two values (e.g., between)
 */
export function operatorRequiresTwoValues(operator: FilterOperator): boolean {
  return operator === 'between';
}

/**
 * Apply filter condition to a value
 */
export function applyFilterCondition(
  value: unknown,
  condition: FilterCondition
): boolean {
  const { operator, value: filterValue } = condition;

  // Handle empty checks
  if (operator === 'isEmpty') {
    return value === null || value === undefined || value === '';
  }
  if (operator === 'isNotEmpty') {
    return value !== null && value !== undefined && value !== '';
  }

  // Convert value to string for text operations
  const stringValue = String(value).toLowerCase();
  const stringFilterValue = String(filterValue).toLowerCase();

  switch (operator) {
    case 'equals':
      return value === filterValue;
    case 'notEquals':
      return value !== filterValue;
    case 'contains':
      return stringValue.includes(stringFilterValue);
    case 'notContains':
      return !stringValue.includes(stringFilterValue);
    case 'startsWith':
      return stringValue.startsWith(stringFilterValue);
    case 'endsWith':
      return stringValue.endsWith(stringFilterValue);
    case 'greaterThan':
      return Number(value) > Number(filterValue);
    case 'lessThan':
      return Number(value) < Number(filterValue);
    case 'greaterThanOrEqual':
      return Number(value) >= Number(filterValue);
    case 'lessThanOrEqual':
      return Number(value) <= Number(filterValue);
    case 'between':
      if (Array.isArray(filterValue) && filterValue.length === 2) {
        const numValue = Number(value);
        return numValue >= Number(filterValue[0]) && numValue <= Number(filterValue[1]);
      }
      return false;
    case 'in':
      if (Array.isArray(filterValue)) {
        return filterValue.includes(value as string | number);
      }
      return false;
    case 'notIn':
      if (Array.isArray(filterValue)) {
        return !filterValue.includes(value as string | number);
      }
      return false;
    default:
      return true;
  }
}

/**
 * Apply filter group to data
 */
export function applyFilterGroup<T extends Record<string, unknown>>(
  data: T[],
  filterGroup: FilterGroup
): T[] {
  if (filterGroup.conditions.length === 0) {
    return data;
  }

  return data.filter((item) => {
    const results = filterGroup.conditions.map((condition) => {
      const value = item[condition.field];
      return applyFilterCondition(value, condition);
    });

    // Apply logic (AND/OR)
    if (filterGroup.logic === 'AND') {
      return results.every((result) => result);
    } else {
      return results.some((result) => result);
    }
  });
}

/**
 * Generate a unique ID for filters
 */
export function generateFilterId(): string {
  return `filter_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Create a default filter condition
 */
export function createDefaultCondition(
  field: string,
  type: FilterType
): FilterCondition {
  return {
    id: generateFilterId(),
    field,
    operator: getOperatorsForType(type)[0],
    value: null,
    type,
  };
}

/**
 * Create a default filter group
 */
export function createDefaultFilterGroup(): FilterGroup {
  return {
    id: generateFilterId(),
    logic: 'AND',
    conditions: [],
  };
}

/**
 * Validate filter condition
 */
export function validateFilterCondition(condition: FilterCondition): boolean {
  // Check if operator requires value
  if (operatorRequiresValue(condition.operator)) {
    if (condition.value === null || condition.value === undefined || condition.value === '') {
      return false;
    }

    // Check for between operator
    if (operatorRequiresTwoValues(condition.operator)) {
      if (!Array.isArray(condition.value) || condition.value.length !== 2) {
        return false;
      }
      if (condition.value[0] === null || condition.value[1] === null) {
        return false;
      }
    }
  }

  return true;
}

/**
 * Validate filter group
 */
export function validateFilterGroup(filterGroup: FilterGroup): boolean {
  if (filterGroup.conditions.length === 0) {
    return false;
  }

  return filterGroup.conditions.every((condition) =>
    validateFilterCondition(condition)
  );
}

/**
 * Convert filter group to human-readable string
 */
export function filterGroupToString(filterGroup: FilterGroup): string {
  if (filterGroup.conditions.length === 0) {
    return 'No filters applied';
  }

  const conditionStrings = filterGroup.conditions.map((condition) => {
    const operatorLabel = getOperatorLabel(condition.operator);
    const valueStr = Array.isArray(condition.value)
      ? condition.value.join(', ')
      : String(condition.value);

    if (!operatorRequiresValue(condition.operator)) {
      return `${condition.field} ${operatorLabel}`;
    }

    return `${condition.field} ${operatorLabel} ${valueStr}`;
  });

  return conditionStrings.join(` ${filterGroup.logic} `);
}

/**
 * Save filter preset to localStorage
 */
export function saveFilterPreset(preset: FilterPreset): void {
  const presets = getFilterPresets();
  const existingIndex = presets.findIndex((p) => p.id === preset.id);

  if (existingIndex >= 0) {
    presets[existingIndex] = { ...preset, updatedAt: new Date() };
  } else {
    presets.push(preset);
  }

  localStorage.setItem('filterPresets', JSON.stringify(presets));
}

/**
 * Get all filter presets from localStorage
 */
export function getFilterPresets(): FilterPreset[] {
  const presetsJson = localStorage.getItem('filterPresets');
  if (!presetsJson) {
    return [];
  }

  try {
    const presets = JSON.parse(presetsJson);
    // Convert date strings back to Date objects
    return presets.map((preset: FilterPreset) => ({
      ...preset,
      createdAt: new Date(preset.createdAt),
      updatedAt: new Date(preset.updatedAt),
    }));
  } catch {
    return [];
  }
}

/**
 * Delete filter preset from localStorage
 */
export function deleteFilterPreset(presetId: string): void {
  const presets = getFilterPresets();
  const filtered = presets.filter((p) => p.id !== presetId);
  localStorage.setItem('filterPresets', JSON.stringify(filtered));
}

/**
 * Get filter preset by ID
 */
export function getFilterPresetById(presetId: string): FilterPreset | null {
  const presets = getFilterPresets();
  return presets.find((p) => p.id === presetId) || null;
}