import { useState } from 'react';
import type { MapLayerVisibility } from './layers';

const COLORS = [
  { color: 'bg-emerald-600', label: 'Alta' },
  { color: 'bg-amber-500', label: 'Media' },
  { color: 'bg-red-600', label: 'Baja' },
  { color: 'bg-zinc-400', label: 'Sin datos' },
];

export function MapLegend({ layers }: { layers: MapLayerVisibility }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="pointer-events-none absolute bottom-9 left-3 z-10 flex flex-col items-start gap-1.5">
      <div
        id="map-legend"
        className={`${open ? 'block' : 'hidden'} pointer-events-auto w-72 max-w-[calc(100vw-5rem)] rounded-lg border border-zinc-200 bg-white/95 px-3 py-2 text-[11px] shadow-sm backdrop-blur lg:block`}
      >
        <p className="font-medium text-zinc-700">Disponibilidad</p>

        <ul className="mt-1 flex flex-wrap gap-x-3 gap-y-1">
          {COLORS.map((item) => (
            <li key={item.label} className="flex items-center gap-1.5 text-zinc-600">
              <span aria-hidden="true" className={`size-2 rounded-full ${item.color}`} />
              {item.label}
            </li>
          ))}
        </ul>

        <p className="mt-1 flex flex-wrap gap-x-2 gap-y-1 text-zinc-600">
          {layers.garages && (
            <span>
              <span aria-hidden="true" className="font-semibold text-zinc-800">
                P
              </span>{' '}
              garaje (dato municipal)
            </span>
          )}
          {layers.streets && (
            <span>
              <span aria-hidden="true" className="font-semibold text-zinc-800">
                —
              </span>{' '}
              calle: predicción 1 h
            </span>
          )}
          {layers.reports && (
            <span>
              <span aria-hidden="true" className="font-semibold text-zinc-800">
                ●
              </span>{' '}
              reporte
            </span>
          )}
          {layers.cameras && (
            <span>
              <span aria-hidden="true" className="font-semibold text-zinc-800">
                C
              </span>{' '}
              cámara, sin vídeo
            </span>
          )}
        </p>

        <p className="mt-1 text-[10px] leading-snug text-zinc-500">
          Garajes: plazas libres · Calles: probabilidad prevista · no reserva
        </p>
        <p className="text-[10px] leading-snug text-zinc-500">
          Mapa: MapTiler · Datos: Ajuntament de València (CC BY 4.0)
        </p>
      </div>

      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        aria-expanded={open}
        aria-controls="map-legend"
        className="pointer-events-auto inline-flex items-center gap-1.5 rounded-full border border-zinc-200 bg-white/95 px-3 py-1.5 text-xs font-medium text-zinc-700 shadow-sm backdrop-blur transition-colors hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 lg:hidden"
      >
        <span
          aria-hidden="true"
          className="flex size-4 items-center justify-center rounded-full bg-zinc-200 text-[10px] font-semibold text-zinc-700"
        >
          i
        </span>
        Leyenda
      </button>
    </div>
  );
}
