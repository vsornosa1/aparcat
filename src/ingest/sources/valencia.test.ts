import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  VALENCIA_LAYERS,
  ValenciaSchemaError,
  ValenciaSourceError,
  countValenciaLayer,
  fetchValenciaLayer,
  parkingFacilitiesCollection,
  parkingFacilityFromFeature,
  parkingPredictionsCollection,
  predictionValueFromFeature,
  trafficCameraFromFeature,
  trafficCamerasCollection,
  type ParkingFacilityFeature,
} from './valencia';

function fixture(name: string): unknown {
  return JSON.parse(readFileSync(join(process.cwd(), 'tests', 'fixtures', name), 'utf8'));
}

function jsonResponse(payload: unknown, status = 200): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

const fetchMock = vi.fn();

vi.stubGlobal('fetch', fetchMock);

afterEach(() => {
  fetchMock.mockReset();
});

describe('esquemas de las capas municipales', () => {
  it('acepta una respuesta real de garajes', () => {
    expect(parkingFacilitiesCollection.safeParse(fixture('valencia-layer-194.json')).success).toBe(
      true,
    );
  });

  it('detecta un campo obligatorio ausente', () => {
    const payload = structuredClone(fixture('valencia-layer-194.json')) as {
      features: { properties: Record<string, unknown> }[];
    };
    delete payload.features[0].properties.id_aparcamiento;

    expect(parkingFacilitiesCollection.safeParse(payload).success).toBe(false);
  });

  it('acepta líneas de predicción con coordenada Z', () => {
    const parsed = parkingPredictionsCollection[1].safeParse(fixture('valencia-layer-254.json'));
    expect(parsed.success).toBe(true);
  });

  it('acepta cámaras con la url del visor oficial', () => {
    expect(trafficCamerasCollection.safeParse(fixture('valencia-layer-190.json')).success).toBe(
      true,
    );
  });
});

describe('normalización de garajes', () => {
  const facilities = parkingFacilitiesCollection.parse(fixture('valencia-layer-194.json')).features;

  it('convierte el centinela -1 en ausencia de dato', () => {
    const feature = facilities.find((item) => item.properties.id_aparcamiento === 12);
    const facility = parkingFacilityFromFeature(feature as ParkingFacilityFeature);

    expect(facility).not.toBeNull();
    expect(facility?.capacity).toBe(192);
    expect(facility?.freeSpaces).toBeNull();
    expect(facility?.sourceUpdatedAt).toBeNull();
  });

  it('deriva plazas y fecha del dato reciente', () => {
    const feature = facilities.find((item) => item.properties.id_aparcamiento === 78);
    const facility = parkingFacilityFromFeature(feature as ParkingFacilityFeature);

    expect(facility?.sourceId).toBe('78');
    expect(facility?.freeSpaces).toBe(365);
    expect(facility?.sourceUpdatedAt?.toISOString()).toBe('2026-10-19T21:58:18.000Z');
  });

  it('descarta una geometría ausente', () => {
    const feature = { type: 'Feature', geometry: null, properties: {} } as unknown as
      ParkingFacilityFeature;

    expect(parkingFacilityFromFeature(feature)).toBeNull();
  });
});

describe('fetchValenciaLayer', () => {
  it('valida el recuento de una capa', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ count: 23 }));

    await expect(countValenciaLayer(VALENCIA_LAYERS.parkingFacilities)).resolves.toBe(23);
    expect(String(fetchMock.mock.calls[0][0])).toContain('returnCountOnly=true');
  });

  it('lanza error de esquema cuando la capa cambia', async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse({
        type: 'FeatureCollection',
        features: [{ type: 'Feature', geometry: null, properties: { objectid: 1 } }],
      }),
    );

    await expect(
      fetchValenciaLayer(VALENCIA_LAYERS.parkingFacilities, parkingFacilitiesCollection, {
        retries: 0,
      }),
    ).rejects.toBeInstanceOf(ValenciaSchemaError);
  });

  it('reintenta ante un error de servidor', async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse({ error: 'boom' }, 500))
      .mockResolvedValueOnce(jsonResponse(fixture('valencia-layer-254.json')));

    const collection = await fetchValenciaLayer(
      VALENCIA_LAYERS.regulatedParkingPredictions1h,
      parkingPredictionsCollection[1],
      { retries: 1 },
    );

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(collection.features).toHaveLength(2);
  });

  it('no reintenta ante un error de cliente', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ error: 'not found' }, 404));

    await expect(
      fetchValenciaLayer(VALENCIA_LAYERS.parkingFacilities, parkingFacilitiesCollection),
    ).rejects.toBeInstanceOf(ValenciaSourceError);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('se identifica ante el Ayuntamiento y pide geojson', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(fixture('valencia-layer-190.json')));

    await fetchValenciaLayer(VALENCIA_LAYERS.trafficCameras, trafficCamerasCollection, {
      retries: 0,
    });

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toContain('/190/query?');
    expect(url).toContain('f=geojson');
    expect(init.headers).toMatchObject({ 'user-agent': expect.stringContaining('parkflow') });
  });
});

describe('normalización de cámaras y predicciones', () => {
  it('extrae la cámara con su visor oficial', () => {
    const feature = trafficCamerasCollection.parse(fixture('valencia-layer-190.json')).features[0];
    const camera = trafficCameraFromFeature(feature);

    expect(camera?.sourceId).toBe('10209');
    expect(camera?.url).toContain('/visualizador.html?id=10209');
    expect(camera?.longitude).toBeCloseTo(-0.348257, 5);
  });

  it('lee el valor de ocupación del horizonte pedido', () => {
    const features = parkingPredictionsCollection[1].parse(
      fixture('valencia-layer-254.json'),
    ).features;

    expect(predictionValueFromFeature(1, features[0])).toBe(42);
    expect(predictionValueFromFeature(1, features[1])).toBe(88);
  });
});
