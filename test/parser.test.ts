import { describe, it, expect } from 'vitest';
import Srf from '..';

describe('parser functions', () => {
  it('should export parseUri', () => {
    const { parseUri } = Srf;
    expect(typeof parseUri).toBe('function');
  });
});
