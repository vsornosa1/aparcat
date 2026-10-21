export interface ReportFeedback {
  tone: 'success' | 'error';
  text: string;
}

interface ReportButtonsProps {
  onReport: (kind: 'spot_free' | 'area_full') => void;
  isReporting: boolean;
  feedback: ReportFeedback | null;
}

export function ReportButtons({ onReport, isReporting, feedback }: ReportButtonsProps) {
  return (
    <section
      aria-labelledby="report-title"
      className="rounded-xl border border-zinc-200 bg-zinc-50 p-3"
    >
      <h2 id="report-title" className="text-xs font-semibold text-zinc-900">
        Avisa a otros conductores
      </h2>
      <p className="mt-0.5 text-[11px] leading-snug text-zinc-500">
        Se marca en el punto elegido del mapa · anónimo · caduca en 15 min
      </p>

      <div className="mt-2 grid grid-cols-2 gap-1.5">
        <button
          type="button"
          onClick={() => onReport('spot_free')}
          disabled={isReporting}
          className="cursor-pointer rounded-lg bg-emerald-600 px-2.5 py-2 text-xs font-semibold text-white transition-colors hover:bg-emerald-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 disabled:cursor-wait disabled:opacity-60"
        >
          He dejado un hueco
        </button>
        <button
          type="button"
          onClick={() => onReport('area_full')}
          disabled={isReporting}
          className="cursor-pointer rounded-lg border border-zinc-300 bg-white px-2.5 py-2 text-xs font-semibold text-zinc-700 transition-colors hover:bg-zinc-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400 focus-visible:ring-offset-2 disabled:cursor-wait disabled:opacity-60"
        >
          Está lleno
        </button>
      </div>

      <p
        role="status"
        aria-live="polite"
        className={`text-[11px] font-medium ${feedback || isReporting ? 'mt-2' : ''} ${
          feedback?.tone === 'error' ? 'text-red-700' : 'text-emerald-700'
        }`}
      >
        {isReporting ? <span className="text-zinc-500">Enviando…</span> : feedback?.text}
      </p>
    </section>
  );
}
