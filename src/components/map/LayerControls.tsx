import type { MapLayerVisibility } from './layers';

interface LayerControlsProps {
  layers: MapLayerVisibility;
  counts?: { garages: number; streets: number; cameras: number; reports: number };
  onToggle: (layer: keyof MapLayerVisibility) => void;
}

export function LayerControls({ layers, counts, onToggle }: LayerControlsProps) {
  return (
    <details className="rounded-xl border border-zinc-200 bg-white/97 shadow-sm backdrop-blur">
      <summary className="cursor-pointer list-none px-3 py-2 text-sm font-medium text-zinc-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500">
        Capas del mapa
      </summary>

      <div className="space-y-2 border-t border-zinc-100 px-3 py-2">
        <LayerToggle
          label="Garajes públicos"
          hint="Plazas libres publicadas por el Ayuntamiento"
          count={counts?.garages}
          checked={layers.garages}
          onChange={() => onToggle('garages')}
        />
        <LayerToggle
          label="Reportes recientes"
          hint="Huecos y zonas llenas de la comunidad"
          count={counts?.reports}
          checked={layers.reports}
          onChange={() => onToggle('reports')}
        />
        <LayerToggle
          label="Calles con predicción"
          hint="Estimación municipal para la próxima hora"
          count={counts?.streets}
          checked={layers.streets}
          onChange={() => onToggle('streets')}
        />
        <LayerToggle
          label="Cámaras"
          hint="Solo ubicación; acerca el mapa para verlas. El vídeo, en el visor oficial"
          count={counts?.cameras}
          checked={layers.cameras}
          onChange={() => onToggle('cameras')}
        />
      </div>
    </details>
  );
}

function LayerToggle({
  label,
  hint,
  count,
  checked,
  onChange,
}: {
  label: string;
  hint: string;
  count?: number;
  checked: boolean;
  onChange: () => void;
}) {
  return (
    <label className="flex cursor-pointer items-start gap-2 text-sm">
      <input
        type="checkbox"
        checked={checked}
        onChange={onChange}
        className="mt-0.5 size-4 rounded border-zinc-300 text-emerald-600 focus:ring-emerald-500"
      />
      <span className="min-w-0">
        <span className="flex items-baseline gap-1.5 font-medium text-zinc-800">
          {label}
          {typeof count === 'number' && count > 0 && (
            <span className="text-[11px] font-normal text-zinc-400">({count})</span>
          )}
        </span>
        <span className="block text-[11px] leading-snug text-zinc-500">{hint}</span>
      </span>
    </label>
  );
}
