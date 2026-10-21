import { describe, expect, it } from 'vitest';
import { formatFreeSpaces, formatPlaceName, spacesTone } from './format';

describe('formatFreeSpaces', () => {
  it('usa el singular para una plaza', () => {
    expect(formatFreeSpaces(1)).toBe('1 plaza libre');
  });

  it('usa el plural para cero y varias plazas', () => {
    expect(formatFreeSpaces(0)).toBe('0 plazas libres');
    expect(formatFreeSpaces(37)).toBe('37 plazas libres');
  });

  it('devuelve Sin datos cuando falta el dato', () => {
    expect(formatFreeSpaces(null)).toBe('Sin datos');
    expect(formatFreeSpaces(undefined)).toBe('Sin datos');
  });
});

describe('spacesTone', () => {
  it('clasifica por plazas absolutas, no por porcentaje', () => {
    expect(spacesTone(74)).toBe('high');
    expect(spacesTone(20)).toBe('high');
    expect(spacesTone(19)).toBe('medium');
    expect(spacesTone(5)).toBe('medium');
    expect(spacesTone(4)).toBe('low');
    expect(spacesTone(0)).toBe('low');
  });

  it('devuelve unknown sin dato', () => {
    expect(spacesTone(null)).toBe('unknown');
    expect(spacesTone(undefined)).toBe('unknown');
  });
});

describe('formatPlaceName', () => {
  it('pasa los nombres en mayúsculas a formato título', () => {
    expect(formatPlaceName('AVINGUDA DE L’OEST')).toBe('Avinguda de l’Oest');
    expect(formatPlaceName('CENTRE HISTÒRIC-MERCAT CENTRAL')).toBe(
      'Centre Històric-Mercat Central',
    );
    expect(formatPlaceName('MARTI GRAJALES (MERCADO DEL CABAÑAL)')).toBe(
      'Marti Grajales (Mercado del Cabañal)',
    );
    expect(formatPlaceName('DR. WAKSMAN')).toBe('Dr. Waksman');
    expect(formatPlaceName('REINA ')).toBe('Reina');
  });

  it('respeta los nombres que ya tienen minúsculas', () => {
    expect(formatPlaceName('Garaje de prueba')).toBe('Garaje de prueba');
  });
});
