import type { Coordinates } from '@/domain/types';

export function mapsUrl(location: Coordinates): string {
  return `https://www.google.com/maps/dir/?api=1&destination=${location.latitude},${location.longitude}`;
}
