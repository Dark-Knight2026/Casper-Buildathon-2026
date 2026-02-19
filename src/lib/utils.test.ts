import { describe, it, expect } from 'vitest';
import { pluralize } from './utils';

describe('pluralize', () => {
  it('returns singular form when value is 1', () => {
    expect(pluralize(1, 'Day', 'Days')).toBe('Day');
  });

  it('returns plural form when value is 0', () => {
    expect(pluralize(0, 'Day', 'Days')).toBe('Days');
  });

  it('returns plural form when value is greater than 1', () => {
    expect(pluralize(2, 'Day', 'Days')).toBe('Days');
    expect(pluralize(5, 'Hour', 'Hours')).toBe('Hours');
    expect(pluralize(100, 'Minute', 'Minutes')).toBe('Minutes');
  });

  it('works with lowercase strings', () => {
    expect(pluralize(1, 'day', 'days')).toBe('day');
    expect(pluralize(3, 'day', 'days')).toBe('days');
  });

  it('returns plural form for negative values', () => {
    expect(pluralize(-1, 'Day', 'Days')).toBe('Days');
  });
});
