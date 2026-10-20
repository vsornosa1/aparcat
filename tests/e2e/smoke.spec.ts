import { expect, test, type Page } from '@playwright/test';

const ATTRIBUTION = {
  text: 'Datos: Ajuntament de València (CC BY 4.0)',
  url: 'https://opendata.vlci.valencia.es/',
  license: 'CC BY 4.0',
};

const MAP_RESPONSE = {
  generatedAt: new Date().toISOString(),
  layers: {
    segments: { type: 'FeatureCollection', features: [] },
    facilities: { type: 'FeatureCollection', features: [] },
    reports: { type: 'FeatureCollection', features: [] },
    cameras: { type: 'FeatureCollection', features: [] },
  },
  meta: { segments: 0, facilities: 0, reports: 0, cameras: 0, truncated: false },
  attribution: ATTRIBUTION,
};

const NEARBY_RESPONSE = {
  origin: { latitude: 39.4699, longitude: -0.3763 },
  generatedAt: new Date().toISOString(),
  radiusMeters: 800,
  horizonHours: 1,
  candidates: [
    {
      id: 'street:2411',
      kind: 'street',
      name: 'Carrer de la Prova',
      distanceMeters: 120,
      walkingMinutes: 2,
      availability: 0.7,
      freshness: 'live',
      confidence: 'high',
      score: 0.8,
      reportSignal: 0.5,
      observedAt: new Date().toISOString(),
      ageMinutes: 1,
      reason: 'Predicción municipal: 70% libre en la próxima hora (hace 1 min)',
      location: { latitude: 39.4705, longitude: -0.3763 },
    },
  ],
  meta: { facilities: 0, streetSegments: 1, reports: 0, totalConsidered: 1 },
  attribution: ATTRIBUTION,
};

const CREATED_REPORT = {
  id: '00000000-0000-4000-8000-000000000000',
  kind: 'spot_free',
  latitude: 39.4699,
  longitude: -0.3763,
  createdAt: new Date().toISOString(),
  expiresAt: new Date(Date.now() + 15 * 60_000).toISOString(),
};

async function mockApis(page: Page): Promise<void> {
  await page.route('**/api/parking/map', (route) => route.fulfill({ json: MAP_RESPONSE }));
  await page.route('**/api/parking/nearby*', (route) => route.fulfill({ json: NEARBY_RESPONSE }));
  await page.route('**/api/streets*', (route) =>
    route.fulfill({
      json: {
        streets: [
          {
            id: 'street:2411',
            name: 'Carrer de la Prova',
            latitude: 39.4705,
            longitude: -0.3763,
          },
        ],
      },
    }),
  );
  await page.route('**/api/reports', (route) =>
    route.fulfill({ status: 201, json: CREATED_REPORT }),
  );
  await page.route('https://tile.openstreetmap.org/**', (route) => route.abort());
}

async function chooseStreet(page: Page): Promise<void> {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Parkflow' })).toBeVisible();
  await page.getByLabel('O elige una calle').fill('Carrer');
  await page.getByRole('button', { name: 'Carrer de la Prova' }).click();
  await expect(page.getByRole('heading', { name: 'Carrer de la Prova' })).toBeVisible();
}

test.beforeEach(async ({ page }) => {
  await mockApis(page);
});

test('elige una calle y muestra una recomendación con frescura', async ({ page }) => {
  await chooseStreet(page);

  await expect(page.getByText('70% libre', { exact: true })).toBeVisible();
  await expect(page.getByText('En vivo · ahora')).toBeVisible();
  await expect(page.getByRole('link', { name: 'Cómo llegar' })).toBeVisible();
  await expect(page.getByText('Predicción orientativa')).toBeVisible();
  await expect(page.getByRole('link', { name: 'Ajuntament de València' })).toBeVisible();
});

test('envía un reporte anónimo y muestra confirmación', async ({ page }) => {
  await page.route('**/api/reports', (route) =>
    route.fulfill({ status: 201, json: CREATED_REPORT }),
  );

  await chooseStreet(page);
  const requestPromise = page.waitForRequest('**/api/reports');
  await page.getByRole('button', { name: 'He dejado un hueco' }).click();
  const request = await requestPromise;
  const payload = request.postDataJSON() as { kind?: string; latitude?: number };

  await expect(page.getByText('Hueco reportado. Gracias por avisar.')).toBeVisible();
  expect(payload.kind).toBe('spot_free');
  expect(payload.latitude).toBeCloseTo(39.4705, 2);
});
