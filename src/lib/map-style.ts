import type { StyleSpecification } from 'maplibre-gl';

const MAPTILER_KEY = process.env.NEXT_PUBLIC_MAPTILER_KEY?.trim();
const MAPTILER_STYLE = process.env.NEXT_PUBLIC_MAPTILER_STYLE?.trim() || 'streets-v4';

export const hasBasemap = Boolean(MAPTILER_KEY);

export function getMapStyle(): string | StyleSpecification {
  if (MAPTILER_KEY) {
    return `https://api.maptiler.com/maps/${MAPTILER_STYLE}/style.json?key=${MAPTILER_KEY}`;
  }

  return {
    version: 8,
    sources: {},
    layers: [{ id: 'background', type: 'background', paint: { 'background-color': '#eef2f5' } }],
  };
}
