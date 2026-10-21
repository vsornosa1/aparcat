'use client';

import { useCallback, useState } from 'react';
import type { Coordinates } from '@/domain/types';

export interface LocateState {
  locate: () => void;
  isLocating: boolean;
  message: string | null;
  clearMessage: () => void;
}

export function useLocate(onOrigin: (origin: Coordinates) => void): LocateState {
  const [isLocating, setIsLocating] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const locate = useCallback(() => {
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
      (failure) => {
        setIsLocating(false);
        setMessage(
          failure.code === failure.PERMISSION_DENIED
            ? 'Sin permiso de ubicación. Actívalo en el navegador, busca una calle o toca el mapa.'
            : 'No pudimos obtener tu ubicación. Busca una calle o toca el mapa.',
        );
      },
      { enableHighAccuracy: false, timeout: 10_000, maximumAge: 60_000 },
    );
  }, [onOrigin]);

  const clearMessage = useCallback(() => setMessage(null), []);

  return { locate, isLocating, message, clearMessage };
}
