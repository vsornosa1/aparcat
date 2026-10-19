import { describe, expect, it } from 'vitest';
import { ageMinutes, classifyFreshness, confidenceFor, freshnessScore } from './freshness';

const now = new Date('2026-10-19T22:00:00.000Z');

function minutesAgo(minutes: number): Date {
  return new Date(now.getTime() - minutes * 60_000);
}

describe('classifyFreshness', () => {
  it('marca como live un garaje de hasta 5 minutos', () => {
    expect(classifyFreshness('garage', minutesAgo(0), now)).toBe('live');
    expect(classifyFreshness('garage', minutesAgo(5), now)).toBe('live');
  });

  it('marca como recent un garaje de 6 a 20 minutos', () => {
    expect(classifyFreshness('garage', minutesAgo(6), now)).toBe('recent');
    expect(classifyFreshness('garage', minutesAgo(20), now)).toBe('recent');
  });

  it('marca como stale un garaje de más de 20 minutos', () => {
    expect(classifyFreshness('garage', minutesAgo(21), now)).toBe('stale');
  });

  it('usa umbrales más laxos para la predicción municipal', () => {
    expect(classifyFreshness('street_prediction', minutesAgo(60), now)).toBe('live');
    expect(classifyFreshness('street_prediction', minutesAgo(61), now)).toBe('recent');
    expect(classifyFreshness('street_prediction', minutesAgo(360), now)).toBe('recent');
    expect(classifyFreshness('street_prediction', minutesAgo(361), now)).toBe('stale');
  });

  it('caduca un reporte de la comunidad a los 15 minutos', () => {
    expect(classifyFreshness('community_report', minutesAgo(5), now)).toBe('live');
    expect(classifyFreshness('community_report', minutesAgo(15), now)).toBe('recent');
    expect(classifyFreshness('community_report', minutesAgo(16), now)).toBe('stale');
  });

  it('devuelve unknown sin fecha o con una fecha inválida', () => {
    expect(classifyFreshness('garage', null, now)).toBe('unknown');
    expect(classifyFreshness('garage', new Date('invalid'), now)).toBe('unknown');
  });

  it('trata una fecha futura como recién observada', () => {
    expect(classifyFreshness('garage', new Date(now.getTime() + 5 * 60_000), now)).toBe('live');
  });
});

describe('confidenceFor', () => {
  it('da confianza alta a un dato en vivo con disponibilidad', () => {
    expect(confidenceFor('live', 0.8)).toBe('high');
  });

  it('da confianza media a un dato reciente', () => {
    expect(confidenceFor('recent', 0.5)).toBe('medium');
  });

  it('da confianza baja a un dato obsoleto o desconocido', () => {
    expect(confidenceFor('stale', 0.5)).toBe('low');
    expect(confidenceFor('unknown', 0.5)).toBe('low');
  });

  it('nunca da confianza alta si falta la disponibilidad', () => {
    expect(confidenceFor('live', null)).toBe('low');
  });
});

describe('freshnessScore', () => {
  it('ordena live > recent > stale > unknown', () => {
    expect(freshnessScore('live')).toBeGreaterThan(freshnessScore('recent'));
    expect(freshnessScore('recent')).toBeGreaterThan(freshnessScore('stale'));
    expect(freshnessScore('stale')).toBeGreaterThan(freshnessScore('unknown'));
  });
});

describe('ageMinutes', () => {
  it('redondea la antigüedad al minuto más cercano', () => {
    expect(ageMinutes(minutesAgo(2), now)).toBe(2);
    expect(ageMinutes(new Date(now.getTime() - 90_000), now)).toBe(2);
  });

  it('devuelve cero para fechas futuras y null sin fecha', () => {
    expect(ageMinutes(new Date(now.getTime() + 60_000), now)).toBe(0);
    expect(ageMinutes(null, now)).toBeNull();
  });
});
