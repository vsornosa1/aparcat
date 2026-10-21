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
  regulatedParkingMarkingsCollection,
  trafficCameraFromFeature,
  trafficCamerasCollection,
  type ValenciaParkingFacility,
} from '@/ingest/sources/valencia';

const EXPECTED_COUNTS: Record<string, { min: number; max: number }> = {
  parkingFacilities: { min: 15, max: 40 },
  regulatedParkingMarkings: { min: 20_000, max: 60_000 },
  trafficCameras: { min: 400, max: 1_200 },
};

const failures: string[] = [];
const warnings: string[] = [];

async function main(): Promise<void> {
  await checkParkingFacilities();
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
  const buckets = bucketByAge(facilities);

  console.log(
    `Garajes públicos (capa ${layerId}): ${count} registros · ${withData.length} con plazas libres · ${facilities.length - withData.length} sin dato`,
  );
  console.log(
    `  frescos (≤${FRESH_MINUTES} min): ${buckets.fresh} · recientes: ${buckets.recent} · obsoletos: ${buckets.stale} · sin dato utilizable: ${buckets.unknown}`,
  );
  if (buckets.freshestMinutes !== null) {
    console.log(`  dato más reciente: hace ${buckets.freshestMinutes} min`);
  }
  if (buckets.fresh === 0) {
    warnings.push('Ningún garaje devuelve plazas libres frescas; la app mostrará «sin datos».');
  }
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
  writeFileSync(target, ['idcamara,descripcion,latitud,longitud,url', ...rows].join('\n'), 'utf8');
  console.log(`Anexo de cámaras exportado: ${target} (${rows.length} filas)`);
}

async function guard<T>(label: string, layerId: number, action: () => Promise<T>): Promise<T> {
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

/** Umbrales provisionales del informe; el módulo de dominio los formaliza en la tarea 4. */
const FRESH_MINUTES = 20;
const RECENT_MINUTES = 6 * 60;

interface AgeBuckets {
  fresh: number;
  recent: number;
  stale: number;
  unknown: number;
  freshestMinutes: number | null;
}

function bucketByAge(facilities: ValenciaParkingFacility[]): AgeBuckets {
  const buckets: AgeBuckets = {
    fresh: 0,
    recent: 0,
    stale: 0,
    unknown: 0,
    freshestMinutes: null,
  };

  for (const facility of facilities) {
    if (facility.freeSpaces === null || facility.sourceUpdatedAt === null) {
      buckets.unknown += 1;
      continue;
    }

    const minutes = Math.round((Date.now() - facility.sourceUpdatedAt.getTime()) / 60_000);
    buckets.freshestMinutes =
      buckets.freshestMinutes === null ? minutes : Math.min(buckets.freshestMinutes, minutes);

    if (minutes <= FRESH_MINUTES) buckets.fresh += 1;
    else if (minutes <= RECENT_MINUTES) buckets.recent += 1;
    else buckets.stale += 1;
  }

  return buckets;
}

function csvCell(value: string | number | null | undefined): string {
  const text = value === null || value === undefined ? '' : String(value);
  return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
