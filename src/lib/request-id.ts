import { randomUUID } from 'node:crypto';

/** Identificador de petición para correlacionar logs; no contiene datos personales. */
export function getRequestId(request: Request): string {
  const header = request.headers.get('x-request-id')?.trim();
  return header && header.length <= 100 ? header : randomUUID();
}
