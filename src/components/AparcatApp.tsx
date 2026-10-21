'use client';

import dynamic from 'next/dynamic';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { MapResponse, NearbyResponse, OraFeatureCollection } from '@/api/contracts';
import type { Coordinates } from '@/domain/types';
import { fetchMapData, fetchNearby, fetchOraData, sendReport } from '@/lib/api-client';
import { withReliableCandidates, withReliableMapFacilities } from '@/lib/candidates';
import { hasBasemap } from '@/lib/map-style';
import { useLocate } from '@/lib/use-locate';
import { LayerControls } from './map/LayerControls';
import { MapLegend } from './map/MapLegend';
import { DEFAULT_LAYERS, type MapLayerVisibility } from './map/layers';
import { SearchBar } from './parking/SearchBar';
import { RecommendationSheet } from './parking/RecommendationSheet';
import type { ReportFeedback } from './reports/ReportButtons';

const ParkingMap = dynamic(() => import('./map/ParkingMap').then((module) => module.ParkingMap), {
  ssr: false,
  loading: () => (
    <div className="absolute inset-0 animate-pulse bg-zinc-200" aria-label="Cargando mapa" />
  ),
});

type LoadState = 'idle' | 'loading' | 'ready' | 'error';

/** Los garajes publican cada pocos minutos; refrescar más a menudo no aporta. */
const REFRESH_MS = 60_000;

export function AparcatApp() {
  const [origin, setOrigin] = useState<Coordinates | null>(null);
  const [mapData, setMapData] = useState<MapResponse | null>(null);
  const [oraData, setOraData] = useState<OraFeatureCollection | null>(null);
  const [nearby, setNearby] = useState<NearbyResponse | null>(null);
  const [state, setState] = useState<LoadState>('idle');
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [focusRequest, setFocusRequest] = useState(0);
  const [report, setReport] = useState<ReportFeedback | null>(null);
  const [isReporting, setIsReporting] = useState(false);
  const [basemapFailed, setBasemapFailed] = useState(false);
  const [layers, setLayers] = useState<MapLayerVisibility>(DEFAULT_LAYERS);
  const requestId = useRef(0);
  const oraRequested = useRef(false);

  const loadMap = useCallback(async () => {
    try {
      setMapData(withReliableMapFacilities(await fetchMapData()));
    } catch {
      // El mapa base sigue siendo útil aunque fallen las capas municipales.
    }
  }, []);

  useEffect(() => {
    // Carga inicial al montar; el setState ocurre después del fetch, no en el render.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadMap();
  }, [loadMap]);

  useEffect(() => {
    if (!layers.ora || oraRequested.current) return;

    oraRequested.current = true;
    void fetchOraData()
      .then(setOraData)
      .catch(() => {
        oraRequested.current = false;
      });
  }, [layers.ora]);

  const loadNearby = useCallback(
    async (coordinates: Coordinates, options?: { silent?: boolean }) => {
      const silent = options?.silent ?? false;
      const currentRequest = ++requestId.current;
      if (!silent) {
        setState('loading');
        setError(null);
        setSelectedId(null);
      }

      try {
        const data = withReliableCandidates(
          await fetchNearby(coordinates.latitude, coordinates.longitude),
        );
        if (currentRequest !== requestId.current) return;

        setNearby(data);
        setSelectedId((current) =>
          data.candidates.some((candidate) => candidate.id === current)
            ? current
            : (data.candidates[0]?.id ?? null),
        );
        setState('ready');
      } catch (caught) {
        if (currentRequest !== requestId.current) return;
        // Un refresco en segundo plano fallido no borra lo que ya se ve.
        if (silent) return;

        setNearby(null);
        setError(
          caught instanceof Error ? caught.message : 'No se pudieron cargar las recomendaciones',
        );
        setState('error');
      }
    },
    [],
  );

  useEffect(() => {
    if (!origin) return;

    const timer = setTimeout(() => void loadNearby(origin), 250);
    return () => clearTimeout(timer);
  }, [origin, loadNearby]);

  useEffect(() => {
    const timer = setInterval(() => {
      if (document.visibilityState !== 'visible') return;
      void loadMap();
      if (origin) void loadNearby(origin, { silent: true });
    }, REFRESH_MS);
    return () => clearInterval(timer);
  }, [origin, loadMap, loadNearby]);

  const handleOrigin = useCallback((coordinates: Coordinates) => {
    setOrigin(coordinates);
    setReport(null);
  }, []);

  const location = useLocate(handleOrigin);

  const toggleLayer = useCallback((layer: keyof MapLayerVisibility) => {
    setLayers((current) => ({ ...current, [layer]: !current[layer] }));
  }, []);

  const handleBasemapError = useCallback(() => setBasemapFailed(true), []);

  const handleSelect = useCallback((id: string) => {
    setSelectedId(id);
    setFocusRequest((current) => current + 1);
  }, []);

  const handleReport = useCallback(
    async (kind: 'spot_free' | 'area_full') => {
      if (!origin) return;

      setIsReporting(true);
      setReport(null);

      try {
        await sendReport({ kind, latitude: origin.latitude, longitude: origin.longitude });
        setReport({
          tone: 'success',
          text:
            kind === 'spot_free'
              ? 'Hueco reportado. Gracias por avisar.'
              : 'Zona marcada como llena. Gracias por avisar.',
        });
        await Promise.all([loadMap(), loadNearby(origin, { silent: true })]);
      } catch (caught) {
        setReport({
          tone: 'error',
          text: caught instanceof Error ? caught.message : 'No se pudo enviar el reporte',
        });
      } finally {
        setIsReporting(false);
      }
    },
    [origin, loadMap, loadNearby],
  );

  const candidates = nearby?.candidates;
  const selected = useMemo(
    () => candidates?.find((candidate) => candidate.id === selectedId) ?? null,
    [candidates, selectedId],
  );

  const handleFacilityClick = useCallback(
    (facilityId: string) => {
      const id = `garage:${facilityId}`;
      if (candidates?.some((candidate) => candidate.id === id)) setSelectedId(id);
    },
    [candidates],
  );

  return (
    <main className="flex h-dvh flex-col overflow-hidden lg:flex-row">
      <section
        className="relative h-[46dvh] min-h-[260px] shrink-0 lg:h-auto lg:min-h-0 lg:flex-1"
        aria-label="Mapa y búsqueda de aparcamiento"
      >
        <ParkingMap
          data={mapData}
          ora={oraData}
          origin={origin}
          selected={selected}
          focusRequest={focusRequest}
          layers={layers}
          onOrigin={handleOrigin}
          onFacilityClick={handleFacilityClick}
          onBasemapError={handleBasemapError}
        />

        <div
          data-map-overlay="top"
          className="absolute inset-x-3 top-3 z-10 flex flex-col gap-2 sm:right-auto sm:w-[27.5rem]"
        >
          <SearchBar origin={origin} onOrigin={handleOrigin} location={location} />
          <LayerControls layers={layers} onToggle={toggleLayer} />
          {!hasBasemap && (
            <p
              role="status"
              className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs leading-snug text-amber-800 shadow-sm"
            >
              Añade <code className="font-mono">NEXT_PUBLIC_MAPTILER_KEY</code> al{' '}
              <code className="font-mono">.env.local</code> para ver el mapa base. Las capas de
              datos siguen funcionando.
            </p>
          )}
          {hasBasemap && basemapFailed && (
            <p
              role="status"
              className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs leading-snug text-amber-800 shadow-sm"
            >
              No se pudo cargar el mapa base. Las capas de datos siguen funcionando sobre un fondo
              neutro.
            </p>
          )}
        </div>

        <MapLegend layers={layers} />
      </section>

      <aside className="flex min-h-0 flex-1 flex-col border-t border-zinc-200 bg-white lg:h-full lg:w-[420px] lg:flex-none lg:border-l lg:border-t-0">
        <RecommendationSheet
          origin={origin}
          nearby={nearby}
          state={state}
          error={error}
          selectedId={selectedId}
          onSelect={handleSelect}
          onRetry={() => {
            if (origin) void loadNearby(origin);
          }}
          onLocate={location.locate}
          isLocating={location.isLocating}
          onReport={handleReport}
          isReporting={isReporting}
          report={report}
        />
      </aside>
    </main>
  );
}
