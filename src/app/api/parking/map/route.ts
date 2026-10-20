import { errorResponse, jsonResponse } from '@/api/http';
import { InvalidBoundsError, loadMapData, parseBounds } from '@/api/map';
import { logger } from '@/lib/logger';
import { getRequestId } from '@/lib/request-id';

export async function GET(request: Request): Promise<Response> {
  const params = new URL(request.url).searchParams;

  let bounds;
  try {
    bounds = parseBounds(params.get('bbox'));
  } catch (error) {
    if (error instanceof InvalidBoundsError) {
      return errorResponse(400, 'invalid_query', error.message);
    }
    throw error;
  }

  try {
    const data = await loadMapData(bounds, new Date());
    return jsonResponse(data, {
      headers: { 'cache-control': 'public, s-maxage=60, stale-while-revalidate=120' },
    });
  } catch (error) {
    logger.error({ err: error, requestId: getRequestId(request) }, 'Fallo en /api/parking/map');
    return errorResponse(500, 'internal_error', 'No se pudieron cargar los datos del mapa');
  }
}
