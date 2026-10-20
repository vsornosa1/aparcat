'use client';

import {
  LngLat,
  Map as MapLibreMap,
  NavigationControl,
  Popup,
  setWorkerUrl,
  type ExpressionSpecification,
  type GeoJSONSource,
  type MapLayerMouseEvent,
  type MapMouseEvent,
  type StyleSpecification,
} from 'maplibre-gl';
import { useEffect, useRef, useState } from 'react';
import type {
  Candidate,
  MapCameraProperties,
  MapFacilityProperties,
  MapResponse,
} from '@/api/contracts';
import type { Coordinates } from '@/domain/types';

const CENTER = { latitude: 39.4699, longitude: -0.3763 };
const MAP_STYLE_URL = process.env.NEXT_PUBLIC_MAP_STYLE_URL;

const OSM_STYLE: StyleSpecification = {
  version: 8,
  sources: {
    osm: {
      type: 'raster',
      tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
      tileSize: 256,
      attribution: '© OpenStreetMap contributors',
    },
  },
  layers: [
    { id: 'background', type: 'background', paint: { 'background-color': '#f4f4f5' } },
    { id: 'osm', type: 'raster', source: 'osm' },
  ],
};

const SEGMENT_COLOR: ExpressionSpecification = [
  'case',
  ['==', ['get', 'freshness'], 'stale'],
  '#a1a1aa',
  ['>=', ['get', 'availability'], 0.6],
  '#059669',
  ['>=', ['get', 'availability'], 0.3],
  '#d97706',
  '#dc2626',
];

const FACILITY_COLOR: ExpressionSpecification = [
  'case',
  ['==', ['get', 'availability'], null],
  '#a1a1aa',
  ['>=', ['get', 'availability'], 0.6],
  '#059669',
  ['>=', ['get', 'availability'], 0.3],
  '#d97706',
  '#dc2626',
];

const REPORT_COLOR: ExpressionSpecification = [
  'match',
  ['get', 'kind'],
  'spot_free',
  '#2563eb',
  '#f97316',
];

interface ParkingMapProps {
  data: MapResponse | null;
  origin: Coordinates | null;
  selected: Candidate | null;
  onOrigin: (origin: Coordinates) => void;
}

export function ParkingMap({ data, origin, selected, onOrigin }: ParkingMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const popupRef = useRef<Popup | null>(null);
  const onOriginRef = useRef(onOrigin);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    onOriginRef.current = onOrigin;
  }, [onOrigin]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let mapInstance: MapLibreMap | undefined;

    const start = () => {
      setWorkerUrl('/maplibre-gl-worker.mjs');

      const map = new MapLibreMap({
        container,
        style: MAP_STYLE_URL ? MAP_STYLE_URL : OSM_STYLE,
        center: [CENTER.longitude, CENTER.latitude],
        zoom: 13,
        attributionControl: { compact: true },
      });

      mapInstance = map;
      mapRef.current = map;

      map.on('error', (event) => {
        if (!map.isStyleLoaded()) console.error('MapLibre:', event.error);
      });

      map.addControl(new NavigationControl({ showCompass: false }), 'bottom-right');

      const addLayers = () => {
        if (map.getSource('segments')) return;
        map.addSource('segments', { type: 'geojson', data: emptyCollection() });
        map.addLayer({
          id: 'segments-line',
          type: 'line',
          source: 'segments',
          paint: {
            'line-color': SEGMENT_COLOR,
            'line-width': 4,
            'line-opacity': 0.9,
          },
        });

        map.addSource('facilities', { type: 'geojson', data: emptyCollection() });
        map.addLayer({
          id: 'facilities-circle',
          type: 'circle',
          source: 'facilities',
          paint: {
            'circle-radius': 7,
            'circle-color': FACILITY_COLOR,
            'circle-stroke-width': 2,
            'circle-stroke-color': '#ffffff',
          },
        });

        map.addSource('cameras', { type: 'geojson', data: emptyCollection() });
        map.addLayer({
          id: 'cameras-circle',
          type: 'circle',
          source: 'cameras',
          paint: {
            'circle-radius': 5,
            'circle-color': '#475569',
            'circle-stroke-width': 1.5,
            'circle-stroke-color': '#ffffff',
          },
        });

        map.addSource('reports', { type: 'geojson', data: emptyCollection() });
        map.addLayer({
          id: 'reports-circle',
          type: 'circle',
          source: 'reports',
          paint: {
            'circle-radius': 6,
            'circle-color': REPORT_COLOR,
            'circle-stroke-width': 2,
            'circle-stroke-color': '#ffffff',
          },
        });

        map.addSource('origin', { type: 'geojson', data: emptyCollection() });
        map.addLayer({
          id: 'origin-halo',
          type: 'circle',
          source: 'origin',
          paint: {
            'circle-radius': 16,
            'circle-color': '#2563eb',
            'circle-opacity': 0.2,
          },
        });
        map.addLayer({
          id: 'origin-dot',
          type: 'circle',
          source: 'origin',
          paint: {
            'circle-radius': 7,
            'circle-color': '#2563eb',
            'circle-stroke-width': 2,
            'circle-stroke-color': '#ffffff',
          },
        });

        map.addSource('selected', { type: 'geojson', data: emptyCollection() });
        map.addLayer({
          id: 'selected-ring',
          type: 'circle',
          source: 'selected',
          paint: {
            'circle-radius': 14,
            'circle-color': 'rgba(0,0,0,0)',
            'circle-stroke-width': 3,
            'circle-stroke-color': '#0f172a',
          },
        });

        map.on('click', 'facilities-circle', (event: MapLayerMouseEvent) => {
          const feature = event.features?.[0];
          if (!feature) return;

          const properties = feature.properties as unknown as MapFacilityProperties;
          const content = document.createElement('div');
          const title = document.createElement('strong');
          title.textContent = properties.name;
          const detail = document.createElement('div');
          detail.textContent =
            properties.availability === null
              ? 'Sin datos recientes'
              : `${Math.round(properties.availability * 100)}% de plazas libres`;

          content.append(title, detail);
          popupRef.current?.remove();
          popupRef.current = new Popup({ offset: 12, closeButton: false })
            .setLngLat(event.lngLat)
            .setDOMContent(content)
            .addTo(map);
        });

        map.on('click', 'cameras-circle', (event: MapLayerMouseEvent) => {
          const feature = event.features?.[0];
          if (!feature) return;

          const properties = feature.properties as unknown as MapCameraProperties;
          const content = document.createElement('div');
          const title = document.createElement('strong');
          title.textContent = properties.description ?? 'Cámara de tráfico';
          const detail = document.createElement('div');
          detail.textContent = 'Solo ubicación · sin imágenes';
          const link = document.createElement('a');
          link.href = properties.url;
          link.target = '_blank';
          link.rel = 'noopener noreferrer';
          link.textContent = 'Ver en el visor oficial';
          content.append(title, detail, link);

          popupRef.current?.remove();
          popupRef.current = new Popup({ offset: 12, closeButton: false })
            .setLngLat(event.lngLat)
            .setDOMContent(content)
            .addTo(map);
        });

        map.on('click', (event: MapMouseEvent) => {
          const facilities = map.queryRenderedFeatures(event.point, {
            layers: ['facilities-circle', 'cameras-circle'],
          });
          if (facilities.length > 0) return;

          onOriginRef.current({ latitude: event.lngLat.lat, longitude: event.lngLat.lng });
        });

        map.on('mouseenter', 'facilities-circle', () => {
          map.getCanvas().style.cursor = 'pointer';
        });
        map.on('mouseleave', 'facilities-circle', () => {
          map.getCanvas().style.cursor = '';
        });

        setReady(true);
      };

      map.on('style.load', addLayers);
      map.on('load', addLayers);
    };

    // Retrasar la creación evita el doble montaje de StrictMode y que el primer
    // mapa elimine los workers compartidos del segundo.
    const timer = window.setTimeout(start, 0);

    return () => {
      window.clearTimeout(timer);
      popupRef.current?.remove();
      popupRef.current = null;
      mapInstance?.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!ready) return;
    const map = mapRef.current;
    if (!map) return;

    (map.getSource('segments') as GeoJSONSource | undefined)?.setData(
      data?.layers.segments ?? emptyCollection(),
    );
    (map.getSource('facilities') as GeoJSONSource | undefined)?.setData(
      data?.layers.facilities ?? emptyCollection(),
    );
    (map.getSource('cameras') as GeoJSONSource | undefined)?.setData(
      data?.layers.cameras ?? emptyCollection(),
    );
    (map.getSource('reports') as GeoJSONSource | undefined)?.setData(
      data?.layers.reports ?? emptyCollection(),
    );
  }, [ready, data]);

  useEffect(() => {
    if (!ready) return;
    const map = mapRef.current;
    if (!map) return;

    (map.getSource('origin') as GeoJSONSource | undefined)?.setData(
      origin ? pointCollection(origin) : emptyCollection(),
    );

    if (!origin) return;

    const distance = map.getCenter().distanceTo(new LngLat(origin.longitude, origin.latitude));
    if (distance > 500) {
      map.flyTo({ center: [origin.longitude, origin.latitude], zoom: 14.5, duration: 600 });
    }
  }, [ready, origin]);

  useEffect(() => {
    if (!ready) return;
    const map = mapRef.current;
    if (!map) return;

    (map.getSource('selected') as GeoJSONSource | undefined)?.setData(
      selected ? pointCollection(selected.location) : emptyCollection(),
    );
  }, [ready, selected]);

  return (
    <div className="absolute inset-0">
      <div
        ref={containerRef}
        className="h-full w-full"
        role="application"
        aria-label="Mapa de aparcamiento"
      />
      <p className="sr-only">
        Toca el mapa para elegir el punto desde el que buscar. También puedes usar el buscador de
        calles o el botón de ubicación.
      </p>
    </div>
  );
}

function emptyCollection() {
  return { type: 'FeatureCollection' as const, features: [] };
}

function pointCollection(point: Coordinates) {
  return {
    type: 'FeatureCollection' as const,
    features: [
      {
        type: 'Feature' as const,
        geometry: {
          type: 'Point' as const,
          coordinates: [point.longitude, point.latitude],
        },
        properties: {},
      },
    ],
  };
}
