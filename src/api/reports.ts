import { createHash } from 'node:crypto';
import { getSql } from '@/db/client';
import { serverEnv } from '@/lib/env';
import { consumeRateLimit } from '@/lib/rate-limit';
import type { CreatedReport, CreateReportInput } from './contracts';

const REPORT_TTL_MINUTES = 15;
const COORDINATE_DECIMALS = 4;

const DEVICE_RULE = { limit: 3, windowMs: 10 * 60_000 };
const IP_RULE = { limit: 10, windowMs: 10 * 60_000 };

export class ReportRateLimitError extends Error {
  constructor() {
    super('Has enviado demasiados reportes. Espera unos minutos.');
    this.name = 'ReportRateLimitError';
  }
}

export interface CreateReportContext {
  deviceId: string;
  ip: string;
  now?: number;
}

export async function createReport(
  input: CreateReportInput,
  context: CreateReportContext,
): Promise<CreatedReport> {
  const now = context.now ?? Date.now();
  const deviceHash = hashDeviceId(context.deviceId);

  if (
    !consumeRateLimit(`device:${deviceHash}`, DEVICE_RULE, now) ||
    !consumeRateLimit(`ip:${context.ip}`, IP_RULE, now)
  ) {
    throw new ReportRateLimitError();
  }

  const latitude = roundCoordinate(input.latitude);
  const longitude = roundCoordinate(input.longitude);
  const sql = getSql();

  await sql`delete from availability_reports where expires_at <= now()`;

  let segmentId: string | null = null;
  if (input.segmentId) {
    const [segment] = await sql<{ id: string }[]>`
      select id
      from parking_segments
      where id = ${input.segmentId}
        and ST_DWithin(
          geom::geography,
          ST_SetSRID(ST_MakePoint(${longitude}, ${latitude}), 4326)::geography,
          100
        )
      limit 1
    `;
    segmentId = segment?.id ?? null;
  }

  const [row] = await sql<
    {
      id: string;
      kind: 'spot_free' | 'area_full';
      created_at: Date;
      expires_at: Date;
      latitude: number;
      longitude: number;
    }[]
  >`
    insert into availability_reports (kind, device_hash, segment_id, expires_at, geom)
    values (
      ${input.kind},
      ${deviceHash},
      ${segmentId},
      now() + make_interval(mins => ${REPORT_TTL_MINUTES}),
      ST_SetSRID(ST_MakePoint(${longitude}, ${latitude}), 4326)
    )
    returning
      id,
      kind,
      created_at,
      expires_at,
      ST_Y(geom) as latitude,
      ST_X(geom) as longitude
  `;

  return {
    id: row.id,
    kind: row.kind,
    latitude: row.latitude,
    longitude: row.longitude,
    createdAt: row.created_at.toISOString(),
    expiresAt: row.expires_at.toISOString(),
  };
}

function hashDeviceId(deviceId: string): string {
  return createHash('sha256').update(`${deviceId}:${serverEnv().REPORT_SALT}`).digest('hex');
}

function roundCoordinate(value: number): number {
  return Number(value.toFixed(COORDINATE_DECIMALS));
}
