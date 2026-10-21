import { gzipSync } from 'node:zlib';
import { errorResponse, jsonResponse } from '@/api/http';
import { InvalidBoundsError, parseBounds } from '@/api/map';
import { loadOraZones } from '@/api/ora';
import { logger } from '@/lib/logger';
import { getRequestId } from '@/lib/request-id';

const CACHE_HEADERS = {
  'cache-control': 'public, max-age=300, s-maxage=3600, stale-while-revalidate=86400',
  vary: 'accept-encoding',
};

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
    const data = await loadOraZones(bounds);

    // La capa completa puede pesar varios MB; sin gzip se nota en móvil.
    if (request.headers.get('accept-encoding')?.includes('gzip')) {
      return new Response(gzipSync(JSON.stringify(data)), {
        headers: {
          ...CACHE_HEADERS,
          'content-type': 'application/json',
          'content-encoding': 'gzip',
        },
      });
    }

    return jsonResponse(data, { headers: CACHE_HEADERS });
  } catch (error) {
    logger.error({ err: error, requestId: getRequestId(request) }, 'Fallo en /api/parking/ora');
    return errorResponse(500, 'internal_error', 'No se pudieron cargar las zonas ORA');
  }
}
