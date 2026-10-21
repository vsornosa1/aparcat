import { isNil } from '@/lib/nil';

export function formatFreeSpaces(count: number | null | undefined): string {
  if (isNil(count)) return 'Sin datos';
  return count === 1 ? '1 plaza libre' : `${count} plazas libres`;
}
