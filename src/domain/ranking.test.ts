import { describe, expect, it } from 'vitest';
import { DEFAULT_WEIGHTS, rankCandidates } from './ranking';
import type { CandidateInput } from './types';

const now = new Date('2026-10-19T22:00:00.000Z');
const twoMinutesAgo = new Date(now.getTime() - 2 * 60_000);
const threeHoursAgo = new Date(now.getTime() - 3 * 60 * 60_000);

function candidate(overrides: Partial<CandidateInput> = {}): CandidateInput {
  return {
    id: 'garage-78',
    kind: 'garage',
    name: 'Severo Ochoa',
    distanceMeters: 300,
    availability: 0.8,
    observedAt: twoMinutesAgo,
    signal: 'garage',
    ...overrides,
  };
}

describe('rankCandidates', () => {
  it('ordena por puntuación sin mutar la entrada', () => {
    const input = [
      candidate({ id: 'lejos', distanceMeters: 1_200, availability: 0.4 }),
      candidate({ id: 'cerca', distanceMeters: 200, availability: 0.9 }),
    ];

    const ranked = rankCandidates(input, { now });

    expect(ranked.map((item) => item.id)).toEqual(['cerca', 'lejos']);
    expect(input[0].id).toBe('lejos');
    expect(input[0].availability).toBe(0.4);
  });

  it('nunca coloca primero un candidato sin disponibilidad', () => {
    const ranked = rankCandidates(
      [
        candidate({ id: 'sin-dato', distanceMeters: 0, availability: null }),
        candidate({ id: 'con-dato', distanceMeters: 900, availability: 0.3 }),
      ],
      { now },
    );

    expect(ranked[0].id).toBe('con-dato');
    expect(ranked[1].confidence).toBe('low');
  });

  it('desempata por distancia y después por identificador', () => {
    const ranked = rankCandidates(
      [
        candidate({ id: 'b', distanceMeters: 200 }),
        candidate({ id: 'a', distanceMeters: 200 }),
        candidate({ id: 'c', distanceMeters: 100 }),
      ],
      { now },
    );

    expect(ranked.map((item) => item.id)).toEqual(['c', 'a', 'b']);
  });

  it('penaliza los datos obsoletos', () => {
    const ranked = rankCandidates(
      [
        candidate({ id: 'antiguo', observedAt: threeHoursAgo }),
        candidate({ id: 'fresco', observedAt: twoMinutesAgo }),
      ],
      { now },
    );

    expect(ranked[0].id).toBe('fresco');
    expect(ranked[1].freshness).toBe('stale');
    expect(ranked[1].confidence).toBe('low');
  });

  it('un reporte negativo reduce la puntuación', () => {
    const neutral = rankCandidates([candidate({ reportSignal: 0 })], { now })[0];
    const negative = rankCandidates([candidate({ reportSignal: -1 })], { now })[0];

    expect(negative.score).toBeLessThan(neutral.score);
  });

  it('un reporte positivo mejora la puntuación', () => {
    const neutral = rankCandidates([candidate({ reportSignal: 0 })], { now })[0];
    const positive = rankCandidates([candidate({ reportSignal: 1 })], { now })[0];

    expect(positive.score).toBeGreaterThan(neutral.score);
  });

  it('respeta los pesos configurados', () => {
    const ranked = rankCandidates(
      [
        candidate({ id: 'cerca-pero-lleno', distanceMeters: 50, availability: 0.1 }),
        candidate({ id: 'lejos-pero-libre', distanceMeters: 1_500, availability: 0.95 }),
      ],
      {
        now,
        weights: { availability: 1, proximity: 0, freshness: 0, report: 0 },
      },
    );

    expect(ranked[0].id).toBe('lejos-pero-libre');
  });

  it('explica la recomendación con frescura y confianza', () => {
    const [garage] = rankCandidates([candidate()], { now });
    expect(garage.reason).toContain('plazas libres');
    expect(garage.reason).toContain('hace 2 min');
    expect(garage.confidence).toBe('high');
    expect(garage.walkingMinutes).toBe(4);
  });

  it('marca sin datos y confianza baja cuando falta la disponibilidad', () => {
    const [item] = rankCandidates(
      [candidate({ availability: null, observedAt: null, signal: 'garage' })],
      { now },
    );

    expect(item.score).toBe(0);
    expect(item.freshness).toBe('unknown');
    expect(item.confidence).toBe('low');
    expect(item.reason).toContain('Sin datos');
  });

  it('acota la puntuación al rango 0..1', () => {
    const [item] = rankCandidates(
      [candidate({ availability: 1, distanceMeters: 0, reportSignal: 1 })],
      { now },
    );

    expect(item.score).toBeLessThanOrEqual(1);
    expect(item.score).toBeGreaterThanOrEqual(0);
  });

  it('devuelve una lista vacía sin candidatos', () => {
    expect(rankCandidates([], { now })).toEqual([]);
  });

  it('es determinista con candidatos equivalentes', () => {
    const inputs = [candidate({ id: 'b' }), candidate({ id: 'a' })];
    const forward = rankCandidates(inputs, { now }).map((item) => item.id);
    const backward = rankCandidates([...inputs].reverse(), { now }).map((item) => item.id);

    expect(forward).toEqual(backward);
  });

  it('expone los pesos por defecto del plan', () => {
    expect(DEFAULT_WEIGHTS).toEqual({
      availability: 0.45,
      proximity: 0.3,
      freshness: 0.15,
      report: 0.1,
    });
  });
});
