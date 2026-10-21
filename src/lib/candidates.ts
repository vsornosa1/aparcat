import type { Candidate, MapResponse, NearbyResponse } from '@/api/contracts';

export function isReliableCandidate(candidate: Candidate): boolean {
  return candidate.confidence !== 'low' && candidate.availability !== null;
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
      freeSpaces !== null &&
      availability !== null &&
      freshness !== 'unknown' &&
      freshness !== 'stale'
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
