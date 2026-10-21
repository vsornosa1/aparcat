import { describe, expect, it, vi } from 'vitest';
import { createGarageRefresher, garageRefreshMode } from './on-demand';
import type { IngestResult } from './types';

const now = new Date('2026-10-19T22:00:00.000Z');

function minutesAgo(minutes: number): Date {
  return new Date(now.getTime() - minutes * 60_000);
}

const success: IngestResult = { source: 'parking_facilities', status: 'success', records: 23 };

describe('garageRefreshMode', () => {
  it('no refresca un dato de menos de un minuto', () => {
    expect(garageRefreshMode(minutesAgo(0), now)).toBe('none');
    expect(garageRefreshMode(minutesAgo(0.5), now)).toBe('none');
  });

  it('refresca después de responder mientras el dato aún se muestra', () => {
    expect(garageRefreshMode(minutesAgo(1), now)).toBe('background');
    expect(garageRefreshMode(minutesAgo(14), now)).toBe('background');
  });

  it('espera al refresco cuando los garajes están a punto de caducar', () => {
    expect(garageRefreshMode(minutesAgo(15), now)).toBe('blocking');
    expect(garageRefreshMode(minutesAgo(120), now)).toBe('blocking');
  });

  it('espera al refresco si nunca se descargaron garajes', () => {
    expect(garageRefreshMode(null, now)).toBe('blocking');
  });
});

describe('createGarageRefresher', () => {
  it('comparte un mismo refresco entre peticiones simultáneas', async () => {
    let finish: (result: IngestResult) => void = () => {};
    const ingest = vi.fn(
      () =>
        new Promise<IngestResult>((resolve) => {
          finish = resolve;
        }),
    );
    const refresh = createGarageRefresher(ingest, () => now.getTime());

    const first = refresh();
    const second = refresh();
    finish(success);

    await expect(first).resolves.toBe(success);
    await expect(second).resolves.toBe(success);
    expect(ingest).toHaveBeenCalledTimes(1);
  });

  it('intenta como mucho un refresco por minuto, aunque falle', async () => {
    let clock = now.getTime();
    const ingest = vi.fn(async (): Promise<IngestResult> => ({
      source: 'parking_facilities',
      status: 'failed',
      records: 0,
      errors: ['fuente caída'],
    }));
    const refresh = createGarageRefresher(ingest, () => clock);

    await refresh();
    clock += 30_000;
    await expect(refresh()).resolves.toBeNull();
    expect(ingest).toHaveBeenCalledTimes(1);

    clock += 30_000;
    await refresh();
    expect(ingest).toHaveBeenCalledTimes(2);
  });

  it('libera el refresco si la ingesta lanza un error', async () => {
    let clock = now.getTime();
    const ingest = vi
      .fn<() => Promise<IngestResult>>()
      .mockRejectedValueOnce(new Error('sin base de datos'))
      .mockResolvedValueOnce(success);
    const refresh = createGarageRefresher(ingest, () => clock);

    await expect(refresh()).rejects.toThrow('sin base de datos');
    clock += 60_000;
    await expect(refresh()).resolves.toBe(success);
  });
});
