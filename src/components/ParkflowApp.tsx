'use client';

import dynamic from 'next/dynamic';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { MapResponse, NearbyResponse, OraFeatureCollection } from '@/api/contracts';
import type { Coordinates } from '@/domain/types';
import { fetchMapData, fetchNearby, fetchOraData, sendReport } from '@/lib/api-client';
import { hasBasemap } from '@/lib/map-style';
import { LayerControls } from './map/LayerControls';
import { MapLegend } from './map/MapLegend';
import { DEFAULT_LAYERS, type MapLayerVisibility } from './map/layers';
import { SearchBar } from './parking/SearchBar';
import { RecommendationSheet } from './parking/RecommendationSheet';

const ParkingMap = dynamic(() => import('./map/ParkingMap').then((module) => module.ParkingMap), {
  ssr: false,
  loading: () => (
    <div className="absolute inset-0 animate-pulse bg-zinc-200" aria-label="Cargando mapa" />
  ),
});

type LoadState = 'idle' | 'loading' | 'ready' | 'error';

export function ParkflowApp() {
  const [origin, setOrigin] = useState<Coordinates | null>(null);
  const [mapData, setMapData] = useState<MapResponse | null>(null);
  const [oraData, setOraData] = useState<OraFeatureCollection | null>(null);
  const [nearby, setNearby] = useState<NearbyResponse | null>(null);
  const [state, setState] = useState<LoadState>('idle');
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [reportMessage, setReportMessage] = useState<string | null>(null);
  const [isReporting, setIsReporting] = useState(false);
  const [layers, setLayers] = useState<MapLayerVisibility>(DEFAULT_LAYERS);
  const requestId = useRef(0);
  const oraRequested = useRef(false);

  const loadMap = useCallback(async () => {
    try {
      setMapData(await fetchMapData());
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

  const loadNearby = useCallback(async (coordinates: Coordinates, includeStreets: boolean) => {
    const currentRequest = ++requestId.current;
    setState('loading');
    setError(null);
    setSelectedId(null);

    try {
      const data = await fetchNearby(coordinates.latitude, coordinates.longitude, {
        includeStreets,
      });
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

      setNearby(null);
      setError(
        caught instanceof Error ? caught.message : 'No se pudieron cargar las recomendaciones',
      );
      setState('error');
    }
  }, []);

  useEffect(() => {
    if (!origin) return;

    const timer = setTimeout(() => void loadNearby(origin, layers.streets), 250);
    return () => clearTimeout(timer);
  }, [origin, layers.streets, loadNearby]);

  const handleOrigin = useCallback((coordinates: Coordinates) => {
    setOrigin(coordinates);
    setReportMessage(null);
  }, []);

  const toggleLayer = useCallback((layer: keyof MapLayerVisibility) => {
    setLayers((current) => ({ ...current, [layer]: !current[layer] }));
  }, []);

  const handleReport = useCallback(
    async (kind: 'spot_free' | 'area_full') => {
      if (!origin) return;

      setIsReporting(true);
      setReportMessage(null);

      try {
        await sendReport({ kind, latitude: origin.latitude, longitude: origin.longitude });
        setReportMessage(
          kind === 'spot_free'
            ? 'Hueco reportado. Gracias por avisar.'
            : 'Zona marcada como llena. Gracias por avisar.',
        );
        await Promise.all([loadMap(), loadNearby(origin, layers.streets)]);
      } catch (caught) {
        setReportMessage(caught instanceof Error ? caught.message : 'No se pudo enviar el reporte');
      } finally {
        setIsReporting(false);
      }
    },
    [origin, layers.streets, loadMap, loadNearby],
  );

  const selected = useMemo(
    () => nearby?.candidates.find((candidate) => candidate.id === selectedId) ?? null,
    [nearby, selectedId],
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
          layers={layers}
          onOrigin={handleOrigin}
        />

        <div className="absolute inset-x-3 top-3 z-10 flex flex-col gap-2 sm:w-96">
          <SearchBar origin={origin} onOrigin={handleOrigin} />
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
          streetsEnabled={layers.streets}
          onSelect={setSelectedId}
          onRetry={() => {
            if (origin) void loadNearby(origin, layers.streets);
          }}
          onReport={handleReport}
          isReporting={isReporting}
          reportMessage={reportMessage}
        />
      </aside>
    </main>
  );
}
