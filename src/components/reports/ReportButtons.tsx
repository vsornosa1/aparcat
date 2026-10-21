interface ReportButtonsProps {
  onReport: (kind: 'spot_free' | 'area_full') => void;
  isReporting: boolean;
  message: string | null;
}

export function ReportButtons({ onReport, isReporting, message }: ReportButtonsProps) {
  return (
    <section
      aria-labelledby="report-title"
      className="rounded-xl border border-zinc-200 bg-zinc-50 p-2.5"
    >
      <div className="flex items-center justify-between gap-2">
        <h2 id="report-title" className="text-xs font-semibold text-zinc-900">
          ¿Ves un hueco?
        </h2>
        <span className="text-[10px] text-zinc-500">Caduca en 15 min · anónimo</span>
      </div>

      <div className="mt-2 grid grid-cols-2 gap-1.5">
        <button
          type="button"
          onClick={() => onReport('spot_free')}
          disabled={isReporting}
          className="rounded-lg bg-emerald-600 px-2.5 py-1.5 text-[11px] font-semibold text-white transition-colors hover:bg-emerald-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 disabled:opacity-60"
        >
          He dejado un hueco
        </button>
        <button
          type="button"
          onClick={() => onReport('area_full')}
          disabled={isReporting}
          className="rounded-lg border border-zinc-300 bg-white px-2.5 py-1.5 text-[11px] font-semibold text-zinc-700 transition-colors hover:bg-zinc-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400 focus-visible:ring-offset-2 disabled:opacity-60"
        >
          Está lleno
        </button>
      </div>

      <p role="status" aria-live="polite" className="mt-1 min-h-3 text-[11px] text-zinc-600">
        {message}
      </p>
    </section>
  );
}
