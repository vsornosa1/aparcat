import { z } from 'zod';

export function jsonResponse<T>(
  body: T,
  options: { status?: number; headers?: Record<string, string> } = {},
): Response {
  return Response.json(body, {
    status: options.status ?? 200,
    headers: {
      'cache-control': 'no-store',
      ...options.headers,
    },
  });
}

export function errorResponse(status: number, code: string, message: string): Response {
  return jsonResponse({ error: { code, message } }, { status });
}

export function formatZodError(error: z.ZodError): string {
  return error.issues
    .map((issue) => `${issue.path.join('.') || 'body'}: ${issue.message}`)
    .join('; ');
}
