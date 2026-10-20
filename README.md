# Parkflow Valencia

Webapp para encontrar aparcamiento libre cerca de ti en Valencia sin dar vueltas.

> **Estado:** fase 2 completada. El mapa, las recomendaciones y los reportes de la comunidad funcionan con datos reales. Queda la puesta en producción (fase 3).

## Cómo funciona

Parkflow combina tres señales legales y complementarias:

- **Garajes públicos:** plazas libres en vivo cuando el Ayuntamiento las publica. Si no hay dato, se muestra «sin datos», nunca «libre».
- **Predicción de aparcamiento regulado:** ocupación estimada por el Ayuntamiento para tramos de la zona centro, etiquetada como predicción y con su hora de consulta.
- **Reportes de la comunidad:** «he dejado un hueco» o «zona llena», anónimos y con caducidad de 15 minutos.
- **Cámaras de tráfico:** solo su ubicación y un enlace al visor oficial. No se descargan ni se publican imágenes.

Cada recomendación muestra su antigüedad y su confianza. La app no reserva ni garantiza plazas.

## Fuentes de datos

Los endpoints, campos, licencias y limitaciones están verificados en [docs/research/valencia-data-sources.md](docs/research/valencia-data-sources.md).

- Datos del Ajuntament de València: **CC BY 4.0**.
- Mapas: **OpenStreetMap**.
- **No se usan imágenes de cámaras de tráfico.** Su difusión está prohibida sin autorización escrita; la solicitud está preparada en [docs/legal/camera-authorization-request.md](docs/legal/camera-authorization-request.md).

## Stack

Next.js 16 · TypeScript estricto · Tailwind CSS · PostgreSQL + PostGIS · Drizzle ORM · Vitest · Docker Compose.

## Puesta en marcha

Requisitos: Node.js 22+ y Docker.

```bash
npm install
cp .env.example .env.local
docker compose up -d db
npm run db:migrate
npm run dev
```

Abre <http://localhost:3000>. La base de datos escucha en el puerto **5434** para no chocar con otros PostgreSQL de la máquina.

## Scripts

| Comando                    | Qué hace                                                                         |
| -------------------------- | -------------------------------------------------------------------------------- |
| `npm run dev`              | Servidor de desarrollo                                                           |
| `npm run build`            | Build de producción                                                              |
| `npm run lint`             | ESLint                                                                           |
| `npm run typecheck`        | TypeScript sin emitir                                                            |
| `npm test`                 | Pruebas unitarias                                                                |
| `npm run test:integration` | Pruebas contra PostgreSQL (requiere Docker y migraciones)                        |
| `npm run test:coverage`    | Cobertura con umbrales                                                           |
| `npm run db:migrate`       | Aplica las migraciones pendientes                                                |
| `npm run ingest`           | Ejecuta una ingesta completa (garajes, predicciones, marcas y limpieza)          |
| `npm run ingest:watch`     | Scheduler continuo: garajes 60 s, predicciones 5 min, marcas 24 h                |
| `npm run probe:sources`    | Verifica que las fuentes municipales siguen respondiendo con el esquema esperado |

El probe admite exportar el anexo de cámaras para la solicitud municipal:

```bash
npm run probe:sources -- --export-cameras=docs/legal/camaras-valencia.csv
```

## API

| Método y ruta                            | Propósito                                                      |
| ---------------------------------------- | -------------------------------------------------------------- |
| `GET /api/parking/nearby?lat&lng&radius` | Recomendaciones ordenadas con frescura, confianza y motivo     |
| `GET /api/parking/map?bbox=`             | Capas GeoJSON de tramos, garajes y reportes vigentes           |
| `GET /api/streets?q=`                    | Búsqueda de calle para elegir el origen sin geolocalización    |
| `POST /api/reports`                      | Reporte anónimo «hueco libre» o «zona llena», caduca en 15 min |

Los errores usan siempre `{ "error": { "code": "...", "message": "..." } }`. Los reportes se limitan por dispositivo e IP y solo guardan un hash con sal (`REPORT_SALT`).

## Mapa

`npm install` ejecuta `scripts/copy-maplibre-worker.mjs`, que copia el worker de MapLibre a `public/`. En desarrollo se usa OpenStreetMap; para producción define `NEXT_PUBLIC_MAP_STYLE_URL` con un estilo de un proveedor de tiles o autohospedado. El uso intensivo de los tiles públicos de OpenStreetMap no está permitido.

## Estructura

```text
src/
  api/        contratos, consultas y lógica de las rutas
  app/        rutas y páginas de Next.js
  components/ mapa y componentes de interfaz
  db/         esquema, cliente y migraciones SQL
  domain/     disponibilidad, frescura y ranking (TypeScript puro)
  ingest/     fuentes municipales, upsert y scheduler
  lib/        entorno, logs y utilidades
public/       worker de MapLibre generado en postinstall
scripts/      probe de fuentes, ingesta, migrador y worker
tests/        pruebas de integración, e2e y fixtures
docs/         intención, investigación y legal
tasks/        plan y lista de tareas
```

## Pruebas

Las pruebas unitarias no tocan la red. Las de integración usan el PostgreSQL de Docker y aplican las migraciones automáticamente. El probe de fuentes es el único que consulta al Ayuntamiento, y se ejecuta a mano o en un job nocturno.

## Plan y decisiones

- Intención confirmada: [docs/intent/valencia-parking.md](docs/intent/valencia-parking.md)
- Plan de implementación: [tasks/plan.md](tasks/plan.md)
- Tareas y criterios de aceptación: [tasks/todo.md](tasks/todo.md)

## Aviso legal

Parkflow no está afiliado al Ajuntament de València. Las señales de tráfico y las normas de estacionamiento prevalecen sobre cualquier recomendación de la app.
