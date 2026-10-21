import { describe, expect, it } from 'vitest';
import { garageAvailability } from './availability';

describe('garageAvailability', () => {
  it('calcula la proporción de plazas libres', () => {
    expect(garageAvailability(365, 371)).toBeCloseTo(0.9838, 4);
  });

  it('devuelve null cuando el Ayuntamiento usa el centinela -1', () => {
    expect(garageAvailability(-1, 192)).toBeNull();
  });

  it('devuelve null cuando no hay aforo o es cero', () => {
    expect(garageAvailability(10, 0)).toBeNull();
    expect(garageAvailability(10, null)).toBeNull();
  });

  it('devuelve null cuando faltan las plazas libres', () => {
    expect(garageAvailability(null, 300)).toBeNull();
  });

  it('acota valores incoherentes al rango 0..1', () => {
    expect(garageAvailability(400, 300)).toBe(1);
  });
});
