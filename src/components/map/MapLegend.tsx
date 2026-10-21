import type { MapLayerVisibility } from './layers';

const COLORS = [
  { color: 'bg-emerald-600', label: '≥60%' },
  { color: 'bg-amber-500', label: '30–59%' },
  { color: 'bg-red-600', label: '<30%' },
  { color: 'bg-zinc-400', label: 'Sin datos' },
];

export function MapLegend({ layers }: { layers: MapLayerVisibility }) {
  return (
    <div className="pointer-events-none absolute bottom-9 left-3 z-10 max-w-[calc(100%-5rem)] rounded-lg border border-zinc-200 bg-white/95 px-3 py-2 text-[11px] shadow-sm backdrop-blur">
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
        Garajes: dato municipal (puede estar desactualizado) · Calles: predicción, no reserva
      </p>
      <p className="text-[10px] leading-snug text-zinc-500">
        Mapa: MapTiler · Datos: Ajuntament de València (CC BY 4.0)
      </p>
    </div>
  );
}
