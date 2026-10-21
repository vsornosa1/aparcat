'use client';

import {
  LngLat,
  LngLatBounds,
  Map as MapLibreMap,
  NavigationControl,
  Popup,
  setWorkerUrl,
  type ExpressionSpecification,
  type GeoJSONSource,
  type MapLayerMouseEvent,
  type MapMouseEvent,
} from 'maplibre-gl';
import { useEffect, useRef, useState } from 'react';
import type {
  Candidate,
  MapCameraProperties,
  MapFacilityProperties,
  MapOraProperties,
  MapReportProperties,
  MapResponse,
  MapSegmentProperties,
  OraFeatureCollection,
} from '@/api/contracts';
import type { Coordinates } from '@/domain/types';
import { FEW_SPACES, formatFreeSpaces, formatPlaceName, PLENTY_OF_SPACES } from '@/lib/format';
import { getMapStyle } from '@/lib/map-style';
import { mapsUrl } from '@/lib/maps';
import type { MapLayerVisibility } from './layers';

const CENTER = { latitude: 39.4699, longitude: -0.3763 };

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

// Mismos umbrales que la tarjeta: plazas absolutas, no porcentaje.
const FACILITY_COLOR: ExpressionSpecification = [
  'case',
  ['==', ['get', 'freeSpaces'], null],
  '#a1a1aa',
  ['>=', ['get', 'freeSpaces'], PLENTY_OF_SPACES],
  '#059669',
  ['>=', ['get', 'freeSpaces'], FEW_SPACES],
  '#d97706',
  '#dc2626',
];

// Fuera de la paleta ORA (azul, naranja, verde) para no confundirlos con zonas.
const REPORT_FREE_COLOR = '#7c3aed';
const REPORT_FULL_COLOR = '#be123c';
const ORIGIN_COLOR = '#18181b';

const REPORT_COLOR: ExpressionSpecification = [
  'match',
  ['get', 'kind'],
  'spot_free',
  REPORT_FREE_COLOR,
  REPORT_FULL_COLOR,
];

const ORA_COLOR: ExpressionSpecification = [
  'match',
  ['get', 'color'],
  'Azul',
  '#2563eb',
  'Naranja',
  '#f97316',
  'Verde',
  '#16a34a',
  'Amarillo',
  '#eab308',
  '#71717a',
];

const INTERACTIVE_LAYERS = [
  'facilities-circle',
  'facilities-icon',
  'cameras-circle',
  'cameras-icon',
  'reports-circle',
  'segments-line',
  'ora-fill',
  'ora-outline',
];

interface ParkingMapProps {
  data: MapResponse | null;
  ora: OraFeatureCollection | null;
  origin: Coordinates | null;
  selected: Candidate | null;
  /** Se incrementa cuando el usuario elige una tarjeta y el mapa debe enseñarla. */
  focusRequest: number;
  layers: MapLayerVisibility;
  onOrigin: (origin: Coordinates) => void;
  onFacilityClick: (facilityId: string) => void;
}

export function ParkingMap({
  data,
  ora,
  origin,
  selected,
  focusRequest,
  layers,
  onOrigin,
  onFacilityClick,
}: ParkingMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const popupRef = useRef<Popup | null>(null);
  const onOriginRef = useRef(onOrigin);
  const onFacilityClickRef = useRef(onFacilityClick);
  const originRef = useRef(origin);
  const selectedRef = useRef(selected);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    onOriginRef.current = onOrigin;
    onFacilityClickRef.current = onFacilityClick;
    originRef.current = origin;
    selectedRef.current = selected;
  }, [onOrigin, onFacilityClick, origin, selected]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let mapInstance: MapLibreMap | undefined;

    const start = () => {
      setWorkerUrl('/maplibre-gl-worker.mjs');

      const map = new MapLibreMap({
        container,
        style: getMapStyle(),
        center: [CENTER.longitude, CENTER.latitude],
        zoom: 13,
        attributionControl: { compact: true },
      });

      mapInstance = map;
      mapRef.current = map;
      map.addControl(new NavigationControl({ showCompass: false }), 'bottom-right');

      const showPopup = (event: MapLayerMouseEvent, content: HTMLElement) => {
        popupRef.current?.remove();
        popupRef.current = new Popup({ offset: 12, closeButton: true, maxWidth: '260px' })
          .setLngLat(event.lngLat)
          .setDOMContent(content)
          .addTo(map);
      };

      const addLayers = () => {
        if (map.getSource('segments')) return;

        map.addSource('segments', { type: 'geojson', data: emptyCollection() });
        map.addSource('ora', { type: 'geojson', data: emptyCollection() });
        map.addSource('facilities', { type: 'geojson', data: emptyCollection() });
        map.addSource('cameras', { type: 'geojson', data: emptyCollection() });
        map.addSource('reports', { type: 'geojson', data: emptyCollection() });
        map.addSource('origin', { type: 'geojson', data: emptyCollection() });
        map.addSource('selected', { type: 'geojson', data: emptyCollection() });

        map.addLayer({
          id: 'ora-fill',
          type: 'fill',
          source: 'ora',
          paint: {
            'fill-color': ORA_COLOR,
            'fill-opacity': 0.35,
          },
        });

        map.addLayer({
          id: 'ora-outline',
          type: 'line',
          source: 'ora',
          paint: {
            'line-color': ORA_COLOR,
            'line-width': 1.5,
            'line-opacity': 0.85,
          },
        });

        map.addLayer({
          id: 'segments-line',
          type: 'line',
          source: 'segments',
          paint: {
            'line-color': SEGMENT_COLOR,
            'line-width': 5,
            'line-opacity': 0.9,
          },
        });

        map.addLayer({
          id: 'facilities-circle',
          type: 'circle',
          source: 'facilities',
          paint: {
            'circle-radius': 10,
            'circle-color': FACILITY_COLOR,
            'circle-stroke-width': 2,
            'circle-stroke-color': '#ffffff',
          },
        });

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

        map.addLayer({
          id: 'cameras-circle',
          type: 'circle',
          source: 'cameras',
          minzoom: 14,
          paint: {
            'circle-radius': 8,
            'circle-color': '#475569',
            'circle-stroke-width': 2,
            'circle-stroke-color': '#ffffff',
          },
        });

        map.addLayer({
          id: 'origin-halo',
          type: 'circle',
          source: 'origin',
          paint: {
            'circle-radius': 16,
            'circle-color': ORIGIN_COLOR,
            'circle-opacity': 0.15,
          },
        });
        map.addLayer({
          id: 'origin-dot',
          type: 'circle',
          source: 'origin',
          paint: {
            'circle-radius': 7,
            'circle-color': ORIGIN_COLOR,
            'circle-stroke-width': 3,
            'circle-stroke-color': '#ffffff',
          },
        });

        map.addLayer({
          id: 'selected-ring',
          type: 'circle',
          source: 'selected',
          paint: {
            'circle-radius': 15,
            'circle-color': 'rgba(0,0,0,0)',
            'circle-stroke-width': 3,
            'circle-stroke-color': '#18181b',
          },
        });

        if (!map.hasImage('garage-p'))
          map.addImage('garage-p', createGarageIcon(), { pixelRatio: 2 });
        if (!map.hasImage('camera-icon'))
          map.addImage('camera-icon', createCameraIcon(), { pixelRatio: 2 });

        map.addLayer({
          id: 'facilities-icon',
          type: 'symbol',
          source: 'facilities',
          layout: {
            'icon-image': 'garage-p',
            'icon-size': 0.5,
            'icon-allow-overlap': true,
            'icon-ignore-placement': true,
          },
        });

        map.addLayer({
          id: 'cameras-icon',
          type: 'symbol',
          source: 'cameras',
          minzoom: 14,
          layout: {
            'icon-image': 'camera-icon',
            'icon-size': 0.5,
            'icon-allow-overlap': true,
            'icon-ignore-placement': true,
          },
        });

        for (const layer of ['facilities-circle', 'facilities-icon']) {
          map.on('click', layer, (event: MapLayerMouseEvent) => {
            const feature = event.features?.[0];
            if (!feature) return;
            const properties = feature.properties as unknown as MapFacilityProperties;
            onFacilityClickRef.current(String(properties.id));
            showPopup(event, facilityPopup(properties, event.lngLat));
          });
        }

        for (const layer of ['cameras-circle', 'cameras-icon']) {
          map.on('click', layer, (event: MapLayerMouseEvent) => {
            const feature = event.features?.[0];
            if (!feature) return;
            showPopup(event, cameraPopup(feature.properties as unknown as MapCameraProperties));
          });
        }

        map.on('click', 'reports-circle', (event: MapLayerMouseEvent) => {
          const feature = event.features?.[0];
          if (!feature) return;
          showPopup(event, reportPopup(feature.properties as unknown as MapReportProperties));
        });

        map.on('click', 'segments-line', (event: MapLayerMouseEvent) => {
          const feature = event.features?.[0];
          if (!feature) return;
          showPopup(
            event,
            segmentPopup(feature.properties as unknown as MapSegmentProperties, event.lngLat),
          );
        });

        const handleOraClick = (event: MapLayerMouseEvent) => {
          const feature = event.features?.[0];
          if (!feature) return;

          const priority = map.queryRenderedFeatures(event.point, {
            layers: [
              'facilities-circle',
              'facilities-icon',
              'cameras-circle',
              'cameras-icon',
              'reports-circle',
              'segments-line',
            ],
          });
          if (priority.length > 0) return;

          showPopup(event, oraPopup(feature.properties as unknown as MapOraProperties));
        };

        map.on('click', 'ora-fill', handleOraClick);
        map.on('click', 'ora-outline', handleOraClick);

        map.on('click', (event: MapMouseEvent) => {
          const hits = map.queryRenderedFeatures(event.point, { layers: INTERACTIVE_LAYERS });
          if (hits.length > 0) return;
          onOriginRef.current({ latitude: event.lngLat.lat, longitude: event.lngLat.lng });
        });

        for (const layer of INTERACTIVE_LAYERS) {
          map.on('mouseenter', layer, () => {
            map.getCanvas().style.cursor = 'pointer';
          });
          map.on('mouseleave', layer, () => {
            map.getCanvas().style.cursor = '';
          });
        }

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
    (map.getSource('ora') as GeoJSONSource | undefined)?.setData(ora ?? emptyCollection());
    (map.getSource('facilities') as GeoJSONSource | undefined)?.setData(
      data?.layers.facilities ?? emptyCollection(),
    );
    (map.getSource('cameras') as GeoJSONSource | undefined)?.setData(
      data?.layers.cameras ?? emptyCollection(),
    );
    (map.getSource('reports') as GeoJSONSource | undefined)?.setData(
      data?.layers.reports ?? emptyCollection(),
    );
  }, [ready, data, ora]);

  useEffect(() => {
    if (!ready) return;
    const map = mapRef.current;
    if (!map) return;

    setLayerVisibility(map, 'segments-line', layers.streets);
    setLayerVisibility(map, 'ora-fill', layers.ora);
    setLayerVisibility(map, 'ora-outline', layers.ora);
    setLayerVisibility(map, 'facilities-circle', layers.garages);
    setLayerVisibility(map, 'facilities-icon', layers.garages);
    setLayerVisibility(map, 'reports-circle', layers.reports);
    setLayerVisibility(map, 'cameras-circle', layers.cameras);
    setLayerVisibility(map, 'cameras-icon', layers.cameras);
  }, [ready, layers]);

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

  useEffect(() => {
    if (!ready || focusRequest === 0) return;
    const map = mapRef.current;
    const target = selectedRef.current;
    if (!map || !target) return;

    const bounds = new LngLatBounds().extend([target.location.longitude, target.location.latitude]);
    const start = originRef.current;
    if (start) bounds.extend([start.longitude, start.latitude]);

    map.fitBounds(bounds, {
      padding: overlayPadding(map.getContainer()),
      maxZoom: 16,
      duration: 600,
    });
  }, [ready, focusRequest]);

  return (
    <div className="absolute inset-0">
      <div
        ref={containerRef}
        className="h-full w-full"
        role="application"
        aria-label="Mapa de aparcamiento"
      />
      <p className="sr-only">
        Toca el mapa para elegir el origen. Usa el buscador para calles y direcciones, o el botón de
        ubicación.
      </p>
    </div>
  );
}

/** Márgenes para encuadrar sin que el buscador ni la leyenda tapen los puntos. */
function overlayPadding(container: HTMLElement) {
  const box = container.getBoundingClientRect();
  const section = container.closest('section');
  const top = section?.querySelector('[data-map-overlay="top"]')?.getBoundingClientRect();
  const legend = section?.querySelector('#map-legend')?.getBoundingClientRect();
  const margin = 32;

  const padding = {
    top: top ? Math.max(margin, top.bottom - box.top + margin) : margin,
    bottom: legend && legend.height > 0 ? box.bottom - legend.top + margin : margin + 24,
    left: margin,
    right: margin + 24,
  };

  // En pantallas bajas los márgenes no pueden comerse todo el mapa.
  const spare = box.height - padding.top - padding.bottom;
  if (spare < 80) padding.bottom = Math.max(margin, padding.bottom + spare - 80);

  return padding;
}

function setLayerVisibility(map: MapLibreMap, layerId: string, visible: boolean): void {
  if (map.getLayer(layerId)) {
    map.setLayoutProperty(layerId, 'visibility', visible ? 'visible' : 'none');
  }
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

function createGarageIcon(): ImageData {
  const size = 64;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('No se pudo crear el icono de garaje');

  context.fillStyle = '#ffffff';
  context.font = 'bold 42px Arial, sans-serif';
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  context.fillText('P', size / 2, size / 2 + 2);

  return context.getImageData(0, 0, size, size);
}

function createCameraIcon(): ImageData {
  const size = 64;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('No se pudo crear el icono de cámara');

  context.fillStyle = '#ffffff';
  context.fillRect(14, 24, 36, 24);
  context.fillRect(24, 16, 14, 8);
  context.beginPath();
  context.arc(32, 36, 7, 0, Math.PI * 2);
  context.fillStyle = '#475569';
  context.fill();

  return context.getImageData(0, 0, size, size);
}

function facilityPopup(
  properties: MapFacilityProperties,
  location: { lng: number; lat: number },
): HTMLElement {
  const root = document.createElement('div');
  root.className = 'space-y-1 text-sm';

  const title = document.createElement('strong');
  title.textContent = formatPlaceName(properties.name);

  const type = document.createElement('p');
  type.className = 'text-xs text-zinc-500';
  type.textContent = 'Garaje público · dato municipal';

  const availability = document.createElement('p');
  availability.className = 'font-medium text-zinc-800';
  const freeSpaces = properties.freeSpaces ?? null;
  const capacity = properties.capacity ?? null;
  const ageMinutes = properties.ageMinutes ?? null;

  availability.textContent = freeSpaces === null ? 'Sin datos' : formatFreeSpaces(freeSpaces);

  const detail = document.createElement('p');
  detail.className = 'text-xs text-zinc-500';
  detail.textContent =
    freeSpaces === null
      ? 'No hay datos recientes de este garaje.'
      : `${capacity !== null ? `de ${capacity} plazas · ` : ''}${
          ageMinutes !== null ? `actualizado hace ${ageMinutes} min` : 'sin hora de actualización'
        }`;

  root.append(
    title,
    type,
    availability,
    detail,
    mapsLink({ longitude: location.lng, latitude: location.lat }),
  );
  return root;
}

function segmentPopup(
  properties: MapSegmentProperties,
  location: { lng: number; lat: number },
): HTMLElement {
  const root = document.createElement('div');
  root.className = 'space-y-1 text-sm';

  const title = document.createElement('strong');
  title.textContent = properties.streetName;

  const type = document.createElement('p');
  type.className = 'text-xs text-zinc-500';
  type.textContent = 'Calle con aparcamiento regulado · predicción municipal';

  const availability = document.createElement('p');
  availability.className = 'font-medium text-zinc-800';
  const level =
    properties.availability >= 0.6 ? 'alta' : properties.availability >= 0.3 ? 'media' : 'baja';
  availability.textContent = `Probabilidad ${level} de hueco (próxima hora)`;

  const detail = document.createElement('p');
  detail.className = 'text-xs text-zinc-500';
  const ageMinutes = properties.ageMinutes ?? null;
  detail.textContent = `${
    ageMinutes !== null ? `Consultada hace ${ageMinutes} min. ` : 'Sin hora de actualización. '
  }Puede incluir partes sin plazas. No es una reserva.`;

  root.append(
    title,
    type,
    availability,
    detail,
    mapsLink({ longitude: location.lng, latitude: location.lat }),
  );
  return root;
}

function oraPopup(properties: MapOraProperties): HTMLElement {
  const root = document.createElement('div');
  root.className = 'space-y-1 text-sm';

  const color = properties.color ?? '';
  const title = document.createElement('strong');
  title.textContent = ORA_ZONE_LABELS[color] ?? 'Zona de aparcamiento';

  const type = document.createElement('p');
  type.className = 'text-xs text-zinc-500';
  type.textContent = ORA_ZONE_TYPES[color] ?? 'Marcas de aparcamiento en calle';

  const detail = document.createElement('p');
  detail.className = 'text-xs text-zinc-500';
  detail.textContent = ORA_ZONE_DESCRIPTIONS[color] ?? 'Consulta la señalización de la calle.';

  const note = document.createElement('p');
  note.className = 'text-xs text-zinc-500';
  note.textContent = 'Solo esta zona; otras marcas de la calle pueden tener otra tarifa.';

  root.append(title, type, detail, note);
  return root;
}

const ORA_ZONE_LABELS: Record<string, string> = {
  Azul: 'Zona azul',
  Naranja: 'Zona naranja',
  Verde: 'Zona verde',
  Amarillo: 'Zona amarilla',
};

const ORA_ZONE_TYPES: Record<string, string> = {
  Azul: 'Aparcamiento regulado (ORA)',
  Naranja: 'Aparcamiento regulado (ORA)',
  Verde: 'Aparcamiento regulado (ORA)',
  Amarillo: 'Zona restringida',
};

const ORA_ZONE_DESCRIPTIONS: Record<string, string> = {
  Azul: 'Pago con límite de tiempo.',
  Naranja: 'Preferente para residentes; los visitantes pueden pagar.',
  Verde: 'Exclusiva para residentes con distintivo.',
  Amarillo: 'Carga y descarga, bus o movilidad reducida.',
};

function mapsLink(location: Coordinates): HTMLAnchorElement {
  const link = document.createElement('a');
  link.href = mapsUrl(location);
  link.target = '_blank';
  link.rel = 'noopener noreferrer';
  link.className = 'inline-block text-xs font-medium text-emerald-700 underline underline-offset-2';
  link.textContent = 'Cómo llegar ↗';
  return link;
}

function cameraPopup(properties: MapCameraProperties): HTMLElement {
  const root = document.createElement('div');
  root.className = 'space-y-1 text-sm';

  const title = document.createElement('strong');
  title.textContent = properties.description ?? 'Cámara de tráfico';

  const type = document.createElement('p');
  type.className = 'text-xs text-zinc-500';
  type.textContent = 'Solo ubicación · sin imágenes en Aparcat';

  const link = document.createElement('a');
  link.href = properties.url;
  link.target = '_blank';
  link.rel = 'noopener noreferrer';
  link.className = 'inline-block text-xs font-medium text-emerald-700 underline underline-offset-2';
  link.textContent = 'Abrir el visor oficial';

  root.append(title, type, link);
  return root;
}

function reportPopup(properties: MapReportProperties): HTMLElement {
  const root = document.createElement('div');
  root.className = 'space-y-1 text-sm';

  const title = document.createElement('strong');
  title.textContent = properties.kind === 'spot_free' ? 'Hueco reportado' : 'Zona llena';

  const detail = document.createElement('p');
  detail.className = 'text-xs text-zinc-500';
  detail.textContent = `Reporte de la comunidad · hace ${properties.ageMinutes} min. Caduca a los 15 minutos.`;

  root.append(title, detail);
  return root;
}
