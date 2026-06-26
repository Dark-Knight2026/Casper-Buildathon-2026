import { describe, it, expect } from 'vitest';
import { diffMediaOrder } from '@/hooks/useListingMedia';

describe('diffMediaOrder', () => {
  it('returns null when nothing changed', () => {
    expect(diffMediaOrder(['a', 'b', 'c'], ['a', 'b', 'c'])).toBeNull();
  });

  it('returns null for two empty sets', () => {
    expect(diffMediaOrder([], [])).toBeNull();
  });

  it('detects a removal (remove only, no order)', () => {
    expect(diffMediaOrder(['a', 'b', 'c'], ['a', 'c'])).toEqual({
      order: ['a', 'c'],
      remove: ['b'],
    });
  });

  it('detects a reorder (order only, no remove)', () => {
    expect(diffMediaOrder(['a', 'b', 'c'], ['c', 'a', 'b'])).toEqual({
      order: ['c', 'a', 'b'],
      remove: undefined,
    });
  });

  it('detects removal + reorder together', () => {
    expect(diffMediaOrder(['a', 'b', 'c'], ['c', 'a'])).toEqual({
      order: ['c', 'a'],
      remove: ['b'],
    });
  });

  it('omits `order` when everything was removed', () => {
    expect(diffMediaOrder(['a', 'b'], [])).toEqual({
      order: undefined,
      remove: ['a', 'b'],
    });
  });
});
