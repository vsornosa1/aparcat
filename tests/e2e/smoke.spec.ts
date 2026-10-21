import { expect, test, type Page } from '@playwright/test';

const ATTRIBUTION = {
  text: 'Datos: Ajuntament de València (CC BY 4.0)',
  url: 'https://opendata.vlci.valencia.es/',
  license: 'CC BY 4.0',
};

const NOW = new Date().toISOString();

const MAP_RESPONSE = {
  generatedAt: NOW,
  layers: {
    segments: { type: 'FeatureCollection', features: [] },
    facilities: { type: 'FeatureCollection', features: [] },
    reports: { type: 'FeatureCollection', features: [] },
    cameras: { type: 'FeatureCollection', features: [] },
  },
  meta: { segments: 0, facilities: 1, reports: 0, cameras: 0, truncated: false },
  attribution: ATTRIBUTION,
};

const GARAGE = {
  id: 'garage:1',
  kind: 'garage',
  name: 'Garaje de prueba',
  distanceMeters: 90,
  walkingMinutes: 1,
  availability: 0.8,
  freeSpaces: 80,
  capacity: 100,
  freshness: 'live',
  confidence: 'high',
  score: 0.9,
  reportSignal: 0,
  observedAt: NOW,
  ageMinutes: 1,
  reason: 'Dato municipal: 80% de plazas libres (ahora mismo)',
  location: { latitude: 39.4705, longitude: -0.3763 },
};

const STREET = {
  id: 'street:2411',
  kind: 'street',
  name: 'Carrer de la Prova',
  distanceMeters: 120,
  walkingMinutes: 2,
  availability: 0.7,
  freeSpaces: null,
  capacity: null,
  freshness: 'live',
  confidence: 'high',
  score: 0.8,
  reportSignal: 0.5,
  observedAt: NOW,
  ageMinutes: 1,
  reason: 'Predicción municipal: 70% libre en la próxima hora (hace 1 min)',
  location: { latitude: 39.4705, longitude: -0.3763 },
};

const CREATED_REPORT = {
  id: '00000000-0000-4000-8000-000000000000',
  kind: 'spot_free',
  latitude: 39.4705,
  longitude: -0.3763,
  createdAt: NOW,
  expiresAt: new Date(Date.now() + 15 * 60_000).toISOString(),
};

async function mockApis(page: Page): Promise<void> {
  await page.route('**/api/parking/map', (route) => route.fulfill({ json: MAP_RESPONSE }));
  await page.route('**/api/parking/ora**', (route) =>
    route.fulfill({ json: { type: 'FeatureCollection', features: [] } }),
  );
  await page.route('**/api/parking/nearby*', (route) => {
    const includeStreets =
      new URL(route.request().url()).searchParams.get('includeStreets') === '1';

    return route.fulfill({
      json: {
        origin: { latitude: 39.4705, longitude: -0.3763 },
        generatedAt: NOW,
        radiusMeters: 800,
        horizonHours: 1,
        candidates: includeStreets ? [STREET] : [GARAGE],
        meta: {
          facilities: includeStreets ? 0 : 1,
          streetSegments: includeStreets ? 1 : 0,
          reports: 0,
          totalConsidered: 1,
        },
        attribution: ATTRIBUTION,
      },
    });
  });
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
  await page.route('https://api.maptiler.com/geocoding/**', (route) =>
    route.fulfill({
      json: {
        features: [
          {
            id: 'poi.1',
            text: 'Carrer de la Prova',
            place_name: 'Carrer de la Prova, València',
            center: [-0.3763, 39.4705],
          },
        ],
      },
    }),
  );
  await page.route('https://api.maptiler.com/maps/**', (route) =>
    route.fulfill({
      json: {
        version: 8,
        sources: {},
        layers: [
          { id: 'background', type: 'background', paint: { 'background-color': '#eef2f5' } },
        ],
      },
    }),
  );
  await page.route('https://api.maptiler.com/tiles/**', (route) => route.abort());
  await page.route('**/api/reports', (route) =>
    route.fulfill({ status: 201, json: CREATED_REPORT }),
  );
}

async function choosePlace(page: Page): Promise<void> {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Aparcat' })).toBeVisible();
  await page.getByLabel('Buscar calle o lugar').fill('Carrer de la Prova');
  await page.getByRole('button', { name: /Carrer de la Prova/ }).click();
  await expect(page.getByRole('heading', { name: 'Garaje de prueba' })).toBeVisible();
}

test.beforeEach(async ({ page }) => {
  await mockApis(page);
});

test('la búsqueda muestra un garaje por defecto', async ({ page }) => {
  await choosePlace(page);

  await expect(page.getByText('80 plazas libres', { exact: true })).toBeVisible();
  await expect(page.getByText('En vivo · ahora')).toBeVisible();
  await expect(page.getByRole('link', { name: 'Cómo llegar' })).toBeVisible();
  await expect(page.getByText('Predicción orientativa')).toBeVisible();
  await expect(page.getByRole('link', { name: 'Ajuntament de València' })).toBeVisible();
});

test('en móvil la leyenda no tapa el mapa hasta abrirla', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await choosePlace(page);

  const legend = page.getByText(/Orientativo · no reserva plaza/);
  await expect(page.getByText('80 plazas libres', { exact: true })).toBeVisible();
  await expect(legend).toBeHidden();

  const legendButton = page.getByRole('button', { name: 'Leyenda' });
  await legendButton.click();

  await expect(legend).toBeVisible();
  await expect(legendButton).toHaveAttribute('aria-expanded', 'true');
});

test('en móvil la capa ORA se puede activar y desactivar', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await choosePlace(page);

  const ora = page.getByRole('button', { name: /^ORA:/ });
  await expect(ora).toHaveAttribute('aria-pressed', 'true');
  await ora.click();
  await expect(ora).toHaveAttribute('aria-pressed', 'false');
  await ora.click();
  await expect(ora).toHaveAttribute('aria-pressed', 'true');
});

test('las calles con predicción se activan desde Capas', async ({ page }) => {
  await choosePlace(page);

  const streetsChip = page.getByRole('button', { name: /^Calles:/ });
  await expect(streetsChip).toHaveAttribute('aria-pressed', 'false');
  await streetsChip.click();
  await expect(streetsChip).toHaveAttribute('aria-pressed', 'true');

  await expect(page.getByRole('heading', { name: 'Carrer de la Prova' })).toBeVisible();
  await expect(page.getByText('Calle · predicción 1 h')).toBeVisible();
});

test('envía un reporte anónimo y muestra confirmación', async ({ page }) => {
  await choosePlace(page);

  const requestPromise = page.waitForRequest('**/api/reports');
  await page.getByRole('button', { name: 'He dejado un hueco' }).click();
  const request = await requestPromise;
  const payload = request.postDataJSON() as { kind?: string; latitude?: number };

  await expect(page.getByText('Hueco reportado. Gracias por avisar.')).toBeVisible();
  expect(payload.kind).toBe('spot_free');
  expect(payload.latitude).toBeCloseTo(39.4705, 2);
});

test('si el estilo de MapTiler falla, el mapa sigue con las capas de datos', async ({ page }) => {
  await page.route('https://api.maptiler.com/maps/**', (route) =>
    route.fulfill({ status: 403, json: { message: 'Invalid key or origin' } }),
  );
  await page.goto('/');

  await expect(
    page.getByRole('status').filter({ hasText: 'No se pudo cargar el mapa base' }),
  ).toBeVisible();

  // El mapa sigue vivo: tocar un punto elige el origen y trae recomendaciones.
  await page
    .getByRole('application', { name: 'Mapa de aparcamiento' })
    .click({ position: { x: 300, y: 300 } });
  await expect(page.getByRole('heading', { name: 'Garaje de prueba' })).toBeVisible();
});

test('con el mapa base disponible no aparece el aviso de fallo', async ({ page }) => {
  await choosePlace(page);

  await expect(page.getByText('No se pudo cargar el mapa base')).toHaveCount(0);
});
