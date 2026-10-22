import { describe, expect, it } from 'vitest';
import { SHEET_PEEK_PX, coveredBottom, settleSheet, sheetHeights, stepSheet } from './bottom-sheet';

const heights = sheetHeights(844);

function rect(left: number, top: number, width: number, height: number): DOMRect {
  return {
    left,
    top,
    width,
    height,
    right: left + width,
    bottom: top + height,
    x: left,
    y: top,
    toJSON: () => ({}),
  };
}

describe('sheetHeights', () => {
  it('deja el asa, casi media pantalla o casi toda la pantalla', () => {
    expect(heights).toEqual({ collapsed: SHEET_PEEK_PX, half: 380, full: 760 });
  });

  it('nunca baja de la altura del asa en pantallas muy bajas', () => {
    const tiny = sheetHeights(100);
    expect(tiny.half).toBeGreaterThanOrEqual(SHEET_PEEK_PX);
    expect(tiny.full).toBeGreaterThanOrEqual(tiny.half);
  });
});

describe('settleSheet', () => {
  it('sin impulso se queda en la posición más cercana', () => {
    expect(settleSheet(120, 0, heights)).toBe('collapsed');
    expect(settleSheet(420, 0, heights)).toBe('half');
    expect(settleSheet(700, 0, heights)).toBe('full');
  });

  it('un gesto rápido hacia abajo baja una posición', () => {
    expect(settleSheet(360, -1, heights)).toBe('collapsed');
    expect(settleSheet(740, -1, heights)).toBe('half');
  });

  it('un gesto rápido hacia arriba sube una posición', () => {
    expect(settleSheet(100, 1, heights)).toBe('half');
    expect(settleSheet(400, 1, heights)).toBe('full');
  });

  it('no se sale de los extremos', () => {
    expect(settleSheet(SHEET_PEEK_PX, -2, heights)).toBe('collapsed');
    expect(settleSheet(heights.full, 2, heights)).toBe('full');
  });
});

describe('stepSheet', () => {
  it('sube y baja de una en una sin pasarse', () => {
    expect(stepSheet('collapsed', 1)).toBe('half');
    expect(stepSheet('half', 1)).toBe('full');
    expect(stepSheet('full', 1)).toBe('full');
    expect(stepSheet('half', -1)).toBe('collapsed');
    expect(stepSheet('collapsed', -1)).toBe('collapsed');
  });
});

describe('coveredBottom', () => {
  it('mide lo que la hoja tapa del mapa en móvil', () => {
    expect(coveredBottom(rect(0, 0, 390, 844), rect(0, 464, 390, 380))).toBe(380);
  });

  it('no tapa nada si el panel está al lado del mapa', () => {
    expect(coveredBottom(rect(0, 0, 860, 800), rect(860, 0, 420, 800))).toBe(0);
  });

  it('sin panel no hay nada tapado', () => {
    expect(coveredBottom(rect(0, 0, 390, 844), undefined)).toBe(0);
  });
});
