'use client';

import { useEffect, useState } from 'react';
import type { Street } from '@/api/contracts';
import type { Coordinates } from '@/domain/types';
import { searchStreets } from '@/lib/api-client';

interface OriginPickerProps {
  origin: Coordinates | null;
  onOrigin: (origin: Coordinates) => void;
}

export function OriginPicker({ origin, onOrigin }: OriginPickerProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Street[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [isLocating, setIsLocating] = useState(false);

  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length < 2) return;

    let cancelled = false;
    const timer = setTimeout(async () => {
      try {
        const data = await searchStreets(trimmed);
        if (!cancelled) setResults(data.streets);
      } catch {
        if (!cancelled) setResults([]);
      }
    }, 300);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [query]);

  const locate = () => {
    if (!('geolocation' in navigator)) {
      setMessage('Tu navegador no permite geolocalización. Toca el mapa para elegir el origen.');
      return;
    }

    setIsLocating(true);
    setMessage('Obteniendo tu ubicación…');

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setIsLocating(false);
        setMessage(null);
        onOrigin({ latitude: position.coords.latitude, longitude: position.coords.longitude });
      },
      () => {
        setIsLocating(false);
        setMessage('No pudimos obtener tu ubicación. Toca el mapa o busca una calle.');
      },
      { enableHighAccuracy: false, timeout: 10_000, maximumAge: 60_000 },
    );
  };

  const chooseStreet = (street: Street) => {
    onOrigin({ latitude: street.latitude, longitude: street.longitude });
    setQuery('');
    setResults([]);
    setMessage(null);
  };

  const handleQueryChange = (value: string) => {
    setQuery(value);
    if (value.trim().length < 2) setResults([]);
  };

  return (
    <div className="rounded-xl border border-zinc-200 bg-white/95 p-3 shadow-sm backdrop-blur">
      <button
        type="button"
        onClick={locate}
        disabled={isLocating}
        className="flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-emerald-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 disabled:opacity-60"
      >
        <LocationIcon />
        {isLocating ? 'Buscando…' : 'Aparcar cerca de mí'}
      </button>
      <p className="mt-1.5 text-[11px] leading-snug text-zinc-500">
        Usamos tu ubicación solo mientras buscas. Sin seguimiento en segundo plano.
      </p>

      <div className="mt-3">
        <label htmlFor="street-search" className="text-xs font-medium text-zinc-700">
          O elige una calle
        </label>
        <input
          id="street-search"
          type="search"
          value={query}
          onChange={(event) => handleQueryChange(event.target.value)}
          placeholder="Carrer de Xàtiva"
          autoComplete="off"
          className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
        />

        {results.length > 0 && (
          <ul className="mt-1 max-h-44 overflow-y-auto rounded-lg border border-zinc-200 bg-white">
            {results.map((street) => (
              <li key={street.id}>
                <button
                  type="button"
                  onClick={() => chooseStreet(street)}
                  className="w-full px-3 py-2 text-left text-sm text-zinc-700 hover:bg-zinc-50 focus-visible:bg-zinc-50 focus-visible:outline-none"
                >
                  {street.name}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <p role="status" aria-live="polite" className="mt-2 text-xs leading-snug text-zinc-600">
        {message ??
          (origin
            ? 'Origen elegido. Toca otro punto del mapa para cambiarlo.'
            : 'Toca el mapa para elegir el origen.')}
      </p>
    </div>
  );
}

function LocationIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      className="size-4"
    >
      <circle cx="12" cy="12" r="3" />
      <path d="M12 2v3m0 14v3M2 12h3m14 0h3" strokeLinecap="round" />
    </svg>
  );
}
