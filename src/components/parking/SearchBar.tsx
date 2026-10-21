'use client';

import { useEffect, useId, useState } from 'react';
import type { Coordinates } from '@/domain/types';
import { formatPlaceName } from '@/lib/format';
import { searchPlaces, type PlaceSuggestion } from '@/lib/geocoding';
import type { LocateState } from '@/lib/use-locate';

interface SearchBarProps {
  origin: Coordinates | null;
  onOrigin: (origin: Coordinates) => void;
  location: LocateState;
}

type SearchStatus = 'idle' | 'searching' | 'done';

export function SearchBar({ origin, onOrigin, location }: SearchBarProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<PlaceSuggestion[]>([]);
  const [status, setStatus] = useState<SearchStatus>('idle');
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const listId = useId();

  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length < 2) return;

    let cancelled = false;
    const timer = setTimeout(async () => {
      const places = await searchPlaces(trimmed, origin ?? undefined);
      if (cancelled) return;
      setResults(places);
      setActive(0);
      setStatus('done');
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
    setStatus('idle');
    setOpen(false);
    location.clearMessage();
  };

  const handleQueryChange = (value: string) => {
    setQuery(value);
    setOpen(true);
    if (value.trim().length < 2) {
      setResults([]);
      setStatus('idle');
    } else {
      setStatus('searching');
    }
  };

  const showList = open && status !== 'idle';
  const activeId = showList && results[active] ? `${listId}-${active}` : undefined;

  useEffect(() => {
    if (activeId) document.getElementById(activeId)?.scrollIntoView({ block: 'nearest' });
  }, [activeId]);

  const hint =
    location.message ??
    (origin
      ? 'Punto elegido. Toca el mapa o busca otro lugar para cambiarlo.'
      : 'Busca una dirección, toca el mapa o usa tu ubicación. Sin seguimiento.');

  return (
    <div
      className="rounded-xl border border-zinc-200 bg-white/97 shadow-sm backdrop-blur"
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false);
      }}
    >
      <div className="flex items-center gap-2 px-3 py-2">
        <SearchIcon />
        <input
          type="search"
          role="combobox"
          aria-label="Buscar calle o lugar"
          aria-expanded={showList}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={activeId}
          placeholder="¿Dónde quieres aparcar?"
          value={query}
          onChange={(event) => handleQueryChange(event.target.value)}
          onFocus={() => setOpen(true)}
          onKeyDown={(event) => {
            if (event.key === 'ArrowDown' && results.length > 0) {
              event.preventDefault();
              setOpen(true);
              setActive((current) => (current + 1) % results.length);
            } else if (event.key === 'ArrowUp' && results.length > 0) {
              event.preventDefault();
              setActive((current) => (current - 1 + results.length) % results.length);
            } else if (event.key === 'Enter' && showList && results[active]) {
              event.preventDefault();
              choose(results[active]);
            } else if (event.key === 'Escape') {
              setOpen(false);
            }
          }}
          autoComplete="off"
          enterKeyHint="search"
          className="min-w-0 flex-1 bg-transparent py-1 text-base text-zinc-900 placeholder:text-zinc-500 focus:outline-none sm:text-sm"
        />
        <button
          type="button"
          onClick={location.locate}
          disabled={location.isLocating}
          aria-label="Usar mi ubicación"
          title="Usar mi ubicación"
          className="flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-full text-emerald-700 transition-colors hover:bg-emerald-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 disabled:cursor-wait disabled:opacity-50"
        >
          <LocateIcon spinning={location.isLocating} />
        </button>
      </div>

      {showList && (
        <ul
          id={listId}
          role="listbox"
          aria-label="Sugerencias"
          className="max-h-60 overflow-y-auto border-t border-zinc-100"
        >
          {status === 'searching' && results.length === 0 && (
            <li className="px-3 py-2 text-xs text-zinc-500">Buscando…</li>
          )}
          {status === 'done' && results.length === 0 && (
            <li className="px-3 py-2 text-xs text-zinc-500">
              Sin resultados en Valencia. Prueba con otra calle o toca el mapa.
            </li>
          )}
          {results.map((place, index) => (
            <li
              key={place.id}
              id={`${listId}-${index}`}
              role="option"
              aria-selected={index === active}
            >
              <button
                type="button"
                tabIndex={-1}
                onMouseDown={(event) => event.preventDefault()}
                onMouseEnter={() => setActive(index)}
                onClick={() => choose(place)}
                className={`w-full cursor-pointer px-3 py-2 text-left ${
                  index === active ? 'bg-zinc-100' : ''
                }`}
              >
                <span className="block text-sm font-medium text-zinc-900">
                  {formatPlaceName(place.name)}
                </span>
                <span className="block truncate text-xs text-zinc-500">{place.detail}</span>
              </button>
            </li>
          ))}
        </ul>
      )}

      <p
        role="status"
        aria-live="polite"
        className={`px-3 pb-2 text-[11px] leading-snug text-zinc-500 ${
          location.message ? '' : 'hidden sm:block'
        }`}
      >
        {hint}
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

function LocateIcon({ spinning }: { spinning: boolean }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      className={`size-4 ${spinning ? 'animate-spin' : ''}`}
    >
      <circle cx="12" cy="12" r="3" />
      <path d="M12 2v3m0 14v3M2 12h3m14 0h3" strokeLinecap="round" />
    </svg>
  );
}
