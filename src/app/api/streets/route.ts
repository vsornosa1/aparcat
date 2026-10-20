import { z } from 'zod';
import { errorResponse, formatZodError, jsonResponse } from '@/api/http';
import { findStreets } from '@/api/streets';
import { logger } from '@/lib/logger';

const querySchema = z.object({
  q: z.string().trim().min(2).max(80),
});

export async function GET(request: Request): Promise<Response> {
  const params = new URL(request.url).searchParams;
  const parsed = querySchema.safeParse({ q: params.get('q') ?? '' });

  if (!parsed.success) {
    return errorResponse(400, 'invalid_query', formatZodError(parsed.error));
  }

  try {
    const streets = await findStreets(parsed.data.q);
    return jsonResponse(
      { streets },
      { headers: { 'cache-control': 'public, s-maxage=300, stale-while-revalidate=600' } },
    );
  } catch (error) {
    logger.error({ err: error }, 'Fallo en /api/streets');
    return errorResponse(500, 'internal_error', 'No se pudieron buscar calles');
  }
}
