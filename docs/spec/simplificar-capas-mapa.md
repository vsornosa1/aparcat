# Spec: simplificar las capas del mapa (sin «Calles» y sin ORA amarilla)

> Estado: **aprobado** el 2026-10-21. Decisiones: tablas de predicción vacías y sin borrar, MapTiler se queda, `docs/research` y `tasks/` se actualizan.

## Supuestos confirmados

1. «Quitar la feature de Calles» significa **eliminar la predicción municipal por completo**: capa del mapa, tarjetas de recomendación, parámetro `includeStreets`, endpoint `/api/streets` y su ingesta. No es solo ocultar el chip.
2. La búsqueda seguirá funcionando con **MapTiler Geocoding**. Si no hay `NEXT_PUBLIC_MAPTILER_KEY`, el buscador no devolverá resultados (hoy cae al endpoint local de calles).
3. **No se borran tablas** en esta iteración: `parking_segments` y `occupancy_predictions` quedan sin escrituras ni lecturas. Un `DROP TABLE` sería una migración destructiva aparte.
4. El cambio de contrato de la API es **breaking** y aceptado: la app es el único consumidor.
5. Garajes, reportes, cámaras y zonas ORA (azul, naranja, verde) no cambian de comportamiento.
6. «Quitar el amarillo» se hace **al leer**, no al ingerir: `ora_markings` sigue guardando la fuente completa y la API filtra `Amarillo`, igual que ya hace con `Blanco`.

Corrígeme ahora o seguiré con estos supuestos.

## Decisiones aprobadas (2026-10-21)

1. Las tablas `parking_segments` y `occupancy_predictions` se quedan **vacías y sin escrituras**; no hay migración destructiva.
2. El mapa mantiene el resto de features; solo desaparece la pestaña «Calles» con toda su lógica de predicción.
3. MapTiler se mantiene como proveedor de mapa y geocodificador.
4. `docs/research` y `tasks/` se actualizan para reflejar el estado real, conservando el histórico.

## Objective

Dejar el mapa con cuatro señales claras y sin ruido:

- **Garajes públicos** con plazas libres reales.
- **Reportes** de la comunidad.
- **Zonas ORA** en tres colores: azul (pago), naranja (mixta), verde (residentes).
- **Cámaras** (solo ubicación).

Motivo: la capa «Calles» mostraba una predicción que solo cubre 257 tramos del centro, se solapaba visualmente con las zonas ORA y confundía sobre qué dato era una plaza real y qué una probabilidad.

**Éxito:** una persona abre la app y entiende en un vistazo que hay garajes con plazas, reportes y zonas de aparcamiento en calle de tres tarifas; no existe ninguna referencia a «predicción de calles» ni al color amarillo.

## Tech Stack

Sin cambios: Next.js 16 (App Router), TypeScript estricto, Tailwind v4, MapLibre + MapTiler, PostgreSQL 17 + PostGIS, Drizzle, Vitest, Playwright, Docker Compose.

## Commands

```
Dev:          npm run dev
Build:        npm run build
Typecheck:    npm run typecheck
Lint:         npm run lint
Format:       npm run format
Unit:         npm test
Integration:  npm run test:integration
E2E:          npm run test:e2e
Migrations:   npm run db:migrate
Ingest:       npm run ingest
Docker:       docker compose --env-file .env.local up -d --build
```

## Project Structure

```
src/api/            contratos Zod y consultas SQL de las rutas
src/app/api/        rutas HTTP (parking/map, parking/nearby, parking/ora, reports, health)
src/components/map/ mapa, capas y leyenda
src/components/parking/ buscador, tarjetas y reportes
src/domain/         reglas puras (disponibilidad, frescura, ranking, geo)
src/ingest/         fuentes municipales y scheduler
src/db/             esquema Drizzle y migraciones
tests/integration/  pruebas contra PostgreSQL real
tests/e2e/          Playwright con APIs simuladas
docs/               intent, research, legal y este spec
```

## Code Style

Reglas del proyecto: TypeScript estricto, sin `any`, nombres en inglés en código y textos de UI en español, componentes de servidor por defecto y `'use client'` solo donde hay estado o APIs del navegador.

```ts
// Antes: dos fuentes de verdad para el mismo candidato
type SignalKind = 'garage' | 'street_prediction' | 'community_report';

// Después: el mapa y las recomendaciones hablan solo de garajes
type SignalKind = 'garage' | 'community_report';
```

## Testing Strategy

- **Unitarias** (`src/**/*.test.ts`): disponibilidad, frescura, ranking y formato. Se eliminan los casos de `streetAvailability` y de horizontes.
- **Integración** (`tests/integration`): `nearby` solo devuelve garajes; `map` no incluye `layers.segments`; `ora` excluye `Blanco` y `Amarillo`; se elimina la ingesta de predicciones de `ingest-segments` y se conserva el test de marcas ORA.
- **E2E** (`tests/e2e`): chips = Garajes, Reportes, ORA, Cámaras; activar/desactivar ORA; sin test de «Calles».
- La cobertura existente se mantiene; no se bajan umbrales.

## Boundaries

**Always**

- Ejecutar `typecheck`, `lint`, `test`, `test:integration` y `test:e2e` antes de cerrar.
- Actualizar el spec si cambia una decisión.
- Mantener los textos de UI en español y sin jerga.

**Ask first**

- Cualquier migración que haga `DROP` de tablas o columnas.
- Eliminar el endpoint `/api/streets` si se decide conservarlo como geocodificador de reserva.
- Cambiar el formato de `/api/parking/nearby` para otros consumidores.

**Never**

- Romper la ingesta de garajes, ORA o cámaras.
- Dejar imports, tipos o textos huérfanos de la feature eliminada.
- Commitear claves o tocar `.env.local`.

## Alcance técnico (qué se toca)

### 1. Recomendaciones: solo garajes

- `contracts.ts`: `candidateSchema.kind` pasa a `'garage'`; se eliminan `streetSchema`, `streetsResponseSchema`, `MapSegmentProperties`, `layers.segments`, `meta.segments`, `meta.streetSegments`, `includeStreets` y `horizon`.
- `nearby.ts`: fuera `SegmentRow`, la consulta de `parking_segments`/`occupancy_predictions`, `includeStreets` y el `horizon`. `meta` queda con `facilities`, `reports` y `totalConsidered`.
- `domain`: fuera `streetAvailability`, el caso `street_prediction` de frescura y la rama de calle del ranking y del motivo.
- `AvailabilityBadge`, `RecommendationSheet`: desaparece la rama de calle y los textos «Calle · predicción 1 h» / «Calles con predicción».
- `lib/candidates.ts`: el filtro de fiabilidad se simplifica a garajes con plazas y confianza no baja.

### 2. Mapa: cuatro capas

- `layers.ts`: `{ garages, reports, ora, cameras }`.
- `LayerControls.tsx`: chips Garajes, Reportes, ORA, Cámaras. Se actualiza el `hint` de ORA a tres colores.
- `ParkingMap.tsx`: fuera `SEGMENT_COLOR`, la fuente `segments`, la capa `segments-line`, `segmentPopup` y su entrada en `INTERACTIVE_LAYERS`. Se mantiene el resto.
- `MapLegend.tsx`: fuera la sección «Predicción de calles»; ORA muestra azul, naranja y verde.
- `ParkflowApp.tsx`: fuera `layers.streets` del estado inicial y el refetch por ese flag.

### 3. Búsqueda

- `geocoding.ts`: se elimina el fallback a `searchStreets`; solo MapTiler.
- `api-client.ts`: fuera `searchStreets` e `includeStreets`.
- Se eliminan `src/api/streets.ts` y `src/app/api/streets/route.ts`.

### 4. ORA sin amarillo

- `api/ora.ts`: `color <> 'Amarillo'` (además de `Blanco`).
- `ParkingMap.tsx`: fuera `Amarillo` de `ORA_COLOR` y de los mapas de etiquetas/descripciones del popup.
- `MapLegend.tsx`: fuera la entrada «Amarillo · restringido».
- `api-client.ts`: subir la versión de caché a `?v=6` para invalidar la respuesta anterior.
- La ingesta de `ora_markings` no cambia: sigue guardando la fuente completa con CC BY 4.0.

### 5. Ingesta

- `ingest/segments.ts`: se queda solo `ingestOraMarkings`; fuera `ingestRegulatedParking`, horizontes y predicciones.
- `ingest/sources/valencia.ts`: fuera las capas 254/253/252/4, sus esquemas y `predictionValueFromFeature`.
- `ingest/run.ts` y `ingest/scheduler.ts`: fuera el job `regulated_parking`.
- `scripts/probe-sources.ts`: fuera la comprobación de las capas de predicción; se mantiene ORA.
- Las tablas `parking_segments` y `occupancy_predictions` **se conservan** sin escrituras.

### 6. Tests y documentación

- Actualizar fixtures (`nearby-fixtures.ts` deja de sembrar tramos y predicciones) y todos los tests que hoy esperan `streetSegments` o `layers.segments`.
- `tests/e2e/smoke.spec.ts`: quitar el mock `STREET` y el test de «Calles»; añadir que los chips son exactamente cuatro.
- README: quitar la predicción de calles de «Cómo funciona», de la tabla de API y de la estructura; añadir que ORA muestra tres colores.
- `docs/research/valencia-data-sources.md`: se mantiene como registro histórico, con una nota de que la predicción ya no se ingiere.
- `tasks/plan.md` y `tasks/todo.md`: no se reescriben; son histórico del proyecto.

## Success Criteria

1. `npm run typecheck`, `npm run lint`, `npm test`, `npm run test:integration` y `npm run test:e2e` pasan.
2. Una búsqueda de `street_prediction`, `includeStreets` o `streetSegments` en `src` y `tests` no devuelve código funcional.
3. La UI del mapa muestra exactamente cuatro chips: Garajes, Reportes, ORA, Cámaras.
4. `GET /api/parking/nearby` devuelve solo `kind: "garage"` y su `meta` no contiene `streetSegments`.
5. `GET /api/parking/map` no contiene `layers.segments` ni `meta.segments`.
6. `GET /api/parking/ora` no devuelve ninguna zona `Amarillo` ni `Blanco`.
7. La leyenda y los popups de ORA solo mencionan azul, naranja y verde.
8. `/api/streets` responde 404.
9. La ingesta periódica no ejecuta `regulated_parking` y sigue ejecutando garajes, ORA y cámaras.
10. Docker levanta sano (`db`, `web`, `ingest`) y `/api/health` responde 200.

## Open Questions

Ninguna: las tres preguntas quedaron resueltas el 2026-10-21 (ver «Decisiones aprobadas»).
