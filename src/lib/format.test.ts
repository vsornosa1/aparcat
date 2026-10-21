import { describe, expect, it } from 'vitest';
import { formatFreeSpaces } from './format';

describe('formatFreeSpaces', () => {
  it('usa el singular para una plaza', () => {
    expect(formatFreeSpaces(1)).toBe('1 plaza libre');
  });

  it('usa el plural para cero y varias plazas', () => {
    expect(formatFreeSpaces(0)).toBe('0 plazas libres');
    expect(formatFreeSpaces(37)).toBe('37 plazas libres');
  });
});
