import type { Candidate, MapResponse, NearbyResponse } from '@/api/contracts';
import { isNil } from '@/lib/nil';

export function isReliableCandidate(candidate: Candidate): boolean {
  if (isNil(candidate.availability)) return false;
  if (candidate.kind === 'garage' && isNil(candidate.freeSpaces)) return false;

  return candidate.confidence !== 'low';
}

export function withReliableCandidates(response: NearbyResponse): NearbyResponse {
  return {
    ...response,
    candidates: response.candidates.filter(isReliableCandidate),
  };
}

export function withReliableMapFacilities(response: MapResponse): MapResponse {
  const features = response.layers.facilities.features.filter((feature) => {
    const { freeSpaces, availability, freshness } = feature.properties;
    return (
      !isNil(freeSpaces) && !isNil(availability) && freshness !== 'unknown' && freshness !== 'stale'
    );
  });

  return {
    ...response,
    layers: {
      ...response.layers,
      facilities: { ...response.layers.facilities, features },
    },
    meta: { ...response.meta, facilities: features.length },
  };
}
