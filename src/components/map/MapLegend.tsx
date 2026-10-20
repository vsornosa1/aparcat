const ITEMS = [
  { color: 'bg-emerald-600', label: '≥60% libre' },
  { color: 'bg-amber-500', label: '30–59%' },
  { color: 'bg-red-600', label: '<30%' },
  { color: 'bg-zinc-400', label: 'Sin datos' },
  { color: 'bg-blue-600', label: 'Hueco reportado' },
  { color: 'bg-orange-500', label: 'Zona llena' },
  { color: 'bg-slate-600', label: 'Cámara (solo ubicación)' },
];

export function MapLegend() {
  return (
    <div className="pointer-events-none absolute bottom-9 left-3 z-10 max-w-[calc(100%-5rem)] rounded-lg border border-zinc-200 bg-white/95 px-3 py-2 text-[11px] shadow-sm backdrop-blur">
      <p className="font-medium text-zinc-700">Disponibilidad estimada</p>
      <ul className="mt-1 flex flex-wrap gap-x-3 gap-y-1">
        {ITEMS.map((item) => (
          <li key={item.label} className="flex items-center gap-1.5 text-zinc-600">
            <span aria-hidden="true" className={`size-2 rounded-full ${item.color}`} />
            {item.label}
          </li>
        ))}
      </ul>
      <p className="mt-1 text-[10px] leading-snug text-zinc-500">
        Predicción municipal · no reserva · Datos: Ajuntament de València (CC BY 4.0) ·
        OpenStreetMap
      </p>
    </div>
  );
}
