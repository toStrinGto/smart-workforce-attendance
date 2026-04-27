import { describe, expect, it } from 'vitest';
import { formatCompactAmount } from './formatAmount';

describe('formatCompactAmount', () => {
  it('compacts large numeric amounts with Chinese units', () => {
    expect(formatCompactAmount(68200000)).toBe('6820万');
    expect(formatCompactAmount(1907500)).toBe('190.75万');
  });

  it('keeps smaller amounts readable with separators', () => {
    expect(formatCompactAmount(5775.33)).toBe('5,775.33');
    expect(formatCompactAmount(2300)).toBe('2,300');
  });

  it('passes through already abbreviated strings', () => {
    expect(formatCompactAmount('45.2M')).toBe('45.2M');
  });
});
