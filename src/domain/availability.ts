import { clamp } from './numbers';

/** Proporción de plazas libres de un garaje, o null si el dato no es utilizable. */
export function garageAvailability(
  freeSpaces: number | null,
  capacity: number | null,
): number | null {
  if (freeSpaces === null || capacity === null) return null;
  if (!Number.isFinite(freeSpaces) || !Number.isFinite(capacity)) return null;
  if (freeSpaces < 0 || capacity <= 0) return null;

  return clamp(freeSpaces / capacity, 0, 1);
}

/** Proporción de aparcamiento libre en la calle a partir de la ocupación municipal. */
export function streetAvailability(occupancyPct: number | null): number | null {
  if (occupancyPct === null || !Number.isFinite(occupancyPct)) return null;

  return clamp(1 - occupancyPct / 100, 0, 1);
}
