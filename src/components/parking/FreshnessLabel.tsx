import type { Freshness } from '@/domain/types';

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
  ageMinutes: number | null;
}) {
  return (
    <span className={`text-xs ${TONES[freshness]}`}>
      {LABELS[freshness]}
      {formatAge(ageMinutes)}
    </span>
  );
}

function formatAge(minutes: number | null): string {
  if (minutes === null) return '';
  return minutes <= 1 ? ' · ahora' : ` · hace ${minutes} min`;
}
