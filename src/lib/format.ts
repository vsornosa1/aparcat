import { isNil } from '@/lib/nil';

export function formatFreeSpaces(count: number | null | undefined): string {
  if (isNil(count)) return 'Sin datos';
  return count === 1 ? '1 plaza libre' : `${count} plazas libres`;
}

export type SpacesTone = 'high' | 'medium' | 'low' | 'unknown';

/** Umbrales en plazas absolutas: a quien conduce le importa si cabe, no el % de ocupación. */
export const PLENTY_OF_SPACES = 20;
export const FEW_SPACES = 5;

export function spacesTone(freeSpaces: number | null | undefined): SpacesTone {
  if (isNil(freeSpaces)) return 'unknown';
  if (freeSpaces >= PLENTY_OF_SPACES) return 'high';
  if (freeSpaces >= FEW_SPACES) return 'medium';
  return 'low';
}

const LOWERCASE_WORDS = new Set([
  'de',
  'del',
  'la',
  'las',
  'el',
  'els',
  'los',
  'i',
  'y',
  'en',
  'l',
  'd',
]);

/** Los garajes llegan en mayúsculas («AVINGUDA DE L’OEST»); se muestran en formato título. */
export function formatPlaceName(name: string): string {
  const trimmed = name.trim();
  if (trimmed !== trimmed.toLocaleUpperCase('es')) return trimmed;

  return trimmed
    .toLocaleLowerCase('es')
    .split(/(\s+|-|’|')/)
    .map((part, index) => {
      if (index > 0 && LOWERCASE_WORDS.has(part)) return part;
      return part.replace(/\p{L}/u, (letter) => letter.toLocaleUpperCase('es'));
    })
    .join('');
}
