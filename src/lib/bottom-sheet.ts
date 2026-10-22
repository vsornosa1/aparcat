/** Posiciones del panel de resultados en móvil, como la hoja inferior de Google Maps. */
export type SheetSnap = 'collapsed' | 'half' | 'full';

const ORDER: SheetSnap[] = ['collapsed', 'half', 'full'];

/** Asa y cabecera: lo justo para saber que el panel sigue ahí y poder subirlo. */
export const SHEET_PEEK_PX = 76;
/** Por defecto el mapa se queda con algo más de la mitad de la pantalla. */
export const SHEET_HALF_RATIO = 0.45;
export const SHEET_FULL_RATIO = 0.9;
/** A partir de esta velocidad (px/ms) un gesto rápido salta a la siguiente posición. */
export const SHEET_FLICK_VELOCITY = 0.45;

export type SheetHeights = Record<SheetSnap, number>;

/** Altura visible del panel en cada posición para una pantalla de `viewport` px. */
export function sheetHeights(viewport: number): SheetHeights {
  const full = Math.max(SHEET_PEEK_PX, Math.round(viewport * SHEET_FULL_RATIO));
  const half = Math.min(full, Math.max(SHEET_PEEK_PX, Math.round(viewport * SHEET_HALF_RATIO)));
  return { collapsed: SHEET_PEEK_PX, half, full };
}

/**
 * Posición final al soltar el panel. Un gesto rápido avanza una posición en su
 * sentido; uno lento se queda en la más cercana. `velocity` es positiva hacia arriba.
 */
export function settleSheet(visible: number, velocity: number, heights: SheetHeights): SheetSnap {
  if (velocity > SHEET_FLICK_VELOCITY) {
    return ORDER.find((snap) => heights[snap] > visible + 1) ?? 'full';
  }
  if (velocity < -SHEET_FLICK_VELOCITY) {
    return [...ORDER].reverse().find((snap) => heights[snap] < visible - 1) ?? 'collapsed';
  }

  return ORDER.reduce((best, snap) =>
    Math.abs(heights[snap] - visible) < Math.abs(heights[best] - visible) ? snap : best,
  );
}

/** Una posición más arriba (1) o más abajo (-1), para el teclado. */
export function stepSheet(current: SheetSnap, direction: 1 | -1): SheetSnap {
  const index = ORDER.indexOf(current) + direction;
  return ORDER[Math.min(ORDER.length - 1, Math.max(0, index))];
}

/** Lo que el panel tapa del mapa por abajo (0 si está al lado, como en escritorio). */
export function coveredBottom(map: DOMRect, sheet: DOMRect | undefined): number {
  if (!sheet || sheet.left >= map.right || sheet.right <= map.left) return 0;
  return Math.max(0, Math.min(map.height, map.bottom - sheet.top));
}
