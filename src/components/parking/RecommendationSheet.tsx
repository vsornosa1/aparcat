'use client';

import { attribution } from '@/api/attribution';
import type { Candidate, NearbyResponse } from '@/api/contracts';
import type { Coordinates } from '@/domain/types';
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
  onSelect,
  onRetry,
  onReport,
  isReporting,
  reportMessage,
}: RecommendationSheetProps) {
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <header className="border-b border-zinc-200 px-4 py-3">
        <div className="flex items-baseline gap-2">
          <h1 className="text-lg font-semibold tracking-tight text-zinc-900">Parkflow</h1>
          <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-[11px] font-medium text-zinc-600">
            Valencia
          </span>
        </div>
        <p className="mt-0.5 text-xs text-zinc-500">
          Aparcamiento con datos abiertos y reportes de la comunidad.
        </p>
      </header>

      <div className="flex-1 space-y-4 overflow-y-auto p-4">
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
              <EmptyState />
            )}

            <ReportButtons onReport={onReport} isReporting={isReporting} message={reportMessage} />
          </>
        )}
      </div>

      <footer className="space-y-1 border-t border-zinc-200 px-4 py-3">
        <p className="text-[11px] leading-snug text-zinc-500">
          Predicción orientativa. Parkflow no garantiza ni reserva plazas; respeta la señalización.
        </p>
        <p className="text-[11px] text-zinc-500">
          Datos:{' '}
          <a
            href={attribution.url}
            target="_blank"
            rel="noopener noreferrer"
            className="underline underline-offset-2 hover:text-zinc-700"
          >
            Ajuntament de València
          </a>{' '}
          (CC BY 4.0) · Mapas: OpenStreetMap
        </p>
      </footer>
    </div>
  );
}

function IdleState() {
  return (
    <div className="rounded-xl border border-dashed border-zinc-300 p-4">
      <p className="text-sm font-medium text-zinc-800">Elige dónde buscar</p>
      <p className="mt-1 text-xs leading-snug text-zinc-600">
        Pulsa «Aparcar cerca de mí», toca el mapa o busca una calle. Verás las mejores opciones a
        menos de 800 metros, con su antigüedad y su confianza.
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

function EmptyState() {
  return (
    <div role="status" className="rounded-xl border border-zinc-200 bg-zinc-50 p-4">
      <p className="text-sm font-medium text-zinc-800">Sin datos en este radio</p>
      <p className="mt-1 text-xs leading-snug text-zinc-600">
        Toca otra zona del mapa o busca una calle cercana. La cobertura de predicción municipal se
        concentra en el centro de Valencia.
      </p>
    </div>
  );
}

function Summary({ nearby }: { nearby: NearbyResponse }) {
  const time = new Date(nearby.generatedAt).toLocaleTimeString('es-ES', {
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <div
      aria-live="polite"
      className="flex flex-wrap items-center justify-between gap-2 text-xs text-zinc-500"
    >
      <span>
        {nearby.meta.facilities} garajes · {nearby.meta.streetSegments} calles ·{' '}
        {nearby.meta.reports} reportes
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
        className="w-full px-3 py-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
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
              <h2 className="truncate text-sm font-semibold text-zinc-900">{candidate.name}</h2>
              <AvailabilityBadge availability={candidate.availability} />
            </div>
            <p className="mt-0.5 text-xs text-zinc-500">
              {candidate.kind === 'garage' ? 'Garaje público' : 'Aparcamiento regulado'} · a{' '}
              {candidate.walkingMinutes} min andando
            </p>
            <p className="mt-1 text-xs leading-snug text-zinc-600">{candidate.reason}</p>
            <div className="mt-1.5 flex items-center justify-between gap-2">
              <FreshnessLabel freshness={candidate.freshness} ageMinutes={candidate.ageMinutes} />
              <span className="text-[11px] text-zinc-400">
                {Math.round(candidate.distanceMeters)} m
              </span>
            </div>
          </div>
        </div>
      </button>

      <div className="flex items-center justify-between border-t border-zinc-100 px-3 py-2">
        <span className="text-[11px] text-zinc-500">
          Confianza {confidenceLabel(candidate.confidence)}
        </span>
        <a
          href={directionsUrl(candidate.location)}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs font-medium text-emerald-700 hover:text-emerald-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
        >
          Cómo llegar
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

function directionsUrl(location: Coordinates): string {
  return `https://www.google.com/maps/dir/?api=1&destination=${location.latitude},${location.longitude}`;
}
