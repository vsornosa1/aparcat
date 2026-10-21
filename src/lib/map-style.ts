import type { StyleSpecification } from 'maplibre-gl';

const MAPTILER_KEY = process.env.NEXT_PUBLIC_MAPTILER_KEY?.trim();
const MAPTILER_STYLE = process.env.NEXT_PUBLIC_MAPTILER_STYLE?.trim() || 'streets-v4';

export const hasBasemap = Boolean(MAPTILER_KEY);

const NEUTRAL_STYLE: StyleSpecification = {
  version: 8,
  sources: {},
  layers: [{ id: 'background', type: 'background', paint: { 'background-color': '#eef2f5' } }],
};

/** Fondo liso: las capas de datos se dibujan igual sin teselas de ningún proveedor. */
export function getNeutralStyle(): StyleSpecification {
  return NEUTRAL_STYLE;
}

export function getMapStyle(): string | StyleSpecification {
  if (MAPTILER_KEY) {
    return `https://api.maptiler.com/maps/${MAPTILER_STYLE}/style.json?key=${MAPTILER_KEY}`;
  }

  return getNeutralStyle();
}

interface BasemapState {
  /** Se pidió un estilo remoto (hay key); sin key ya se usa el fondo neutro. */
  basemapRequested: boolean;
  styleLoaded: boolean;
  usedFallback: boolean;
}

/**
 * Un error antes de que el primer estilo cargue es un fallo del estilo remoto (key
 * rechazada, dominio no autorizado, red caída) y deja el mapa sin capas de datos.
 * Los errores posteriores (una tesela suelta) no justifican cambiar de estilo.
 */
export function shouldFallBackToNeutralStyle(state: BasemapState): boolean {
  return state.basemapRequested && !state.styleLoaded && !state.usedFallback;
}
