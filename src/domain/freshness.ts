import type { Confidence, Freshness, SignalKind } from './types';

export const FRESHNESS_THRESHOLDS_MINUTES: Record<SignalKind, { live: number; recent: number }> = {
  garage: { live: 5, recent: 20 },
  street_prediction: { live: 60, recent: 360 },
  community_report: { live: 5, recent: 15 },
};

export function classifyFreshness(
  signal: SignalKind,
  observedAt: Date | null,
  now: Date,
): Freshness {
  const age = ageMinutes(observedAt, now);
  if (age === null) return 'unknown';

  const thresholds = FRESHNESS_THRESHOLDS_MINUTES[signal];
  if (age <= thresholds.live) return 'live';
  if (age <= thresholds.recent) return 'recent';

  return 'stale';
}

export function ageMinutes(observedAt: Date | null, now: Date): number | null {
  if (!observedAt) return null;

  const millis = observedAt.getTime();
  if (!Number.isFinite(millis)) return null;

  return Math.max(0, Math.round((now.getTime() - millis) / 60_000));
}

export function confidenceFor(freshness: Freshness, availability: number | null): Confidence {
  if (availability === null) return 'low';

  switch (freshness) {
    case 'live':
      return 'high';
    case 'recent':
      return 'medium';
    default:
      return 'low';
  }
}

export function freshnessScore(freshness: Freshness): number {
  switch (freshness) {
    case 'live':
      return 1;
    case 'recent':
      return 0.6;
    case 'stale':
      return 0.2;
    case 'unknown':
      return 0;
  }
}
