import type { Freshness } from '@/domain/types';
import { isNil } from '@/lib/nil';

const LABELS: Record<Freshness, string> = {
  live: 'En vivo',
  recent: 'Reciente',
  stale: 'Dato antiguo',
  unknown: 'Sin hora',
};

const TONES: Record<Freshness, string> = {
  live: 'text-emerald-700',
  recent: 'text-amber-700',
  stale: 'text-red-700',
  unknown: 'text-zinc-500',
};

export function FreshnessLabel({
  freshness,
  ageMinutes,
}: {
  freshness: Freshness;
  ageMinutes: number | null | undefined;
}) {
  const label = LABELS[freshness] ?? LABELS.unknown;
  const tone = TONES[freshness] ?? TONES.unknown;

  return (
    <span className={`text-xs ${tone}`}>
      {label}
      {formatAge(ageMinutes)}
    </span>
  );
}

function formatAge(minutes: number | null | undefined): string {
  if (isNil(minutes)) return '';
  return minutes <= 1 ? ' · ahora' : ` · hace ${minutes} min`;
}
