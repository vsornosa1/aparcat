'use client';

import { attribution } from '@/api/attribution';
import type { Candidate, NearbyResponse } from '@/api/contracts';
import type { Coordinates } from '@/domain/types';
import { formatPlaceName } from '@/lib/format';
import { mapsUrl } from '@/lib/maps';
import { ReportButtons, type ReportFeedback } from '../reports/ReportButtons';
import { AvailabilityBadge } from './AvailabilityBadge';
import { FreshnessLabel } from './FreshnessLabel';

type LoadState = 'idle' | 'loading' | 'ready' | 'error';

const MAX_CARDS = 3;

interface RecommendationSheetProps {
  origin: Coordinates | null;
  nearby: NearbyResponse | null;
  state: LoadState;
  error: string | null;
  selectedId: string | null;
  streetsEnabled: boolean;
  onSelect: (id: string) => void;
  onRetry: () => void;
  onLocate: () => void;
  isLocating: boolean;
  onReport: (kind: 'spot_free' | 'area_full') => void;
  isReporting: boolean;
  report: ReportFeedback | null;
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
  onLocate,
  isLocating,
  onReport,
  isReporting,
  report,
}: RecommendationSheetProps) {
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <header className="border-b border-zinc-200 px-3 py-2 sm:px-4 sm:py-2.5">
        <div className="flex items-baseline gap-2">
          <h1 className="text-lg font-semibold tracking-tight text-zinc-900">Aparcat</h1>
          <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-[11px] font-medium text-zinc-600">
            Valencia
          </span>
        </div>
        <p className="mt-0.5 hidden text-xs text-zinc-500 sm:block">
          Garajes, reportes y zonas ORA. Las calles son una predicción opcional.
        </p>
      </header>

      <div className="flex-1 space-y-3 overflow-y-auto p-3 sm:p-3.5">
        {!origin && <IdleState onLocate={onLocate} isLocating={isLocating} />}

        {origin && state === 'loading' && <LoadingState />}

        {origin && state === 'error' && <ErrorState message={error} onRetry={onRetry} />}

        {origin && state === 'ready' && nearby && (
          <>
            {nearby.candidates.length > 0 ? (
              <>
                <Summary nearby={nearby} shown={Math.min(nearby.candidates.length, MAX_CARDS)} />
                <ol className="space-y-2.5" aria-label="Recomendaciones de aparcamiento">
                  {nearby.candidates.slice(0, MAX_CARDS).map((candidate, index) => (
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
              <EmptyState streetsEnabled={streetsEnabled} radiusMeters={nearby.radiusMeters} />
            )}

            <ReportButtons onReport={onReport} isReporting={isReporting} feedback={report} />
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

function IdleState({ onLocate, isLocating }: { onLocate: () => void; isLocating: boolean }) {
  return (
    <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4">
      <p className="text-sm font-semibold text-zinc-900">Encuentra aparcamiento libre cerca</p>
      <p className="mt-1 text-xs leading-snug text-zinc-600">
        Te mostramos los garajes públicos con plazas libres más cerca del punto que elijas.
      </p>

      <button
        type="button"
        onClick={onLocate}
        disabled={isLocating}
        className="mt-3 inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-lg bg-emerald-600 px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-emerald-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 disabled:cursor-wait disabled:opacity-60"
      >
        {isLocating ? 'Obteniendo ubicación…' : 'Buscar cerca de mí'}
      </button>
      <p className="mt-2 text-center text-[11px] text-zinc-500">
        o busca una dirección arriba, o toca cualquier punto del mapa
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

function EmptyState({
  streetsEnabled,
  radiusMeters,
}: {
  streetsEnabled: boolean;
  radiusMeters: number;
}) {
  return (
    <div role="status" className="rounded-xl border border-zinc-200 bg-zinc-50 p-4">
      <p className="text-sm font-medium text-zinc-800">
        Nada con datos a menos de {formatDistance(radiusMeters)}
      </p>
      <p className="mt-1 text-xs leading-snug text-zinc-600">
        {streetsEnabled
          ? 'Toca otra zona del mapa o busca otro lugar. La predicción municipal se concentra en el centro de Valencia.'
          : 'No hay garajes públicos con plazas publicadas cerca de este punto. Toca otra zona del mapa, o activa «Calles» en Capas para ver la estimación municipal.'}
      </p>
    </div>
  );
}

function Summary({ nearby, shown }: { nearby: NearbyResponse; shown: number }) {
  const time = new Date(nearby.generatedAt).toLocaleTimeString('es-ES', {
    hour: '2-digit',
    minute: '2-digit',
  });
  const options = shown === 1 ? 'La mejor opción' : `Las ${shown} mejores opciones`;
  const reports =
    nearby.meta.reports > 0
      ? ` · ${nearby.meta.reports} ${nearby.meta.reports === 1 ? 'reporte' : 'reportes'} cerca`
      : '';

  return (
    <div
      aria-live="polite"
      className="flex flex-wrap items-baseline justify-between gap-x-2 gap-y-0.5 text-xs text-zinc-500"
    >
      <span>
        <span className="font-medium text-zinc-700">{options}</span> a menos de{' '}
        {formatDistance(nearby.radiusMeters)}
        {reports}
      </span>
      <span>Actualizado {time}</span>
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
        selected
          ? 'border-emerald-500 ring-1 ring-emerald-500/30'
          : 'border-zinc-200 hover:border-zinc-300'
      }`}
    >
      <button
        type="button"
        onClick={onSelect}
        aria-pressed={selected}
        title="Ver en el mapa"
        className="w-full cursor-pointer px-3 py-2.5 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-emerald-500"
      >
        <div className="flex items-start gap-2.5">
          <span
            aria-hidden="true"
            className={`mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold transition-colors ${
              selected ? 'bg-emerald-600 text-white' : 'bg-zinc-100 text-zinc-600'
            }`}
          >
            {rank}
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-2">
              <h2 className="line-clamp-2 text-sm font-semibold text-zinc-900">
                {formatPlaceName(candidate.name)}
              </h2>
              <AvailabilityBadge candidate={candidate} />
            </div>
            <p className="mt-0.5 text-xs text-zinc-500">
              {candidate.kind === 'garage' ? 'Garaje público' : 'Calle · predicción 1 h'} ·{' '}
              <span className="text-zinc-700">{candidate.walkingMinutes} min a pie</span> (
              {formatDistance(candidate.distanceMeters)})
            </p>
          </div>
        </div>
      </button>

      <div className="flex items-center justify-between gap-2 border-t border-zinc-100 py-1.5 pl-11 pr-3">
        <p className="flex flex-wrap items-center gap-x-1.5 text-[11px] text-zinc-500">
          <FreshnessLabel freshness={candidate.freshness} ageMinutes={candidate.ageMinutes} />
          {candidate.confidence !== 'high' && (
            <>
              <span aria-hidden="true">·</span>
              <span>Confianza {confidenceLabel(candidate.confidence)}</span>
            </>
          )}
        </p>
        <a
          href={mapsUrl(candidate.location)}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex shrink-0 items-center gap-1 rounded-md border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 transition-colors hover:bg-emerald-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
        >
          Cómo llegar
          <span aria-hidden="true">↗</span>
        </a>
      </div>
    </article>
  );
}

function formatDistance(meters: number): string {
  return meters >= 1000
    ? `${(meters / 1000).toLocaleString('es-ES', { maximumFractionDigits: 1 })} km`
    : `${Math.round(meters)} m`;
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
