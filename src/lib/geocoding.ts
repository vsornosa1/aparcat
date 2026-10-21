import type { Coordinates } from '@/domain/types';

export interface PlaceSuggestion {
  id: string;
  name: string;
  detail: string;
  latitude: number;
  longitude: number;
}

interface MapTilerFeature {
  id: string;
  text: string;
  place_name: string;
  center: [number, number];
}

const MAPTILER_KEY = process.env.NEXT_PUBLIC_MAPTILER_KEY?.trim();
const VALENCIA = { latitude: 39.4699, longitude: -0.3763 };
const VALENCIA_BBOX = '-0.45,39.42,-0.30,39.52';

export async function searchPlaces(
  query: string,
  proximity?: Coordinates,
): Promise<PlaceSuggestion[]> {
  const trimmed = query.trim();
  if (trimmed.length < 2) return [];

  if (MAPTILER_KEY) {
    try {
      const point = proximity ?? VALENCIA;
      const params = new URLSearchParams({
        key: MAPTILER_KEY,
        language: 'es',
        limit: '6',
        country: 'es',
        bbox: VALENCIA_BBOX,
        proximity: `${point.longitude},${point.latitude}`,
      });
      const response = await fetch(
        `https://api.maptiler.com/geocoding/${encodeURIComponent(trimmed)}.json?${params.toString()}`,
      );

      if (response.ok) {
        const data = (await response.json()) as { features?: MapTilerFeature[] };
        return (data.features ?? []).map((feature) => ({
          id: `place:${feature.id}`,
          name: feature.text,
          detail: feature.place_name,
          latitude: feature.center[1],
          longitude: feature.center[0],
        }));
      }
    } catch {
      // Sin red o con MapTiler caído la búsqueda no devuelve sugerencias; el mapa sigue sirviendo.
    }
  }

  return [];
}
