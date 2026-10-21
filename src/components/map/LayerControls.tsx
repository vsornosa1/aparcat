import type { MapLayerVisibility } from './layers';

const ITEMS: {
  key: keyof MapLayerVisibility;
  label: string;
  symbol: string;
  hint: string;
}[] = [
  {
    key: 'garages',
    label: 'Garajes',
    symbol: 'P',
    hint: 'Garajes públicos con plazas libres publicadas por el Ayuntamiento',
  },
  {
    key: 'reports',
    label: 'Reportes',
    symbol: '●',
    hint: 'Huecos y zonas llenas reportados por la comunidad',
  },
  {
    key: 'streets',
    label: 'Calles',
    symbol: '—',
    hint: 'Calles con predicción municipal para la próxima hora',
  },
  {
    key: 'cameras',
    label: 'Cámaras',
    symbol: 'C',
    hint: 'Solo ubicación; el vídeo se abre en el visor oficial',
  },
];

interface LayerControlsProps {
  layers: MapLayerVisibility;
  onToggle: (layer: keyof MapLayerVisibility) => void;
}

export function LayerControls({ layers, onToggle }: LayerControlsProps) {
  return (
    <div
      className="flex flex-nowrap items-center gap-1.5 overflow-x-auto overscroll-x-contain rounded-xl border border-zinc-200 bg-white/95 px-2 py-1.5 shadow-sm backdrop-blur [scrollbar-width:none] sm:flex-wrap sm:overflow-visible [&::-webkit-scrollbar]:hidden"
      role="group"
      aria-label="Capas del mapa"
    >
      <span className="shrink-0 pr-0.5 text-[11px] font-medium text-zinc-500">Capas</span>

      {ITEMS.map((item) => {
        const active = layers[item.key];

        return (
          <button
            key={item.key}
            type="button"
            aria-pressed={active}
            aria-label={`${item.label}: ${item.hint}`}
            title={item.hint}
            onClick={() => onToggle(item.key)}
            className={`inline-flex shrink-0 items-center gap-1 rounded-full border px-2 py-1 text-[11px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 ${
              active
                ? 'border-emerald-600 bg-emerald-600 text-white'
                : 'border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-50'
            }`}
          >
            <span aria-hidden="true" className="font-semibold">
              {item.symbol}
            </span>
            {item.label}
          </button>
        );
      })}
    </div>
  );
}
