import { z } from 'zod';
import { createReportSchema } from '@/api/contracts';
import { errorResponse, formatZodError, jsonResponse } from '@/api/http';
import { createReport, ReportRateLimitError } from '@/api/reports';
import { logger } from '@/lib/logger';
import { getRequestId } from '@/lib/request-id';

const deviceIdSchema = z.string().uuid();
const MAX_BODY_BYTES = 4_096;

export async function POST(request: Request): Promise<Response> {
  const contentType = request.headers.get('content-type') ?? '';
  if (!contentType.toLowerCase().startsWith('application/json')) {
    return errorResponse(415, 'unsupported_media_type', 'El cuerpo debe ser JSON');
  }

  const contentLength = Number(request.headers.get('content-length') ?? '0');
  if (contentLength > MAX_BODY_BYTES) {
    return errorResponse(413, 'payload_too_large', 'El cuerpo es demasiado grande');
  }

  const device = deviceIdSchema.safeParse(request.headers.get('x-device-id'));
  if (!device.success) {
    return errorResponse(400, 'invalid_device', 'Falta un identificador de dispositivo válido');
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return errorResponse(400, 'invalid_json', 'El cuerpo no es JSON válido');
  }

  const parsed = createReportSchema.safeParse(body);
  if (!parsed.success) {
    return errorResponse(400, 'invalid_body', formatZodError(parsed.error));
  }

  const forwarded = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim();
  const ip = forwarded || request.headers.get('x-real-ip') || 'local';

  try {
    const report = await createReport(parsed.data, { deviceId: device.data, ip });
    return jsonResponse(report, { status: 201 });
  } catch (error) {
    if (error instanceof ReportRateLimitError) {
      return errorResponse(429, 'rate_limited', error.message);
    }

    logger.error({ err: error, requestId: getRequestId(request) }, 'Fallo en POST /api/reports');
    return errorResponse(500, 'internal_error', 'No se pudo guardar el reporte');
  }
}
