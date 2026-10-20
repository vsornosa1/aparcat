'use client';

import dynamic from 'next/dynamic';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { MapResponse, NearbyResponse } from '@/api/contracts';
import type { Coordinates } from '@/domain/types';
import { fetchMapData, fetchNearby, sendReport } from '@/lib/api-client';
import { MapLegend } from './map/MapLegend';
import { OriginPicker } from './parking/OriginPicker';
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
  const [nearby, setNearby] = useState<NearbyResponse | null>(null);
  const [state, setState] = useState<LoadState>('idle');
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [reportMessage, setReportMessage] = useState<string | null>(null);
  const [isReporting, setIsReporting] = useState(false);
  const requestId = useRef(0);

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

  const loadNearby = useCallback(async (coordinates: Coordinates) => {
    const currentRequest = ++requestId.current;
    setState('loading');
    setError(null);
    setSelectedId(null);

    try {
      const data = await fetchNearby(coordinates.latitude, coordinates.longitude);
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

    const timer = setTimeout(() => void loadNearby(origin), 250);
    return () => clearTimeout(timer);
  }, [origin, loadNearby]);

  const handleOrigin = useCallback((coordinates: Coordinates) => {
    setOrigin(coordinates);
    setReportMessage(null);
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
        await Promise.all([loadMap(), loadNearby(origin)]);
      } catch (caught) {
        setReportMessage(caught instanceof Error ? caught.message : 'No se pudo enviar el reporte');
      } finally {
        setIsReporting(false);
      }
    },
    [origin, loadMap, loadNearby],
  );

  const selected = useMemo(
    () => nearby?.candidates.find((candidate) => candidate.id === selectedId) ?? null,
    [nearby, selectedId],
  );

  return (
    <main className="flex min-h-dvh flex-col lg:h-dvh lg:flex-row">
      <section
        className="relative h-[52dvh] min-h-[320px] shrink-0 lg:h-auto lg:flex-1"
        aria-label="Mapa y búsqueda de aparcamiento"
      >
        <ParkingMap data={mapData} origin={origin} selected={selected} onOrigin={handleOrigin} />

        <div className="absolute inset-x-3 top-3 z-10 sm:w-80">
          <OriginPicker origin={origin} onOrigin={handleOrigin} />
        </div>

        <MapLegend />
      </section>

      <aside className="flex min-h-0 flex-1 flex-col border-t border-zinc-200 bg-white lg:h-full lg:w-[420px] lg:flex-none lg:border-l lg:border-t-0">
        <RecommendationSheet
          origin={origin}
          nearby={nearby}
          state={state}
          error={error}
          selectedId={selectedId}
          onSelect={setSelectedId}
          onRetry={() => {
            if (origin) void loadNearby(origin);
          }}
          onReport={handleReport}
          isReporting={isReporting}
          reportMessage={reportMessage}
        />
      </aside>
    </main>
  );
}
