/**
 * Comprueba que las fuentes del Ayuntamiento siguen respondiendo con el esquema esperado.
 *
 * Uso:
 *   npm run probe:sources
 *   npm run probe:sources -- --export-cameras=docs/legal/camaras-valencia.csv
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import {
  VALENCIA_LAYERS,
  countValenciaLayer,
  fetchValenciaLayer,
  parkingFacilitiesCollection,
  parkingFacilityFromFeature,
  parkingPredictionsCollection,
  predictionValueFromFeature,
  regulatedParkingMarkingsCollection,
  trafficCameraFromFeature,
  trafficCamerasCollection,
  type PredictionHorizon,
  type ValenciaParkingFacility,
} from '@/ingest/sources/valencia';

const EXPECTED_COUNTS: Record<string, { min: number; max: number }> = {
  parkingFacilities: { min: 15, max: 40 },
  regulatedParkingPredictions: { min: 150, max: 600 },
  regulatedParkingMarkings: { min: 20_000, max: 60_000 },
  trafficCameras: { min: 400, max: 1_200 },
};

const HORIZONS: PredictionHorizon[] = [1, 6, 12, 24];

const failures: string[] = [];
const warnings: string[] = [];

async function main(): Promise<void> {
  await checkParkingFacilities();
  await checkPredictions();
  await checkMarkings();
  await checkCameras();
  await exportCamerasIfRequested();

  console.log('');
  for (const warning of warnings) console.warn(`AVISO  ${warning}`);
  for (const failure of failures) console.error(`FALLO  ${failure}`);

  if (failures.length === 0) {
    console.log('Fuentes verificadas sin errores de esquema.');
  } else {
    console.error(`Probe fallido: ${failures.length} problema(s).`);
    process.exitCode = 1;
  }
}

async function checkParkingFacilities(): Promise<void> {
  const layerId = VALENCIA_LAYERS.parkingFacilities;
  const count = await guard('Garajes públicos', layerId, () => countValenciaLayer(layerId));
  checkExpectedCount('Garajes públicos', layerId, count, EXPECTED_COUNTS.parkingFacilities);

  const collection = await guard('Garajes públicos', layerId, () =>
    fetchValenciaLayer(layerId, parkingFacilitiesCollection),
  );
  const facilities = collection.features
    .map(parkingFacilityFromFeature)
    .filter((facility): facility is ValenciaParkingFacility => facility !== null);

  const withData = facilities.filter((facility) => facility.freeSpaces !== null);
  const withoutData = facilities.length - withData.length;
  const [youngest, oldest] = ageRangeMinutes(withData);

  console.log(
    `Garajes públicos (capa ${layerId}): ${count} registros · ${withData.length} con plazas libres · ${withoutData} sin dato`,
  );
  if (youngest !== null && oldest !== null) {
    console.log(`  antigüedad del dato: ${youngest} min (más reciente) a ${oldest} min (más antiguo)`);
  }
  if (withData.length === 0) {
    warnings.push('Ningún garaje devuelve plazas libres; la app mostrará «sin datos».');
  }
}

async function checkPredictions(): Promise<void> {
  const layerByHorizon: Record<PredictionHorizon, number> = {
    1: VALENCIA_LAYERS.regulatedParkingPredictions1h,
    6: VALENCIA_LAYERS.regulatedParkingPredictions6h,
    12: VALENCIA_LAYERS.regulatedParkingPredictions12h,
    24: VALENCIA_LAYERS.regulatedParkingPredictions24h,
  };

  let count: number | undefined;
  for (const horizon of HORIZONS) {
    const layerId = layerByHorizon[horizon];
    const horizonCount = await guard(`Predicción ${horizon} h`, layerId, () =>
      countValenciaLayer(layerId),
    );
    count ??= horizonCount;

    const collection = await guard(`Predicción ${horizon} h`, layerId, () =>
      fetchValenciaLayer(layerId, parkingPredictionsCollection[horizon], { limit: 25 }),
    );
    const values = collection.features.map((feature) => predictionValueFromFeature(horizon, feature));

    console.log(
      `Predicción ${horizon} h (capa ${layerId}): ${horizonCount} tramos · muestra de ${values.length} valores ${describe(values)}`,
    );
  }

  checkExpectedCount(
    'Predicción de ocupación',
    layerByHorizon[1],
    count,
    EXPECTED_COUNTS.regulatedParkingPredictions,
  );
}

async function checkMarkings(): Promise<void> {
  const layerId = VALENCIA_LAYERS.regulatedParkingMarkings;
  const count = await guard('Marcas ORA', layerId, () => countValenciaLayer(layerId));
  await guard('Marcas ORA', layerId, () =>
    fetchValenciaLayer(layerId, regulatedParkingMarkingsCollection, { limit: 10 }),
  );
  checkExpectedCount('Marcas ORA', layerId, count, EXPECTED_COUNTS.regulatedParkingMarkings);
  console.log(`Marcas de aparcamiento regulado (capa ${layerId}): ${count} líneas`);
}

async function checkCameras(): Promise<void> {
  const layerId = VALENCIA_LAYERS.trafficCameras;
  const count = await guard('Cámaras de tráfico', layerId, () => countValenciaLayer(layerId));
  const collection = await guard('Cámaras de tráfico', layerId, () =>
    fetchValenciaLayer(layerId, trafficCamerasCollection, { limit: 5 }),
  );
  const cameras = collection.features
    .map(trafficCameraFromFeature)
    .filter((camera) => camera !== null);

  checkExpectedCount('Cámaras de tráfico', layerId, count, EXPECTED_COUNTS.trafficCameras);
  console.log(
    `Cámaras de tráfico (capa ${layerId}): ${count} registros · ${cameras.length} en la muestra (solo metadatos, las imágenes no se usan)`,
  );
}

async function exportCamerasIfRequested(): Promise<void> {
  const argument = process.argv.find((value) => value.startsWith('--export-cameras='));
  if (!argument) return;

  const target = argument.slice('--export-cameras='.length);
  const collection = await fetchValenciaLayer(
    VALENCIA_LAYERS.trafficCameras,
    trafficCamerasCollection,
  );
  const rows = collection.features.map((feature) => {
    const camera = trafficCameraFromFeature(feature);
    return [camera?.sourceId, camera?.description, camera?.latitude, camera?.longitude, camera?.url]
      .map(csvCell)
      .join(',');
  });

  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(
    target,
    ['idcamara,descripcion,latitud,longitud,url', ...rows].join('\n'),
    'utf8',
  );
  console.log(`Anexo de cámaras exportado: ${target} (${rows.length} filas)`);
}

async function guard<T>(
  label: string,
  layerId: number,
  action: () => Promise<T>,
): Promise<T> {
  try {
    return await action();
  } catch (error) {
    failures.push(`${label} (capa ${layerId}): ${error instanceof Error ? error.message : error}`);
    throw error;
  }
}

function checkExpectedCount(
  label: string,
  layerId: number,
  count: number | undefined,
  expected: { min: number; max: number },
): void {
  if (count === undefined) return;
  if (count < expected.min || count > expected.max) {
    failures.push(
      `${label} (capa ${layerId}) devuelve ${count} registros, fuera del rango esperado ${expected.min}-${expected.max}. Revisa la capa y actualiza la documentación.`,
    );
  }
}

function ageRangeMinutes(facilities: ValenciaParkingFacility[]): [number | null, number | null] {
  const ages = facilities
    .map((facility) => facility.sourceUpdatedAt)
    .filter((date): date is Date => date !== null)
    .map((date) => Math.round((Date.now() - date.getTime()) / 60_000));

  if (ages.length === 0) return [null, null];
  return [Math.min(...ages), Math.max(...ages)];
}

function describe(values: number[]): string {
  if (values.length === 0) return 'sin valores';
  const sum = values.reduce((total, value) => total + value, 0);
  return `(min ${Math.min(...values)} · media ${Math.round(sum / values.length)} · max ${Math.max(...values)})`;
}

function csvCell(value: string | number | null | undefined): string {
  const text = value === null || value === undefined ? '' : String(value);
  return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
