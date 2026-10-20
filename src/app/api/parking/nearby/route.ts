import { nearbyQuerySchema, type Horizon } from '@/api/contracts';
import { errorResponse, formatZodError, jsonResponse } from '@/api/http';
import { findNearbyCandidates } from '@/api/nearby';
import { logger } from '@/lib/logger';
import { getRequestId } from '@/lib/request-id';

export async function GET(request: Request): Promise<Response> {
  const params = new URL(request.url).searchParams;
  const parsed = nearbyQuerySchema.safeParse({
    lat: params.get('lat') ?? undefined,
    lng: params.get('lng') ?? undefined,
    radius: params.get('radius') ?? undefined,
    horizon: params.get('horizon') ?? undefined,
  });

  if (!parsed.success) {
    return errorResponse(400, 'invalid_query', formatZodError(parsed.error));
  }

  try {
    const data = await findNearbyCandidates({
      latitude: parsed.data.lat,
      longitude: parsed.data.lng,
      radiusMeters: parsed.data.radius,
      horizonHours: parsed.data.horizon as Horizon,
      now: new Date(),
    });

    return jsonResponse(data, {
      headers: { 'cache-control': 'public, s-maxage=30, stale-while-revalidate=60' },
    });
  } catch (error) {
    logger.error({ err: error, requestId: getRequestId(request) }, 'Fallo en /api/parking/nearby');
    return errorResponse(500, 'internal_error', 'No se pudieron cargar las recomendaciones');
  }
}
