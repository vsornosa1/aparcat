import type { Candidate } from '@/api/contracts';
import { formatFreeSpaces } from '@/lib/format';
import { isNil } from '@/lib/nil';

const TONES = {
  high: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
  medium: 'bg-amber-50 text-amber-700 ring-amber-600/20',
  low: 'bg-red-50 text-red-700 ring-red-600/20',
  unknown: 'bg-zinc-100 text-zinc-600 ring-zinc-500/20',
} as const;

const DOTS = {
  high: 'bg-emerald-600',
  medium: 'bg-amber-500',
  low: 'bg-red-600',
  unknown: 'bg-zinc-400',
} as const;

type Tone = keyof typeof TONES;

export function AvailabilityBadge({ candidate }: { candidate: Candidate }) {
  const stale = candidate.freshness === 'stale';

  if (candidate.kind === 'garage') {
    const freeSpaces = candidate.freeSpaces;
    const ratio =
      !isNil(freeSpaces) && candidate.capacity
        ? freeSpaces / candidate.capacity
        : candidate.availability;
    const tone = stale ? 'unknown' : toneFor(ratio);
    const label = `${formatFreeSpaces(freeSpaces)}${stale ? ' · antiguo' : ''}`;

    return <Badge tone={tone} label={label} />;
  }

  const tone = stale ? 'unknown' : toneFor(candidate.availability);
  const level =
    tone === 'high' ? 'alta' : tone === 'medium' ? 'media' : tone === 'low' ? 'baja' : null;
  const label = level ? `Probabilidad ${level}${stale ? ' · antiguo' : ''}` : 'Sin datos';

  return <Badge tone={tone} label={label} />;
}

function toneFor(availability: number | null): Tone {
  if (isNil(availability)) return 'unknown';
  if (availability >= 0.6) return 'high';
  if (availability >= 0.3) return 'medium';
  return 'low';
}

function Badge({ tone, label }: { tone: Tone; label: string }) {
  return (
    <span
      className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${TONES[tone]}`}
    >
      <span aria-hidden="true" className={`size-1.5 rounded-full ${DOTS[tone]}`} />
      {label}
    </span>
  );
}
