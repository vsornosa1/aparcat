import type {
  CreatedReport,
  CreateReportInput,
  MapResponse,
  NearbyResponse,
  Street,
} from '@/api/contracts';
import { getDeviceId } from './device-token';

export class ApiClientError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = 'ApiClientError';
  }
}

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, init);

  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as {
      error?: { message?: string };
    } | null;

    throw new ApiClientError(
      body?.error?.message ?? `La petición falló (${response.status})`,
      response.status,
    );
  }

  return (await response.json()) as T;
}

export function fetchMapData(): Promise<MapResponse> {
  return request<MapResponse>('/api/parking/map');
}

export function fetchNearby(
  latitude: number,
  longitude: number,
  radiusMeters = 800,
): Promise<NearbyResponse> {
  const params = new URLSearchParams({
    lat: String(latitude),
    lng: String(longitude),
    radius: String(radiusMeters),
  });

  return request<NearbyResponse>(`/api/parking/nearby?${params.toString()}`);
}

export function searchStreets(query: string): Promise<{ streets: Street[] }> {
  const params = new URLSearchParams({ q: query });
  return request<{ streets: Street[] }>(`/api/streets?${params.toString()}`);
}

export function sendReport(input: CreateReportInput): Promise<CreatedReport> {
  return request<CreatedReport>('/api/reports', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-device-id': getDeviceId(),
    },
    body: JSON.stringify(input),
  });
}
