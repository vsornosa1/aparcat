import { walkingMinutes } from './geo';
import { ageMinutes, classifyFreshness, confidenceFor, freshnessScore } from './freshness';
import { clamp } from './numbers';
import type { CandidateInput, Freshness, RankedCandidate } from './types';

export interface RankingWeights {
  availability: number;
  proximity: number;
  freshness: number;
  report: number;
}

export const DEFAULT_WEIGHTS: RankingWeights = {
  availability: 0.45,
  proximity: 0.3,
  freshness: 0.15,
  report: 0.1,
};

export const DEFAULT_PROXIMITY_SCALE_METERS = 800;

export interface RankingOptions {
  now: Date;
  weights?: RankingWeights;
  proximityScaleMeters?: number;
}

export function rankCandidates(
  candidates: readonly CandidateInput[],
  options: RankingOptions,
): RankedCandidate[] {
  const weights = options.weights ?? DEFAULT_WEIGHTS;
  const proximityScale = options.proximityScaleMeters ?? DEFAULT_PROXIMITY_SCALE_METERS;

  const ranked = candidates.map((candidate) => {
    const availability =
      candidate.availability === null ? null : clamp(candidate.availability, 0, 1);
    const freshness = classifyFreshness(candidate.signal, candidate.observedAt, options.now);
    const confidence = confidenceFor(freshness, availability);
    const reportSignal = clamp(candidate.reportSignal ?? 0, -1, 1);
    const proximity = Math.exp(-Math.max(0, candidate.distanceMeters) / proximityScale);

    const score =
      availability === null
        ? 0
        : clamp(
            weights.availability * availability +
              weights.proximity * proximity +
              weights.freshness * freshnessScore(freshness) +
              weights.report * reportSignal,
            0,
            1,
          );

    return {
      ...candidate,
      availability,
      score,
      freshness,
      confidence,
      reportSignal,
      walkingMinutes: walkingMinutes(candidate.distanceMeters),
      reason: buildReason(candidate, availability, freshness, options.now),
    };
  });

  return ranked.sort(compareCandidates);
}

function compareCandidates(a: RankedCandidate, b: RankedCandidate): number {
  const aHasData = a.availability !== null;
  const bHasData = b.availability !== null;

  if (aHasData !== bHasData) return aHasData ? -1 : 1;
  if (aHasData && bHasData && a.score !== b.score) return b.score - a.score;
  if (a.distanceMeters !== b.distanceMeters) return a.distanceMeters - b.distanceMeters;

  return a.id.localeCompare(b.id);
}

function buildReason(
  candidate: CandidateInput,
  availability: number | null,
  freshness: Freshness,
  now: Date,
): string {
  if (availability === null) return 'Sin datos recientes de disponibilidad';

  const percent = Math.round(availability * 100);
  const age = ageMinutes(candidate.observedAt, now);
  const ageText =
    age === null ? 'sin hora de observación' : age === 0 ? 'ahora mismo' : `hace ${age} min`;
  const staleNote = freshness === 'stale' ? ' · dato antiguo' : '';

  switch (candidate.signal) {
    case 'garage':
      return `Dato municipal: ${percent}% de plazas libres (${ageText})${staleNote}`;
    case 'community_report':
      return `Reporte de la comunidad: ${percent}% de disponibilidad (${ageText})${staleNote}`;
  }
}
