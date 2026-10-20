import { ingestParkingFacilities } from './facilities';
import { purgeExpiredReports } from './retention';
import { ingestOraMarkings, ingestRegulatedParking } from './segments';
import type { IngestResult } from './types';

/** Ejecuta todas las ingestas una vez, en orden, para no saturar al Ayuntamiento. */
export async function runIngestionOnce(): Promise<IngestResult[]> {
  const results: IngestResult[] = [];

  results.push(await ingestParkingFacilities());
  results.push(await ingestRegulatedParking());
  results.push(await ingestOraMarkings());
  results.push({
    source: 'report_cleanup',
    status: 'success',
    records: await purgeExpiredReports(),
  });

  return results;
}
