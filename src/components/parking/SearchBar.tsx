'use client';

import { useEffect, useState } from 'react';
import type { Coordinates } from '@/domain/types';
import { searchPlaces, type PlaceSuggestion } from '@/lib/geocoding';

interface SearchBarProps {
  origin: Coordinates | null;
  onOrigin: (origin: Coordinates) => void;
}

export function SearchBar({ origin, onOrigin }: SearchBarProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<PlaceSuggestion[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [isLocating, setIsLocating] = useState(false);

  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length < 2) return;

    let cancelled = false;
    const timer = setTimeout(async () => {
      const places = await searchPlaces(trimmed, origin ?? undefined);
      if (!cancelled) setResults(places);
    }, 350);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [query, origin]);

  const choose = (place: PlaceSuggestion) => {
    onOrigin({ latitude: place.latitude, longitude: place.longitude });
    setQuery('');
    setResults([]);
    setMessage(null);
  };

  const locate = () => {
    if (!('geolocation' in navigator)) {
      setMessage('Tu navegador no permite geolocalización. Busca una calle o toca el mapa.');
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
        setMessage('No pudimos obtener tu ubicación. Busca una calle o toca el mapa.');
      },
      { enableHighAccuracy: false, timeout: 10_000, maximumAge: 60_000 },
    );
  };

  const handleQueryChange = (value: string) => {
    setQuery(value);
    if (value.trim().length < 2) setResults([]);
  };

  return (
    <div className="rounded-xl border border-zinc-200 bg-white/97 shadow-sm backdrop-blur">
      <div className="flex items-center gap-2 px-3 py-2">
        <SearchIcon />
        <input
          type="search"
          aria-label="Buscar calle o lugar"
          placeholder="¿Dónde quieres aparcar?"
          value={query}
          onChange={(event) => handleQueryChange(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter' && results[0]) {
              event.preventDefault();
              choose(results[0]);
            }
          }}
          autoComplete="off"
          className="min-w-0 flex-1 bg-transparent py-1 text-sm text-zinc-900 placeholder:text-zinc-500 focus:outline-none"
        />
        <button
          type="button"
          onClick={locate}
          disabled={isLocating}
          aria-label="Usar mi ubicación"
          title="Usar mi ubicación"
          className="flex size-8 shrink-0 items-center justify-center rounded-full text-emerald-700 transition-colors hover:bg-emerald-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 disabled:opacity-50"
        >
          <LocateIcon />
        </button>
      </div>

      {results.length > 0 && (
        <ul className="max-h-60 overflow-y-auto border-t border-zinc-100">
          {results.map((place) => (
            <li key={place.id}>
              <button
                type="button"
                onClick={() => choose(place)}
                className="w-full px-3 py-2 text-left hover:bg-zinc-50 focus-visible:bg-zinc-50 focus-visible:outline-none"
              >
                <span className="block text-sm font-medium text-zinc-900">{place.name}</span>
                <span className="block truncate text-xs text-zinc-500">{place.detail}</span>
              </button>
            </li>
          ))}
        </ul>
      )}

      <p
        role="status"
        aria-live="polite"
        className={`px-3 pb-2 text-[11px] leading-snug text-zinc-500 ${message ? '' : 'hidden sm:block'}`}
      >
        {message ??
          (origin
            ? 'Origen elegido. Toca el mapa o busca otro lugar para cambiarlo.'
            : 'Busca una dirección, una calle o usa tu ubicación. Sin seguimiento.')}
      </p>
    </div>
  );
}

function SearchIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      className="size-4 shrink-0 text-zinc-500"
    >
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" strokeLinecap="round" />
    </svg>
  );
}

function LocateIcon() {
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
