export type Freshness = 'live' | 'recent' | 'stale' | 'unknown';
export type Confidence = 'high' | 'medium' | 'low';
export type CandidateKind = 'garage';
export type SignalKind = 'garage' | 'community_report';

export interface Coordinates {
  latitude: number;
  longitude: number;
}

export interface CandidateInput {
  id: string;
  kind: CandidateKind;
  name: string;
  distanceMeters: number;
  /** Proporción de plazas libres entre 0 y 1; null cuando no hay dato. */
  availability: number | null;
  observedAt: Date | null;
  signal: SignalKind;
  /** Señal de reportes entre -1 (zona llena) y 1 (hueco recién dejado). */
  reportSignal?: number;
}

export interface RankedCandidate extends CandidateInput {
  score: number;
  freshness: Freshness;
  confidence: Confidence;
  reportSignal: number;
  walkingMinutes: number;
  reason: string;
}
