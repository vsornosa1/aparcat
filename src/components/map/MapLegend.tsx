import { useState } from 'react';
import { FEW_SPACES, PLENTY_OF_SPACES } from '@/lib/format';
import type { MapLayerVisibility } from './layers';

const GARAGE_COLORS = [
  { color: 'bg-emerald-600', label: `${PLENTY_OF_SPACES}+ plazas` },
  { color: 'bg-amber-600', label: `${FEW_SPACES}–${PLENTY_OF_SPACES - 1}` },
  { color: 'bg-red-600', label: `menos de ${FEW_SPACES}` },
];

const ORA_COLORS = [
  { color: 'bg-blue-600', label: 'Azul · pago' },
  { color: 'bg-orange-500', label: 'Naranja · mixta' },
  { color: 'bg-green-600', label: 'Verde · residentes' },
  { color: 'bg-yellow-400', label: 'Amarillo · restringido' },
];

const REPORT_COLORS = [
  { color: 'bg-violet-600', label: 'Hueco libre' },
  { color: 'bg-rose-700', label: 'Zona llena' },
];

export function MapLegend({ layers }: { layers: MapLayerVisibility }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="pointer-events-none absolute bottom-9 left-3 z-10 flex flex-col items-start gap-1.5">
      <div
        id="map-legend"
        className={`${open ? 'block' : 'hidden'} pointer-events-auto max-h-[calc(46dvh-9rem)] w-64 lg:max-h-[50dvh] max-w-[calc(100vw-5rem)] space-y-1.5 overflow-y-auto rounded-lg border border-zinc-200 bg-white/95 px-3 py-2 text-[11px] shadow-sm backdrop-blur lg:block`}
      >
        <p className="flex items-center gap-1.5 font-medium text-zinc-800">
          <span
            aria-hidden="true"
            className="size-2.5 rounded-full bg-zinc-900 ring-2 ring-white outline outline-1 outline-zinc-300"
          />
          Punto elegido
        </p>

        {layers.garages && (
          <LegendGroup title="Garajes públicos · plazas libres ahora" items={GARAGE_COLORS} />
        )}
        {layers.reports && <LegendGroup title="Reportes (15 min)" items={REPORT_COLORS} />}
        {layers.ora && (
          <LegendGroup title="Zonas ORA · el color indica la tarifa" items={ORA_COLORS} />
        )}
        {layers.cameras && (
          <p className="text-zinc-600">
            <span aria-hidden="true" className="font-semibold text-zinc-800">
              C
            </span>{' '}
            cámara de tráfico (solo ubicación)
          </p>
        )}

        <p className="text-[10px] leading-snug text-zinc-500">Orientativo · no reserva plaza</p>
      </div>

      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        aria-expanded={open}
        aria-controls="map-legend"
        className="pointer-events-auto inline-flex cursor-pointer items-center gap-1.5 rounded-full border border-zinc-200 bg-white/95 px-3 py-1.5 text-xs font-medium text-zinc-700 shadow-sm backdrop-blur transition-colors hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 lg:hidden"
      >
        <span
          aria-hidden="true"
          className="flex size-4 items-center justify-center rounded-full bg-zinc-200 text-[10px] font-semibold text-zinc-700"
        >
          {open ? '×' : 'i'}
        </span>
        Leyenda
      </button>
    </div>
  );
}

function LegendGroup({
  title,
  items,
}: {
  title: string;
  items: { color: string; label: string }[];
}) {
  return (
    <div>
      <p className="text-zinc-700">{title}</p>
      <ul className="mt-0.5 flex flex-wrap gap-x-3 gap-y-0.5">
        {items.map((item) => (
          <li key={item.label} className="flex items-center gap-1.5 text-zinc-600">
            <span aria-hidden="true" className={`size-2 rounded-full ${item.color}`} />
            {item.label}
          </li>
        ))}
      </ul>
    </div>
  );
}
