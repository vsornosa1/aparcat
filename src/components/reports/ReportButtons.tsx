interface ReportButtonsProps {
  onReport: (kind: 'spot_free' | 'area_full') => void;
  isReporting: boolean;
  message: string | null;
}

export function ReportButtons({ onReport, isReporting, message }: ReportButtonsProps) {
  return (
    <section
      aria-labelledby="report-title"
      className="rounded-xl border border-zinc-200 bg-zinc-50 p-3"
    >
      <h2 id="report-title" className="text-sm font-semibold text-zinc-900">
        Ayuda a los demás conductores
      </h2>
      <p className="mt-0.5 text-xs leading-snug text-zinc-500">
        El reporte caduca en 15 minutos. Sin cuentas ni datos personales.
      </p>

      <div className="mt-2 grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => onReport('spot_free')}
          disabled={isReporting}
          className="rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-emerald-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 disabled:opacity-60"
        >
          He dejado un hueco
        </button>
        <button
          type="button"
          onClick={() => onReport('area_full')}
          disabled={isReporting}
          className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-xs font-semibold text-zinc-700 transition-colors hover:bg-zinc-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400 focus-visible:ring-offset-2 disabled:opacity-60"
        >
          Está lleno
        </button>
      </div>

      <p role="status" aria-live="polite" className="mt-2 min-h-4 text-xs text-zinc-600">
        {message}
      </p>
    </section>
  );
}
