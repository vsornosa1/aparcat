import { describe, expect, it } from 'vitest';
import { haversineMeters, walkingMinutes } from './geo';

describe('haversineMeters', () => {
  it('mide una distancia conocida en metros', () => {
    const valencia = { latitude: 39.4699, longitude: -0.3763 };
    const nearby = { latitude: 39.4709, longitude: -0.3763 };

    expect(haversineMeters(valencia, nearby)).toBeCloseTo(111, 0);
  });

  it('devuelve cero para el mismo punto', () => {
    const point = { latitude: 39.4699, longitude: -0.3763 };

    expect(haversineMeters(point, point)).toBe(0);
  });
});

describe('walkingMinutes', () => {
  it('estima un minuto por cada 80 metros', () => {
    expect(walkingMinutes(80)).toBe(1);
    expect(walkingMinutes(400)).toBe(5);
  });

  it('redondea hacia arriba y admite distancia cero', () => {
    expect(walkingMinutes(81)).toBe(2);
    expect(walkingMinutes(0)).toBe(0);
  });
});
