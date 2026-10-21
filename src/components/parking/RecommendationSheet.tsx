'use client';

import { attribution } from '@/api/attribution';
import type { Candidate, NearbyResponse } from '@/api/contracts';
import type { Coordinates } from '@/domain/types';
import { mapsUrl } from '@/lib/maps';
import { ReportButtons } from '../reports/ReportButtons';
import { AvailabilityBadge } from './AvailabilityBadge';
import { FreshnessLabel } from './FreshnessLabel';

type LoadState = 'idle' | 'loading' | 'ready' | 'error';

interface RecommendationSheetProps {
  origin: Coordinates | null;
  nearby: NearbyResponse | null;
  state: LoadState;
  error: string | null;
  selectedId: string | null;
  streetsEnabled: boolean;
  onSelect: (id: string) => void;
  onRetry: () => void;
  onReport: (kind: 'spot_free' | 'area_full') => void;
  isReporting: boolean;
  reportMessage: string | null;
}

export function RecommendationSheet({
  origin,
  nearby,
  state,
  error,
  selectedId,
  streetsEnabled,
  onSelect,
  onRetry,
  onReport,
  isReporting,
  reportMessage,
}: RecommendationSheetProps) {
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <header className="border-b border-zinc-200 px-3 py-2 sm:px-4 sm:py-2.5">
        <div className="flex items-baseline gap-2">
          <h1 className="text-lg font-semibold tracking-tight text-zinc-900">Parkflow</h1>
          <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-[11px] font-medium text-zinc-600">
            Valencia
          </span>
        </div>
        <p className="mt-0.5 hidden text-xs text-zinc-500 sm:block">
          Garajes y reportes de la comunidad. Las calles son una predicción opcional.
        </p>
      </header>

      <div className="flex-1 space-y-3 overflow-y-auto p-3 sm:p-3.5">
        {!origin && <IdleState />}

        {origin && state === 'loading' && <LoadingState />}

        {origin && state === 'error' && <ErrorState message={error} onRetry={onRetry} />}

        {origin && state === 'ready' && nearby && (
          <>
            {nearby.candidates.length > 0 ? (
              <>
                <Summary nearby={nearby} />
                <ol className="space-y-3" aria-label="Recomendaciones de aparcamiento">
                  {nearby.candidates.slice(0, 3).map((candidate, index) => (
                    <li key={candidate.id}>
                      <CandidateCard
                        candidate={candidate}
                        rank={index + 1}
                        selected={candidate.id === selectedId}
                        onSelect={() => onSelect(candidate.id)}
                      />
                    </li>
                  ))}
                </ol>
              </>
            ) : (
              <EmptyState streetsEnabled={streetsEnabled} />
            )}

            <ReportButtons onReport={onReport} isReporting={isReporting} message={reportMessage} />
          </>
        )}
      </div>

      <footer className="border-t border-zinc-200 px-3 py-2 text-[10px] leading-relaxed text-zinc-500 sm:px-4">
        <p>
          Predicción orientativa · no reserva · Datos:{' '}
          <a
            href={attribution.url}
            target="_blank"
            rel="noopener noreferrer"
            className="underline underline-offset-2 hover:text-zinc-700"
          >
            Ajuntament de València
          </a>{' '}
          (CC BY 4.0) · Mapa: MapTiler © OpenStreetMap
        </p>
        <nav aria-label="Información legal" className="mt-0.5 flex gap-2">
          <a href="/privacidad" className="hover:text-zinc-700">
            Privacidad
          </a>
          <a href="/aviso-legal" className="hover:text-zinc-700">
            Aviso legal
          </a>
        </nav>
      </footer>
    </div>
  );
}

function IdleState() {
  return (
    <div className="rounded-xl border border-dashed border-zinc-300 p-4">
      <p className="text-sm font-medium text-zinc-800">Encuentra aparcamiento libre ahora</p>
      <p className="mt-1 text-xs leading-snug text-zinc-600">
        Busca una dirección o usa tu ubicación. El mapa arranca con los{' '}
        <strong>garajes públicos</strong> (plazas libres publicadas por el Ayuntamiento) y los{' '}
        <strong>reportes</strong> de otros conductores. Si quieres la estimación municipal de las
        calles, activa «Calles con predicción» en Capas.
      </p>
    </div>
  );
}

function LoadingState() {
  return (
    <div className="space-y-3" aria-busy="true" aria-label="Buscando aparcamiento">
      {[0, 1, 2].map((item) => (
        <div key={item} className="h-28 animate-pulse rounded-xl bg-zinc-100" />
      ))}
    </div>
  );
}

function ErrorState({ message, onRetry }: { message: string | null; onRetry: () => void }) {
  return (
    <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4">
      <p className="text-sm font-medium text-red-800">No pudimos cargar las recomendaciones</p>
      <p className="mt-1 text-xs text-red-700">
        {message ?? 'Inténtalo de nuevo en unos segundos.'}
      </p>
      <button
        type="button"
        onClick={onRetry}
        className="mt-3 rounded-lg bg-red-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2"
      >
        Reintentar
      </button>
    </div>
  );
}

function EmptyState({ streetsEnabled }: { streetsEnabled: boolean }) {
  return (
    <div role="status" className="rounded-xl border border-zinc-200 bg-zinc-50 p-4">
      <p className="text-sm font-medium text-zinc-800">Sin datos en este radio</p>
      <p className="mt-1 text-xs leading-snug text-zinc-600">
        {streetsEnabled
          ? 'Toca otra zona del mapa o busca otro lugar. La predicción municipal se concentra en el centro de Valencia.'
          : 'No hay garajes con datos en este radio. Activa «Calles con predicción» en Capas para ver la estimación municipal, o toca otra zona.'}
      </p>
    </div>
  );
}

function Summary({ nearby }: { nearby: NearbyResponse }) {
  const time = new Date(nearby.generatedAt).toLocaleTimeString('es-ES', {
    hour: '2-digit',
    minute: '2-digit',
  });
  const garages = `${nearby.meta.facilities} ${nearby.meta.facilities === 1 ? 'garaje' : 'garajes'}`;
  const reports = `${nearby.meta.reports} ${nearby.meta.reports === 1 ? 'reporte' : 'reportes'}`;
  const streets =
    nearby.meta.streetSegments > 0
      ? ` · ${nearby.meta.streetSegments} ${nearby.meta.streetSegments === 1 ? 'calle' : 'calles'}`
      : '';

  return (
    <div
      aria-live="polite"
      className="flex flex-wrap items-center justify-between gap-2 text-xs text-zinc-500"
    >
      <span>
        {garages} · {reports}
        {streets}
      </span>
      <span>datos de las {time}</span>
    </div>
  );
}

function CandidateCard({
  candidate,
  rank,
  selected,
  onSelect,
}: {
  candidate: Candidate;
  rank: number;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <article
      className={`overflow-hidden rounded-xl border bg-white transition-colors ${
        selected ? 'border-emerald-500 ring-1 ring-emerald-500/30' : 'border-zinc-200'
      }`}
    >
      <button
        type="button"
        onClick={onSelect}
        aria-pressed={selected}
        className="w-full px-3 py-2.5 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 sm:py-3"
      >
        <div className="flex items-start gap-2">
          <span
            aria-hidden="true"
            className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-zinc-100 text-xs font-semibold text-zinc-600"
          >
            {rank}
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-2">
              <h2 className="line-clamp-2 text-sm font-semibold text-zinc-900">{candidate.name}</h2>
              <AvailabilityBadge candidate={candidate} />
            </div>
            <p className="mt-0.5 flex flex-wrap gap-x-1 text-xs text-zinc-500">
              <span>
                {candidate.kind === 'garage' ? 'Garaje público' : 'Calle · predicción 1 h'}
              </span>
              <span>· a {candidate.walkingMinutes} min</span>
              <span>· {Math.round(candidate.distanceMeters)} m</span>
            </p>
            <div className="mt-1 flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-[11px] text-zinc-500">
              <FreshnessLabel freshness={candidate.freshness} ageMinutes={candidate.ageMinutes} />
              <span aria-hidden="true">·</span>
              <span>Confianza {confidenceLabel(candidate.confidence)}</span>
            </div>
          </div>
        </div>
      </button>

      <div className="border-t border-zinc-100 px-3 py-1.5 text-right">
        <a
          href={mapsUrl(candidate.location)}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 rounded-md border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 transition-colors hover:bg-emerald-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
        >
          Abrir en Maps
        </a>
      </div>
    </article>
  );
}

function confidenceLabel(confidence: Candidate['confidence']): string {
  switch (confidence) {
    case 'high':
      return 'alta';
    case 'medium':
      return 'media';
    case 'low':
      return 'baja';
  }
}
