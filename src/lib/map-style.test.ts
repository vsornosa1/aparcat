import { describe, expect, it } from 'vitest';
import { getNeutralStyle, shouldFallBackToNeutralStyle } from './map-style';

describe('shouldFallBackToNeutralStyle', () => {
  const failed = { basemapRequested: true, styleLoaded: false, usedFallback: false };

  it('cambia al fondo neutro si el estilo remoto falla antes de cargar', () => {
    expect(shouldFallBackToNeutralStyle(failed)).toBe(true);
  });

  it('ignora errores una vez cargado el estilo (una tesela suelta)', () => {
    expect(shouldFallBackToNeutralStyle({ ...failed, styleLoaded: true })).toBe(false);
  });

  it('no repite el cambio si ya se usó el fondo neutro', () => {
    expect(shouldFallBackToNeutralStyle({ ...failed, usedFallback: true })).toBe(false);
  });

  it('no hace nada si nunca se pidió un estilo remoto', () => {
    expect(shouldFallBackToNeutralStyle({ ...failed, basemapRequested: false })).toBe(false);
  });
});

describe('getNeutralStyle', () => {
  it('no depende de fuentes externas', () => {
    const style = getNeutralStyle();

    expect(style.sources).toEqual({});
    expect(style.layers).toHaveLength(1);
    expect(style.layers[0]?.type).toBe('background');
  });
});
