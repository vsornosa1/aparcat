'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import {
  type SheetSnap,
  settleSheet,
  sheetHeights,
  stepSheet,
  SHEET_PEEK_PX,
} from '@/lib/bottom-sheet';

const MOBILE_QUERY = '(max-width: 1023.98px)';
/** Por debajo de esto el gesto es un toque, no un arrastre. */
const TAP_SLOP_PX = 6;

interface DragState {
  pointerId: number;
  startY: number;
  startVisible: number;
  lastY: number;
  lastTime: number;
  velocity: number;
  moved: boolean;
  /** Altura visible mientras se arrastra. */
  visible: number;
}

interface BottomSheetProps {
  children: ReactNode;
  /** Si cambia (por ejemplo, un origen nuevo) y el panel está abajo, sube a media pantalla. */
  revealKey: string | null;
}

/**
 * En móvil el panel de resultados es una hoja que se arrastra sobre el mapa
 * (abajo del todo, media pantalla o casi entera); en escritorio sigue al lado.
 */
export function BottomSheet({ children, revealKey }: BottomSheetProps) {
  const sheetRef = useRef<HTMLElement>(null);
  const dragRef = useRef<DragState | null>(null);
  const suppressClick = useRef(false);
  const [viewport, setViewport] = useState<number | null>(null);
  const [snap, setSnap] = useState<SheetSnap>('half');
  const [dragVisible, setDragVisible] = useState<number | null>(null);
  const [lastRevealKey, setLastRevealKey] = useState(revealKey);

  // Un origen nuevo trae resultados: si el panel estaba abajo, se enseñan.
  if (revealKey !== lastRevealKey) {
    setLastRevealKey(revealKey);
    if (revealKey !== null && snap === 'collapsed') setSnap('half');
  }

  useEffect(() => {
    const query = window.matchMedia(MOBILE_QUERY);
    const update = () => setViewport(query.matches ? window.innerHeight : null);
    update();
    query.addEventListener('change', update);
    window.addEventListener('resize', update);
    return () => {
      query.removeEventListener('change', update);
      window.removeEventListener('resize', update);
    };
  }, []);

  const heights = viewport === null ? null : sheetHeights(viewport);
  const visible = heights === null ? null : (dragVisible ?? heights[snap]);
  const dragging = dragVisible !== null;

  // El mapa coloca la leyenda, sus controles y los encuadres por encima del panel.
  useEffect(() => {
    const root = sheetRef.current?.closest('main');
    if (!root) return;
    if (visible === null) {
      root.style.removeProperty('--sheet-cover');
      root.removeAttribute('data-sheet');
    } else {
      root.style.setProperty('--sheet-cover', `${visible}px`);
      root.setAttribute('data-sheet', snap);
    }
    root.toggleAttribute('data-sheet-dragging', dragging);
  }, [visible, dragging, snap]);

  const toggle = () => setSnap((current) => (current === 'collapsed' ? 'half' : 'collapsed'));

  const finishDrag = (pointerId: number, released: boolean) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== pointerId || !heights) return;
    dragRef.current = null;

    // El gesto ya decide (arrastre o toque): el clic que algunos navegadores
    // lanzan después sobre el asa no debe volver a cambiar el panel.
    suppressClick.current = true;
    window.setTimeout(() => {
      suppressClick.current = false;
    }, 0);

    if (drag.moved) {
      setSnap(settleSheet(drag.visible, drag.velocity, heights));
    } else if (released) {
      toggle();
    }
    setDragVisible(null);
  };

  return (
    <aside
      ref={sheetRef}
      data-bottom-sheet
      aria-label="Resultados"
      className={`flex min-h-0 flex-col bg-white max-lg:absolute max-lg:inset-x-0 max-lg:bottom-0 max-lg:z-20 max-lg:h-[45dvh] max-lg:rounded-t-2xl max-lg:shadow-[0_-6px_24px_rgba(24,24,27,0.14)] lg:h-full lg:w-[420px] lg:flex-none lg:border-l lg:border-zinc-200 ${
        dragging
          ? 'transition-none'
          : 'max-lg:transition-[height] max-lg:duration-300 max-lg:ease-[cubic-bezier(0.2,0.8,0.2,1)] motion-reduce:transition-none'
      }`}
      style={visible === null ? undefined : { height: visible }}
      onPointerDown={(event) => {
        if (!heights || !(event.target as Element).closest('[data-sheet-drag]')) return;
        dragRef.current = {
          pointerId: event.pointerId,
          startY: event.clientY,
          startVisible: visible ?? heights[snap],
          lastY: event.clientY,
          lastTime: event.timeStamp,
          velocity: 0,
          moved: false,
          visible: visible ?? heights[snap],
        };
        // Capturar desde el primer toque: un gesto rápido sale del panel enseguida.
        try {
          event.currentTarget.setPointerCapture(event.pointerId);
        } catch {
          // El puntero ya no está activo (se soltó antes de llegar aquí): no hay nada que seguir.
        }
      }}
      onPointerMove={(event) => {
        const drag = dragRef.current;
        if (!drag || drag.pointerId !== event.pointerId || !heights) return;

        const offset = drag.startY - event.clientY;
        if (!drag.moved) {
          if (Math.abs(offset) < TAP_SLOP_PX) return;
          drag.moved = true;
        }

        const elapsed = Math.max(1, event.timeStamp - drag.lastTime);
        drag.velocity = (drag.lastY - event.clientY) / elapsed;
        drag.lastY = event.clientY;
        drag.lastTime = event.timeStamp;
        drag.visible = Math.min(heights.full, Math.max(SHEET_PEEK_PX, drag.startVisible + offset));
        setDragVisible(drag.visible);
      }}
      onPointerUp={(event) => finishDrag(event.pointerId, true)}
      onPointerCancel={(event) => finishDrag(event.pointerId, false)}
    >
      <button
        type="button"
        data-sheet-drag
        aria-expanded={snap !== 'collapsed'}
        aria-label={snap === 'collapsed' ? 'Mostrar resultados' : 'Ocultar resultados'}
        title="Arrastra para ver más mapa o más resultados"
        onClick={() => {
          if (suppressClick.current) {
            suppressClick.current = false;
            return;
          }
          toggle();
        }}
        onKeyDown={(event) => {
          if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
            event.preventDefault();
            setSnap((current) => stepSheet(current, event.key === 'ArrowUp' ? 1 : -1));
          }
        }}
        className="flex h-6 w-full shrink-0 cursor-grab touch-none items-center justify-center rounded-t-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-emerald-500 lg:hidden"
      >
        <span aria-hidden="true" className="h-1.5 w-10 rounded-full bg-zinc-300" />
      </button>
      {children}
    </aside>
  );
}
